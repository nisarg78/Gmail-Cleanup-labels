"""
main.py — Gmail Cleanup CLI
Autonomous inbox labeling via Anthropic API + Gmail MCP server.

Usage:
    python main.py               # Full run (all 3 phases)
    python main.py --phase 1     # Labels only
    python main.py --phase 2     # Senders only
    python main.py --phase 3     # Discovery sweep only
    python main.py --dry-run     # Preview batches without calling the API
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from itertools import islice
from typing import Any

import requests
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
)
from rich.table import Table
from rich import print as rprint

from config import (
    BATCH_SIZE,
    GMAIL_MCP_URL,
    LABEL_TIMEOUT,
    LABELS,
    MAX_TOKENS,
    MODEL,
    SENDER_TIMEOUT,
    SENDERS,
    SWEEP_TIMEOUT,
)

# ── Bootstrap ──────────────────────────────────────────────────────────────────
load_dotenv()
console = Console()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

# Gmail MCP server definition passed in every API request
GMAIL_MCP_SERVER: dict = {
    "type": "url",
    "url": GMAIL_MCP_URL,
    "name": "gmail",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def chunk(lst: list, size: int):
    """Yield successive fixed-size chunks from lst."""
    it = iter(lst)
    while True:
        batch = list(islice(it, size))
        if not batch:
            break
        yield batch


def safe_parse_json(text: str) -> Any | None:
    """
    Extract the first valid JSON array or object from a string.
    Claude sometimes wraps JSON in markdown fences — this strips them.
    Returns None if no valid JSON is found.
    """
    # Strip markdown fences if present
    cleaned = text.strip()
    for fence in ("```json", "```"):
        if cleaned.startswith(fence):
            cleaned = cleaned[len(fence):]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Try array first, then object
    for start_char, end_char in [("[", "]"), ("{", "}")]:
        si = cleaned.find(start_char)
        ei = cleaned.rfind(end_char)
        if si != -1 and ei > si:
            try:
                return json.loads(cleaned[si : ei + 1])
            except json.JSONDecodeError:
                continue
    return None


def call_api(prompt: str, timeout_sec: int = 120) -> dict | list | None:
    """
    Send a prompt to the Anthropic API with the Gmail MCP server attached.
    Returns parsed JSON from Claude's text response, or a partial-success dict
    if tool calls were made but no JSON was emitted.
    Raises on hard failures (non-recoverable HTTP errors, auth issues).
    """
    if not ANTHROPIC_API_KEY:
        raise EnvironmentError(
            "ANTHROPIC_API_KEY is not set. Copy .env.example → .env and add your key."
        )

    headers = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-beta": "mcp-client-2025-04-04",
    }

    payload = {
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "system": (
            "You are a Gmail automation agent. Execute the requested Gmail MCP operations "
            "precisely. Be concise. Always return your final answer as raw JSON only — "
            "no prose, no markdown fences."
        ),
        "messages": [{"role": "user", "content": prompt}],
        "mcp_servers": [GMAIL_MCP_SERVER],
    }

    try:
        response = requests.post(
            ANTHROPIC_API_URL,
            headers=headers,
            json=payload,
            timeout=timeout_sec,
        )
    except requests.exceptions.Timeout:
        raise TimeoutError(f"API call timed out after {timeout_sec}s")
    except requests.exceptions.ConnectionError as exc:
        raise ConnectionError(f"Network error: {exc}") from exc

    # Surface hard HTTP errors (auth, quota, etc.)
    if response.status_code == 401:
        raise PermissionError("Invalid ANTHROPIC_API_KEY — check your .env file.")
    if response.status_code == 429:
        raise RuntimeError("Rate limit hit — wait a moment and retry.")
    if response.status_code >= 500:
        raise RuntimeError(f"Anthropic server error ({response.status_code}) — retry later.")
    if not response.ok:
        raise RuntimeError(f"API error {response.status_code}: {response.text[:200]}")

    data = response.json()

    if "error" in data:
        raise RuntimeError(f"Anthropic API error: {data['error'].get('message', data['error'])}")

    content_blocks = data.get("content", [])

    # Extract text blocks and try JSON parsing
    raw_text = "".join(
        block["text"] for block in content_blocks if block.get("type") == "text"
    ).strip()

    if raw_text:
        parsed = safe_parse_json(raw_text)
        if parsed is not None:
            return parsed

    # If no parseable JSON but tool calls happened — partial success
    tool_call_count = sum(
        1 for block in content_blocks if block.get("type") == "mcp_tool_use"
    )
    return {"ok": True, "tool_calls": tool_call_count, "partial": True}


# ── Phase 1: Create Labels ──────────────────────────────────────────────────────

def phase_labels(dry_run: bool = False) -> tuple[int, int]:
    """
    Create all Gmail labels in batches.
    Returns (batches_succeeded, batches_failed).
    """
    batches = list(chunk(LABELS, BATCH_SIZE))
    succeeded = failed = 0

    console.print(
        Panel(
            f"[bold]Phase 1 — Creating {len(LABELS)} labels[/bold] in {len(batches)} batches of {BATCH_SIZE}",
            style="blue",
        )
    )

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console,
        transient=False,
    ) as progress:
        task = progress.add_task("Labels", total=len(batches))

        for i, batch in enumerate(batches, 1):
            names = ", ".join(l["name"] for l in batch)
            progress.update(task, description=f"[cyan]Batch {i}/{len(batches)}[/cyan] — {names[:60]}…")

            if dry_run:
                console.print(f"  [dim][DRY RUN] Would create: {names}[/dim]")
                progress.advance(task)
                succeeded += 1
                continue

            prompt_lines = [
                f'{j + 1}. create_label name="{l["name"]}" '
                f'backgroundColor="{l["bg"]}" textColor="{l["text"]}"'
                for j, l in enumerate(batch)
            ]
            prompt = "\n".join(prompt_lines)
            prompt += '\nSkip labels that already exist. Return JSON: {"created": N, "skipped": N}'

            try:
                result = call_api(prompt, timeout_sec=LABEL_TIMEOUT)
                if isinstance(result, dict) and "created" in result:
                    console.print(
                        f"  [green]✓[/green] Batch {i}: "
                        f"{result['created']} created, {result.get('skipped', 0)} skipped"
                    )
                elif isinstance(result, dict) and result.get("partial"):
                    console.print(
                        f"  [green]✓[/green] Batch {i}: done "
                        f"({result.get('tool_calls', '?')} tool calls)"
                    )
                else:
                    console.print(f"  [green]✓[/green] Batch {i}: done")
                succeeded += 1

            except TimeoutError as exc:
                console.print(f"  [yellow]⚠[/yellow] Batch {i} timed out ({exc}) — skipping")
                failed += 1
            except Exception as exc:
                console.print(f"  [red]✗[/red] Batch {i} error: {exc} — continuing")
                failed += 1

            progress.advance(task)
            # Polite pause between batches to avoid rate-limit spikes
            if i < len(batches):
                time.sleep(1)

    return succeeded, failed


# ── Phase 2: Label Senders ──────────────────────────────────────────────────────

def phase_senders(dry_run: bool = False) -> tuple[int, int]:
    """
    Search Gmail threads by sender and apply labels, in batches.
    Returns (batches_succeeded, batches_failed).
    """
    batches = list(chunk(SENDERS, BATCH_SIZE))
    succeeded = failed = 0

    console.print(
        Panel(
            f"[bold]Phase 2 — Labeling {len(SENDERS)} senders[/bold] in {len(batches)} batches of {BATCH_SIZE}",
            style="blue",
        )
    )

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console,
        transient=False,
    ) as progress:
        task = progress.add_task("Senders", total=len(batches))

        for i, batch in enumerate(batches, 1):
            names = ", ".join(s["name"] for s in batch)
            progress.update(task, description=f"[cyan]Batch {i}/{len(batches)}[/cyan] — {names[:60]}…")

            if dry_run:
                console.print(f"  [dim][DRY RUN] Would label: {names}[/dim]")
                progress.advance(task)
                succeeded += 1
                continue

            sender_lines = [
                f'{j + 1}. from:{s["email"]} → label "{s["label"]}"'
                for j, s in enumerate(batch)
            ]
            prompt = (
                "For each sender below, use search_threads to find their emails "
                "then use label_thread to apply the specified label.\n"
                "Do NOT archive or remove from inbox. Apply the label only.\n\n"
                + "\n".join(sender_lines)
                + f"\n\nProcess all {len(batch)} senders. "
                'Return JSON: [{"email": "...", "threads": N}]'
            )

            try:
                result = call_api(prompt, timeout_sec=SENDER_TIMEOUT)
                if isinstance(result, list) and result:
                    for item in result:
                        if isinstance(item, dict) and item.get("email"):
                            console.print(
                                f"  [green]✓[/green] {item['email']}: "
                                f"{item.get('threads', '?')} thread(s)"
                            )
                    succeeded += 1
                elif isinstance(result, dict) and result.get("partial"):
                    console.print(
                        f"  [green]✓[/green] Batch {i}: done "
                        f"({result.get('tool_calls', '?')} tool calls)"
                    )
                    succeeded += 1
                else:
                    console.print(f"  [green]✓[/green] Batch {i}: done")
                    succeeded += 1

            except TimeoutError as exc:
                console.print(f"  [yellow]⚠[/yellow] Batch {i} timed out ({exc}) — skipping")
                failed += 1
            except Exception as exc:
                console.print(f"  [red]✗[/red] Batch {i} error: {exc} — continuing")
                failed += 1

            progress.advance(task)
            if i < len(batches):
                time.sleep(1)

    return succeeded, failed


# ── Phase 3: Discovery Sweep ───────────────────────────────────────────────────

def phase_sweep(dry_run: bool = False) -> int:
    """
    Broad Gmail search for unsubscribe-pattern senders not in the known list.
    Automatically labels them as 'Unsubscribe Candidates'.
    Returns the number of new senders found and labeled.
    """
    console.print(
        Panel(
            "[bold]Phase 3 — Discovery Sweep[/bold] (finding unlisted unsubscribe senders)",
            style="blue",
        )
    )

    if dry_run:
        console.print("  [dim][DRY RUN] Would run a sweep for unlisted unsubscribe senders[/dim]")
        return 0

    # Pass only the first 30 known emails to keep the prompt compact
    known_emails = ", ".join(s["email"] for s in SENDERS[:30])

    prompt = (
        'Do ONE search_threads with query: "unsubscribe"\n'
        "From the results, identify sender email addresses NOT in this list:\n"
        f"{known_emails}\n\n"
        "For each new sender with 2 or more threads, apply the label "
        '"Unsubscribe Candidates" using label_thread.\n'
        'Return JSON: [{"email": "...", "threads": N}]'
    )

    try:
        with console.status("[cyan]Running discovery sweep…[/cyan]"):
            result = call_api(prompt, timeout_sec=SWEEP_TIMEOUT)

        new_senders: list = result if isinstance(result, list) else []
        count = len(new_senders)

        if count:
            console.print(f"  [green]✓[/green] Found {count} new sender(s):")
            for item in new_senders:
                if isinstance(item, dict) and item.get("email"):
                    console.print(
                        f"    [dim]→[/dim] {item['email']}: {item.get('threads', '?')} thread(s)"
                    )
        else:
            tool_calls = result.get("tool_calls", "?") if isinstance(result, dict) else "?"
            console.print(f"  [green]✓[/green] Sweep done ({tool_calls} tool calls) — no new senders found")

        return count

    except TimeoutError as exc:
        console.print(f"  [yellow]⚠[/yellow] Sweep timed out ({exc}) — not critical")
        return 0
    except Exception as exc:
        console.print(f"  [red]✗[/red] Sweep error: {exc} — not critical")
        return 0


# ── Preview / Dry-run table ────────────────────────────────────────────────────

def show_preview():
    """Print a preview table of labels and senders before running."""
    label_batches = list(chunk(LABELS, BATCH_SIZE))
    sender_batches = list(chunk(SENDERS, BATCH_SIZE))
    total_calls = len(label_batches) + len(sender_batches) + 1

    console.print(
        Panel(
            f"[bold]Gmail Cleanup CLI[/bold] — Agentic inbox organization\n"
            f"Model: [cyan]{MODEL}[/cyan]  •  "
            f"Labels: [cyan]{len(LABELS)}[/cyan]  •  "
            f"Senders: [cyan]{len(SENDERS)}[/cyan]  •  "
            f"API calls: ~[cyan]{total_calls}[/cyan]",
            style="bold white",
        )
    )

    table = Table(title="Labels to create", show_lines=False, style="dim")
    table.add_column("Name", style="cyan", no_wrap=False)
    table.add_column("Bg color", style="dim")
    for label in LABELS:
        table.add_row(label["name"], label["bg"])
    console.print(table)

    table2 = Table(title=f"Senders to label ({len(SENDERS)})", show_lines=False, style="dim")
    table2.add_column("Name")
    table2.add_column("Email", style="dim")
    table2.add_column("→ Label", style="cyan")
    for sender in SENDERS:
        table2.add_row(sender["name"], sender["email"], sender["label"])
    console.print(table2)


# ── Post-run manual checklist ──────────────────────────────────────────────────

def show_manual_steps():
    console.print(
        Panel(
            "[bold green]✅ All phases complete![/bold green]\n\n"
            "[bold]Remaining manual steps:[/bold]\n"
            "  1. [yellow]ARCHIVE[/yellow]  — In Gmail: click each label → checkbox → "
            '"Select all" → Archive\n'
            "  2. [yellow]UNSUBSCRIBE[/yellow] — Gmail ☰ → Manage subscriptions → "
            "work through [cyan]Unsubscribe Candidates[/cyan]\n"
            "  3. [yellow]DELETE[/yellow]    — After unsubscribing, search each sender → "
            "Select All → Delete\n"
            "  4. [yellow]TO REVIEW[/yellow] — Open [cyan]To Review[/cyan] label → "
            "manually decide on each sender",
            style="green",
        )
    )


# ── Entry point ────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gmail Cleanup CLI — autonomous inbox labeling via Anthropic + Gmail MCP",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python main.py                # Full run (all 3 phases)\n"
            "  python main.py --phase 1      # Labels only\n"
            "  python main.py --phase 2      # Senders only\n"
            "  python main.py --phase 3      # Discovery sweep only\n"
            "  python main.py --dry-run      # Preview without API calls\n"
            "  python main.py --preview      # Show config tables and exit\n"
        ),
    )
    parser.add_argument(
        "--phase",
        type=int,
        choices=[1, 2, 3],
        default=None,
        help="Run a single phase only (1=labels, 2=senders, 3=sweep)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would happen without making any API calls",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Show config tables (labels + senders) and exit",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if args.preview:
        show_preview()
        return

    show_preview()

    if not args.dry_run and not ANTHROPIC_API_KEY:
        console.print(
            "[red bold]Error:[/red bold] ANTHROPIC_API_KEY is not set.\n"
            "Copy [cyan].env.example[/cyan] → [cyan].env[/cyan] and paste your key."
        )
        sys.exit(1)

    if args.dry_run:
        console.print("\n[yellow bold]DRY RUN — no API calls will be made[/yellow bold]\n")

    run_phase_1 = args.phase in (None, 1)
    run_phase_2 = args.phase in (None, 2)
    run_phase_3 = args.phase in (None, 3)

    total_succeeded = total_failed = 0

    if run_phase_1:
        s, f = phase_labels(dry_run=args.dry_run)
        total_succeeded += s
        total_failed += f
        console.print()

    if run_phase_2:
        s, f = phase_senders(dry_run=args.dry_run)
        total_succeeded += s
        total_failed += f
        console.print()

    if run_phase_3:
        phase_sweep(dry_run=args.dry_run)
        console.print()

    if not args.dry_run:
        show_manual_steps()

    # Exit code: non-zero if every single batch failed
    if total_failed > 0 and total_succeeded == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
