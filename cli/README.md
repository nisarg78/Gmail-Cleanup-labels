# Gmail Cleanup CLI

Autonomous inbox organization powered by the Anthropic API and Gmail MCP. A single command creates a structured label hierarchy in your Gmail account and classifies thousands of emails by sender — without touching your OAuth flow or writing a single Gmail API call yourself.

```
python main.py
```

---

## How it works

This tool uses a **Claude-in-Claude** (agentic loop) pattern:

1. **Your machine** runs `main.py`, which acts as a batch orchestrator.
2. For each batch, it sends a plain-English prompt to the **Anthropic API** (`/v1/messages`) — along with a reference to the **Gmail MCP server**.
3. The Anthropic runtime connects Claude to your Gmail account via the MCP server. Claude autonomously decides which Gmail tools to call (`create_label`, `search_threads`, `label_thread`) and executes them.
4. Claude returns structured JSON. Your script parses it, logs the result, and moves to the next batch.

You never write a Gmail API call. You never manage OAuth tokens. Claude handles all tool-calling decisions; your script just drives the batching and error handling.

```
┌─────────────────────────────────┐
│         Your machine            │
│  main.py  (batch orchestrator)  │
└────────────────┬────────────────┘
                 │  POST /v1/messages
                 │  + mcp_servers: [gmail_mcp_url]
                 ▼
┌─────────────────────────────────┐
│        Anthropic API            │
│   Claude Sonnet (inner agent)   │
│   ┌─────────────────────────┐   │
│   │  MCP runtime            │   │
│   │  → create_label         │   │
│   │  → search_threads       │   │
│   │  → label_thread         │   │
│   └─────────────────────────┘   │
└────────────────┬────────────────┘
                 │  tool calls
                 ▼
┌─────────────────────────────────┐
│  Gmail MCP Server (Google)      │
│  gmailmcp.googleapis.com        │
└─────────────────────────────────┘
```

### Execution phases

| Phase | What it does | API calls |
|---|---|---|
| 1 — Labels | Creates 26 colored, nested Gmail labels | ~7 |
| 2 — Senders | Searches threads per sender, applies label | ~15 |
| 3 — Sweep | Finds unlisted unsubscribe senders automatically | 1 |

All phases run in **batches of 4** to stay well within context and rate limits. A timeout guard (90–120 s per batch) ensures one slow call never blocks the rest.

---

## Prerequisites

- Python 3.10 or later
- An [Anthropic API key](https://console.anthropic.com/account/keys) (Claude Sonnet access required)
- A Google account with Gmail, and the Gmail MCP server authorized (see below)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/gmail-cleanup-cli.git
cd gmail-cleanup-cli

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and set your Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

> **Never commit `.env` to Git.** It is already listed in `.gitignore`.

### 3. Authorize the Gmail MCP server

The Gmail MCP server (`gmailmcp.googleapis.com`) is operated by Google. Before the Anthropic API can call Gmail tools on your behalf, you must authorize it once in your Claude account:

1. Go to **claude.ai → Settings → Integrations** (or the Connectors panel).
2. Find **Gmail** and click **Connect**.
3. Complete the Google OAuth flow — grant the read/write permissions Gmail MCP requires.
4. Once connected, any API request that includes `mcp_servers: [{url: "https://gmailmcp.googleapis.com/mcp/v1"}]` will have access to your Gmail account.

> **Note:** The Gmail MCP server runs on Google's infrastructure. Your emails are accessed by the MCP server on Claude's behalf using the OAuth token you granted — not stored by this tool locally.

---

## Usage

```bash
# Full run — all 3 phases (recommended for first use)
python main.py

# Preview config tables without running anything
python main.py --preview

# Dry run — shows what would happen, no API calls
python main.py --dry-run

# Run a single phase
python main.py --phase 1     # Create labels only
python main.py --phase 2     # Label senders only
python main.py --phase 3     # Discovery sweep only
```

### Example output

```
Phase 1 — Creating 26 labels in 7 batches of 4
  ✓ Batch 1: 4 created, 0 skipped
  ✓ Batch 2: 3 created, 1 skipped
  ...

Phase 2 — Labeling 58 senders in 15 batches of 4
  ✓ noreply@uber.com: 34 thread(s)
  ✓ catch@payments.interac.ca: 12 thread(s)
  ...

Phase 3 — Discovery sweep
  ✓ Found 3 new sender(s)
    → promo@somestore.ca: 5 thread(s)
```

---

## Customization

All labels and sender mappings live in `config.py`. No Python knowledge is required to edit them — it is plain data.

**Add a new sender:**

```python
{"name": "Stripe", "email": "receipts@stripe.com", "label": "Finance/Receipts"},
```

**Add a new label:**

```python
{"name": "Finance/Invoices", "bg": "#16a765", "text": "#ffffff"},
```

**Change batch size or timeouts:**

```python
BATCH_SIZE = 4        # items per API call
SENDER_TIMEOUT = 120  # seconds per sender batch
```

---

## After the script runs

The script **only applies labels** — it does not archive or delete anything. After it finishes, the terminal will display a checklist for the remaining manual steps:

1. **Archive** — In Gmail, click each label → select all → archive (3 clicks per label).
2. **Unsubscribe** — Work through the `Unsubscribe Candidates` label. Gmail's built-in unsubscribe button appears at the top of each thread.
3. **Delete** — After unsubscribing, search each sender → select all → delete.
4. **Review** — Open the `To Review` label and decide manually on ambiguous senders.

---

## Project structure

```
gmail-cleanup-cli/
├── main.py            # Orchestration logic, CLI entry point
├── config.py          # All label and sender data (edit this to customize)
├── requirements.txt   # pip dependencies
├── .env.example       # Environment variable template
├── .gitignore
└── README.md
```

---

## Architecture notes

### Why not use the official Anthropic Python SDK?

The `requests` library is used intentionally to make the MCP server handshake explicit and readable. The raw API payload — especially the `mcp_servers` field — is easier to understand and debug than it would be hidden behind SDK abstractions. If you prefer the SDK, the `anthropic` package is listed as an optional dependency in `requirements.txt`.

### Why batch size 4?

Each batch is one full round-trip through Claude: the model reads your prompt, decides which Gmail MCP tools to call, calls them, and returns a result. Batches of 4 keep the context window usage low and make each call complete within the 120 s timeout window reliably. Larger batches (8–10) work in practice but increase the risk of partial failures with no useful error signal.

### Error handling strategy

The orchestrator treats every batch as independent. Timeout errors, rate limit responses, and network failures are caught per-batch; the run continues to the next batch rather than aborting. This mirrors the `AbortController` pattern in the original React implementation. If all batches in a phase fail, the exit code is non-zero so CI pipelines can detect it.

---

## License

MIT
