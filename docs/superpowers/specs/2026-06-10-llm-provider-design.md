# InboxPilot — LLM Provider System Design

**Date:** 2026-06-10
**Scope:** Prompt 4 — LLM classification pipeline, settings UI, approval panel
**Status:** Approved

---

## Overview

Build a pluggable LLM classification system that takes `SenderSummary[]` from the Gmail scanner, batches them into groups of 15, sends each batch to the active LLM provider, applies hardcoded safety overrides, and streams `ClassificationResult[]` back to the dashboard. The user then reviews and approves results before the execution phase.

---

## File Structure

```
src/lib/llm/
  provider.ts          ← LLMProvider interface + ClassificationResult + LLMConfig types
  anthropic.ts         ← Claude via @anthropic-ai/sdk
  openai.ts            ← OpenAI via openai sdk
  ollama.ts            ← Ollama via fetch to base URL
  compatible.ts        ← Any OpenAI-compatible endpoint
  classifier.ts        ← Batch orchestrator, safety overrides, streams results

src/lib/batching/
  token-counter.ts     ← Token estimation, adjusts batch size for context window
  retry.ts             ← Exponential backoff (1s→2s→4s, 3 retries, 429 detection)

src/app/api/classify/
  route.ts             ← POST endpoint, SSE stream, auth guard

src/app/settings/
  page.tsx             ← Protected settings page

src/app/components/
  LLMConfig.tsx        ← Provider config form (client component)
  ApprovalPanel.tsx    ← Classification review + approve (client component)
```

---

## Types (`src/lib/llm/provider.ts`)

```ts
export interface ClassificationResult {
  email: string
  category: string
  subcategory: string | null
  suggestedLabel: string      // matches a LABELS entry name
  suggestedAction: 'Keep' | 'Archive' | 'Unsubscribe' | 'Review'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reasoning: string
  confidence: number          // 0–1
  safetyOverride?: string     // set when a safety rule was applied
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'ollama' | 'compatible' | 'none'
  apiKey: string
  model: string
  baseUrl?: string
}

// SenderSummary imported from '@/lib/gmail/types'
export interface LLMProvider {
  name: string
  classify(senders: SenderSummary[], config: LLMConfig): Promise<ClassificationResult[]>
  testConnection(config: LLMConfig): Promise<boolean>
}
```

`STORAGE_KEY = 'inboxpilot_llm_config'` — localStorage key for settings persistence.

---

## LLM Classification Prompt

Each batch of 15 senders is formatted as:

```
System: You are an email classifier. Classify each sender. Return valid JSON array only, no prose.

User:
Classify these {n} senders. For each return JSON with:
email, suggestedLabel (from taxonomy), suggestedAction (Keep|Archive|Unsubscribe|Review),
riskLevel (low|medium|high|critical), confidence (0-1), reasoning (1 sentence)

Available labels: Finance, Finance/Receipts, Finance/Statements, Shopping, Shopping/Orders, ...

Senders:
1. newsletter@company.com | "Company" | 234 emails | Jan 2020–Dec 2024
   Subjects: "Weekly digest", "Your monthly recap", "Top stories", "New features", "Product update"
2. ...
```

---

## Safety Overrides (enforced in classifier.ts, after LLM response)

| Condition | Override |
|-----------|----------|
| Email domain contains: bank, credit, chase, wellsfargo, paypal, stripe, amex, visa | Keep, critical |
| Email domain contains: .gov, irs, tax, immigration, cbp, dhs | Keep, critical |
| `heuristicCategory === 'security'` OR subject keywords: password, security alert, verify account | Keep in inbox, high |
| `heuristicCategory === 'receipt'` | Archive only (never Delete/Unsubscribe), medium |
| Email domain contains: coinbase, binance, kraken, crypto, ethereum, bitcoin | Review, high |
| `heuristicCategory === 'newsletter'` AND any subject contains job/career/recruiter | Keep, high |

Safety overrides set `safetyOverride: "reason"` on the result and cannot be changed in the ApprovalPanel.

---

## Token Counter (`src/lib/batching/token-counter.ts`)

```ts
// Per-sender estimates
const INPUT_TOKENS_PER_SENDER = 100
const OUTPUT_TOKENS_PER_SENDER = 150

// Default batch size
const DEFAULT_BATCH_SIZE = 15

// Model context windows (input only — leave headroom for output)
const MODEL_CONTEXT: Record<string, number> = {
  'claude-sonnet-4-6': 180_000,
  'claude-opus-4-8': 180_000,
  'gpt-4o': 100_000,
  'gpt-4o-mini': 100_000,
  default: 8_000,
}

export function getBatchSize(model: string): number {
  const contextLimit = MODEL_CONTEXT[model] ?? MODEL_CONTEXT.default
  const maxSendersFromContext = Math.floor(contextLimit / INPUT_TOKENS_PER_SENDER)
  return Math.min(DEFAULT_BATCH_SIZE, maxSendersFromContext)
}

export function estimateTokens(senderCount: number): { input: number; output: number } {
  return {
    input: senderCount * INPUT_TOKENS_PER_SENDER,
    output: senderCount * OUTPUT_TOKENS_PER_SENDER,
  }
}
```

---

## Retry Logic (`src/lib/batching/retry.ts`)

```ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T>
```

- On failure: check if error message / status contains "429" or "rate limit" → wait longer (5s first retry)
- Otherwise: exponential backoff 1s, 2s, 4s
- After 3 failures: re-throw

---

## Provider Implementations

### Default models per provider:
- `anthropic`: `claude-sonnet-4-6`
- `openai`: `gpt-4o-mini`
- `ollama`: `llama3`
- `compatible`: user-specified

### Anthropic (`@anthropic-ai/sdk`)
```ts
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: config.apiKey })
await client.messages.create({ model, max_tokens: 2048, messages: [...] })
```

### OpenAI (`openai`)
```ts
import OpenAI from 'openai'
const client = new OpenAI({ apiKey: config.apiKey, dangerouslyAllowBrowser: false })
await client.chat.completions.create({ model, messages: [...] })
```

### Ollama (fetch)
```ts
const baseUrl = config.baseUrl || 'http://localhost:11434'
await fetch(`${baseUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ model, messages, stream: false }) })
```

### Compatible (OpenAI SDK with custom baseURL)
```ts
const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl })
```

### testConnection
Each provider sends a minimal test prompt ("Reply with 'ok'") and returns `true` if it gets a response, `false` on any error.

---

## API Routes (`/api/classify`)

### POST /api/classify — classify senders
```ts
Body: { senders: SenderSummary[], provider: string, apiKey: string, model: string, baseUrl?: string }
Response: SSE stream
```

### POST /api/classify/test — test provider connection
```ts
Body: { provider: string, apiKey: string, model: string, baseUrl?: string }
Response: { ok: boolean, error?: string }
```
Sends a minimal "Reply with ok" prompt to the provider. Returns 200 with `{ ok: true }` on success, `{ ok: false, error: "..." }` on failure. Auth required (session).

Auth: requires session (`auth()`) — returns 401 if unauthenticated.

Stream format (one event per batch of 15):
```json
{"batch": 1, "total": 7, "results": [ClassificationResult, ...]}
```

Final event:
```json
{"done": true, "totalClassified": 100}
```

Error event:
```json
{"error": "Provider error message"}
```

---

## Settings Page (`/settings`)

Add `/settings/:path*` to middleware matcher.

`LLMConfig.tsx` (`'use client'`):
- On mount: read config from `localStorage[STORAGE_KEY]`
- Provider dropdown: Anthropic Claude, OpenAI / GPT, Ollama (local), OpenAI-compatible, No LLM
- API key input: `type="password"`, hidden when provider is Ollama or None
- Model selector:
  - Anthropic: `claude-sonnet-4-6`, `claude-opus-4-8`, `claude-haiku-4-5-20251001`
  - OpenAI: `gpt-4o`, `gpt-4o-mini`, `o1-mini`
  - Ollama: text input (default: `llama3`)
  - Compatible: text input
- Base URL input: shown for Ollama and Compatible only
- "Test Connection" → `POST /api/classify/test` with config, shows ✓ or ✗
- "Save" → writes to localStorage, shows saved toast

---

## ApprovalPanel (`src/app/components/ApprovalPanel.tsx`)

Props:
```ts
interface ApprovalPanelProps {
  results: ClassificationResult[]
  senders: SenderSummary[]
  onApprove: (approved: ClassificationResult[]) => void
}
```

State: `overrides: Record<string, ClassificationResult>` — per-email user overrides.

Display: table-like list with sender name, suggested label, suggested action (editable), risk badge. Safety-overridden rows show a 🔒 icon and cannot be modified.

Three approval modes:
- **Accept All** → `onApprove(mergeOverrides(results, overrides))`
- **Accept Safe Only** → filters out `riskLevel === 'high' | 'critical'` without safety override, `onApprove(filtered)`
- **Review One by One** → cycles through each result individually for confirm/skip

---

## DashboardClient Changes

After `senders` state is populated, show a "Classify with AI" button that:
1. Reads LLM config from localStorage
2. If provider is 'none' or config is missing: shows a toast "Configure LLM in Settings first"
3. Otherwise: opens SSE stream to `/api/classify`, builds up `classificationResults` state
4. Once complete: renders `<ApprovalPanel results={classificationResults} senders={senders} onApprove={setApprovedResults} />`
5. After approval: `approvedResults` state is ready for Prompt 5 (execution)

---

## What This Prompt Does NOT Include

- Actual label creation / Gmail API execution (Prompt 5)
- Zustand store (add in a later step when state crosses more components)
- Persisting classification results to SQLite (Prompt 5 handles execution state)
