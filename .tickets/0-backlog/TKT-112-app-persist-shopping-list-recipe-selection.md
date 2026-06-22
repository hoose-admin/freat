---
id: TKT-112
title: "Persist shopping-list recipe selection across reload"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ux
depends_on: [TKT-105, TKT-108]
blocks: []
related: [TKT-105, TKT-108]
files_touched: []
complexity: 2
next_step_hint: Land TKT-105 + TKT-108 to main, then re-fork TKT-112 so it can extend the real selection state + src/lib/session.ts.
chaos_unstick_count: 1
---

### Objective

The shopping-list recipe selection added in TKT-105 lives only in React state and
is keyed by array index, so it is lost on reload/reset and would mis-map if recipe
order ever changed. Persist the selection (and harden the key) so a user who
refreshes mid-shop doesn't lose their list.

### Context

- Selection state is `const [selected, setSelected] = useState<Set<number>>(new Set())`
  in `src/App.tsx` — an index-based set, defaulted to all recipes in
  `handleGetRecipes` and cleared in `reset()`.
- `ShoppingList` (`src/components/ShoppingList.tsx`) derives the list from
  `recipes.filter((_, i) => selected.has(i))`, so a changed recipe order would
  silently re-point the selection.
- Strongly related to **TKT-108** ("Persist last session photo and ingredients") —
  this should reuse whatever local-storage persistence approach TKT-108
  establishes rather than inventing a parallel one. Per ADR-001 keep it
  client-only (no server).

### Acceptance Criteria
- [ ] Recipe selection survives a page reload within the same session.
- [ ] Selection is keyed by stable recipe identity (e.g. title), not raw array
      index, so reordering recipes can't mis-map the list.
- [ ] typecheck passes; smoke green.

### Why this was spawned mid-stack

**Parent ticket:** TKT-105
**Trigger source:** validation-time
**What was discovered:** Selection is an in-memory index-based `Set<number>` (`src/App.tsx`), lost on reload and fragile to recipe reordering.
**Ordering decision:** defer-to-backlog
**Rationale:** Robustness/persistence polish, not a blocker for the shipped feature; best done alongside the TKT-108 persistence work it should share.

