---
id: TKT-155
title: "Add phase enter transition and a prefers-reduced-motion baseline"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - ux
  - ai-proposed
depends_on: []
blocks: []
related: []
files_touched: []
complexity: 2
---

## Objective
Soften the hard-cut between phases with a short, purposeful enter transition, and establish the app's missing `prefers-reduced-motion` baseline.

## Context
`phase` swaps the entire `<main>` body instantly (`src/App.tsx:71`, `:73`, `:92`). After an async wait where the button reads "Thinking…" (`src/App.tsx:86`), a full screen of recipe cards (`src/components/RecipeList.tsx:16`, all cards at once) hard-cuts into place with no visual link between the state the user acted from and the state they land in — a classic abrupt change that forces re-orientation ("did it work? is this the same page?"). The only transition anywhere in the app is on `.btn` (`src/styles.css:122`), and there is **no `@media (prefers-reduced-motion: reduce)` block anywhere in `src/styles.css`**, so any motion the app does/will have is currently unguarded.

## Acceptance Criteria
- The phase container (`PhotoCapture` / `section.stack`) plays a short (~150–200ms) opacity/translateY enter transition when the phase changes, tying the new content to the user's action.
- A global `@media (prefers-reduced-motion: reduce)` block is added to `src/styles.css` that renders content at its final state with no movement (and neutralizes the `.btn` transform/transitions too).
- No layout shift or console errors; works with no Gemini key configured.
- `bun run typecheck` passes.

### UX Finding
**Heuristic:** Motion-for-comprehension; aesthetic & minimalist design (Nielsen #8) — abrupt state change
**Where:** `src/App.tsx:64-105` (phase swaps at `71`/`73`/`92`); `src/styles.css` has no `prefers-reduced-motion` block
**Now:** Phases swap instantly; after a multi-second async wait the recipe screen hard-cuts in, with no continuity cue and no reduced-motion baseline.
**Proposed:** Add a brief phase enter transition that signals "your request produced this," gated behind a newly-added `prefers-reduced-motion` block.
**Why it helps:** Converts a disorienting hard-cut into a "this is the result of your tap" cue, while making the whole app respect reduced-motion for the first time.
**Impact:** med · **Effort:** low
