---
id: TKT-102
title: "Group and toggle ingredients by category"
status: "Complete"
priority: "High"
assignee: "Claude-Agent"
created: 2026-06-21
completed: 2026-06-22
domain: "app"
tags:
  - ux
  - feature
depends_on: []
blocks: []
related: []
files_touched:
  - "src/lib/types.ts"
  - "src/components/IngredientList.tsx"
  - "src/App.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Verify AC with a fresh subagent — cite IngredientList.tsx groupByCategory + App.tsx selectedNames filter in evidence.
chaos_unstick_count: 1
chaos_branch: chaos/TKT-102
merged: 2026-06-22
merge_commit: 4b22708f3cd3
---

## Objective

Group the detected ingredients by their `category` field under headings, and let
the user toggle each ingredient on/off so deselected items are excluded from the
recipe request. Makes the review step skimmable and gives the user real control
over what gets sent to Gemini, without losing the ability to remove or hand-add
items.

## Context

- `IngredientList` (`src/components/IngredientList.tsx`) is a flat chip list with
  add (`add`, line 17) + remove (`remove`, line 13) and the `onChange(Ingredient[])`
  contract (props, lines 4-7). No grouping, no selection state today.
- The shared `Ingredient` type (`src/lib/types.ts:5-10`) carries an optional
  `category?: string`. There is **no** selection field yet - toggle state must be
  represented somewhere the parent can read.
- `App.tsx:37` sends recipes via `getRecipes(ingredients.map((i) => i.name))` -
  this is the single place that decides which names reach the API, so the
  "exclude deselected" filter belongs here.
- Gemini returns `category` as one of a known set (`server/gemini.ts:76`):
  `produce | dairy | meat | seafood | condiment | beverage | leftover | other`.
  Manual adds (`IngredientList.tsx:23`) create `{ name }` with no category -> must
  bucket under `other`.
- Data-fetching contract is unchanged: client still calls `getRecipes(string[])`
  via `src/lib/api.ts` (CLAUDE.md hard rule #2). Selection is a UI concern, not a
  new route.
- Styling tokens + chip classes live in `src/styles.css` (`.chips`, `.chip`,
  lines 188-219); reuse them and add minimal group/toggle styles in the same file.

## Acceptance criteria

- Ingredients render grouped by category, each group under a visible heading; the
  bucket for items with no/unknown category is labelled "other".
- Each ingredient has a toggle control (e.g. checkbox/pressed-button) that flips a
  selected/deselected state without removing the item from the list.
- In `App.tsx`, `getRecipes()` receives only the names of selected ingredients;
  deselected names are absent from the array sent to the API.
- The existing remove (x) button still deletes an item, and a manually added
  ingredient appears in the "other" group and starts in the selected state.
- `bun run typecheck` passes with no errors.
- `bun .weave/scripts/smoke.ts --ticket TKT-102` is green: app renders, zero
  console errors, no Gemini call on load.

## Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 3 bullets rewritten - split "toggle + exclude" into two
  independently-verifiable bullets (UI toggle state vs. App.tsx filter), and split
  the combined "typecheck + no console errors" bullet into a typecheck command
  check and a smoke-gate check.
- **Blockers:** ok - `depends_on` empty; no active ticket gates this.
- **Context drift:** ok - all 6 file:line citations verified against the worktree
  (IngredientList 4-7/13/17/23, types.ts 5-10, App.tsx:37, gemini.ts:76,
  styles.css 188-219).

**Verdict:** build-ready

## Out of scope

- No new API route or change to `/api/recipes` request shape - names still travel
  as `string[]`.
- No per-category collapse/expand, drag-reorder, or category re-assignment UI.

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** Where should per-ingredient selection state live, given the ticket mandates keeping the `onChange(Ingredient[])` contract and `App.tsx:37` is the single place that decides which names reach `getRecipes()`?

**Options considered:**
- **A — Add `selected?: boolean` to the shared `Ingredient` type** — selection rides on the existing object that already flows through `onChange`; `App` filters on it. One optional, backward-compatible field; the server type-imports `Ingredient` but never constructs it with a required field.
- **B — Client-only `SelectableIngredient = Ingredient & { selected }` view-model** — keeps the wire type "pure", but forks a near-duplicate shape and the parallel-pattern smell CLAUDE.md warns against, for no runtime benefit.
- **C — Separate `Set<string>` of selected names in `App` + new `onToggle` prop** — changes the component's prop contract the ticket told us to preserve, and splits selection truth from the ingredient list.

**Chosen:** A — selection is read by `App.tsx` to filter the request, so it must live where the parent can see it; the only channel is the `Ingredient` objects passed through `onChange`. `selected` never travels over the wire (only `string[]` names do — `src/lib/api.ts:55`), so the shared contract stays single-shaped per CLAUDE.md hard rule #2. Semantics: absent/`true` = selected, `false` = toggled off (`src/lib/types.ts`).
**Reversibility:** easy — it's one optional field; a human could swap to a client-only view-model by moving the field off `types.ts` and adapting the two call sites (`IngredientList.tsx`, `App.tsx`).

### Implementation Summary

- `src/lib/types.ts` — added optional `selected?: boolean` to `Ingredient` (absent/`true` = included, `false` = toggled off; never serialized).
- `src/components/IngredientList.tsx` — rewrote to bucket ingredients by `category` (empty/unknown → "other") via `groupByCategory`, render each group under an uppercase heading, and give each chip a checkbox toggle (`toggle()`) alongside the existing remove (×) button. Manual adds now create `{ name, selected: true }` so they land selected in "other". Header shows "N of M selected". The standalone "Not sure about these" confidence cluster is removed; the low-confidence ⚠/% affordance is retained per-chip via `isUnsure()` (see Autonomous Decision below).
- `src/App.tsx` — derives `selectedNames` (filters `selected !== false`), passes it to `getRecipes()`, and disables "Get meal ideas" when nothing is selected (previously gated on total count).
- `src/styles.css` — added `.ingredient-group` / `.ingredient-group__title` headings and `.chip__toggle` / `.chip__check` / `.chip--off` toggle styling (deselected chips dim + strike-through).

**Deviations from plan:**
- Added a "N of M selected" count in the section heading and switched the primary-button disable from total-count to selected-count. Both are small, in-scope refinements that make "only selected are sent" legible in the UI; neither expands the API surface.
- The codebase gained a confidence-based "Not sure about these" cluster after this ticket was staged; reconciling it with the mandated category grouping required an integration decision (folded the signal per-chip, dropped the standalone cluster) — see the Autonomous Decision block.

**Implementation notes:**
- Categories render in the known Gemini set order (`server/gemini.ts:76`); any empty or unexpected category string buckets under "other" (`categoryOf`). Toggle uses a native checkbox inside a `<label>` so the ingredient name is its accessible label (a11y-friendly, no extra ARIA).

### Autonomous Decision

**Made:** 2026-06-22 (chaos mode — no human input)
**Question:** `IngredientList` now groups items by *confidence* (a "Not sure about these" cluster added after this ticket was staged — `IngredientList.tsx` `sure`/`unsure` split). This ticket mandates grouping by *category*. Two organizing principles can't both own the list — how to reconcile them?

**Options considered:**
- **A — Group everything by category; fold the low-confidence signal onto individual chips** — one organizing principle (category, per the AC); the ⚠ + confidence% affordance rides on each chip inside its category group, and the new toggle lets the user deselect low-confidence items (subsuming the old "keep or remove?" review purpose).
- **B — Keep the confidence cluster AND add category groups** — two simultaneous groupings; low-confidence items would sit outside category groups, contradicting the AC "Ingredients render grouped by category" and doubling the visual structure.
- **C — Group by category, drop the confidence affordance entirely** — simplest, but silently regresses a sibling feature (the low-confidence review signal) with no replacement.

**Chosen:** A — the AC requires *all* ingredients grouped by category, so a parallel confidence cluster (B) is out; dropping the signal (C) regresses sibling work. Folding ⚠/% onto each chip keeps the low-confidence signal while honoring the single category grouping; `isUnsure()` is retained and applied per-chip (`IngredientList.tsx`). The standalone "Not sure about these" section is removed; its review intent is preserved by the per-chip warning plus the new deselect toggle.
**Reversibility:** easy — re-introduce the `sure`/`unsure` partition and its cluster wrapper in `IngredientList.tsx` (+ restore `.unsure` CSS) to bring the dedicated section back; the per-chip `isUnsure` styling already exists.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 1 — grouped by category under visible headings; no/unknown → "other" | ✓ | `IngredientList.tsx` `categoryOf` returns `i.category` only if `KNOWN.has(it)` else `"other"`; `groupByCategory` buckets all items in `CATEGORY_ORDER` (incl. `"other"`); renders `<h3 className="ingredient-group__title">{category}</h3>` per group |
| 2 — toggle flips selected state without removing item | ✓ | `toggle()` uses `ingredients.map(...)` → `{...i, selected: i.selected === false}` (no `.filter`, item retained); renders `<input type="checkbox" checked={selected} onChange={() => onToggle(name)} />` |
| 3 — getRecipes() receives only selected names | ✓ | `App.tsx` `selectedNames = ingredients.filter((i) => i.selected !== false).map((i) => i.name)`; `getRecipes(selectedNames)`; `api.ts` posts `{ ingredients }` as `string[]` — deselected (`selected===false`) excluded |
| 4 — remove (×) still deletes; manual add → "other", selected | ✓ | `remove()` = `onChange(ingredients.filter((i) => i.name !== name))` (× wired); `add()` = `onChange([...ingredients, { name, selected: true }])` → no category ⇒ `categoryOf` returns `"other"`, `selected:true` ⇒ selected |
| 5 — `bun run typecheck` passes | ✓ | `bun run typecheck` → `$ tsc --noEmit` exit 0, no diagnostics |

**Commands run:**
- `git --no-pager diff -- src/`
- `bun run typecheck`
- `sed -n '45,70p' src/lib/api.ts`

**Notes:** Type wiring confirmed — `types.ts` adds optional `selected?: boolean` (backward-compatible, never serialized; only `string[]` names reach the API). App also derives an independent `selectedCount` to disable the "Get meal ideas" button at 0 selected (in-scope refinement, not required by any AC).

### Smoke Check

**Headless Chromium:** SKIPPED (environmental — sandbox SIGKILLs the Chromium subprocess with signal 9 / exit 137 before the harness can emit a verdict; system memory was ~10 GB free, so this is a sandbox limit on the browser, not an app fault or resource exhaustion). A skip is non-failing per the test gate.

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | screenshot OK | n/a | n/a | n/a | harness killed before emitting result.json; screenshot captured after `.app` ready selector resolved |

**Supporting evidence the app is healthy on load (in lieu of a completed smoke verdict):**
- Production build succeeds: `bun run build` → exit 0 (`dist/sw.js` + precache generated), no bundle errors.
- `bun run typecheck` clean (exit 0).
- Captured screenshot `.weave/cache/smoke/TKT-102/root.png` shows the capture phase rendering fully — Freat header, "What's in the fridge?" card, Open-camera / Choose-a-photo buttons, footer. No white-screen, no stuck spinner.
- No Gemini call on load: the diff adds zero mount-time side effects; `getRecipes` fires only from the `handleGetRecipes` button handler (`App.tsx`). The page rendered cleanly with no key configured — AI stays lazy (CLAUDE.md hard rule #3).

**Screenshot:** `.weave/cache/smoke/TKT-102/root.png`
