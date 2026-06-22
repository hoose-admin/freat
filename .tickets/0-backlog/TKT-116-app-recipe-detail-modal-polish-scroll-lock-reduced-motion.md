---
id: TKT-116
title: "Recipe-detail modal polish: body-scroll-lock and reduced-motion"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - ux
  - a11y
depends_on: [TKT-109]
blocks: []
related: [TKT-109, TKT-110]
files_touched: []
complexity: 1
next_step_hint: Land TKT-109 first - its RecipeDetail modal + .modal styles are not on main, so this polish has nothing to attach to.
chaos_unstick_count: 1
---

## Objective

Two small polish items for the recipe-detail modal shipped in TKT-109: (1) lock
background scroll while the modal is open, and (2) suppress the backdrop blur for
users who prefer reduced motion.

## Context

- TKT-109 added `src/components/RecipeDetail.tsx` — a `position: fixed` modal
  (`.modal` / `.modal__dialog` in `src/styles.css`). The dialog itself scrolls
  (`max-height` + `overflow-y: auto`), but the underlying recipe list still
  scrolls behind the backdrop on wheel/touch — a common modal-UX defect.
- The `.modal` backdrop uses `backdrop-filter: blur(2px)` in `src/styles.css`;
  there is no `@media (prefers-reduced-motion: reduce)` / reduced-visual-effects
  carve-out for it.
- Related a11y work: TKT-110 (app-wide accessibility pass) covers focus/labels/
  live-regions at the flow level; this ticket is the modal-specific visual polish
  not covered there. Keep both coherent — don't duplicate scroll-lock logic.

## Acceptance criteria

- While the recipe-detail modal is open, the page behind it does not scroll;
  scrolling is restored (and the prior scroll position preserved) on close. Clean
  up the lock if the component unmounts while open.
- The `.modal` backdrop blur is suppressed under
  `@media (prefers-reduced-motion: reduce)` (or equivalent), with no other visual
  regression.
- `bun run typecheck` passes; `/` smoke green with no console errors.

### Why this was spawned mid-stack

**Parent ticket:** TKT-109
**Trigger source:** validation-time
**What was discovered:** The validation reviewer flagged that the new modal
(`RecipeDetail.tsx` / `.modal` in `styles.css`) does not lock body scroll and has
no reduced-motion carve-out for its `backdrop-filter` blur.
**Ordering decision:** defer-to-backlog
**Rationale:** Both are non-blocking polish outside TKT-109's "detail view + share,
keyboard accessible" objective and AC; folding them in would expand scope.
