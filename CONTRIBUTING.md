# Contributing to InboxPilot

Contributions are welcome! Here's how to get started.

## Development setup

```bash
git clone https://github.com/your-username/inboxpilot.git
cd inboxpilot
npm install
cp .env.example .env.local
# Fill in credentials (see docs/SETUP.md)
npm run dev
```

## Project structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── auth/           # NextAuth handlers
│   │   ├── classify/       # LLM classification SSE
│   │   └── gmail/          # Gmail scan SSE
│   ├── components/         # React components
│   ├── dashboard/          # Dashboard page
│   └── settings/           # Settings page
├── lib/
│   ├── gmail/              # Gmail API client (scanner, labeler)
│   ├── llm/                # LLM providers and classifier
│   └── batching/           # Token counter, retry logic
└── types/                  # TypeScript type augmentation
```

## Guidelines

- **TypeScript strict** — no `any` types
- **Server components by default** — client components only when state/events are needed
- **One file, one responsibility** — keep files focused
- **No email content** — the LLM must never see email bodies

## Pull requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Run `npm run build` to verify no TypeScript errors
4. Open a PR with a clear description

## Reporting issues

Open an issue at https://github.com/your-username/inboxpilot/issues
