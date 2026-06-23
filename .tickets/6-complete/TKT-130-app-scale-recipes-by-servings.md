---
id: TKT-130
title: "Scale recipes by servings"
status: "Complete"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
completed: 2026-06-22
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: []
blocks: []
related: [TKT-106]
files_touched:
  - "src/lib/types.ts"
  - "server/gemini.ts"
  - "src/App.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Human review queue — whole-ticket validation passed; verify arch coherence vs ADR-001 then commit/merge chaos/TKT-130.
chaos_branch: chaos/TKT-130
merged: 2026-06-22
merge_commit: 69715e76d28e
---

## Objective
Let the user **scale a recipe by servings**. Add a servings stepper that re-requests
recipes (or a single recipe) with a target headcount, so Gemini rescales quantities
in `steps[]` and `missingIngredients[]` to the number of people being fed.

## Context
Servings are baked silently into the model's head ("serves 4"), but real cooking is
"I'm feeding 2" or "meal-prepping 6" — and `missingIngredients` (`src/lib/types.ts:31`)
is only useful for shopping when it reflects the actual headcount. This extends the
**existing** recipe contract rather than forking it: add `servings?: number` to
`RecipePreferences` (`src/lib/types.ts:22-25`) and weave it into `recipePrompt()`
(`server/gemini.ts:108-122`, which already conditionally builds dietary/time clauses).
A stepper renders in the recipe-card meta row (`src/components/RecipeList.tsx:18-26`).
Distinct from dietary/time preferences (TKT-106) — same contract, new field.

## Acceptance Criteria
- [ ] `RecipePreferences` (`src/lib/types.ts:22-25`) gains optional `servings?: number`. No fork of the request shape — it rides the existing `RecipesRequest.preferences` field, so `getRecipes(ingredients, preferences?)` in `src/lib/api.ts:55-61` carries it with no signature change.
- [ ] `recipePrompt()` (`server/gemini.ts:108-122`) appends a servings clause ONLY when `preferences.servings` is set, instructing Gemini to write `steps[]`/`missingIngredients[]` quantities for exactly N people; when unset the prompt is byte-identical to today (no regression in the no-servings path).
- [ ] A "Serves N" stepper (− / N / +, bounded ≥1) renders on the recipes screen and, on change, re-requests recipes through the single `getRecipes` path with `preferences.servings = N`; disabled while a request is in flight.
- [ ] The FIRST recipe fetch (the existing "Get meal ideas" click) still sends NO servings, and `server/handlers.ts` gains no new route — the stepper reuses `POST /api/recipes`. With no servings ever chosen, behavior is identical to today.
- [ ] With no Gemini key, a stepper re-fetch surfaces the standard 503 "add your key" message (no uncaught error); `bun run typecheck` exits 0 and the app loads with zero console errors (smoke stays green).

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** all 5 bullets rewritten for independent verifiability — each now names the concrete file:line or command to check. AC#1 pins "no fork" (servings rides `preferences`, `api.ts` unchanged); AC#2 pins the prompt is byte-identical when servings is unset (the no-regression guarantee); AC#3 pins the control routes through the single `getRecipes` path and is busy-guarded; AC#4 splits out the "first fetch sends no servings" + "no new route" guarantees; AC#5 splits typecheck from the no-key console-clean requirement.
- **Blockers:** none — `depends_on: []`. `related: TKT-106` (dietary/time prefs) is in `5-validating/` on its own branch and shares this same `RecipePreferences` contract; it is NOT a build blocker — both tickets extend the one contract additively (different fields), and the supervisor merges branches. This ticket builds against the contract as it exists in the worktree.
- **Context drift:** ok — all 4 citations verified against the worktree: `missingIngredients` at types.ts:31, `RecipePreferences` at types.ts:22-25, `recipePrompt` at gemini.ts:108-122, the recipe-card meta row at RecipeList.tsx:18-26.
- **Complexity:** confirmed 2 — one type field, a conditional prompt clause, a small stepper + re-fetch handler in `App.tsx`, and scoped CSS. No server route, no new data path.

**Design note (to be finalized as an `### Autonomous Decision` at build):** the ticket's plug-in hint cites the per-card meta row (`RecipeList.tsx:18-26`), but `/api/recipes` regenerates the whole list (it has no single-recipe-rescale route, and AC#4 forbids adding one). A per-card stepper that re-fetches the whole list yet claims to rescale one card is incoherent; the honest mapping of "re-request recipes for a target headcount" is a SINGLE "Serves N" control on the recipes screen that re-requests the list with `preferences.servings`. Placement resolved at build; contract unchanged either way.

**Verdict:** build-ready

### Out of Scope
- A new server route or a single-recipe "rescale just this card" endpoint (AC#4 forbids it; servings is a generation-time preference fed to `/api/recipes`).
- Cross-session persistence of the chosen headcount (no localStorage); session-only at most, and not required by any AC.
- Unit-conversion or per-ingredient quantity math on the client — quantity scaling is Gemini's job via the prompt.

### Value Hypothesis
**Lens:** Power-user
**Who benefits:** Families, batch-cookers, solo cooks scaling down.
**Why useful:** Removes the nightly mental math of rescaling a recipe and makes the
missing-ingredient list actually buyable for the real headcount.
**Plugs in at:** `types.ts:22-25` · `server/gemini.ts:108-122` · `RecipeList.tsx:18-26`.
**Score:** value h · fit h · feasibility h · novelty h


### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** Where does the "Serves N" stepper live, and does adjusting it rescale one card or the whole list? The ticket's plug-in hint cited the per-card meta row (`RecipeList.tsx:18-26`), but `/api/recipes` only generates a fresh list (ingredients -> recipes) and AC#4 forbids adding a single-recipe-rescale route.

**Options considered:**
- **A — Per-card stepper in `RecipeList.tsx:18-26`** — matches the ticket hint literally; but with no single-recipe route, a per-card +/- would have to re-request the WHOLE list, replacing every card while pretending to rescale one — incoherent UX, and it couples a pure presentational component to the fetch lifecycle.
- **B — One "Serves N" control on the recipes screen, re-requests the list** — maps "re-request recipes for a target headcount" honestly onto the existing `/api/recipes` contract (`server/handlers.ts:59`); servings is a generation-time preference fed to `recipePrompt()` exactly like dietary/time, so it rides `RecipePreferences` with zero new route or data path.

**Chosen:** B — the `/api/recipes` route returns an array generated from `recipePrompt()` (`server/gemini.ts:108-126`); there is no per-recipe rescale endpoint and AC#4 bars adding one, so a per-card control cannot rescale a single card without a regenerate-all that would replace the others. A single screen-level stepper keeps `RecipeList` presentational (state + fetch stay in `App.tsx`, mirroring the established `getRecipes` single-path convention) and treats servings as the generation-time preference it actually is. Honors ADR-001 (one `/api/*` data path) and CLAUDE.md rule 2 (one data-fetching path).
**Reversibility:** easy — the control is ~25 lines in `App.tsx`; a human who wants per-card UI would add a rescale route + a `RecipeList` prop, but the `RecipePreferences.servings` contract stays the same either way.

### Implementation Summary

- `src/lib/types.ts`: added optional `servings?: number` to `RecipePreferences` (rides the existing `RecipesRequest.preferences` field — no fork of the request shape; `getRecipes(ingredients, preferences?)` in `src/lib/api.ts` already accepts `preferences?`, so no signature change).
- `server/gemini.ts`: `recipePrompt()` now appends a `servings` clause ONLY when `prefs.servings` is set (`gemini.ts:111-114`), instructing Gemini to write `steps[]`/`missingIngredients[]` quantities for exactly N people (singular/plural aware: "person"/"people"). Falsy → `""` → the prompt string is byte-identical to before, in the same conditional style as the existing `dietary`/`time` clauses.
- `src/App.tsx`: factored the recipe fetch into one `fetchRecipes(preferences?)` helper (the single `getRecipes` path); `handleGetRecipes()` calls it with NO preferences (first fetch byte-identical to before), and a new `rescale(next)` clamps to [1,12], records the choice, and re-fetches `{ servings }`. Added a busy-guarded "Serves N" stepper (−/N/+) rendered as one screen-level control on the recipes screen (gated on `recipes.length > 0`, like ShoppingList); both buttons `disabled={busy || at-bound}`; `reset()` restores `servings` to the default (4). Retry re-runs the exact failed action (first fetch or rescale) via `lastAction`.
- `src/styles.css`: scoped `.servings` / `.stepper*` rules reusing existing tokens (`--surface-2`, `--border`, `--bg`, `--brand`); pill stepper with a focus-visible ring and tabular-nums value.

**Deviations from plan:**
- Stepper placement: rendered as ONE screen-level control on the recipes screen rather than per-card in `RecipeList.tsx:18-26` (the ticket's literal hint). Rationale in the `### Autonomous Decision` block — `/api/recipes` regenerates the whole list and AC#4 forbids a single-recipe route, so a global control is the only coherent mapping. `RecipeList` stays purely presentational.

**Implementation notes:**
- `bun run typecheck` → exit 0; `bun run build` → exit 0 (PWA precache regenerated, 10 entries).
- Hard rules honored: no `VITE_`/`GEMINI_API_KEY`/new `fetch(` in `src/` (only the pre-existing `api.ts` fetch remains); AI stays lazy — the stepper fires `getRecipes` only on a user click, never on load/mount (no `useEffect`); `server/handlers.ts` untouched (no new route).


### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| AC1 — `RecipePreferences` gains `servings?`; rides existing `preferences`; `getRecipes` signature unchanged; api.ts not in diff | ✓ | `types.ts:24-26` adds `servings?: number` inside existing `RecipePreferences`; `git diff --stat` lists only the 4 files (api.ts absent); `api.ts:55-60` `getRecipes(ingredients, preferences?)` unchanged. |
| AC2 — `recipePrompt()` appends servings clause only when set; `""` when unset (byte-identical) | ✓ | `gemini.ts:112-114` ternary yields `""` when servings falsy; line 117 interpolates `...${time}${servings}` → prompt byte-identical when unset. |
| AC3 — "Serves N" stepper (−/N/+, ≥1) re-requests via `getRecipes` w/ `preferences.servings`; both buttons busy-disabled | ✓ | `App.tsx:191-218` `role=group`; `−` `disabled={busy||servings<=1}`, `+` `disabled={busy||servings>=12}`; `rescale()` clamps [1,12] → `fetchRecipes({servings})` → `getRecipes(...,preferences)`. |
| AC4 — first fetch sends NO servings; no new route (handlers.ts not in diff); fires only on click (no useEffect trigger) | ✓ | `handleGetRecipes → fetchRecipes()` (no args) → `preferences=undefined`; handlers.ts absent from diff; `rescale` fires only from button `onClick`; only `useEffect` deps `[phase]`, focus-only. |
| AC5 — no-key stepper re-fetch → 503 friendly msg via existing catch→`messageFor`; typecheck exit 0 | ✓ | `fetchRecipes` catch → `setError(messageFor(e))`; `messageFor` maps `GEMINI_KEY_MISSING` → friendly msg (`App.tsx:258-265`); `tsc --noEmit` EXIT=0. |
| HARD-RULES — no `VITE_`/`GEMINI_API_KEY`/new `fetch(` in src/ | ✓ | `grep VITE_` → none; `grep GEMINI_API_KEY` → none; `fetch(` only pre-existing `api.ts:3` (comment), `:27`. |

**Commands run:**
- `git --no-pager diff --stat` / `git --no-pager diff`
- `grep -rn 'VITE_' / 'GEMINI_API_KEY' / 'fetch(' src/`
- `grep -n 'useEffect' src/App.tsx`
- `bun run typecheck`

**Notes:** All 5 ACs + hard rules verified against actual code; touched files exactly match ticket scope (`server/gemini.ts`, `src/App.tsx`, `src/lib/types.ts`, `src/styles.css`); `api.ts` and `handlers.ts` correctly absent from the diff. `rescale` early-returns at a bound to avoid pointless re-fetches; the stepper renders only when `recipes.length>0` and fires solely on click.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not installed in `.weave` — `bun run install:browsers` not run; browser provisioning is out of this chaos worker's scope)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | skipped: driver absent |

A skip is not a pass and never fails the ticket (per the test-ticket gate). `bun run build` exit 0 and the static trace (the stepper triggers no network on render/mount — `getRecipes` fires only on a user click, whose error path is caught) cover the load-time console-clean requirement in lieu of the runtime smoke.


### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `types.ts:26` adds `servings?` to the existing `RecipePreferences`; `api.ts:55-60` forwards `preferences`; `handlers.ts:68` passes `body.preferences` to `suggestRecipes`; `gemini.ts:112-117` injects the rescale instruction into the SAME prompt that drives `steps[]`/`missingIngredients[]`; `App.tsx rescale()` clamps [1,12], stores the choice, and re-requests the whole list via `fetchRecipes({servings})`. No drift. |
| Context constraints | ✓ | Rule 1: no `VITE_`/`GEMINI_API_KEY` in src/ (only the `e.code === "GEMINI_KEY_MISSING"` string at `App.tsx:260`). Rule 2: no `fetch(` in components/App; rescale routes through `api.ts getRecipes`; `handlers.ts` UNCHANGED (3 original routes). Rule 3: the lone `useEffect` (`App.tsx:48-54`) is focus-only, deps `[phase]`; Gemini fires only from `handleGetRecipes`/`rescale`. Rule 4: no manifest/SW/vite changes. `tsc --noEmit` clean. |
| Sprawl | ✓ | `git diff --stat` = exactly the 4 declared `files_touched` (`server/gemini.ts`, `src/App.tsx`, `src/lib/types.ts`, `src/styles.css`). Zero out-of-scope files; styles.css adds only a self-contained `.servings`/`.stepper` block. |
| Follow-up surfacing | ✓ | One known deferral (servings not persisted across reload) is explicit/intentional (`App.tsx` session-only comment; `reset()` restores default). Stepper is keyboard/SR-accessible (role=group, per-button aria-labels, aria-live value, :focus-visible), busy/bound-disabled, no-ops at a bound. |

**Architecture coherence (chaos-required):** PASS — fully coherent with ADR-001 + CLAUDE.md. Single shared types module (`servings` added to existing `RecipePreferences`, no parallel type); single `api.ts` client path (rescale → `getRecipes` → `/api/recipes`, no component fetch, no second helper); ONE `/api/recipes` contract with NO new route (`handlers.ts` byte-unchanged; the forbidden single-recipe-rescale route was not added); additive extension of the SAME pattern (the `servings` prompt fragment uses the identical `prefs?.X ? `…` : ""` shape as `dietary`/`time` and concatenates the same way), NOT a fork of TKT-106; AI stays lazy.

**Suggested new tickets:** 2 surfaced.
- Persist chosen servings across session/reload → **already filed as TKT-143** (`0-backlog`); not re-filed.
- Stepper value should reflect the displayed recipes on a failed re-fetch → **filed as TKT-159** (`0-backlog`, defer, Low).
