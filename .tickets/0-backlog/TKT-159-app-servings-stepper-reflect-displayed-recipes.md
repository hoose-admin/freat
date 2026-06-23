---
id: TKT-159
title: "Servings stepper value should reflect the displayed recipes on a failed re-fetch"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - ux
  - ai-proposed
depends_on: []
blocks: []
related: [TKT-130]
files_touched:
  - "src/App.tsx"
complexity: 1
next_step_hint: Pick up TKT-159 to scaffold AC for keeping the Serves N value consistent with the recipes actually on screen when a rescale fetch fails.
---

## Objective
Keep the "Serves N" stepper value consistent with the recipe list actually on
screen. Today `rescale()` calls `setServings(clamped)` **before** the re-fetch
(`src/App.tsx`), so if the rescale request fails the stepper shows the new N
while the visible recipes still reflect the previous headcount — a transient
mismatch until the user hits Retry.

## Context
- `rescale(next)` in `src/App.tsx` clamps to `[MIN_SERVINGS, MAX_SERVINGS]`, then
  `setServings(clamped)` and `fetchRecipes({ servings: clamped })`. On error,
  `fetchRecipes`'s catch sets the error banner but the recipes list is left as-is
  (the prior count), while `servings` has already advanced to the new value.
- Severity is low: the error banner's Retry re-runs the exact rescale via
  `lastAction`, so the user can recover; the mismatch is only the stepper number
  vs. the still-displayed older list.
- Surfaced during TKT-130 validation as a deferred follow-up.

## Acceptance Criteria
- [ ] After a failed rescale re-fetch, the on-screen "Serves N" value matches the
  headcount the displayed recipes were generated for (e.g. only commit `servings`
  on a successful fetch, or otherwise reconcile the value with the rendered list).
- [ ] A successful rescale still updates the value and list together; the first
  fetch and the no-servings path are unchanged.
- [ ] `bun run typecheck` exits 0; no new console errors on the recipes screen.

### Why this was spawned mid-stack

**Parent ticket:** TKT-130
**Trigger source:** validation-time
**What was discovered:** `rescale()` commits `setServings(clamped)` before the await (`src/App.tsx`), so a failed re-fetch leaves the stepper value ahead of the displayed recipes.
**Ordering decision:** defer-to-backlog
**Rationale:** low-severity UX nuance with an existing Retry recovery path; not a blocker for TKT-130.
