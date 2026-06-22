---
id: TKT-140
title: "Reconcile duplicate step surfaces on the recipe card (accordion vs Cook Mode vs detail view)"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - ux
  - feature
depends_on: [TKT-126, TKT-109]
blocks: []
related: [TKT-126, TKT-109]
files_touched: []
complexity: 2
next_step_hint: Answer the Stuck Reason: land TKT-126 + TKT-109 to main, then re-queue TKT-140 to reconcile RecipeList.tsx step affordances.
chaos_unstick_count: 1
---

### Objective
After both Cook Mode (TKT-126) and the recipe detail/share view (TKT-109) land, each
recipe card will expose recipe steps through up to three affordances — the original
`<details>` "Steps" accordion, the "Cook this" full-screen overlay, and the "View
recipe" detail modal. Collapse these into one coherent design so the card isn't
cluttered with redundant ways to read the same steps.

### Context
- `src/components/RecipeList.tsx` — TKT-126 (this ticket's parent) **keeps** the
  per-card `<details className="recipe-card__steps">` accordion and adds a "👨‍🍳 Cook
  this" button beside it (`RecipeList.tsx` card body).
- TKT-109 (`5-validating/TKT-109-app-recipe-detail-view-and-share.md`) **removes** that
  same `<details>` accordion and replaces it with a "View recipe" button opening a
  detail modal. The two tickets were built on separate chaos branches and edit the
  same region of `RecipeList.tsx`, so they will conflict at merge.
- The likely resolution: drop the `<details>` accordion entirely (steps live in the
  detail modal for reading and in Cook Mode for cooking), leaving the card with a
  concise preview + "View recipe" + "Cook this".

### Acceptance Criteria
- [ ] A recipe card exposes at most one "read the steps" affordance plus the "Cook this"
      action; the redundant `<details>` accordion is removed (or an explicit rationale
      is recorded for keeping it).
- [ ] No dead CSS left behind (`.recipe-card__steps` rules removed if the accordion goes).
- [ ] `bun run typecheck` passes and the `/` smoke is green with no Gemini key.

### Why this was spawned mid-stack

**Parent ticket:** TKT-126
**Trigger source:** validation-time
**What was discovered:** TKT-126 leaves the `<details>` "Steps" accordion in place while adding "Cook this", and sibling TKT-109 separately removes that accordion for a detail modal — the card ends up with redundant/conflicting step affordances once both merge (`RecipeList.tsx` card body).
**Ordering decision:** defer-to-backlog
**Rationale:** Can only be done coherently once both TKT-126 and TKT-109 are merged to a common branch; not a blocker for either.
