---
id: TKT-105
title: "Shopping list from missing ingredients"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ux
depends_on: []
blocks: []
related: [TKT-104, TKT-109]
files_touched:
  - "src/App.tsx"
  - "src/components/RecipeList.tsx"
  - "src/components/ShoppingList.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Human review: shopping-list feature validated (all 5 axes pass); approve to land the chaos/TKT-105 branch.
---

### Objective

Let the user turn the recipes they're interested in into one **de-duplicated
shopping list** of the ingredients they don't already have, and get that list
off their phone in one tap — copy to clipboard, or native **Web Share** where
the browser supports it (with a copy fallback). The recipes already carry a
`missingIngredients: string[]` field (`src/lib/types.ts:31`) that today is only
shown per-card (`src/components/RecipeList.tsx:30-34`); this ticket aggregates it
across the recipes the user chooses so "what do I need to buy?" is answered in
the app instead of by hand.

### Context

- **Data already exists — no API/contract change.** `Recipe.missingIngredients`
  is part of the `RecipesResponse` returned by `POST /api/recipes`
  (`src/lib/types.ts:27-44`). The shopping list is a pure **client-side
  aggregation** over recipe data already in `App`'s `recipes` state
  (`src/App.tsx:14`). Per ADR-001, AI calls only happen on user action and only
  via `/api/*`; this feature adds **no** Gemini call and **no** server route, so
  it stays inside the contract by not touching it.
- **Recipe selection does not exist yet.** `RecipeList`
  (`src/components/RecipeList.tsx`) renders every recipe read-only; there is no
  way to mark a recipe as "interested". This ticket must add a per-recipe
  **select toggle** and lift the selection into `App` (the flow's single state
  owner — `phase`/`recipes` at `src/App.tsx:11-14`), mirroring how
  `IngredientList` lifts edits via an `onChange` prop
  (`src/components/IngredientList.tsx:4-7`). Default-select all recipes on
  arrival so the list is useful with zero extra taps; the toggle narrows it.
- **Phase flow.** `App` is a 3-phase state machine — `capture | ingredients |
  recipes` (`src/App.tsx:8`). The shopping list is reached **from the recipes
  phase**; whether it is a 4th phase or an inline section is a UX-integration
  call resolved at build time (see the `### Autonomous Decision` block below).
- **De-dup + display conventions.** Ingredient text is normalized to trimmed
  lowercase elsewhere (`src/components/IngredientList.tsx:19-24`) and displayed
  via CSS `text-transform: capitalize` (`src/styles.css:205-207`,
  `.chip__label`). Reuse that: dedupe case-insensitively on trimmed-lowercase,
  render with the existing `chip`/`chips` styles so the list looks native.
- **Clipboard + Share are standard web APIs.** Use `navigator.clipboard.writeText`
  for copy and `navigator.share` (feature-detected) for share, falling back to
  copy when `navigator.share` is absent (desktop). Both must degrade without a
  console error so the smoke gate (`weave.config.json` -> headless `/`) stays
  green; the app renders with no key configured and these APIs are only invoked
  on a user click, never on load (honors ADR-001's "lazy / zero-console-error"
  rule).
- **Parallel-work heads-up:** TKT-103 (in `5-validating/`, unmerged) also edits
  `src/App.tsx`, `src/components/RecipeList.tsx`, and `src/styles.css`. Keep this
  change additive and minimal to ease the eventual merge; do not refactor those
  files beyond what the feature needs.

### Acceptance Criteria
- [ ] From the recipes phase the user can reach a shopping-list view that
      aggregates `missingIngredients` across the recipes they've chosen, and the
      list is **de-duplicated case-insensitively** (e.g. "Olive oil" and "olive
      oil" collapse to one entry). Verifiable in `src/components/` + by reading
      the aggregation function.
- [ ] Each recipe can be toggled in/out of the shopping list; toggling updates
      the aggregated list, and the empty case (no recipes selected) shows a
      friendly message instead of an empty box or a console error.
- [ ] A **Copy** action writes the newline-joined list to the clipboard via
      `navigator.clipboard.writeText` and gives visible confirmation ("Copied").
- [ ] A **Share** action calls `navigator.share` when available and **falls back
      to copy** when it is not (feature-detected, no thrown error on desktop).
- [ ] `bun run typecheck` passes with zero errors.
- [ ] Smoke is green: `bun .weave/scripts/smoke.ts --ticket TKT-105` boots `/`
      with no console errors / uncaught exceptions / stuck spinner.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 2 bullets sharpened — de-dup bullet now names the
  case-insensitive collapse with a concrete example; copy/share split into two
  independently-verifiable bullets (clipboard write + confirmation; share with
  feature-detected fallback). typecheck + smoke promoted to their own explicit,
  command-backed bullets.
- **Blockers:** ok — `depends_on: []`; `related` TKT-104/TKT-109 are weak refs,
  not ordering edges. No prerequisite work needed; the `missingIngredients` data
  this builds on already ships in `src/lib/types.ts:31`.
- **Context drift:** ok — all 9 `file:line` citations re-verified against the
  worktree (types.ts:31 / 27-44, RecipeList.tsx:30-34, App.tsx:8/11-14/14,
  IngredientList.tsx:4-7/19-24, styles.css:205-207). All resolve.
- **Complexity:** confirmed **2** — one new component + lifted selection state +
  a toggle + CSS + two tiny clipboard/share helpers; no API/server/contract
  change. Not a 3 (no cross-layer coupling), not a 1 (more than a trivial edit).

**Verdict:** build-ready

### Out of Scope
- Persisting the shopping list across reloads (that's the storage concern of
  TKT-104/TKT-108) — selection + list live in React state for this ticket.
- Quantities / units / aisle grouping — the list is ingredient names only.
- Any server route or Gemini call — this is pure client aggregation.

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** How should recipe selection + the shopping-list view integrate into the existing 3-phase flow (`capture | ingredients | recipes`) — a new 4th phase, an always-visible inline section, or a collapsed disclosure panel?

**Options considered:**
- **A — 4th `shopping` phase** — a senior FE engineer argued it extends the proven phase machine with zero new primitives and gives the shopping task a focused, thumb-friendly single-purpose screen; downside is extra nav wiring and the biggest rewrite of `App`'s render tree.
- **B — Inline section in the `recipes` phase** — argued it adds one derived list + one prop, no nav graph, live direct-manipulation feedback (toggle a card → list updates in view), and the smallest/cleanest diff to merge against the concurrent unmerged TKT-103; downside is a longer recipes screen.
- **C — Collapsed `<details>` disclosure panel** — argued it reuses RecipeList's existing `<details>` steps pattern with zero interaction JS and a clean default screen; downside is collapse-by-default hurts discovery of a brand-new affordance.

**Chosen:** B — inline `ShoppingList` rendered as its own bordered card below the recipe grid (`src/App.tsx` recipes phase; `src/components/ShoppingList.tsx`). It is the leanest integration that still gives live feedback (Nielsen's visibility-of-system-status: toggling a recipe updates the list in the same viewport), and the smallest diff to three-way-merge against TKT-103 which is concurrently editing `App.tsx`/`RecipeList.tsx`/`styles.css` on an unmerged branch. Option A's strongest point (a focused in-app view) is undercut by the feature itself — copy/Web-Share export the list *out* of the app, so a dedicated screen adds nav cost for little gain. Grafted C's "clean separation" by keeping the section visually distinct (own card surface) without C's discovery-killing collapse.
**Reversibility:** easy — promoting the inline `<ShoppingList>` to a 4th phase later is additive (add `"shopping"` to the `Phase` union + a nav button); the component and its `recipes` prop are unchanged either way.

### Implementation Summary

- Added `src/components/ShoppingList.tsx` — a new presentational component taking
  the user's selected `Recipe[]`. Its exported `aggregateMissing()` helper
  collapses every recipe's `missingIngredients` into one list: trimmed,
  de-duplicated **case-insensitively** (lowercased key, first-seen spelling
  wins), sorted via `localeCompare`. Renders the list as `chip chip--plain`
  items, a **Copy** and **Share** button, and a `role="status"` live region.
- Copy uses `navigator.clipboard.writeText` guarded by a feature check
  (`navigator.clipboard?.writeText`) inside try/catch, returning a boolean so the
  UI shows "Copied to clipboard ✓" or a manual-copy fallback message — never a
  thrown/console error. Share feature-detects `typeof navigator.share === "function"`,
  calls it, treats an `AbortError` (user dismissed the sheet) as a no-op, and
  **falls back to copy** when share is absent or fails.
- `src/components/RecipeList.tsx` — added `selected: Set<number>` +
  `onToggleSelect(index)` props and a per-card checkbox ("Add to shopping list"),
  mirroring the lift-state-up pattern from `IngredientList`. Selected cards get a
  `recipe-card--selected` brand border.
- `src/App.tsx` — added `selected: Set<number>` state, defaulted to all recipes
  in `handleGetRecipes`, a `toggleSelect()` updater, cleared in `reset()`, and
  rendered `<ShoppingList recipes={recipes.filter((_, i) => selected.has(i))} />`
  below `<RecipeList>` in the recipes phase.
- `src/styles.css` — extended the card-surface rule to `.shopping`, added
  `.recipe-card--selected`, `.recipe-card__select` (+ checkbox), `.chip--plain`,
  and `.shopping__status` (with `min-height` to avoid layout shift on feedback).

**Deviations from plan:**
- None on scope — implementation matched the plan. The one open question the plan
  deferred (4th phase vs inline) was resolved to **inline** via the Autonomous
  Decision block above.

**Implementation notes:**
- No changes to `src/lib/types.ts`, `src/lib/api.ts`, or anything under `server/`
  — the feature is pure client aggregation over data already in `App` state, so
  the API contract and ADR-001's server-side-only-Gemini boundary are untouched.
- `bun run typecheck` → exit 0; `bun run build` succeeds and regenerates the PWA
  service worker (precache unchanged at 7 entries).

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader — did not write the code)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 1. Reachable view aggregating missingIngredients, deduped case-insensitively | ✓ | `ShoppingList.tsx:15-26` `aggregateMissing`: Map keyed by `name.toLowerCase()`, `if (!seen.has(key)) seen.set(key, name)` (first spelling wins) → "Olive oil"/"olive oil" collapse. `App.tsx` wires `<ShoppingList recipes={recipes.filter((_, i) => selected.has(i))} />`; reachable only in `phase === "recipes"`. |
| 2. Per-recipe toggle updates list; empty case friendly, no console error | ✓ | `RecipeList.tsx:27-34` checkbox `checked={isSelected} onChange={() => onToggleSelect(idx)}`; `App.tsx:52-58` `toggleSelect` mutates a copied `Set`; empty branch `ShoppingList.tsx` renders `<p className="muted">Select recipes above…</p>` — no empty box, no error. |
| 3. Copy writes newline-joined list via clipboard.writeText + confirmation | ✓ | `text = items.join("\n")`; `copyToClipboard` calls `navigator.clipboard.writeText(text)`; `handleCopy` sets status `Copied to clipboard ✓`; rendered in `<p className="shopping__status" role="status" aria-live="polite">`. |
| 4. Share calls navigator.share when available, falls back to copy; AbortError handled | ✓ | `handleShare`: `if (typeof navigator.share === "function")` → `navigator.share({title,text})`; `AbortError` returns silently; else/absent falls through to `copyToClipboard` — no thrown error on desktop. |
| 5. `bun run typecheck` passes with zero errors | ✓ | `$ tsc --noEmit` → exit 0, no output (subagent re-ran `bun run typecheck`). |
| 6. Smoke green | ✓ (skipped) | `bun .weave/scripts/smoke.ts --ticket TKT-105` → `{"status":"skipped","reason":"playwright not installed in .weave",…}` exit 0. SKIPPED ≠ fail per gate (browsers intentionally unprovisioned in chaos). |

**Commands run:**
- `git status`
- `git diff main --stat`
- `git diff main -- src/styles.css src/components/RecipeList.tsx src/App.tsx`
- `grep -rn -iE 'fetch|/api|gemini|useEffect' src/components/ShoppingList.tsx src/App.tsx src/components/RecipeList.tsx`
- `bun run typecheck`

**Notes:** Independent sanity checks pass — no Gemini call on page load and no new `/api` route (only `analyzeFridge`/`getRecipes` inside user-action handlers); `ShoppingList`'s sole `useEffect` only clears a status string (no I/O); recipes/shopping UI renders only in `phase === "recipes"`, never on load, so the no-key render path stays clean. `src/lib/types.ts` and `server/*` unchanged — feature is pure client aggregation.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not provisioned in `.weave` — browser provisioning is forbidden mid-chaos-run, so the gate records a skip, which is never a failure)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | skipped: `bun run install:browsers` not run in chaos (repo-scoping guard) |

**Captured console errors (verbatim):** none (smoke did not execute)

**Screenshots:** none (smoke skipped)

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `aggregateMissing()` (`ShoppingList.tsx:15-26`) trims, dedupes case-insensitively (Map keyed on `toLowerCase()`, first spelling wins), sorts; `App.tsx` passes only chosen recipes `recipes.filter((_, i) => selected.has(i))`. Copy + Web-Share-with-copy-fallback (`handleShare` handles `AbortError`, falls back when share absent). Objective delivered. |
| Context constraints | ✓ | New component imports only `react` + `../lib/types`; zero `fetch`/`/api`/`GEMINI`/`VITE_` added — pure client aggregation, no network call. AI stays lazy (`getRecipes` call site unchanged, user-action-gated). manifest/SW/vite.config untouched; shared `Recipe` type reused, not forked. typecheck clean. |
| Sprawl | ✓ | Diff = exactly the 4 declared files (`App.tsx`, `RecipeList.tsx`, `styles.css` modified; `ShoppingList.tsx` new). `server/*` and `src/lib/*` untouched. |
| Follow-up surfacing | ✓ | 3 genuine polish/robustness follow-ups surfaced and filed to backlog (see below). None blocking. |
| Architecture coherence (chaos) | ✓ | Honors lift-state-up: selection state in `App`, `RecipeList` gets `selected`+`onToggleSelect` props (mirrors `IngredientList`'s `onChange`). `ShoppingList` is a pure presentational child — no second data path, no competing state store. Reuses existing CSS tokens/classes; adds only additive scoped rules. No drift from ADR-001's dataflow shape. |

**Suggested new tickets:** 3 — filed to `0-backlog/` (all `defer`): TKT-112 (persist recipe selection across reload), TKT-113 (remove individual items from the list), TKT-114 (distinguish copy success vs failure feedback styling).

**Notes:** All five axes pass → overall PASS. Clean, fully client-side extension: correct case-insensitive aggregate+dedupe over chosen recipes, copy + Web-Share-with-copy-fallback. Zero new network/AI surface, no key exposure, contract/manifest/SW untouched, diff confined to declared files, typecheck green.
