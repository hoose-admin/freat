---
id: TKT-106
title: "Dietary and time preferences in recipe requests"
status: "Complete"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
completed: 2026-06-22
domain: "app"
secondary_domains: []
tags:
  - feature
  - frontend
depends_on: []
blocks: []
related: [TKT-122, TKT-143]
files_touched:
  - "src/App.tsx"
  - "src/components/PreferencesControl.tsx"
  - "src/styles.css"
complexity: 3
next_step_hint: Human review — validated PASS (4 axes + architecture coherence); merge the chaos/TKT-106 branch to land.
chaos_branch: chaos/TKT-106
merged: 2026-06-22
merge_commit: 6a61eddb443c
---

### Objective
Let the user steer recipe suggestions with a small preferences control —
dietary tags (vegetarian / vegan / gluten-free) and a max cook time — and pass
those choices through the **existing** `RecipesRequest.preferences` field the
server already honors. Today the UI never sends dietary/time preferences, so the
server's dietary/time prompt steering is dead code from the client's perspective.
This is a **pure-frontend wiring ticket**: the type, API client, route, and
prompt all already accept preferences.

### Context
The full preferences contract already exists end-to-end — only the dietary/time
UI layer is missing. Do **not** fork the request type; extend `types.ts` only if
a new shared field is genuinely needed (it is not for this ticket).

- `src/lib/types.ts:22-27` — `RecipePreferences { dietary?: string[]; maxTimeMinutes?: number; servings? }` is already defined and is part of `RecipesRequest.preferences` (`types.ts:40-43`). It now also carries `servings` (added by the "Serves N" stepper feature — see below).
- `src/lib/api.ts:69-75` — `getRecipes(ingredients, preferences?)` already accepts and forwards `preferences` in the POST body. No change needed here.
- `server/handlers.ts` — `/api/recipes` already reads `body.preferences` and passes it to `suggestRecipes`.
- `server/gemini.ts:109-117` — `recipePrompt` already injects `dietary` (joined by `", "`), `maxTimeMinutes`, and `servings` into the Gemini prompt. The UI must emit dietary strings that read well there (e.g. `"vegetarian"`, `"vegan"`, `"gluten-free"`) and `maxTimeMinutes` as a number.
- `src/App.tsx:92-109` — `fetchRecipes(preferences?)` is the single recipe-fetch path; it forwards whatever preferences object it's handed.
- `src/App.tsx:111-115` — **the gap**: `handleGetRecipes()` calls `fetchRecipes()` with NO preferences. This is where the dietary/time value plugs in (`fetchRecipes(cleanPreferences(preferences))`).
- `src/App.tsx:120-126` — `rescale(next)` already sends `fetchRecipes({ servings })` from the recipes-screen "Serves N" stepper. The dietary/time prefs must **compose** with this — re-scaling servings must not drop the dietary filter, so merge: `fetchRecipes({ ...cleanPreferences(preferences), servings })`.
- `src/App.tsx:206-227` — the `ingredients` phase block is where the "Get meal ideas" button lives; the preferences control belongs here (the request is composed from this screen).
- `src/components/IngredientList.tsx` — sibling component to mirror for structure/props conventions (typed `Props`, single-responsibility, controlled via `onChange`).
- `src/styles.css` — has `.input`, `.chip`, `.btn`, `.section-title`, `--surface`/`--surface-2`/`--border`/`--brand`/`--bg`/`--text`/`--muted` tokens, plus `.visually-hidden`, but **no** fieldset/checkbox/select styles yet; add minimal accessible styles that reuse the existing tokens.
- ADR-001 (`server-side Gemini proxy`) — honored automatically: this ticket adds zero network paths and no Gemini access; it reuses the one `api.ts` -> `/api/*` path. AI stays lazy (only fires on the existing "Get meal ideas" / "Serves N" clicks).
- Sibling ticket `TKT-110` (accessibility pass) — keep the new control accessible by construction (fieldset/legend, real labels) so it doesn't regress that work.

### Acceptance Criteria
- [ ] A preferences control renders on the ingredients screen with three dietary toggles (vegetarian, vegan, gluten-free) and a max-cook-time selector.
- [ ] Selected preferences are included in the `/api/recipes` request body: dietary tags appear in `preferences.dietary` and the chosen time in `preferences.maxTimeMinutes` (verify via the value passed to `getRecipes`).
- [ ] Preferences persist within the session — selections survive moving between phases (ingredients <-> recipes) and a page reload within the same tab.
- [ ] With no preferences selected, the request omits empty preferences (no `dietary: []` / `maxTimeMinutes: 0` / `preferences: {}` noise) and recipes still work exactly as before.
- [ ] Dietary/time prefs compose with the existing "Serves N" stepper — re-scaling servings on the recipes screen still carries the chosen dietary filter (the `rescale` request includes both `preferences.dietary` and `preferences.servings`).
- [ ] Degrades gracefully when no Gemini key is configured — the standard 503 "add your key" message still shows; the app renders with zero console errors on load (smoke stays green).
- [ ] `bun run typecheck` passes.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** AC#2 made verifiable by naming the concrete check (the value passed to `getRecipes` carries `preferences.dietary` + `preferences.maxTimeMinutes`); AC#3 split persistence into two observable conditions (phase navigation + same-tab reload); AC#4 added to pin the empty-preferences behavior so "no selection" can't regress into noisy payloads.
- **Blockers:** none — `depends_on: []`. The contract this ticket consumes (`types.ts`/`api.ts`/`handlers.ts`/`gemini.ts`) is already in `main`, not pending in another bucket.
- **Context drift:** ok — all file:line citations verified against the worktree.
- **Complexity:** confirmed 3 — one new presentational component + App state + sessionStorage persistence + minimal CSS; no server/type/route changes.

**Verdict:** build-ready

### Pass-2 review — addendum (chaos re-pass)

**Run:** 2026-06-22
**Reader:** cold (chaos worker, fresh context)

- **Stale prior-run sections pruned.** The body previously carried a full Implementation Summary / Test Results / Smoke Check / Validation Review marked PASS, describing a `PreferencesControl.tsx` + `cleanPreferences`/`loadPreferences` build. **None of that code is on `main`** — that prior run's branch was never landed, and `main` has since evolved differently (it gained `RecipePreferences.servings` + a "Serves N" stepper). Those false sections were removed so the gates regenerate accurate evidence against the real tree.
- **Context refreshed.** All `file:line` cites re-anchored to current `main`: `RecipePreferences` now at `types.ts:22-27` (incl. `servings`); the gap is now `handleGetRecipes()` → `fetchRecipes()` at `App.tsx:111-115`; `getRecipes` at `api.ts:69-75`; `recipePrompt` at `gemini.ts:109-117`.
- **New AC#5** added: dietary/time prefs must **compose** with the now-existing `servings` stepper (a coupling the original ticket predates), so re-scaling servings doesn't drop the dietary filter.
- **Premise still valid** — the dietary/time UI is genuinely missing; the server prompt steering is still dead from the client's side. Build proceeds.

**Verdict:** build-ready

### Out of Scope
- New shared types beyond what `RecipePreferences` already provides, or any change to the `/api/recipes` route / server prompt.
- Cross-device or cross-session persistence (localStorage / server-side). Session-scoped persistence only.
- Additional dietary options beyond the three named (keep the surface small; more can be a follow-up).
- Changing the existing "Serves N" stepper behavior beyond composing the dietary/time prefs into its request.

### Autonomous Decision

**Made:** 2026-06-22 (chaos mode — no human input)
**Question:** How should the new dietary/time preferences interact with the pre-existing "Serves N" stepper, which also writes `RecipePreferences` (via `servings`)? The original ticket predates the stepper, so the two features' shared use of `preferences` is an unplanned coupling.

**Options considered:**
- **A — Compose** — merge dietary/time into the stepper's request (`{ ...cleanPreferences(preferences), servings }`) so both apply together.
- **B — Separate / ignore** — leave `rescale` sending only `{ servings }`; dietary/time would silently drop whenever the user changes the headcount on the recipes screen.

**Chosen:** A — a re-scale that silently discards the user's vegetarian/gluten-free filter is a correctness bug, not a feature gap (`App.tsx:141-151`). Spreading `cleanPreferences(preferences)` (which is `undefined` when nothing is selected) keeps the no-diet case byte-identical to today's `{ servings }` request, so existing stepper behavior is preserved exactly. Captured as AC#5.
**Reversibility:** easy — revert the one-line spread in `rescale` back to `{ servings: clamped }`.

### Implementation Summary

- Added `src/components/PreferencesControl.tsx` — a controlled presentational component (mirrors `IngredientList`'s typed `Props` + `onChange` shape) rendering three dietary checkboxes (`vegetarian`/`vegan`/`gluten-free`) inside a `<fieldset>`/`<legend>` plus a labeled `<select id="prefs-time">` for max cook time (Any / 15 / 30 / 45 / 60 min). It reads/writes only `dietary` + `maxTimeMinutes`, preserving any other key on `value` via spread; empty selections collapse to `undefined`.
- Wired into `src/App.tsx`: new `preferences` state typed as the shared `RecipePreferences` (`App.tsx`), rendered between `IngredientList` and the actions row in the `ingredients` phase. `handleGetRecipes()` now passes `cleanPreferences(preferences)` into the existing single `fetchRecipes()` path (`App.tsx:131-136`) — no new data path, no fork of the request type.
- **Composed with the existing "Serves N" stepper:** `rescale()` (`App.tsx:141-151`) now sends `{ ...cleanPreferences(preferences), servings }` so re-scaling servings on the recipes screen carries the dietary/time filter instead of dropping it (AC#5).
- Session persistence: `loadPreferences()` lazy-initializes state from `sessionStorage["freat:preferences"]`; a `useEffect` writes it back on every change (`App.tsx`). Both sides are try/catch-wrapped so blocked storage (private mode) cannot throw a console error and trip the smoke gate. `reset()` ("Start over") intentionally leaves preferences intact — they are session settings, not per-photo data.
- `cleanPreferences()` strips empties so an unselected control sends no `preferences` key at all (`undefined` → dropped by `JSON.stringify`), satisfying the "no noise" criterion; recipes still work with zero selections exactly as before.
- `src/styles.css`: added `.prefs*` rules reusing existing tokens (`--surface-2`/`--border`/`--brand`/`--bg`/`--text`/`--muted`); checkbox focus surfaced via `.prefs__group:has(input:focus-visible)`.

**Deviations from plan:**
- The ticket's prior-run body claimed this feature was already built (`PreferencesControl` + `cleanPreferences`/`loadPreferences`). That code was never on `main`; this is a fresh build against current `main` (those false sections were pruned in the Pass-2 chaos addendum). The one genuinely new element vs. the original plan is **AC#5 / the servings composition** — `RecipePreferences.servings` + the stepper did not exist when the ticket was first written, so `rescale` had to be updated to merge prefs. See the Autonomous Decision above.

**Implementation notes:**
- `bun run typecheck` → exit 0; `bun run build` → exit 0 (PWA precache regenerated, 10 entries).
- AI stays lazy: the control only mutates local state; Gemini is still only hit on the existing "Get meal ideas" / "Serves N" clicks, so a no-key load stays console-clean.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold — did not implement)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| #1 Control renders (3 dietary toggles + time selector) | ✓ | `App.tsx:237` renders `<PreferencesControl>` inside the `phase==="ingredients"` block; `PreferencesControl.tsx:11` `DIETARY_OPTIONS=["vegetarian","vegan","gluten-free"]` → 3 checkboxes in `<fieldset>`/`<legend>` (43-57) + labeled `<select id="prefs-time">` Any/15/30/45/60 (59-75). |
| #2 Selected prefs in `/api/recipes` body | ✓ | `handleGetRecipes` (`App.tsx:131-136`) → `fetchRecipes(cleanPreferences(preferences))` → `getRecipes(names, prefs)` (`App.tsx:117`) → `api.ts:73` posts `{ ingredients, preferences }`; `cleanPreferences` copies `dietary`/`maxTimeMinutes`. |
| #3 Persist across phase nav + same-tab reload | ✓ | Traced statically. `preferences` is App-level `useState` (`App.tsx:35`); `phase` is sibling state → switching phases never unmounts. Reload: lazy-init from `sessionStorage` via `loadPreferences()` + `useEffect` write-back (`App.tsx:82-88`), both try/catch. |
| #4 No selection → omits empty prefs | ✓ | `cleanPreferences` returns `undefined` when empty (`App.tsx:342-347`); `getRecipes(ingredients, undefined)` → `JSON.stringify({ ingredients, preferences: undefined })` drops the `preferences` key (`api.ts:73`). Component never emits `dietary:[]` (PreferencesControl.tsx:34) or `maxTimeMinutes:0` (38). |
| #5 Composes with "Serves N" stepper | ✓ | `rescale` (`App.tsx:141-151`) builds `{ ...cleanPreferences(preferences), servings: clamped }` (148) and fetches it; spread merges dietary/time + servings, and spreading `undefined` (no diet) leaves `{ servings }` byte-identical. `gemini.ts:110-114` reads both from one object. |
| #6 Graceful no-key, zero console errors on load | ✓ | Traced statically. `git diff -- server/ src/lib/` empty → 503 path (`handlers.ts:29`) + `getRecipes` untouched. Control makes no fetch (toggle/change call only `onChange`→`setPreferences`); prefs `useEffect` touches only `sessionStorage` in try/catch; `/api/health` `.catch` swallows errors. |
| #7 `bun run typecheck` passes | ✓ | Ran `bun run typecheck` (`tsc --noEmit`) → EXIT_CODE=0, no diagnostics. |

**Commands run:**
- `git status --short`
- `bun run typecheck 2>&1; echo "EXIT_CODE=$?"`
- `git diff -- src/styles.css`
- `grep -rn "GEMINI_KEY_MISSING|geminiConfigured|503" server/`
- `git diff -- server/ src/lib/`

**Notes:** All 7 ACs pass, verified cold against the working tree (`M src/App.tsx`, `M src/styles.css`, untracked `src/components/PreferencesControl.tsx`). Server + shared-lib files untouched (empty diff), so route/contract/503 path unchanged as scoped. AC#3/#6 verified by static trace (runtime smoke skipped — no browser); traces conclusive. AC#4's reliance on `JSON.stringify` dropping `undefined`-valued keys holds.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not installed in `.weave` — `bun run install:browsers` not run; browser provisioning is out of this chaos worker's scope)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | skipped: driver absent |

Raw result: `{"status":"skipped","reason":"playwright not installed in .weave …","routes":[],"ticketId":"TKT-106"}`. A skip is not a pass and never fails the ticket (per test-ticket gate). `bun run build` exit 0 and the static console-error trace (the control triggers no network/Gemini on render or toggle, and storage I/O is try/catch-wrapped) cover the load-time console-clean requirement in lieu of the runtime smoke.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Threads choices through the **existing** field, no fork: `handleGetRecipes` now calls `fetchRecipes(cleanPreferences(preferences))` (`App.tsx:131-136`) where it previously passed nothing — closing the exact gap the Objective named. Flows App → `getRecipes(names, prefs)` → `postJson("/api/recipes", { ingredients, preferences })` (`api.ts:73`), reaching the server's previously-dead dietary/time steering. `git diff -- server/ src/lib/ vite.config.ts` empty. |
| Context constraints | ✓ | All CLAUDE.md hard rules honored: (a) no key ref — `grep -niE 'GEMINI\|VITE_.*KEY\|process.env' src/` returns only benign UI/comment strings; (b) ONE data path — no raw `fetch` in components (control handlers call only `onChange`); (c) AI lazy — toggles mutate local state, prefs `useEffect` touches only `sessionStorage` in try/catch, Gemini still fires only on existing clicks; (d) manifest/SW untouched. **Architecture: COHERENT** — reuses shared `RecipePreferences` + single `getRecipes`; `PreferencesControl` mirrors `IngredientList` (typed `Props`, `onChange`, presentational, state owned by App); composes correctly with the pre-existing `servings` stepper via `rescale`'s `{ ...cleanPreferences(preferences), servings }` merge. |
| Sprawl | ✓ | `git status --short` = exactly the three `files_touched` (`M src/App.tsx`, `M src/styles.css`, `?? src/components/PreferencesControl.tsx`) — no extra files. `git diff -- server/ src/lib/ vite.config.ts` empty. CSS adds only scoped `.prefs*` rules reusing existing tokens. |
| Follow-up surfacing | ✓ | Two honestly-disclosed gaps (no automated test for `cleanPreferences`/`loadPreferences`; runtime smoke skipped — no browser). Neither blocks (static traces conclusive). See routing below. |

**Suggested new tickets:** 2 surfaced; 0 newly filed.
- Suggestion #1 (unit tests for `cleanPreferences`/`loadPreferences`) — **already covered** by existing `TKT-122` (`0-backlog/TKT-122-app-unit-tests-for-recipe-preferences-helpers.md`). Linked as `related`; no duplicate filed.
- Suggestion #2 ("run headless smoke once playwright is provisioned in `.weave`") — **not filed**: a harness/environment condition (browser provisioning is blocked in the chaos worker's scope and owned by the supervisor/human), not feature work. Recorded here for the reviewer rather than added as board noise.

**Reviewer notes (verbatim):** "ARCHITECTURE-COHERENCE VERDICT: COHERENT — no drift. The change is a textbook extension of the established spine: it reuses the shared `RecipePreferences` type (not a forked shape) and the single `api.ts → /api/*` data path (not a second fetch), and the new `PreferencesControl` is a faithful structural sibling of `IngredientList`. The one unplanned coupling the ticket had to resolve — dietary/time vs. the pre-existing `servings` stepper, both sharing the `preferences` object — is handled correctly: the control preserves foreign keys via spread and `rescale` merges both, so re-scaling no longer silently drops the diet, while the no-selection case stays byte-identical to today. The Autonomous Decision (compose, option A) is sound and reversible. All four axes pass; typecheck exits 0; the only soft spots (no unit tests, runtime smoke skipped) are honestly disclosed and filed as defer follow-ups. WHOLE-TICKET FITNESS: PASS."
