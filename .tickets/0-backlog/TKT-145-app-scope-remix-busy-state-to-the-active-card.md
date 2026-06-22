---
id: TKT-145
title: "Scope remix busy-state to the active card, not all cards"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ux
  - ai-proposed
depends_on: [TKT-131]
blocks: []
related: [TKT-131]
files_touched: []
next_step_hint: Land TKT-131 (per-card remix) to main first — its remix code is absent from this base, so there's nothing to scope yet.
complexity: 1
chaos_unstick_count: 1
---

## Objective
Scope the recipe-remix busy/disabled state to the card being remixed, so a remix
on one dish no longer freezes the preset chips and free-text inputs on every other
card. Lets returning cooks queue up or explore other dishes while one regenerates.

## Context
TKT-131 added per-card remix. It uses the app-wide `busy` flag as a single
in-flight guard: `App.handleRemix` early-returns `if (busy) return` and passes
`busy` down to `RecipeList` -> every `RecipeCard` as `disabled={busy}`
(`src/components/RecipeList.tsx`, `src/App.tsx` handleRemix). The app already
tracks which card is in flight via `remixingIndex`, so the data-swap is correctly
scoped -- only the inactive *controls* are over-disabled. This was a deliberate
"concurrent remixes disabled for simplicity" call at build time, flagged in the
TKT-131 validation review as a polish follow-up.

The simplest fix keeps a single in-flight remix but disables only the active
card: pass `remixingIndex` down and disable a card only when it is the active
one, so the global `busy` (shared with analyze/recipes) still gates cross-phase
actions while siblings stay interactive. Decide whether to also allow
*concurrent* remixes (would require per-card in-flight tracking instead of a
single `remixingIndex`) or keep one-at-a-time -- one-at-a-time with
only-active-card disable is the minimal change and likely enough.

## Acceptance Criteria
- [ ] While a remix is in flight, only the active card's chips + nudge input are disabled; sibling cards' remix controls stay interactive (or, if one-at-a-time is kept, are visibly not the one "Remixing...").
- [ ] The data-swap behavior from TKT-131 is unchanged: only the remixed card's recipe is replaced.
- [ ] No new data-fetching path or error shape; reuses `src/lib/api.ts` remixRecipe.
- [ ] `bun run typecheck` passes; recipes view still boots with zero console errors when no key is set.

## Out of Scope
- Full parallel-remix support across multiple cards at once (call it out if pursued; it's a larger change than this minimal scoping fix).
