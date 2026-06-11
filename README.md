# InboxPilot

> AI-powered Gmail cleanup — scan thousands of emails, get label suggestions, and organize your inbox automatically.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://typescriptlang.org)

## Features

- **Full inbox scan** — paginate your entire Gmail inbox, grouped by sender
- **AI classification** — Claude, GPT-4o, Ollama, or any OpenAI-compatible API
- **26 colored labels** — auto-created in Gmail with one click
- **Batch labeling** — up to 1,000 emails per Gmail API call
- **Privacy-first** — AI only sees sender metadata, never email content
- **Resumable** — SQLite cache means rescans are instant
- **Works without LLM** — heuristic pre-classification included

## Quick Start (Docker)

```bash
git clone https://github.com/your-username/inboxpilot.git
cd inboxpilot
cp .env.example .env.local
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET in .env.local
docker-compose up
```

Open http://localhost:3000

> First time: see [Google Cloud Setup](#google-cloud-setup) to get your credentials.

## Manual Setup

### Prerequisites

- Node.js 20+
- A Google account with Gmail

### 1. Clone and install

```bash
git clone https://github.com/your-username/inboxpilot.git
cd inboxpilot
npm install
```

### 2. Set up Google Cloud credentials

See [docs/SETUP.md](docs/SETUP.md) for step-by-step instructions.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=run-openssl-rand-base64-32
```

Generate `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000, click "Connect Gmail", sign in.

## LLM Provider Setup

InboxPilot works without an LLM (heuristic classification only). To enable AI classification:

### Anthropic Claude (Recommended)

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. In InboxPilot Settings: select "Anthropic Claude", paste your key
3. Recommended model: `claude-sonnet-4-6`

### OpenAI / GPT

1. Get an API key at [platform.openai.com](https://platform.openai.com)
2. In Settings: select "OpenAI / GPT", paste your key
3. Recommended model: `gpt-4o-mini` (fast and cheap)

### Ollama (Free, local)

1. Install [Ollama](https://ollama.ai) and run: `ollama pull llama3`
2. In Settings: select "Ollama", base URL: `http://localhost:11434`
3. No API key needed

### OpenAI-Compatible

Works with Together AI, Groq, LM Studio, and any OpenAI-compatible endpoint.
In Settings: select "OpenAI-compatible", provide base URL and API key.

## Architecture

```
User Browser
    |
    v
NextAuth v5 (Google OAuth2)
    |
    +---> /api/gmail/scan (SSE Stream)
    |         |
    |         v
    |     Gmail API
    |     (messages.list, metadata)
    |         |
    |         v
    |     SQLite Cache
    |
    +---> /api/classify (SSE Stream)
    |         |
    |         v
    |     LLM Provider
    |     (Anthropic, OpenAI, Ollama, etc.)
    |
    +---> /api/labels (SSE Stream)
            |
            v
        Gmail API
        (labels.create, batchModify)
```

## Privacy & Security

- **No email content** — the AI only sees: sender email, sender name, message count, date range, and first 5 words of subject lines. Never the email body.
- **No external storage** — scan results are cached in a local SQLite file (`data/scans.db`).
- **API keys in localStorage** — your LLM API keys are stored in your browser only. They're sent to the classification endpoint in the request body but never logged or stored server-side.
- **OAuth tokens in cookies** — Gmail access tokens are stored in encrypted NextAuth JWT cookies.
- **Self-hosted** — you run the server. No SaaS, no accounts, no subscriptions.

## Google Cloud Setup

See [docs/SETUP.md](docs/SETUP.md) for detailed instructions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — free for personal and commercial use.
