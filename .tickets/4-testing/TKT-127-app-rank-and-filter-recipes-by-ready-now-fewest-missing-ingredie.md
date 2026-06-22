---
id: TKT-127
title: "Rank and filter recipes by 'ready now' (fewest missing ingredients)"
status: "Testing"
priority: "High"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: []
blocks: []
related: [TKT-105]
files_touched:
  - "src/components/RecipeList.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Verify the 5 AC with a fresh subagent — cite the copy-sort comparator and the .chip--filter toggle in RecipeList.tsx.
---

## Objective
Rank and filter recipe results by how **ready-to-cook** they are: a "✅ Ready now"
badge when nothing is missing, a default sort by *fewest missing ingredients* (then
most on-hand ingredients used), and a one-tap "Zero shopping" filter chip.

## Context
The core promise is "use what's in your fridge," yet `RecipeList` renders recipes in
raw model order and only uses `missingIngredients.length` for a text line
(`src/components/RecipeList.tsx:16,30`) — never for sort or filter. Both
`usesIngredients[]` and `missingIngredients[]` already arrive in the response
(`src/lib/types.ts:30-31`), so this is pure client over data we already pay Gemini
for. Distinct from the shopping-list feature (TKT-105), which *builds a list* from
missing items; this *ranks the recipe cards themselves*.

- **No data-fetching change.** This is presentation-only inside `RecipeList`. Per
  ADR-001 and CLAUDE.md hard rule #2, the one data path (`api.ts` -> `/api/*`) and
  the shared contract (`types.ts`) are untouched.
- **Styling conventions to reuse.** Pill/badge styling is the existing `.tag`
  class (`src/styles.css:287-303`); toggle chips can reuse the `.chip` pill shape
  (`src/styles.css:196-204`). Brand green is `--brand` (`src/styles.css:8`).
- **Empty/zero states.** `RecipeList` already guards the empty-`recipes` case
  (`src/components/RecipeList.tsx:8`). The filter must also handle "chip on but
  zero ready-now recipes" without a blank screen.
- **Sort purity.** Sort a copy (`[...recipes]`) — never mutate the `recipes` prop;
  it's owned by `App`'s state (`src/App.tsx:14`).

## Acceptance Criteria
- [ ] Cards default-sort by `missingIngredients.length` asc, then `usesIngredients.length` desc (sort a copy, prop not mutated).
- [ ] A "✅ Ready now" badge renders on a card iff `missingIngredients.length === 0`.
- [ ] A "Zero shopping" filter chip toggles between showing only ready-now recipes and all recipes; an empty result while toggled shows a friendly message, not a blank screen.
- [ ] Each card shows a small "uses N of your ingredients" count where N === `usesIngredients.length`.
- [ ] No change to `src/lib/api.ts`, `src/lib/types.ts`, `server/`, or any `/api` route; `bun run typecheck` passes; smoke shows zero console errors with no API key.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 4 bullets tightened — added "sort a copy, prop not mutated", "iff" for the badge condition, an empty-while-toggled state requirement, and an explicit N===usesIngredients.length binding; folded the no-API/no-types constraint into a single verifiable bullet (typecheck + smoke).
- **Blockers:** ok — depends_on is empty. TKT-105 is related only (separate concern: it aggregates missing items into a shopping list; this ranks cards) and sits in 5-validating, not blocking.
- **Context drift:** ok — verified RecipeList.tsx:16,30, types.ts:30-31 (usesIngredients/missingIngredients), and the .tag/.chip styles still exist as cited.

**Verdict:** build-ready

### Value Hypothesis
**Lens:** Data-leverage
**Who benefits:** Anyone who wants dinner without a store run.
**Why useful:** Delivers the app's actual value — "what can I make right now?" — at a
glance instead of forcing the user to read every card.
**Plugs in at:** `src/components/RecipeList.tsx:16,30`; fields `Recipe.usesIngredients/missingIngredients` (`types.ts:30-31`).
**Score:** value h · fit h · feasibility h · novelty h

### Implementation Summary

- **Ranking (`src/components/RecipeList.tsx`):** added a `useMemo`'d `sorted` copy of `recipes` that sorts by `missingIngredients.length` asc, tie-broken by `usesIngredients.length` desc. Spreads `[...recipes]` so the `App`-owned prop is never mutated.
- **Ready-now badge:** each card computes `ready = r.missingIngredients.length === 0` and renders a `✅ Ready now` pill (`.tag.tag--ready`) at the front of `.recipe-card__meta`.
- **"Zero shopping" filter chip:** a `.recipes__head` row holds the section title plus a toggle `<button class="chip chip--filter">` with `aria-pressed`; toggling `onlyReady` narrows `visible` to ready-now recipes and back. The chip shows the live ready count `(N)` from a memoized `readyCount`.
- **Empty-while-toggled state:** when the chip is on and no recipe is ready, a friendly `.muted` message renders instead of a blank grid, telling the user to tap the chip again to see all N ideas.
- **Uses count:** each card's uses line now leads with `Uses {usesIngredients.length} of your ingredients`, then appends the ingredient list when non-empty — one line, no redundancy.
- **Styles (`src/styles.css`):** added `.tag--ready`, `.recipes__head`, `.chip--filter` (+ `:focus-visible`), and `.chip--active`, all built on the existing `--brand`/`--brand-strong`, `.tag`, and `.chip` primitives.

**Deviations from plan:**
- The "uses N" count was folded into the pre-existing `.recipe-card__uses` list line rather than added as a separate element — the current code already rendered a `Uses: <list>` line, so a second count line would duplicate it. The merged line satisfies AC #4 ("uses N of your ingredients", N === usesIngredients.length) without redundancy.

**Implementation notes:**
- No `src/lib/*`, `server/*`, or `/api` changes — purely presentational over fields already in `RecipesResponse`. `bun run typecheck` passes clean; only `src/components/RecipeList.tsx` and `src/styles.css` changed.
