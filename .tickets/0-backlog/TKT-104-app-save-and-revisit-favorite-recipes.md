---
id: TKT-104
title: "Save and revisit favorite recipes"
status: "Todo"
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
next_step_hint: Whole-ticket validation: confirm objective fidelity + ADR-001 / contract coherence for the savedRecipes localStorage slice.
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

- Added `src/lib/savedRecipes.ts` — a self-contained localStorage module keyed `freat.savedRecipes.v1`. All access is try/catch-guarded (returns `[]` / no-ops on a disabled or full store). Exposes `loadSaved`, `saveRecipe`, `removeRecipe`, `isSaved`, and `recipeKey` (identity = trimmed/lowercased title); save/remove are pure list transforms that persist as a side effect and dedupe by `recipeKey`.
- Extended `src/components/RecipeList.tsx` with four optional, additive props (`heading`, `emptyHint`, `savedKeys`, `onToggleSave`). When `onToggleSave` is set each card renders a ♥/♡ toggle button (`aria-pressed`, descriptive `aria-label`). Defaults reproduce the previous render exactly when the new props are absent, so the recipes-phase markup is unchanged for callers that do not opt in.
- Wired `src/App.tsx`: `saved` state seeded from `loadSaved()`, a `savedKeys` Set, a `toggleSave` handler, a header "♥ Saved (N)" toggle (`app__saved-toggle`), and a Saved view that reuses `RecipeList` (heading "Saved recipes", remove-on-toggle). The recipes phase now passes `savedKeys` + `onToggleSave` so cards show the heart.
- Added styles in `src/styles.css` for `.app__bar` / `.app__saved-toggle` (right-aligned header control) and `.recipe-card__save` / `.is-saved` (pill heart button with hover/focus-visible states), reusing existing CSS variables.

**Deviations from plan:**
- Did NOT modify `src/lib/types.ts`. The plan said "extend the Recipe type"; on building it was clear the feature reuses `Recipe` as-is (saved store holds full `Recipe` objects) — adding a field would have been forking/bloating the shared contract for no behavioral gain. Identity is derived instead (see ### Autonomous Decision). This honors the contract rather than changing it.

**Implementation notes:**
- No network and no Gemini: the feature is pure client-side persistence, so it does not add an `/api/*` route or touch `src/lib/api.ts` — consistent with ADR-001 (api.ts governs *network* access only).
- Edits to `RecipeList.tsx` were kept additive to limit merge-conflict surface with the un-merged TKT-109 (recipe detail/share) which also edits this file.

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| AC1 — `savedRecipes.ts` localStorage module | ✓ | `src/lib/savedRecipes.ts:14` `KEY="freat.savedRecipes.v1"`; every access try/catch-wrapped (`loadSaved` L23-30, `persist` L35-39); `recipeKey` L17-19 = `title.trim().toLowerCase()`; dedupe L50-52; exports load/save/remove/isSaved. Bun shim round-trip 13/13 incl. "saving same normalized title twice → length 1" and "throwing store degrades to []". |
| AC2 — per-card save/unsave control | ✓ | `src/components/RecipeList.tsx:42-53` button rendered when `onToggleSave` set; `aria-pressed={saved}` (L47), ♥/♡ glyph (L51), `onClick={()=>onToggleSave(r)}` (L46); `src/App.tsx:23-25` `toggleSave` calls saveRecipe/removeRecipe which `persist()` synchronously. |
| AC3 — persists across reload | ✓ | `src/App.tsx:18` `saved` seeded from `loadSaved()`. Real-browser reload: after seeding `freat.savedRecipes.v1` then `page.reload()`, header reads `♥ Saved (1)` (`countAfterReload`). Shim test: fresh `loadSaved()` after save sees the item. |
| AC4 — Saved view lists + removes, count updates | ✓ | `src/App.tsx:74` count = `saved.length`; saved view reuses `RecipeList` (L90-104) with remove-on-toggle. Real browser: Saved view `savedTitlesShown=["Test Soup"]`, `removeBtnPresent=true`. Shim: removal persists (fresh `loadSaved()` empty). |
| AC5 — no network, offline-safe | ✓ | grep of `src/lib/savedRecipes.ts` + persistence handlers: no `fetch`/`/api/`/`gemini` (only a comment match). `analyzeFridge`/`getRecipes` invoked only in `handlePhoto`/`handleGetRecipes`, never in the save path. localStorage is offline by nature; `/api/health` showed `geminiConfigured:false` while the page rendered clean. |
| AC6 — typecheck passes; smoke zero console errors | ✓ | `bun run typecheck` → `tsc --noEmit` exit 0, no output. Smoke-equivalent headless run on `/`: 0 console errors, 0 page errors, 0 failed requests, not blank. |

**Commands run:**
- `bun run typecheck`
- Bun in-memory `localStorage` shim round-trip (save/reload/dedupe/isSaved/remove/throwing-store) — 13/13 assertions pass
- `grep -nE 'fetch|/api/|gemini|http' src/lib/savedRecipes.ts src/App.tsx`
- `PORT=8792 bun run server/index.ts` (serving production `dist/`) + headless Chromium driver over `/`

**Notes:** Fresh subagent verified all six AC bullets cold against the code; no source modified during verification.

### Smoke Check

**Headless Chromium:** PASS — *via single-process smoke-equivalent.* The canonical harness `bun .weave/scripts/smoke.ts --ticket TKT-104` is **SIGKILL'd (exit 137, zero output)** in this sandbox: its nested `sh -c "bun run build && bun run serve"` subprocess tree plus a Chromium launch is resource/OOM-killed before producing any `SmokeResult`. Verified this is an infra limit of the harness, not the app — Chromium launches fine standalone, and `bun run build` succeeds standalone. The exact smoke route checks were reproduced in one process against the served production `dist/` build.

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | ✓ | 0 | 0 | 0 | `.app` ready & visible; not blank (textLen 261, 18 els); `♥ Saved (0)` toggle renders; reload round-trip persists saved recipe |

**Captured console errors (verbatim):** none (empty array).

**Screenshot:** `/tmp/freat-home.png` (sandbox-local; canonical `.weave/cache/smoke/TKT-104/` not written because the harness was killed pre-verdict).

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Save/unsave (RecipeList.tsx:42-53 + App.tsx:23-25), revisit (header toggle App.tsx:67-76 → Saved view L90-104), remove (♥ toggle → removeRecipe), persist-across-reload (seed loadSaved() L18 + persist on mutate), offline (pure localStorage, no /api/*). typecheck exit 0. |
| Context constraints | ✓ | No client-side key/Gemini logic added (grep: only pre-existing UI copy + a comment); no raw `fetch()` outside lib/api.ts; localStorage access all try/catch-wrapped so no-key render stays console-error-free; `Recipe` type NOT forked — imported from lib/types, types.ts unchanged; identity derived via `recipeKey` without changing the shared contract. |
| Architecture coherence | ✓ | Controlled-component + App-holds-state pattern (mirrors IngredientList); all new RecipeList props optional/additive (won't break TKT-109's edits); lib placed at src/lib; CSS reuses existing variables + `.btn--ghost`; localStorage key `freat.savedRecipes.v1` namespaced **and** versioned to avoid colliding with TKT-108/TKT-112 stores. No parallel pattern. |
| Sprawl | ✓ | Diff touches exactly the 4 declared files_touched; lean (59-line dependency-free lib, no dead code, no needless store/reducer abstraction). |
| Follow-up surfacing | ✓ | 3 observations surfaced (cross-tab sync, storage-quota UX feedback, unit tests). None block the ticket. |

**Suggested new tickets:** 3 (all defer-to-backlog) — filed as TKT-119, TKT-120, TKT-121.
