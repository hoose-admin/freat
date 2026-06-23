---
id: TKT-157
title: "Make shopping-list selection resilient to recipe reordering"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - refactor
  - ux
depends_on: []
blocks: []
related: [TKT-105]
files_touched:
  - "src/App.tsx"
  - "src/components/RecipeList.tsx"
  - "src/components/ShoppingList.tsx"
complexity: 1
---

### Objective

Key the shopping-list recipe selection on a **stable recipe identity** instead of
the array index, so the selection can't silently mis-map if recipe ordering is
ever introduced. Today selection is correct, but it is positionally fragile —
this is future-proofing, not a current-bug fix.

### Context

- TKT-105 added recipe selection as `selected: Set<number>` keyed on the
  `recipes` array index (`src/App.tsx` `toggleSelect`, default-select-all in
  `handleGetRecipes`; `src/components/RecipeList.tsx` checkbox
  `onToggleSelect(idx)`; `src/components/ShoppingList.tsx` receives
  `recipes.filter((_, i) => selected.has(i))`).
- **Why it's correct today:** the `recipes` array is only ever *replaced
  wholesale* (a fresh `getRecipes` call), and `selected` is reset alongside it in
  `handleGetRecipes` and `reset()`. No code reorders or splices `recipes`, so an
  index never points at a different recipe than it did when toggled.
- **Why it's fragile:** if a future ticket adds recipe sorting/filtering/reordering
  in place (e.g. "sort by time"), the index->recipe mapping shifts and the
  selection would point at the wrong cards. A `Set<string>` keyed on a stable
  identity (e.g. `recipe.title`, or a derived id) removes that coupling.

### Acceptance Criteria
- [ ] Selection is keyed on a stable recipe identity rather than the array index;
      toggling, default-select-all, the `ShoppingList` filter, and `reset()` all
      use the same key.
- [ ] Behavior is unchanged for the current flow (default-select-all on arrival,
      toggle narrows, copy/share unaffected).
- [ ] `bun run typecheck` passes with zero errors.

### Out of Scope
- Persisting selection across reloads — that's TKT-112.
- Any new UI; this is an internal keying change.

### Why this was spawned mid-stack

**Parent ticket:** TKT-105
**Trigger source:** validation-time
**What was discovered:** TKT-105's `selected: Set<number>` is index-keyed; correct now (recipes is replaced wholesale and selection reset alongside) but would mis-map if recipe reordering is ever added (`src/App.tsx` `toggleSelect` / `src/components/ShoppingList.tsx` `recipes.filter((_, i) => selected.has(i))`).
**Ordering decision:** defer-to-backlog
**Rationale:** Pure future-proofing with no current defect; no remaining TKT-105 work depends on it.
