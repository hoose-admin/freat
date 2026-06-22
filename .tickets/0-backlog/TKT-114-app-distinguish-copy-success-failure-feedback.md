---
id: TKT-114
title: "Distinguish copy success vs failure feedback styling"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - ux
depends_on: [TKT-105]
blocks: []
related: [TKT-105, TKT-103]
files_touched: []
complexity: 1
next_step_hint: Land TKT-105 (shopping list) on main first; TKT-114 styles ShoppingList.tsx, which exists only on the unmerged chaos/TKT-105 branch.
chaos_unstick_count: 1
---

### Objective

In the TKT-105 shopping list, both the success ("Copied to clipboard ✓") and the
failure ("Couldn't copy automatically…") messages render in the same muted color,
so the copy-fallback failure reads like a success. Give the two states a visual
distinction (color/icon).

### Context

- The status line is `<p className="shopping__status" role="status" aria-live="polite">`
  in `src/components/ShoppingList.tsx`; `.shopping__status` is `color: var(--muted)`
  in `src/styles.css`.
- The component already knows which state it's in (`COPIED` vs `COPY_FAILED`
  constants); thread a success/error modifier class through.
- Related to **TKT-103** ("Polished loading, empty, and error states") — match
  whatever success/error treatment that ticket establishes (e.g. the `--brand`
  vs `--danger` tokens) rather than a one-off color.

### Acceptance Criteria
- [ ] Copy success and copy failure are visually distinguishable (e.g. brand
      green vs danger red, or distinct icons).
- [ ] The `role="status"` live-region semantics are preserved.
- [ ] typecheck passes; smoke green.

### Why this was spawned mid-stack

**Parent ticket:** TKT-105
**Trigger source:** validation-time
**What was discovered:** `COPIED` and `COPY_FAILED` both render in `.shopping__status` `var(--muted)`, so the failure message looks like a success (`src/components/ShoppingList.tsx`, `src/styles.css`).
**Ordering decision:** defer-to-backlog
**Rationale:** Minor visual polish; the fallback path is rare (clipboard unavailable) and the ✓ already cues success.
