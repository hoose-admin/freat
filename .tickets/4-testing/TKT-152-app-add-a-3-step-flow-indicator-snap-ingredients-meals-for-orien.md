---
id: TKT-152
title: "Add a 3-step flow indicator (Snap · Ingredients · Meals) for orientation"
status: "Testing"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - ux
  - ai-proposed
depends_on: []
blocks: []
related:
  - TKT-155
files_touched:
  - src/App.tsx
  - src/components/FlowSteps.tsx
  - src/styles.css
complexity: 2
next_step_hint: "Verify AC with a fresh subagent — cite src/components/FlowSteps.tsx and aria-current in evidence; run smoke."
---

## Objective
Give the user a constant "where am I" cue across the linear capture → ingredients → recipes flow.

## Context
The app is a 3-phase linear flow — `type Phase = "capture" | "ingredients" | "recipes"` (`src/App.tsx:8`) — but the header (`src/App.tsx:57-62`) is identical on every screen and there is no breadcrumb, stepper, or progress cue. A user dropped mid-flow (resumed PWA, or after an error banner cleared) has no signal of which of the three steps they're on, how many remain, or that "Edit ingredients" (`src/App.tsx:96`) navigates *backward* rather than forward. The only between-phase navigation is a row of buttons at the bottom that don't read as movement along a known track.

## Acceptance Criteria
- A lightweight, presentational step indicator (e.g. "1 Snap · 2 Ingredients · 3 Meals") renders from the existing `phase` state and highlights the current step.
- Purely visual — no new app state, no change to the flow logic.
- Decorative glyphs/separators are `aria-hidden` and the indicator does not introduce console errors with no key configured.
- `bun run typecheck` passes.

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** AC made independently verifiable — (1) indicator maps all three `phase` values to a highlighted step, (2) grep-checkable: no new `useState`/state mutation, (3) decorative number badges/separators carry `aria-hidden` (or are CSS-generated), zero console errors with no key, (4) `bun run typecheck` clean.
- **Blockers:** none — `depends_on` empty; `related: TKT-155` is non-blocking (sibling phase-driven UX, no shared contract).
- **Context drift:** ok — `src/App.tsx:8` (`type Phase`), `:57-62` (header), `:96` (Edit ingredients), `:55-105` (phase render) all still accurate in the worktree.

**Verdict:** build-ready

### UX Finding
**Heuristic:** Visibility of system status (Nielsen #1) + flexibility & efficiency of use (#7)
**Where:** `src/App.tsx:55-105` (static header at `57-62`; phases render with no step context)
**Now:** Every phase shows the same header; nothing tells the user which of the three steps they're on or how far is left.
**Proposed:** Add a 3-step indicator under the title, driven by `phase`, highlighting the current step.
**Why it helps:** Users always know where they are in the flow and that the back/forward buttons move them along a known track.
**Impact:** med · **Effort:** low


### Implementation Summary

- Added `src/components/FlowSteps.tsx` — a presentational, prop-driven indicator following the existing `components/*` pattern (PhotoCapture/IngredientList/RecipeList). It imports the shared `Phase` type from `App.tsx`, maps each phase to a step, and renders a `<nav aria-label="Progress"><ol>` with one `<li>` per step.
- Wired into `src/App.tsx`: exported the existing `type Phase` (single source of truth, no new type), imported `FlowSteps`, and rendered `<FlowSteps phase={phase} />` inside the header under the tagline. No new state, no flow-logic change — it reads the existing `phase`.
- Styled `.steps*` in `src/styles.css` using existing design tokens (`--brand`, `--border`, `--muted`, `--text`); current step gets a filled brand badge + `aria-current="step"`, completed steps a brand-outlined badge.
- Accessibility: number badges carry `aria-hidden="true"`; the `·` separators are CSS-generated (`::after`) so they never enter the a11y tree; step labels remain the accessible text; current step marked `aria-current="step"`.

**Deviations from plan:**
- None — implementation matched the plan. Exporting `type Phase` from `App.tsx` (one-word change) was needed so the new component shares the type rather than forking a parallel definition.

**Implementation notes:**
- `bun run typecheck` clean; `bun run build` succeeds with the PWA service worker + manifest regenerated intact (no precache changes to `/api`).
