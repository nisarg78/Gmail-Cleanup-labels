# InboxPilot — AI-Powered Gmail Cleanup Tool

## What This Is
Open-source Next.js app. Users connect Gmail via OAuth2, scan their
full inbox, get AI-powered label/action suggestions, approve them,
and the app creates colored Gmail labels + applies them automatically.

## Tech Stack
- Next.js 15 (App Router, TypeScript strict)
- NextAuth.js v5 — Google OAuth2 (Gmail scopes)
- googleapis npm — direct Gmail API (NOT MCP)
- Anthropic SDK + OpenAI SDK + Ollama support
- SQLite via better-sqlite3 — session cache for scan results
- Tailwind CSS v4
- Zustand — client state

## Architecture Rules
- Gmail scanning does NOT need an LLM. Works without any API key.
- LLM only sees: sender email, sender name, count, date range,
  first 5 words of subject lines. NEVER full email bodies.
- API keys stored client-side only (localStorage). Never logged/stored server-side.
- Use Gmail batchModify (up to 1000 msgs per call) — never label one-by-one.
- All API routes under /api/. No server actions.

## Gmail API Key Numbers
- messages.list: 5 quota units per call, returns up to 500 results
- messages.get (metadata): 5 units per call
- Batch requests: max 100 operations
- Rate limit: 250 quota units/second
- messages.batchModify: labels up to 1000 messages in ONE call
- labels.create: 5 units per call

## LLM Provider System
Pluggable. User picks in Settings UI:
1. Anthropic Claude — @anthropic-ai/sdk
2. OpenAI / GPT — openai sdk
3. Ollama (local/free) — REST to localhost:11434
4. Any OpenAI-compatible endpoint — user provides base URL + key
5. No LLM — manual mode, heuristic classification only

## Classification Safety Rules (hardcoded, LLM cannot override)
- Banks/credit cards/financial → ALWAYS keep, risk critical
- Government (tax, immigration) → ALWAYS keep, risk critical
- Security alerts → ALWAYS keep in inbox, risk high
- Receipts/invoices → ALWAYS archive (never delete), risk medium
- Job applications/recruiters → ALWAYS keep, risk high
- Crypto exchanges → ALWAYS review (tax implications), risk high

## Label Taxonomy (26 labels with Gmail-valid colors)
Finance (green), Shopping (orange), Jobs & Career (blue),
Travel & Transit (teal), Accounts & Security (red),
Education (yellow), Events & Communities (purple),
Newsletters (grey), Loyalty & Rewards (pink),
Food Delivery (red-orange), Auctions (amber),
To Review (light yellow), Unsubscribe Candidates (salmon)

## Token Optimization
- LLM classification: batch 15 senders per call
- ~80-100 input tokens per sender, ~100-150 output tokens
- 100 senders = ~7 LLM calls = ~25,000 tokens total
- Gmail labeling: batchModify 1000 msgs per call
- 60 senders × 1 batchModify each = 60 Gmail API calls

## Commands
- npm run dev — start dev server on port 3000
- npm run build — production build
- npm test — run tests

## Conventions
- TypeScript strict, no `any`
- Server components by default, client components only when needed
- Error boundaries on every page
- All Gmail operations are resumable (track progress in SQLite)
- One file, one responsibility