---
id: TKT-115
title: "Clear saved session when the ingredient list is emptied"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains: []
tags:
  - bug
  - ux
depends_on: []
blocks: []
related: [TKT-108]
files_touched: []
complexity: 1
next_step_hint: Land TKT-108 (in 5-validating/) onto main, then re-dispatch TKT-115 to build on its session.ts + persist effect.
chaos_unstick_count: 1
---

### Objective
After TKT-108 added last-session persistence, emptying the ingredient list does
not clear the saved session — so a reload restores a stale, previously-saved
ingredient set instead of reflecting the now-empty state. Make the persisted
session track an emptied list.

### Context
- `src/App.tsx` persist effect (added by TKT-108) only saves when
  `photo && ingredients.length > 0`. When the user removes the last ingredient via
  `IngredientList` (`src/components/IngredientList.tsx` `remove`, wired through
  `onChange={setIngredients}` in `App.tsx`), the guard goes false: the effect
  skips the save but never calls `clearSession()`, leaving the prior non-empty
  blob in `localStorage`.
- On reload, `loadSession()` (`src/lib/session.ts`) requires a non-empty
  `ingredients` array and would return that stale set, restoring ingredients the
  user had deleted.
- Discovered during TKT-108 validation (whole-ticket review); flagged non-blocking.

### Acceptance Criteria
- [ ] After analyzing then deleting every ingredient, a reload does **not** restore
      the deleted ingredients (it lands on capture, or on an empty ingredients
      phase — pick the coherent behavior and state it).
- [ ] "Start over" behavior (TKT-108) is unchanged.
- [ ] `bun run typecheck` passes; no console errors.

### Notes
- Likely a one-line change: in the persist effect, `else clearSession()` when
  `ingredients.length === 0` (and a photo exists). Confirm it doesn't fight the
  lazy restore initializer.

### Why this was spawned mid-stack

**Parent ticket:** TKT-108
**Trigger source:** validation-time
**What was discovered:** The TKT-108 persist effect guards on `ingredients.length > 0` but never `clearSession()` when the list is emptied (`src/App.tsx` effect + `src/components/IngredientList.tsx` remove), so a reload restores a stale ingredient set.
**Ordering decision:** defer-to-backlog
**Rationale:** Outside TKT-108's Objective (restore-on-reload / clear-on-start-over); a small, independent edge-case fix that need not block the parent landing in validating.

### Implementation Summary
<!-- Populated automatically by the ticket-manager skill when this ticket moves to 4-testing.
     Do not fill in manually before implementation is complete. -->
<Empty until the ticket reaches 4-testing.>
