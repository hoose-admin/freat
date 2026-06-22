---
id: TKT-113
title: "Remove individual items from the shopping list"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ux
depends_on: [TKT-105]
blocks: []
related: [TKT-105]
files_touched: []
complexity: 2
next_step_hint: Land TKT-105 to main, then re-fork TKT-113 so it can extend the real src/components/ShoppingList.tsx chips.
chaos_unstick_count: 1
---

### Objective

The TKT-105 shopping list is built purely by toggling whole recipes in/out; there
is no way to drop a single ingredient the user already has (e.g. they keep the
recipe but already own "olive oil"). Add per-item removal from the aggregated
list.

### Context

- The aggregated list renders in `src/components/ShoppingList.tsx` as
  `chip chip--plain` items with no remove affordance (unlike `IngredientList`'s
  chips, which have a `chip__remove` button — `src/components/IngredientList.tsx:42-49`).
- Removal needs a small piece of state (the set of removed item keys) so a removed
  item doesn't reappear when an unrelated recipe is toggled; reuse the existing
  `.chip__remove` styling rather than inventing a new control.

### Acceptance Criteria
- [ ] Each shopping-list item has a remove control that drops it from the list.
- [ ] A removed item stays removed when other recipes are toggled, and the
      removal set resets on "New photo"/reset.
- [ ] typecheck passes; smoke green.

### Why this was spawned mid-stack

**Parent ticket:** TKT-105
**Trigger source:** validation-time
**What was discovered:** Shopping-list chips are `chip--plain` with no remove affordance; users can only toggle whole recipes, not individual items (`src/components/ShoppingList.tsx`).
**Ordering decision:** defer-to-backlog
**Rationale:** Additive enhancement to a complete feature; not required for the copy/share core to be useful.

