# Claude Code Prompt — Gmail Cleanup Tool

Copy everything below this line and paste it into Claude Code in VS Code.

---

Build a full-stack Gmail cleanup and organization tool as an open-source project called **InboxPilot**. This is a Next.js web app that connects to a user's Gmail via OAuth2, scans their entire inbox, uses an LLM to classify emails by sender, suggests a label taxonomy, and — once the user approves — creates colored Gmail labels and applies them automatically with token-aware batching.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Next.js App (App Router)                       │
│                                                 │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  Frontend    │  │  API Routes              │  │
│  │  React UI    │  │  /api/auth/* (NextAuth)  │  │
│  │  Dashboard   │  │  /api/gmail/*            │  │
│  │  Approval UI │  │  /api/classify/*         │  │
│  │  Progress    │  │  /api/labels/*           │  │
│  └─────────────┘  └──────────────────────────┘  │
│                          │                       │
│         ┌────────────────┼────────────────┐      │
│         ▼                ▼                ▼      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │ Gmail API  │  │ LLM Provider│  │ SQLite   │  │
│  │ (OAuth2)   │  │ Claude/OpenAI│  │ (session │  │
│  │ Direct     │  │ /Ollama/etc │  │  cache)  │  │
│  └────────────┘  └─────────────┘  └──────────┘  │
└─────────────────────────────────────────────────┘
```

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Auth:** NextAuth.js v5 with Google OAuth2 provider
- **Gmail:** `googleapis` npm package — direct Gmail API, NOT MCP
- **LLM:** Pluggable provider system supporting:
  - Anthropic Claude (via `@anthropic-ai/sdk`)
  - OpenAI / GPT (via `openai` sdk)
  - Ollama (local, via REST)
  - Any OpenAI-compatible endpoint (user provides base URL + key)
- **Database:** SQLite via `better-sqlite3` for session-level caching of scan results
- **Styling:** Tailwind CSS v4
- **State:** Zustand for client state

## Gmail OAuth2 Scopes

Request these scopes via NextAuth Google provider:
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.labels
https://www.googleapis.com/auth/gmail.modify
```

The app MUST request only these scopes. No `mail.google.com` (full access). Store the OAuth tokens securely server-side via NextAuth session handling.

## Project Structure

```
inboxpilot/
├── .env.example                 # Template for required env vars
├── .env.local                   # Actual env (gitignored)
├── README.md                    # Full setup guide
├── LICENSE                      # MIT
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── prisma/                      # or drizzle — for session/scan caching
│   └── schema.prisma
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Main dashboard after auth
│   │   ├── settings/
│   │   │   └── page.tsx         # LLM provider config
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── gmail/
│   │       │   ├── scan/route.ts         # Full inbox scan
│   │       │   ├── senders/route.ts      # Aggregated sender list
│   │       │   ├── labels/route.ts       # Create/list labels
│   │       │   └── apply/route.ts        # Apply labels to threads
│   │       └── classify/
│   │           └── route.ts              # LLM classification
│   │
│   ├── lib/
│   │   ├── gmail/
│   │   │   ├── client.ts                 # Gmail API client factory
│   │   │   ├── scanner.ts                # Full inbox scanner with pagination
│   │   │   ├── aggregator.ts             # Aggregate by sender
│   │   │   ├── labeler.ts                # Create labels + apply to threads
│   │   │   └── types.ts
│   │   ├── llm/
│   │   │   ├── provider.ts               # Abstract LLM interface
│   │   │   ├── anthropic.ts              # Claude implementation
│   │   │   ├── openai.ts                 # OpenAI implementation
│   │   │   ├── ollama.ts                 # Ollama implementation
│   │   │   ├── compatible.ts             # Generic OpenAI-compatible
│   │   │   └── classifier.ts             # Email classification logic
│   │   ├── batching/
│   │   │   ├── token-counter.ts          # Estimate tokens per batch
│   │   │   ├── batch-processor.ts        # Process with rate limits
│   │   │   └── retry.ts                  # Exponential backoff
│   │   ├── labels/
│   │   │   ├── taxonomy.ts               # Default label taxonomy + colors
│   │   │   └── mapper.ts                 # Map classifications to labels
│   │   ├── auth.ts                       # NextAuth config
│   │   └── db.ts                         # SQLite connection
│   │
│   ├── components/
│   │   ├── ui/                           # Reusable UI primitives
│   │   ├── landing/                      # Landing page sections
│   │   ├── dashboard/
│   │   │   ├── ScanProgress.tsx          # Real-time scan progress
│   │   │   ├── SenderTable.tsx           # Full sender list with filters/sort
│   │   │   ├── LabelPreview.tsx          # Color-coded label preview
│   │   │   ├── ApprovalPanel.tsx         # Accept/modify/reject suggestions
│   │   │   ├── ExecutionLog.tsx          # Terminal-style execution log
│   │   │   └── StatsCards.tsx            # Summary statistics
│   │   └── settings/
│   │       └── LLMConfig.tsx             # Provider selection + API key input
│   │
│   ├── hooks/
│   │   ├── useGmailScan.ts
│   │   ├── useClassification.ts
│   │   └── useLabelExecution.ts
│   │
│   └── store/
│       └── index.ts                      # Zustand store
│
└── docs/
    ├── SETUP.md                          # Detailed Google Cloud setup guide
    ├── ARCHITECTURE.md
    └── CONTRIBUTING.md
```

## Core Feature: Full Inbox Scanner

This is the most important module. It must handle 7,000+ emails efficiently.

### `src/lib/gmail/scanner.ts`

```typescript
// Scanner must:
// 1. Use Gmail API messages.list with pagination (pageToken)
// 2. Fetch in pages of 500 (max Gmail allows)
// 3. For each message, fetch ONLY metadata (not full body):
//    - From header, Subject header, Date header, Labels
//    - Use format: "metadata" with metadataHeaders: ["From", "Subject", "Date"]
// 4. Stream progress back to the client via Server-Sent Events
// 5. Cache results in SQLite so rescans are instant
// 6. Support incremental scans (only fetch new emails since last scan)

interface ScanResult {
  totalMessages: number;
  scannedMessages: number;
  senders: SenderSummary[];
  scanDuration: number;
}

interface SenderSummary {
  email: string;
  name: string;
  count: number;
  oldestDate: string;    // ISO date
  newestDate: string;    // ISO date
  subjects: string[];    // Sample of 5 subject lines
  categories: string[];  // Gmail categories (PROMOTIONS, UPDATES, etc.)
  hasUnsubscribe: boolean; // List-Unsubscribe header present
  estimatedSize: number;   // Total bytes
}
```

### Scanning Strategy

```
Phase 1: Quick scan (30 seconds)
  - Fetch all message IDs + threadIds via messages.list (fast, metadata only)
  - Count total messages
  - Report to user: "Found 7,234 emails"

Phase 2: Metadata fetch (2-5 minutes for 7k emails)
  - Batch fetch metadata using Gmail API batch endpoint
  - 100 messages per batch request (Gmail batch limit)
  - ~70 batch requests for 7k emails
  - Rate limit: 250 quota units/second (messages.get = 5 units each)
  - So: 50 messages/second → 7000/50 = ~140 seconds
  - Stream progress via SSE: "Scanning: 3,400 / 7,234 (46%)"

Phase 3: Aggregation (instant)
  - Group by sender email
  - Calculate count, date range, sample subjects
  - Sort by count descending
  - Return SenderSummary[]
```

## Core Feature: LLM Classification

### `src/lib/llm/classifier.ts`

The classifier takes batches of SenderSummary objects and returns classifications. Critical design: the Gmail scanning does NOT need an LLM. Only the classification step does. This means the app is useful even without an LLM key — it still shows you all senders grouped by count.

```typescript
interface ClassificationResult {
  email: string;
  category: string;        // "Finance", "Shopping", "Jobs", etc.
  subcategory: string;      // "Receipts", "Promotions", etc.
  suggestedLabel: string;   // "Finance/Receipts"
  suggestedAction: "keep" | "archive" | "unsubscribe" | "delete" | "review";
  riskLevel: "critical" | "high" | "medium" | "low";
  reasoning: string;        // Why this classification
  confidence: number;       // 0-1
}
```

### Classification Prompt Design

```typescript
// The prompt sent to the LLM for each batch:
const SYSTEM_PROMPT = `You are an email classification assistant. Given a list of email senders with metadata, classify each one.

SAFETY RULES (non-negotiable):
- Banks, credit cards, financial institutions → ALWAYS "keep", risk "critical"
- Government (tax, immigration, ID) → ALWAYS "keep", risk "critical"
- Security alerts (Google, Apple, etc.) → ALWAYS "keep", risk "high"
- Receipts and invoices → ALWAYS "archive" (never delete), risk "medium"
- Job applications and recruiter emails → ALWAYS "keep", risk "high"
- Legal, health, insurance → ALWAYS "keep", risk "critical"
- Crypto exchanges → ALWAYS "review" (tax implications), risk "high"

CLASSIFICATION CATEGORIES:
Finance (Receipts | Banking & Credit Cards | Transfers | Taxes & Government | Crypto)
Shopping (Receipts | Promotions)
Jobs & Career (Job Alerts | Recruiters | Applications | Training)
Travel & Transit (Flights & Hotels | Transit Receipts)
Accounts & Security
Education
Events & Communities
Newsletters
Loyalty & Rewards
Food Delivery
Auctions

Respond ONLY with a JSON array. No other text.`;

// Batch size: 15-20 senders per LLM call
// Token budget: ~2000 input tokens per batch, ~1500 output tokens
```

### Token-Aware Batching

```typescript
// src/lib/batching/batch-processor.ts

interface BatchConfig {
  maxTokensPerBatch: number;   // Default: 3500 (input + output)
  maxItemsPerBatch: number;    // Default: 15 senders
  maxConcurrent: number;       // Default: 2 parallel batches
  retryAttempts: number;       // Default: 3
  retryDelayMs: number;        // Default: 1000 (doubles each retry)
  rateLimitPerMinute: number;  // Anthropic: 50, OpenAI: 60, Ollama: unlimited
}

// Token estimation (conservative):
// Each sender in prompt: ~80-120 tokens
// Each classification in response: ~100-150 tokens
// 15 senders per batch ≈ 1500 input + 2000 output = 3500 tokens

// For 100 unique senders:
// 100 / 15 = 7 LLM API calls
// At ~3 seconds each = ~21 seconds total
// Very manageable
```

## Core Feature: Label Management

### `src/lib/labels/taxonomy.ts`

```typescript
// Default label taxonomy with Gmail-compatible colors
// Gmail API uses specific hex color pairs

const DEFAULT_TAXONOMY: LabelDefinition[] = [
  { name: "Finance",                           bg: "#16a765", text: "#ffffff" },
  { name: "Finance/Receipts",                  bg: "#16a765", text: "#ffffff" },
  { name: "Finance/Banking & Credit Cards",    bg: "#0d7a4e", text: "#ffffff" },
  { name: "Finance/Transfers",                 bg: "#89d3b2", text: "#094228" },
  { name: "Finance/Taxes & Government",        bg: "#2da2bb", text: "#ffffff" },
  { name: "Finance/Crypto",                    bg: "#a2dcc1", text: "#094228" },
  { name: "Shopping",                          bg: "#ff7537", text: "#ffffff" },
  { name: "Shopping/Receipts",                 bg: "#ffad47", text: "#3d1c00" },
  { name: "Shopping/Promotions",               bg: "#ffc8af", text: "#5b2800" },
  { name: "Jobs & Career",                     bg: "#4986e7", text: "#ffffff" },
  { name: "Jobs & Career/Job Alerts",          bg: "#4986e7", text: "#ffffff" },
  { name: "Jobs & Career/Recruiters",          bg: "#3d6bbf", text: "#ffffff" },
  { name: "Jobs & Career/Applications",        bg: "#7baef8", text: "#0d1f44" },
  { name: "Jobs & Career/Training",            bg: "#c9daf8", text: "#0d1f44" },
  { name: "Travel & Transit",                  bg: "#2da2bb", text: "#ffffff" },
  { name: "Travel & Transit/Flights & Hotels", bg: "#2da2bb", text: "#ffffff" },
  { name: "Travel & Transit/Transit Receipts", bg: "#7bd3eb", text: "#0d2730" },
  { name: "Accounts & Security",               bg: "#cc3a21", text: "#ffffff" },
  { name: "Education",                         bg: "#f2b600", text: "#1a1400" },
  { name: "Events & Communities",              bg: "#a479e2", text: "#ffffff" },
  { name: "Newsletters",                       bg: "#999999", text: "#ffffff" },
  { name: "Loyalty & Rewards",                 bg: "#f691b2", text: "#460016" },
  { name: "Food Delivery",                     bg: "#fb4c2f", text: "#ffffff" },
  { name: "Auctions",                          bg: "#ffad47", text: "#3d1c00" },
  { name: "To Review",                         bg: "#fbe983", text: "#1a1400" },
  { name: "Unsubscribe Candidates",            bg: "#e07158", text: "#ffffff" },
];
```

### Label Application with Batching

```typescript
// src/lib/gmail/labeler.ts

// Gmail API limits:
// - labels.create: 5 quota units
// - messages.modify (apply label): 5 quota units
// - Batch requests: max 100 operations per batch
// - Rate limit: 250 quota units/second

// Strategy:
// 1. Create all labels first (sequential, 26 calls, ~5 seconds)
// 2. For each sender, search their emails: messages.list(q: "from:x@y.com")
// 3. Batch apply labels: messages.batchModify (up to 1000 message IDs per call!)
//    This is the key optimization — batchModify applies a label to 1000 messages in ONE call.

// For a sender with 200 emails:
//   Old way (MCP): 200 individual label_thread calls = 200 API calls
//   New way: 1 messages.list + 1 messages.batchModify = 2 API calls

// For 60 senders averaging 50 emails each:
//   Old way: 3000+ API calls (this is why it timed out)
//   New way: 60 searches + 60 batchModify = 120 API calls (~30 seconds)
```

## User Flow (UI Screens)

### Screen 1: Landing Page
- Hero section explaining what InboxPilot does
- "Connect Gmail" button → Google OAuth
- Feature list, privacy policy link
- Open source badge, GitHub link

### Screen 2: Settings (first visit)
- LLM Provider selector:
  - "Claude (Anthropic)" — needs API key
  - "OpenAI / GPT" — needs API key
  - "Ollama (Local)" — needs Ollama URL (default: localhost:11434)
  - "Other (OpenAI-compatible)" — needs base URL + API key
  - "No LLM (manual classification only)" — skips AI, shows raw sender list
- API key input (stored in encrypted cookie or local storage, NEVER sent to our server)
- Model selector per provider (e.g., claude-sonnet-4-20250514, gpt-4o, llama3)
- "Test Connection" button

### Screen 3: Dashboard (main screen)
Three-phase flow with clear progress:

**Phase A: Scan**
- Big "Scan My Inbox" button
- Real-time progress bar: "Scanning: 3,400 / 7,234 emails (46%)"
- Estimated time remaining
- Results: "Found 7,234 emails from 312 unique senders"
- Sender table: sortable by count, name, oldest, newest
- Filters: show all / bulk senders only (5+ emails) / one-time senders
- Each row shows: sender name, email, count, date range, has unsubscribe link

**Phase B: Classify (requires LLM)**
- "Classify Senders" button
- Progress: "Classifying batch 3/7..."
- Results appear in the table: category, suggested label, suggested action, risk level
- Color-coded by action: green=keep, blue=archive, yellow=review, red=unsubscribe, grey=delete
- User can OVERRIDE any suggestion by clicking on it
- Approval panel at bottom: "Accept All" / "Accept Safe Only" / "Review One by One"
- Label color preview showing what Gmail sidebar will look like

**Phase C: Execute**
- Summary: "Will create 26 labels, label 4,200 emails across 85 senders"
- Expandable list of every operation
- "Execute" button
- Terminal-style log showing real-time progress
- Progress: "Creating labels... Done (26/26)"
- Progress: "Labeling sender 12/85: noreply@walmart.ca (45 threads)"
- Errors shown inline but don't stop execution
- Completion: summary of what was done + manual steps remaining

### Screen 4: Results / Export
- Summary statistics (emails labeled, labels created, time saved)
- Export results as CSV
- "Manual Steps" checklist:
  - Unsubscribe from X senders (with links)
  - Archive these labels (with instructions)
  - Review "To Review" label
- Share on LinkedIn / Twitter buttons (pre-filled text)

## Environment Variables

```env
# .env.example

# Google OAuth (REQUIRED)
# Get these from Google Cloud Console → APIs & Services → Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# LLM Provider (OPTIONAL — users can also set via UI)
# Only set these for self-hosted deployments where you provide the LLM
LLM_PROVIDER=anthropic          # anthropic | openai | ollama | compatible
ANTHROPIC_API_KEY=sk-ant-...    # If provider is anthropic
OPENAI_API_KEY=sk-...           # If provider is openai
OLLAMA_BASE_URL=http://localhost:11434  # If provider is ollama
COMPATIBLE_BASE_URL=            # If provider is compatible
COMPATIBLE_API_KEY=             # If provider is compatible
COMPATIBLE_MODEL=               # If provider is compatible
```

## README.md Content

Write a comprehensive README with:
1. One-line description: "AI-powered Gmail inbox cleanup — scan, classify, and organize thousands of emails in minutes"
2. Hero screenshot placeholder
3. Features list with emoji icons
4. Quick start (docker-compose up for the easiest path)
5. Manual setup guide:
   a. Clone repo
   b. Google Cloud Console setup (step by step with screenshots placeholder)
   c. Create OAuth credentials
   d. Set env vars
   e. npm install && npm run dev
6. LLM provider setup for each option
7. Architecture diagram (Mermaid)
8. Privacy section: explain that email content never leaves the user's machine, LLM only sees sender names/emails/subject patterns (not email bodies), API keys stored client-side only
9. Contributing guide
10. License (MIT)

## Security and Privacy Requirements

These are NON-NEGOTIABLE:
1. Email bodies are NEVER sent to the LLM. Only: sender email, sender name, email count, date range, sample subject lines (first 5 words only), Gmail category labels
2. API keys entered in the UI are stored ONLY in the browser (localStorage encrypted with a session key) or passed directly in API calls. They are never logged, stored in a database, or sent to any third party.
3. Gmail OAuth tokens are stored server-side in the NextAuth session only. They are never exposed to the client.
4. No analytics, no tracking, no telemetry. Zero external requests except Gmail API and the user's chosen LLM provider.
5. All data processing happens on the user's machine (or their self-hosted server).

## Docker Support

Include a `Dockerfile` and `docker-compose.yml` for easy deployment:

```yaml
# docker-compose.yml
version: "3.8"
services:
  inboxpilot:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    volumes:
      - ./data:/app/data    # SQLite persistence
```

## Critical Implementation Notes

1. **Gmail API batchModify is the key optimization.** One call labels up to 1000 emails. Do NOT label emails one by one.

2. **The scanner should work WITHOUT an LLM.** Users who don't want to use AI should still get a full sender table with counts, dates, and basic heuristic classification (has unsubscribe header → likely newsletter, from noreply → likely automated, etc.).

3. **Heuristic pre-classification (no LLM needed):**
   - `List-Unsubscribe` header present → Newsletter/Mailing List
   - From address contains `noreply`, `no-reply`, `newsletter`, `promo`, `marketing` → Automated
   - Gmail category `PROMOTIONS` → Shopping/Promotions
   - Gmail category `UPDATES` → Notifications
   - Gmail category `SOCIAL` → Social
   - Subject contains `receipt`, `invoice`, `order`, `payment` → Receipts
   - Subject contains `security`, `password`, `verification`, `2FA` → Security
   - From domain matches known banks/financial institutions → Finance

4. **Rate limiting:** Implement proper rate limiting for both Gmail API (250 quota units/sec) and LLM APIs (varies by provider). Use a token bucket algorithm.

5. **Error resilience:** Every operation (scan, classify, label) must be resumable. If labeling fails at sender #30 of 85, clicking "Resume" should pick up at #31, not restart.

6. **Incremental scans:** After the first full scan, subsequent scans should only fetch new emails (using Gmail's `after:` query with the last scan timestamp). Store the last scan timestamp in SQLite.

7. **Gmail label colors:** Gmail's API only accepts specific hex color pairs. The taxonomy above uses validated pairs. Do NOT let users pick arbitrary colors — validate against Gmail's allowed set.

## Build everything. Set up the project structure, implement all modules, create the UI, write the README, and add the Docker files. Start with the core Gmail scanner and work outward.