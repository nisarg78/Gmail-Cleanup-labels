# InboxPilot Next.js Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the InboxPilot Next.js 15 app with Google OAuth2 (NextAuth v5 JWT sessions storing Gmail tokens), route protection via middleware, a landing page, and a protected dashboard.

**Architecture:** `create-next-app` bootstraps the project; NextAuth v5 is layered on top. A single `src/auth.ts` is the source of truth — it exports `auth`, `signIn`, `signOut`, and `handlers`. The API route re-exports `handlers`. Middleware uses `auth` directly. JWT callbacks capture `access_token`/`refresh_token` from Google on first sign-in and persist them in the encrypted cookie. No database adapter is needed for auth.

**Tech Stack:** Next.js 15 (App Router), NextAuth v5, TypeScript strict, Tailwind CSS v4, Google OAuth2

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `cli/` | Create dir + move | Archive Python CLI files |
| `src/auth.ts` | Create | NextAuth config — exports `auth`, `signIn`, `signOut`, `handlers` |
| `src/types/next-auth.d.ts` | Create | Augments `Session` + `JWT` with `accessToken`/`refreshToken` |
| `src/app/api/auth/[...nextauth]/route.ts` | Create | Re-exports `GET`/`POST` from `handlers` |
| `src/middleware.ts` | Create | Redirects unauthenticated requests to `/` |
| `src/app/layout.tsx` | Replace | Root layout: `SessionProvider` + Inter font |
| `src/app/page.tsx` | Replace | Landing page: redirects if authed, else renders hero + button |
| `src/app/components/SignInButton.tsx` | Create | `'use client'` — calls `signIn('google')` |
| `src/app/dashboard/page.tsx` | Create | Protected dashboard: avatar + email + sign out |
| `src/app/components/SignOutButton.tsx` | Create | `'use client'` — calls `signOut()` |
| `.env.example` | Replace | Documents required env vars |
| `.env.local` | Create | Gitignored; user fills in real values |

---

### Task 1: Archive Python CLI files

**Files:**
- Create: `cli/`
- Move: `main.py`, `config.py`, `requirements.txt`, `prompt.md`, `README.md` → `cli/`

- [ ] **Step 1: Create `cli/` directory and move files**

```bash
mkdir cli
mv main.py config.py requirements.txt prompt.md README.md cli/
```

- [ ] **Step 2: Verify**

```bash
ls cli/
```

Expected output: `config.py  main.py  prompt.md  README.md  requirements.txt`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move Python CLI to cli/ subdirectory"
```

---

### Task 2: Scaffold Next.js project

**Files:**
- Creates: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`, `.eslintrc.json`

- [ ] **Step 1: Run `create-next-app` in current directory**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

When prompted **"The directory . contains files that could conflict"** — type `y` and Enter.
When prompted about Turbopack — choose **Yes**.
Accept all other defaults.

- [ ] **Step 2: Check Tailwind version**

```bash
npx tailwindcss --version
```

Expected: `4.x.x`. Tailwind v4 uses CSS-based configuration — `globals.css` will start with `@import "tailwindcss"` and `postcss.config.mjs` will reference `@tailwindcss/postcss`. There is no `tailwind.config.ts` in v4 (theme customization uses `@theme {}` blocks in CSS instead).

If the output is `3.x.x`, upgrade to v4:

```bash
npm install tailwindcss@latest @tailwindcss/postcss@latest
npm uninstall autoprefixer
```

Then replace the contents of `postcss.config.mjs` with:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

And replace the contents of `src/app/globals.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Open http://localhost:3000 — default Next.js page should load without errors. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 with TypeScript and Tailwind v4"
```

---

### Task 3: Install NextAuth v5

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install next-auth**

```bash
npm install next-auth@5
```

- [ ] **Step 2: Verify version**

```bash
node -e "const v = require('./node_modules/next-auth/package.json').version; console.log(v)"
```

Expected: prints `5.x.x`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install next-auth v5"
```

---

### Task 4: Create environment files

**Files:**
- Replace: `.env.example`
- Create: `.env.local`

- [ ] **Step 1: Write `.env.example`**

Create/replace `.env.example` with this exact content:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=
```

- [ ] **Step 2: Create `.env.local`**

Create `.env.local` with placeholder values (user fills in real values before running OAuth):

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=generate-with-openssl-rand-base64-32
```

To generate `AUTH_SECRET`: `openssl rand -base64 32`

- [ ] **Step 3: Ensure `.env.local` is gitignored**

Open `.gitignore` (created by `create-next-app`) and confirm it contains:

```
.env.local
```

If missing, add it.

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "feat: add environment variable template"
```

---

### Task 5: Add NextAuth type augmentation

**Files:**
- Create: `src/types/next-auth.d.ts`

This must be created **before** `src/auth.ts` to avoid TypeScript errors when assigning `accessToken`/`refreshToken` to the session.

- [ ] **Step 1: Create the types file**

```bash
mkdir -p src/types
```

Write `src/types/next-auth.d.ts`:

```ts
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken: string
    refreshToken: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors related to `next-auth` types. (Other errors about missing files are expected at this stage.)

- [ ] **Step 3: Commit**

```bash
git add src/types/next-auth.d.ts
git commit -m "feat: add NextAuth Session and JWT type augmentation"
```

---

### Task 6: Create NextAuth config

**Files:**
- Create: `src/auth.ts`

- [ ] **Step 1: Write `src/auth.ts`**

```ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.labels",
            "https://www.googleapis.com/auth/gmail.modify",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken ?? ""
      session.refreshToken = token.refreshToken ?? ""
      return session
    },
  },
})
```

> `access_type: "offline"` and `prompt: "consent"` are required for Google to return a `refresh_token`. Without them, Google only returns an `access_token` on first sign-in.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/auth.ts
git commit -m "feat: add NextAuth config with Google OAuth2 and Gmail scopes"
```

---

### Task 7: Create auth API route

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create the route file**

```bash
mkdir -p "src/app/api/auth/[...nextauth]"
```

Write `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/auth/[...nextauth]/route.ts"
git commit -m "feat: add NextAuth API route"
```

---

### Task 8: Create middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write `src/middleware.ts`**

```ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/", req.url))
  }
})

export const config = {
  matcher: ["/dashboard/:path*", "/api/gmail/:path*"],
}
```

The `matcher` array only covers `/dashboard/*` and `/api/gmail/*`. NextAuth's own `/api/auth/*` routes, `/_next/*` static assets, and `/favicon.ico` are implicitly excluded because they don't match these patterns.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: protect /dashboard and /api/gmail/* with NextAuth middleware"
```

---

### Task 9: Replace root layout

**Files:**
- Replace: `src/app/layout.tsx`

- [ ] **Step 1: Write `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "InboxPilot",
  description: "AI-powered Gmail cleanup",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add root layout with SessionProvider and Inter font"
```

---

### Task 10: Create SignInButton client component

**Files:**
- Create: `src/app/components/SignInButton.tsx`

- [ ] **Step 1: Create directory and component**

```bash
mkdir -p src/app/components
```

Write `src/app/components/SignInButton.tsx`:

```tsx
"use client"

import { signIn } from "next-auth/react"

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
    >
      Connect Gmail
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SignInButton.tsx
git commit -m "feat: add SignInButton client component"
```

---

### Task 11: Replace landing page

**Files:**
- Replace: `src/app/page.tsx`

- [ ] **Step 1: Write `src/app/page.tsx`**

```tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import SignInButton from "./components/SignInButton"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold tracking-tight">InboxPilot</h1>
      <p className="text-lg text-gray-500">AI-powered Gmail cleanup</p>
      <SignInButton />
    </main>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add landing page with Connect Gmail button"
```

---

### Task 12: Create SignOutButton client component

**Files:**
- Create: `src/app/components/SignOutButton.tsx`

- [ ] **Step 1: Write `src/app/components/SignOutButton.tsx`**

```tsx
"use client"

import { signOut } from "next-auth/react"

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
    >
      Sign out
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/SignOutButton.tsx
git commit -m "feat: add SignOutButton client component"
```

---

### Task 13: Create dashboard page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Configure `next.config.ts` for Google profile images**

`next/image` blocks external domains by default. Google profile pictures are served from `lh3.googleusercontent.com`. Add a `remotePatterns` entry to `next.config.ts`:

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 2: Create directory and page**

```bash
mkdir -p src/app/dashboard
```

Write `src/app/dashboard/page.tsx`:

```tsx
import { auth } from "@/auth"
import Image from "next/image"
import SignOutButton from "../components/SignOutButton"

export default async function Dashboard() {
  const session = await auth()

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt="User avatar"
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{session?.user?.name}</p>
            <p className="text-sm text-gray-500">{session?.user?.email}</p>
          </div>
          <SignOutButton />
        </div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-500">
          Gmail scanning and labeling coming in the next step.
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts src/app/dashboard/
git commit -m "feat: add protected dashboard page and configure Google image domain"
```

---

### Task 14: Final smoke test

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: build completes successfully. Warnings about missing `GOOGLE_CLIENT_ID` or `AUTH_SECRET` env vars are expected if `.env.local` has placeholder values — these are runtime values, not build-time.

- [ ] **Step 3: Dev server — verify landing page**

```bash
npm run dev
```

Open http://localhost:3000. Expected: "InboxPilot" heading, "AI-powered Gmail cleanup" subtext, and a blue "Connect Gmail" button are visible. No console errors.

Stop with Ctrl+C.

- [ ] **Step 4: OAuth flow (requires real Google Cloud credentials)**

If `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `AUTH_SECRET` are set in `.env.local` with real values:

1. Navigate to http://localhost:3000 — landing page shown
2. Click "Connect Gmail" — redirected to Google OAuth consent screen requesting the three Gmail scopes
3. Sign in and approve — redirected to `/dashboard`
4. Dashboard shows your avatar, name, and email address
5. Click "Sign out" — redirected back to `/`
6. Navigating directly to http://localhost:3000/dashboard — redirected to `/` (middleware working)

If credentials are not yet configured, skip this step and verify once Google Cloud project is set up.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Next.js scaffold with NextAuth v5 Google OAuth2"
```
