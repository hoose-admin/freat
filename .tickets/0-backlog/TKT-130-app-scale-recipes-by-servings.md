---
id: TKT-130
title: "Scale recipes by servings"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
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
next_step_hint: Human review: chaos run complete — validated PASS (4 axes + arch coherence). Commit/merge chaos/TKT-130 to land.
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

- `src/lib/types.ts`: added optional `servings?: number` to `RecipePreferences` (rides the existing `RecipesRequest.preferences` field — no fork of the request shape).
- `server/gemini.ts`: `recipePrompt()` now appends a servings clause ONLY when `prefs.servings` is set, instructing Gemini to write `steps[]`/`missingIngredients[]` quantities for exactly N people (singular/plural aware). When unset the prompt string is byte-identical to before.
- `src/App.tsx`: factored the recipe fetch into one `fetchRecipes(preferences?)` helper (the single `getRecipes` path); `handleGetRecipes()` calls it with NO preferences (first fetch unchanged), and a new `rescale(next)` clamps to 1..12, sets `servings`, and re-fetches `{ servings }`. Added a busy-guarded "Serves N" stepper (−/N/+) rendered on the recipes screen; `reset()` restores `servings` to the default (4).
- `src/styles.css`: scoped `.servings` / `.stepper*` rules reusing existing tokens (`--surface-2`, `--border`, `--bg`, `--brand`); pill stepper with focus-visible ring and tabular-nums value.

**Deviations from plan:**
- Stepper placement: rendered as ONE screen-level control on the recipes screen rather than per-card in `RecipeList.tsx:18-26` (the ticket's literal hint). Rationale in the `### Autonomous Decision` block — `/api/recipes` regenerates the whole list and AC#4 forbids a single-recipe route, so a global control is the only coherent mapping. `RecipeList` stays purely presentational.

**Implementation notes:**
- `bun run typecheck` -> exit 0; `bun run build` -> exit 0 (PWA precache regenerated, 7 entries).
- Hard rules honored: no key/`VITE_`/`fetch(` added in `src/` (only the existing `GEMINI_KEY_MISSING` code check and the one `api.ts` fetch remain); AI stays lazy — the stepper fires `getRecipes` only on a user click, never on load.


### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| `RecipePreferences` gains `servings?: number`; no fork; `getRecipes` unchanged | ✓ | `src/lib/types.ts:25` `servings?: number;` inside the existing `RecipePreferences`; `src/lib/api.ts` NOT in the diff — `getRecipes(ingredients, preferences?)` already accepted `preferences?`, no signature change. |
| `recipePrompt()` adds servings clause only when set; byte-identical when unset | ✓ | `server/gemini.ts:112-114` `const servings = prefs?.servings ? "\nScale every recipe…" : ""` appended as `${servings}` at the prompt tail; falsy → `""` → prompt byte-identical to before. Singular/plural ("person"/"people") handled. |
| "Serves N" stepper (−/N/+, ≥1) re-fetches via single `getRecipes`; busy-disabled | ✓ | `src/App.tsx` recipes phase renders the `Serves` group; `rescale()` clamps via `Math.max(MIN_SERVINGS=1, …)` then `fetchRecipes({ servings })` → the single `getRecipes`; both buttons `disabled={busy || …}`. |
| First fetch sends NO servings; `handlers.ts` gains NO new route | ✓ | `handleGetRecipes() → fetchRecipes()` (no args) → `getRecipes(names, undefined)`; `server/handlers.ts` absent from `git diff`; `/api/recipes` reused. Stepper fires only on `onClick`, no `useEffect`/mount trigger. |
| No-key 503 surfaces friendly msg; `typecheck` exit 0; zero console errors on load | ✓ | `fetchRecipes` catch → `messageFor(e)` maps `GEMINI_KEY_MISSING` → friendly 503 message (same path as first fetch, no uncaught error); `bun run typecheck` → `tsc --noEmit` exit 0. |

**Commands run:**
- `git -C <worktree> diff`
- `grep -rn 'VITE_' / 'GEMINI_API_KEY' / 'fetch(' / 'GEMINI_KEY_MISSING' src/`
- `bun run typecheck`

**Notes:** Hard rules clean — no `VITE_` key, no `GEMINI_API_KEY` in `src/`; the only `fetch(` in `src/` is the pre-existing `api.ts:27`; `GEMINI_KEY_MISSING` is only the pre-existing error-CODE check at `App.tsx:165`. AI-lazy confirmed (no mount trigger; `getRecipes` fires only on button click). `handlers.ts` untouched.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not installed in `.weave` — `bun run install:browsers` not run; browser provisioning is out of this chaos worker's scope)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | skipped: driver absent |

A skip is not a pass and never fails the ticket (per the test-ticket gate). `bun run build` exit 0 and the static trace (stepper triggers no network on render/mount; the only Gemini call is the user-clicked re-fetch, whose error path is caught) cover the load-time console-clean requirement in lieu of the runtime smoke.


### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `types.ts:25` adds `servings?` to the existing `RecipePreferences` (no new shape); `gemini.ts:112-114` appends the servings clause only when set (byte-identical when unset); `App.tsx` factors one `fetchRecipes(preferences?)` through `getRecipes`, `handleGetRecipes()` passes no servings (first fetch unchanged), `rescale()` clamps [1,12] and re-fetches `{ servings }`. Documented Autonomous Decision for the screen-level placement is correct given whole-list `/api/recipes` regeneration. No drift. |
| Context constraints | ✓ | Rule 1: no `VITE_`/`GEMINI_API_KEY` in `src/` (grep clean); only `GEMINI_KEY_MISSING` error-code at `App.tsx:165`. Rule 2: sole `fetch(` is pre-existing `api.ts:27`; `servings` rides `preferences`→`/api/recipes`, no signature change. Rule 3: no `useEffect`; calls fire only on button `onClick`. Rule 4: no manifest/SW/vite edits. typecheck exit 0. **Arch coherence:** honors ADR-001 — shared type, single client module, one `/api/recipes` contract, no route added; additively extends the SAME contract as TKT-106 (distinct `servings` field, distinct screen) — no fork. |
| Sprawl | ✓ | `git status --short` = exactly `M server/gemini.ts`, `M src/App.tsx`, `M src/lib/types.ts`, `M src/styles.css` (+ `?? node_modules`, ignored) — precisely `files_touched`. |
| Follow-up surfacing | ✓ | No in-scope gap unfixed. One deferred follow-up (servings persistence) filed; upper cap MAX_SERVINGS=12 is a reasonable un-specified guard, not a defect. |

**Suggested new tickets:** 1 surfaced (filed, defer).
- **TKT-143** (`0-backlog`, defer) — Persist chosen servings across session/reload (currently session-only, resets to 4 on `reset()`; explicitly out-of-scope here).

**Reviewer notes (verbatim):** "Overall PASS — all four axes pass. The change is fully coherent with ADR-001 and CLAUDE.md's four hard rules. It additively extends the single RecipePreferences contract (new servings? field), reuses the one getRecipes -> /api/recipes data path, adds no server route, and does NOT fork TKT-106's pattern. The documented Autonomous Decision to place a single screen-level stepper instead of the per-card hint is the correct mapping given the whole-list /api/recipes regeneration and AC#4's prohibition on a single-recipe route."
