# InboxPilot — Next.js Scaffold Design

**Date:** 2026-06-10  
**Scope:** Step 1 of InboxPilot — project scaffold with auth, routing, and protected pages  
**Status:** Approved

---

## Overview

Scaffold a Next.js 15 (App Router, TypeScript strict) project for InboxPilot, an AI-powered Gmail cleanup tool. This step establishes auth (Google OAuth2 via NextAuth v5), route protection, a landing page, and a minimal dashboard. No Gmail API calls or LLM integration in this step.

The existing Python CLI (`main.py`, `config.py`, etc.) is moved to a `cli/` subdirectory and preserved.

---

## Directory Structure

```
Gmail_cleanup/
├── cli/                          ← moved Python CLI files
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── prompt.md
│   └── README.md
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            ← root layout (SessionProvider, Inter font)
│   │   ├── page.tsx              ← landing page (/)
│   │   ├── dashboard/
│   │   │   └── page.tsx          ← protected dashboard
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts  ← NextAuth GET/POST handlers
│   ├── auth.ts                   ← NextAuth config (auth(), signIn(), signOut())
│   ├── types/
│   │   └── next-auth.d.ts        ← Session + JWT type augmentation
│   └── middleware.ts             ← protects /dashboard + /api/gmail/*
│
├── .env.example
├── .env.local                    ← gitignored
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── package.json
```

---

## Auth Configuration

**Provider:** Google OAuth2 via NextAuth v5  
**Strategy:** JWT (stateless, cookie-based — no DB adapter for auth)  
**Scopes requested:**
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.labels`
- `https://www.googleapis.com/auth/gmail.modify`

**Token persistence:**  
The `jwt` callback captures `access_token` and `refresh_token` from the Google account object on first sign-in and writes them into the encrypted JWT. The `session` callback exposes them as `session.accessToken` and `session.refreshToken`.

**Type safety:**  
`src/types/next-auth.d.ts` augments `Session` and `JWT` with `accessToken: string` and `refreshToken: string` — no `any` casts anywhere.

**Environment variables (`.env.example`):**
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=        ← NextAuth v5 primary secret (replaces NEXTAUTH_SECRET from v4)
```

---

## Pages

### Landing page (`/`)
- Server component
- Redirects to `/dashboard` if session exists
- Renders centered hero: app name, one-line description, "Connect Gmail" button
- "Connect Gmail" is a `'use client'` component calling `signIn('google')`
- Only the button carries a client boundary — page itself stays server-rendered

### Dashboard (`/dashboard`)
- Server component
- Session guaranteed by middleware — no redirect logic needed
- Displays: user avatar (`session.user.image`), user email (`session.user.email`)
- "Sign out" button: small `'use client'` component calling `signOut()`
- Intentionally minimal — scan/label UI added in later steps

### Root layout (`src/app/layout.tsx`)
- Wraps app in `SessionProvider` (required for `next-auth/react` client hooks)
- Applies Tailwind base styles
- Font: Inter via `next/font/google`

---

## Middleware

`src/middleware.ts` uses NextAuth v5's `auth` export as the middleware function.

**Protected routes:**
- `/dashboard` and all sub-paths
- `/api/gmail/*` (reserved for future Gmail API routes)

**Unauthenticated behavior:** redirect to `/`

**Excluded from middleware (always pass through):**
- `/api/auth/*` (NextAuth's own routes)
- `/_next/*` (static assets)
- `/favicon.ico`

```ts
export const config = {
  matcher: ['/dashboard/:path*', '/api/gmail/:path*'],
}
```

---

## Tech Stack (this step)

| Package | Version | Purpose |
|---|---|---|
| next | 15.x | App Router, server components |
| react / react-dom | 19.x | UI runtime |
| next-auth | 5.x (beta) | Google OAuth2, JWT sessions |
| typescript | 5.x | Strict mode |
| tailwindcss | 4.x | Styling |
| @auth/core | latest | NextAuth v5 peer dep |

---

## What This Step Does NOT Include

- Gmail API calls (`googleapis` package)
- LLM integration (Anthropic/OpenAI/Ollama)
- SQLite / better-sqlite3
- Zustand
- Any scan or labeling UI

These are added in subsequent steps per CLAUDE.md architecture.
