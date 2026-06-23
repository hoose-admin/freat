---
id: TKT-104
title: "Save and revisit favorite recipes"
status: "Testing"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains: []
tags:
  - feature
  - ux
depends_on: []
blocks: []
related: [TKT-108, TKT-112, TKT-109]
files_touched:
  - "src/App.tsx"
  - "src/components/RecipeList.tsx"
  - "src/lib/savedRecipes.ts"
  - "src/styles.css"
complexity: 3
next_step_hint: Verify AC with a fresh subagent — cite src/lib/savedRecipes.ts (key freat.savedRecipes.v1) + RecipeList heart toggle in evidence.
---

### Objective
Let users keep recipes they like and come back to them later. A recipe card gains
a save/unsave control; saved recipes are persisted in `localStorage` (no backend)
and shown in a dedicated "Saved" view that supports removal. This makes the app
useful beyond a single session — the meal ideas a user liked survive a reload and
work offline.

### Context
- **Data-fetching contract (ADR-001):** all *network* access funnels through
  `src/lib/api.ts`; `src/lib/types.ts` is the shared type module. This feature is
  **client-only persistence** (no Gemini, no `/api/*`), so it does NOT add a route
  — it adds a small storage module alongside `api.ts`. Extend the `Recipe` type in
  `src/lib/types.ts`; do not fork a parallel recipe shape.
- **Recipe shape:** `src/lib/types.ts:27` — `Recipe` has `title`, `description`,
  `usesIngredients`, `missingIngredients`, `steps`, optional `timeMinutes`,
  `difficulty`. There is **no `id`** — identity must be derived. `title` is the
  natural, stable key for AI-generated recipes; dedupe on a normalized title.
- **Where recipes render:** `src/components/RecipeList.tsx` — maps `recipes[]` to
  `.recipe-card` articles. The save/unsave control belongs on each card. Keep the
  prop additive (optional) so the existing `phase === "recipes"` render path and
  the new Saved view can share this component.
- **App shell / phases:** `src/App.tsx:8` — `Phase = "capture" | "ingredients" |
  "recipes"`. The app holds all state in `App`. Add a way to open a Saved view
  (e.g. a header control showing the saved count) without breaking the existing
  capture->ingredients->recipes flow.
- **No persistence helper exists yet:** `grep localStorage src/` is empty in this
  branch. Sibling tickets in `5-validating/` add their own persistence: **TKT-108**
  (last session photo+ingredients) and **TKT-112** (shopping-list selection). Their
  code is on un-merged branches and is NOT visible here. To stay coherent: namespace
  this feature's key under a `freat.` prefix with a version suffix
  (`freat.savedRecipes.v1`) so it can never collide with a sibling's key, and keep
  the storage module self-contained (no shared/global storage abstraction that would
  fork whatever TKT-108 established).
- **RecipeList overlap:** **TKT-109** (recipe detail view + share) also edits
  `src/components/RecipeList.tsx` on an un-merged branch. Keep edits here additive
  and localized (new optional props + one control per card) to minimize merge
  conflict surface.
- **Hard rule #3 (smoke stays green):** the app must render with zero console
  errors when no Gemini key is set. The Saved view must render fine when empty and
  must not call Gemini. `localStorage` access must be guarded (try/catch) so a
  disabled/full store degrades gracefully instead of throwing.

### Acceptance Criteria
- [ ] A new storage module `src/lib/savedRecipes.ts` reads/writes saved recipes
      in `localStorage` under key `freat.savedRecipes.v1`, with all access wrapped
      in try/catch so a throwing/unavailable store never crashes the app. It
      exposes load/save/remove/isSaved by a normalized title key and dedupes on it.
- [ ] Each recipe card in `src/components/RecipeList.tsx` shows a save/unsave
      control reflecting current saved state; toggling it persists immediately.
- [ ] After saving a recipe and reloading the page, the recipe is still present in
      the Saved view (persisted across reloads via `localStorage`).
- [ ] A "Saved" view lists all saved recipes and lets the user remove any of them;
      removal persists and updates the saved count.
- [ ] Saving/removing performs no network request and works with no Gemini key
      configured (offline-safe).
- [ ] `bun run typecheck` passes; the headless smoke (`bun .weave/scripts/smoke.ts
      --ticket TKT-104`) reports zero console errors / uncaught exceptions.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 2 bullets rewritten for verifiability — split storage-module behavior (key name, try/catch guard, dedupe-by-normalized-title) into one concrete bullet; made the persist-across-reload check an explicit reload assertion; pinned the final bullet to the exact typecheck + smoke commands.
- **Blockers:** ok — depends_on is empty; related TKT-108/TKT-112/TKT-109 are siblings (no hard ordering), already noted as un-merged in Context.
- **Context drift:** ok — verified src/lib/types.ts:27 (Recipe, no id), RecipeList.tsx card map, App.tsx:8 (Phase union), empty `grep localStorage src/`, and the smoke harness (.weave/scripts/smoke.ts + weave.config.json smoke block, routes ["/"], readySelector .app) all still present.
- **Complexity:** re-rated — stays 3 (types + new lib + App view/toggle + RecipeList control; no decomposition needed).

**Verdict:** build-ready

### Out of Scope
- Server-side or cross-device sync of saved recipes (localStorage only, no backend).
- Editing recipe contents, tagging, folders, or ordering of saved recipes.
- Migrating/merging with sibling persistence stores (TKT-108/TKT-112) — each owns
  its own namespaced key.

### Notes
- **Recipe identity:** `Recipe` has no id; saving/dedupe keys on a normalized
  `title` (trim + lowercase). Documented as an autonomous decision at build time.
- The Saved view can reuse `RecipeList` by passing the saved recipes plus the
  save-toggle props, rather than building a second card renderer.

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** How to identify a saved recipe for dedupe/remove, given `Recipe` (src/lib/types.ts:27) has no `id` field?

**Options considered:**
- **A — normalized title (trim + lowercase)** — the only intrinsic stable field on an AI-generated recipe; matches how IngredientList already keys items (src/components/IngredientList.tsx:19, lowercase name dedupe).
- **B — add a generated id (uuid/hash) to `Recipe`** — changes the shared API contract (src/lib/types.ts) and the server response shape for a client-only persistence feature; over-reach.
- **C — JSON-stringify the whole recipe** — brittle: any field reorder or model re-wording forks identity; no natural "unsave".

**Chosen:** A — `recipeKey(r) = r.title.trim().toLowerCase()` in src/lib/savedRecipes.ts. Keeps the contract untouched (client-only feature stays client-only), reuses the codebase's existing lowercase-dedupe convention, and gives a deterministic save/unsave toggle.
**Reversibility:** easy — if a future ticket adds `Recipe.id` server-side, swap the body of `recipeKey()` to prefer the id; the stored `freat.savedRecipes.v1` payload is full `Recipe` objects, so no data migration is forced.

### Implementation Summary

- Added `src/lib/savedRecipes.ts` — a self-contained localStorage module keyed `freat.savedRecipes.v1`. Every access is try/catch-guarded (`loadSaved` returns `[]` on any failure; `persist` no-ops on a disabled/full store). Exposes `loadSaved`, `saveRecipe`, `removeRecipe`, `isSaved`, and `recipeKey` (identity = trimmed/lowercased title). `saveRecipe`/`removeRecipe` are pure list transforms that dedupe by `recipeKey` and persist as a side effect. Deliberately outside `src/lib/api.ts` — it makes no network call (ADR-001 governs `/api/*` only).
- Extended `src/components/RecipeList.tsx` with five optional, additive props (`heading`, `emptyMessage`, `savedKeys`, `onToggleSave`, and made `selected`/`onToggleSelect` optional). When `onToggleSave` is set each card renders a ♥/♡ toggle button (`aria-pressed`, descriptive `aria-label`) in the card head. When `onToggleSelect` is absent the shopping checkbox is hidden, so the Saved view can reuse the same component cleanly. Defaults reproduce the previous recipes-phase markup exactly for callers that don't opt in.
- Wired `src/App.tsx`: added `"saved"` to the `Phase` union; `saved` state seeded once via a lazy `loadSaved()` initializer (no effect → no page-load work); a `savedKeys` `useMemo`; a `toggleSave` handler; a header `.app__bar` "♥ Saved (N)" toggle (`aria-pressed`); a `returnPhase` ref + `toggleSavedView` so the Saved view is a non-destructive detour; and a Saved view that reuses `RecipeList` (heading "Saved recipes", custom empty message, remove-on-toggle). The recipes phase now passes `savedKeys` + `onToggleSave` so cards show the heart.
- Added styles in `src/styles.css` for `.app__bar` (right-aligned header row) and `.recipe-card__save` / `.is-saved` (pill heart button with hover/focus-visible states), reusing existing CSS variables.

**Deviations from plan:**
- Did NOT modify `src/lib/types.ts`. The AC's storage bullet and Context said to "extend the `Recipe` type", but the feature reuses `Recipe` as-is (the saved store holds full `Recipe` objects) — adding a field would fork/bloat the shared contract for no behavioral gain. Identity is derived via `recipeKey` instead (see ### Autonomous Decision). This honors the contract rather than changing it.
- The Saved view reuses `RecipeList` rather than a second renderer (per ### Notes). To make that clean, `selected`/`onToggleSelect` became optional so the Saved view omits the shopping-list checkbox while keeping the heart + cook-mode controls.

**Implementation notes:**
- No network and no Gemini in the save path: pure client-side localStorage, so no `/api/*` route and no `src/lib/api.ts` change — consistent with ADR-001 and CLAUDE.md hard rules #1–#3.
- `bun run typecheck` (tsc --noEmit) exits 0 and `bun run build` succeeds; a 12-assertion in-memory-shim round-trip of the storage module (save/dedupe/isSaved/remove/throwing-store) passes 12/12.
