---
id: TKT-119
title: "Cross-tab sync for saved recipes via storage event"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains: []
tags:
  - feature
  - ux
  - ai-proposed
depends_on: [TKT-104]
blocks: []
related: [TKT-104]
files_touched: []
complexity: 2
next_step_hint: Answer the Stuck Reason: merge dependency TKT-104 (saved-recipes foundation) to main, then re-base and build the storage listener.
chaos_unstick_count: 1
---

### Objective
Keep the saved-recipes state consistent across multiple open tabs. Today, saving
or removing a recipe in one tab is invisible to other open tabs until they reload,
because nothing listens for `localStorage` changes from other documents.

### Context
- Introduced by TKT-104. The store lives at `src/lib/savedRecipes.ts` (key
  `freat.savedRecipes.v1`); `src/App.tsx` seeds `saved` from `loadSaved()` once on
  mount (App.tsx:18) and mutates it locally via `toggleSave`.
- The browser fires a `window` `"storage"` event in *other* tabs when a tab writes
  to `localStorage`. A small `useEffect` in `App` that re-runs `loadSaved()` on that
  event (filtered to the `freat.savedRecipes.v1` key) closes the gap.
- Keep it within the existing pattern — App owns the state; no new store/abstraction.

### Acceptance Criteria
- [ ] Saving/removing a recipe in tab A updates the Saved view + count in tab B
      without a manual reload.
- [ ] The listener filters on the `freat.savedRecipes.v1` key and is cleaned up on
      unmount; `bun run typecheck` passes with no console errors.

### Why this was spawned mid-stack

**Parent ticket:** TKT-104
**Trigger source:** validation-time
**What was discovered:** No `window` 'storage' listener, so saves in one tab don't reflect in other open tabs until reload (src/App.tsx:18 seeds once on mount).
**Ordering decision:** defer-to-backlog
**Rationale:** A polish enhancement, not required for the core save/revisit/persist behavior TKT-104 delivers.
