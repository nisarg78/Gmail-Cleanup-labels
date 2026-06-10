# InboxPilot — Dashboard UI Design

**Date:** 2026-06-10
**Scope:** Prompt 3 — StatsCards, SenderTable, LabelPreview components
**Status:** Approved

---

## Overview

Build the main post-scan dashboard UI. After `ScanProgress` completes, render three components that visualize the scan results: a stats bar, a sortable/filterable sender table, and a Gmail label preview sidebar.

---

## Architecture

**State management:** Props down from `DashboardClient`. No Zustand or Context — all three components are children of the same parent and only read data. Sort/filter/page state is local to `SenderTable`.

**New files:**
| File | Action | Purpose |
|------|--------|---------|
| `src/lib/labels.ts` | Create | 26 Gmail label definitions with colors |
| `src/app/components/StatsCards.tsx` | Create | 5-card stats bar |
| `src/app/components/SenderTable.tsx` | Create | Sortable/filterable/paginated sender table |
| `src/app/components/LabelPreview.tsx` | Create | Gmail sidebar label preview |
| `src/app/dashboard/DashboardClient.tsx` | Update | Replace placeholder with three components |

---

## Color Palette

| Token | Value |
|-------|-------|
| Background | `#0e1117` |
| Cards | `#1e293b` |
| Borders | `#334155` |
| Text | `#e2e8f0` |
| Accent green | `#22c55e` |
| Accent blue | `#4f46e5` |

---

## Derived Data

All metrics are derived from `SenderSummary[]`:

```ts
totalEmails    = senders.reduce((sum, s) => sum + s.count, 0)
uniqueSenders  = senders.length
newsletters    = senders.filter(s => s.heuristicCategory === 'newsletter').length
receipts       = senders.filter(s => s.heuristicCategory === 'receipt').length
estimatedCleanup = senders
  .filter(s => ['newsletter', 'promo', 'automated'].includes(s.heuristicCategory))
  .reduce((sum, s) => sum + s.count, 0)
```

---

## Suggested Actions (from heuristic category)

| Category | Suggested Action | Row color |
|----------|-----------------|-----------|
| newsletter | Unsubscribe | red tint |
| promo | Archive | yellow tint |
| automated | Archive | yellow tint |
| receipt | Archive | blue tint |
| security | Keep | green tint |
| unknown | Review | grey tint |

---

## Component Specs

### `src/lib/labels.ts`

Exports an array of 26 label definitions. Each entry:

```ts
export interface LabelDefinition {
  name: string       // e.g. "Finance/Receipts"
  bg: string         // Gmail hex color for background
  text: string       // Gmail hex color for text label
}
```

Full list (Gmail-valid colors):

```ts
export const LABELS: LabelDefinition[] = [
  // Finance (green) — 4 labels
  { name: "Finance", bg: "#16a765", text: "#ffffff" },
  { name: "Finance/Receipts", bg: "#16a765", text: "#ffffff" },
  { name: "Finance/Statements", bg: "#16a765", text: "#ffffff" },
  { name: "Finance/Investments", bg: "#16a765", text: "#ffffff" },
  // Shopping (orange) — 3 labels
  { name: "Shopping", bg: "#ff7537", text: "#ffffff" },
  { name: "Shopping/Orders", bg: "#ff7537", text: "#ffffff" },
  { name: "Shopping/Shipping", bg: "#ff7537", text: "#ffffff" },
  // Jobs & Career (blue) — 2 labels
  { name: "Jobs & Career", bg: "#4986e7", text: "#ffffff" },
  { name: "Jobs & Career/Recruiters", bg: "#4986e7", text: "#ffffff" },
  // Travel & Transit (teal) — 2 labels
  { name: "Travel & Transit", bg: "#2da2bb", text: "#ffffff" },
  { name: "Travel & Transit/Bookings", bg: "#2da2bb", text: "#ffffff" },
  // Accounts & Security (red) — 2 labels
  { name: "Accounts & Security", bg: "#cc3a21", text: "#ffffff" },
  { name: "Accounts & Security/Alerts", bg: "#cc3a21", text: "#ffffff" },
  // Education (yellow) — 1 label
  { name: "Education", bg: "#f2a600", text: "#ffffff" },
  // Events & Communities (purple) — 2 labels
  { name: "Events & Communities", bg: "#a479e2", text: "#ffffff" },
  { name: "Events & Communities/Meetups", bg: "#a479e2", text: "#ffffff" },
  // Newsletters (grey) — 1 label
  { name: "Newsletters", bg: "#8d8d8d", text: "#ffffff" },
  // Loyalty & Rewards (pink) — 1 label
  { name: "Loyalty & Rewards", bg: "#f691b2", text: "#000000" },
  // Food Delivery (red-orange) — 1 label
  { name: "Food Delivery", bg: "#fb4c2f", text: "#ffffff" },
  // Auctions (amber) — 1 label
  { name: "Auctions", bg: "#ffad47", text: "#000000" },
  // To Review (light yellow) — 1 label
  { name: "To Review", bg: "#fbe983", text: "#000000" },
  // Unsubscribe Candidates (salmon) — 1 label
  { name: "Unsubscribe Candidates", bg: "#e07798", text: "#ffffff" },
  // Crypto (teal-dark) — 1 label
  { name: "Crypto", bg: "#1c4587", text: "#ffffff" },
  // Government & Legal (dark red) — 1 label
  { name: "Government & Legal", bg: "#8a1c00", text: "#ffffff" },
  // Health & Medical (soft green) — 1 label
  { name: "Health & Medical", bg: "#149e60", text: "#ffffff" },
]
```

Total: 26 labels.

---

### `StatsCards.tsx`

Props: `senders: SenderSummary[]`

5 cards in a responsive grid (1 col mobile, 5 cols desktop):
- Total Emails Scanned (blue accent)
- Unique Senders (blue)
- Newsletters (grey)
- Receipts (green)
- Estimated Cleanup (red — emails that could be archived/deleted)

Each card: label (small, muted), large bold number, optional sub-label.

---

### `SenderTable.tsx`

Props: `senders: SenderSummary[]`

Local state:
```ts
sortKey: keyof SenderSummary | 'suggestedAction'
sortDir: 'asc' | 'desc'
filter: HeuristicCategory | 'all'
search: string
page: number  // 0-indexed
```

**Columns:**
1. Sender — name (bold) + email (muted)
2. Emails — count, right-aligned
3. Oldest — formatted date (e.g. "Jan 2022")
4. Newest — formatted date
5. Category — colored badge
6. Unsubscribe — ✓ or –
7. Suggested Action — colored pill

**Features:**
- Sort: click any column header; clicking again reverses direction; arrow indicator shows active sort
- Filter tabs: All | Newsletters | Receipts | Automated | Unknown (5 tabs; Promo/Security rows appear under nearest matching tab or Unknown)
- Search: debounced input, filters by `name` or `email` (case-insensitive)
- Pagination: 50 rows/page, reset to page 0 on filter/search change
- Row color: subtle left border + tinted background based on suggested action

---

### `LabelPreview.tsx`

Props: none (reads from `LABELS` in `src/lib/labels.ts`)

Renders a card styled like a Gmail label sidebar:
- Header: "Gmail Labels Preview"
- Sub-header: "These labels will be created in your Gmail account"
- Scrollable list of label pills — each with a colored dot matching the label's `bg` color, and the label name

---

### `DashboardClient.tsx` (updated)

After scan completes, replace the placeholder category breakdown with:

```tsx
<StatsCards senders={senders} />
<SenderTable senders={senders} />
<LabelPreview />
```

---

## What This Prompt Does NOT Include

- Zustand (added in Prompt 4 for settings/API key state)
- LLM classification UI (Prompt 4)
- Approval panel (Prompt 4)
- Label execution (Prompt 5)
