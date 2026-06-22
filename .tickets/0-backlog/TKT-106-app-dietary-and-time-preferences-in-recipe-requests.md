---
id: TKT-106
title: "Dietary and time preferences in recipe requests"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains: []
tags:
  - feature
  - frontend
depends_on: []
blocks: []
related: []
files_touched:
  - "src/App.tsx"
  - "src/components/PreferencesControl.tsx"
  - "src/styles.css"
complexity: 3
next_step_hint: Verify AC with a fresh subagent — cite App.tsx cleanPreferences/loadPreferences and PreferencesControl.tsx in evidence.
---

### Objective
Let the user steer recipe suggestions with a small preferences control —
dietary tags (vegetarian / vegan / gluten-free) and a max cook time — and pass
those choices through the **existing** `RecipesRequest.preferences` field the
server already honors. Today the UI never sends preferences, so the server's
dietary/time prompt steering is dead code from the client's perspective. This is
a **pure-frontend wiring ticket**: the type, API client, route, and prompt all
already accept preferences.

### Context
The full preferences contract already exists end-to-end — only the UI layer is
missing. Do **not** fork the request type; extend `types.ts` only if a new shared
field is genuinely needed (it is not for this ticket).

- `src/lib/types.ts:22-25` — `RecipePreferences { dietary?: string[]; maxTimeMinutes?: number }` is already defined and is part of `RecipesRequest.preferences` (`types.ts:38-41`).
- `src/lib/api.ts:55-61` — `getRecipes(ingredients, preferences?)` already accepts and forwards `preferences` in the POST body. No change needed here unless a signature tweak helps the caller.
- `server/handlers.ts:67-78` — `/api/recipes` already reads `body.preferences` and passes it to `suggestRecipes`.
- `server/gemini.ts:108-114` — `recipePrompt` already injects `dietary` (joined by `", "`) and `maxTimeMinutes` into the Gemini prompt. The UI must emit dietary strings that read well there (e.g. `"vegetarian"`, `"vegan"`, `"gluten-free"`) and `maxTimeMinutes` as a number.
- `src/App.tsx:33-45` — **the gap**: `handleGetRecipes` calls `getRecipes(ingredients.map((i) => i.name))` with NO preferences argument. This is where the threaded value plugs in.
- `src/App.tsx:73-90` — the `ingredients` phase block is where the "Get meal ideas" button lives; the preferences control belongs here (the request is composed from this screen).
- `src/components/IngredientList.tsx` — sibling component to mirror for structure/props conventions (typed `Props`, single-responsibility, controlled via `onChange`).
- `src/styles.css` — has `.input`, `.chip`, `.btn`, `.section-title`, `--surface-2`/`--border`/`--brand` tokens, but **no** fieldset/checkbox/select styles yet; add minimal accessible styles that reuse the existing tokens.
- ADR-001 (`server-side Gemini proxy`) — honored automatically: this ticket adds zero network paths and no Gemini access; it reuses the one `api.ts` -> `/api/*` path. AI stays lazy (only fires on the existing "Get meal ideas" click).
- Sibling ticket `TKT-110` (accessibility pass) is in `5-validating/` — keep the new control accessible by construction (fieldset/legend, real labels) so it doesn't regress that work.

### Acceptance Criteria
- [ ] A preferences control renders on the ingredients screen with three dietary toggles (vegetarian, vegan, gluten-free) and a max-cook-time selector.
- [ ] Selected preferences are included in the `/api/recipes` request body: dietary tags appear in `preferences.dietary` and the chosen time in `preferences.maxTimeMinutes` (verify via the value passed to `getRecipes`).
- [ ] Preferences persist within the session — selections survive moving between phases (ingredients <-> recipes) and a page reload within the same tab.
- [ ] With no preferences selected, the request omits empty preferences (no `dietary: []` / `maxTimeMinutes: 0` noise) and recipes still work exactly as before.
- [ ] Degrades gracefully when no Gemini key is configured — the standard 503 "add your key" message still shows; the app renders with zero console errors on load (smoke stays green).
- [ ] `bun run typecheck` passes.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** AC#2 made verifiable by naming the concrete check (the value passed to `getRecipes` carries `preferences.dietary` + `preferences.maxTimeMinutes`); AC#3 split persistence into two observable conditions (phase navigation + same-tab reload); AC#4 added to pin the empty-preferences behavior so "no selection" can't regress into noisy payloads.
- **Blockers:** none — `depends_on: []`. The contract this ticket consumes (`types.ts`/`api.ts`/`handlers.ts`/`gemini.ts`) is already in `main`, not pending in another bucket.
- **Context drift:** ok — all 7 file:line citations verified against the worktree (`RecipePreferences` at types.ts:22-25, `getRecipes` at api.ts:55-61, recipes route at handlers.ts:67-78, `recipePrompt` at gemini.ts:108-114, the unthreaded `handleGetRecipes` call at App.tsx:33-45).
- **Complexity:** confirmed 3 — one new presentational component + App state + sessionStorage persistence + minimal CSS; no server/type/route changes.

**Verdict:** build-ready

### Out of Scope
- New shared types beyond what `RecipePreferences` already provides, or any change to the `/api/recipes` route / server prompt.
- Cross-device or cross-session persistence (localStorage / server-side). Session-scoped persistence only.
- Additional dietary options beyond the three named (keep the surface small; more can be a follow-up).

### Implementation Summary

- Added `src/components/PreferencesControl.tsx` — a controlled presentational component (mirrors `IngredientList`'s `Props` + `onChange` shape) rendering three dietary checkboxes (`vegetarian`, `vegan`, `gluten-free`) inside a `<fieldset>`/`<legend>` plus a labeled `<select>` for max cook time (Any / 15 / 30 / 45 / 60 min). Time value `0` maps to `undefined`.
- Wired into `src/App.tsx`: new `preferences` state typed as the shared `RecipePreferences`, rendered between `IngredientList` and the actions row in the `ingredients` phase; `handleGetRecipes` now passes `cleanPreferences(preferences)` as the second arg of the existing `getRecipes(ingredients, preferences?)` — no new data path, no fork of the request type.
- Session persistence: `loadPreferences()` lazy-initializes state from `sessionStorage["freat:preferences"]`; a `useEffect` writes it back on every change. Both sides are wrapped in try/catch so blocked storage (private mode) cannot throw a console error and trip the smoke gate. `reset()` intentionally leaves preferences intact (they are session settings, not per-photo data).
- `cleanPreferences()` strips empties so an unselected control sends no `preferences` key at all (`undefined` → dropped by `JSON.stringify`), satisfying the "no noise" criterion; recipes still work with zero selections exactly as before.
- `src/styles.css`: added `.prefs*` rules reusing existing tokens (`--surface`, `--surface-2`, `--border`, `--brand`); checkbox focus surfaced via `:has(input:focus-visible)`.

**Deviations from plan:**
- None — implementation matched the plan. No changes to `types.ts`, `api.ts`, or any server file were needed; the existing contract carried the feature as predicted.

**Implementation notes:**
- `bun run typecheck` → exit 0; `bun run build` → exit 0 (PWA precache regenerated, 7 entries).
- AI stays lazy: the control only mutates local state; Gemini is still only hit on the existing "Get meal ideas" click, so a no-key load stays console-clean.

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Control renders (3 dietary toggles + time selector) | ✓ | `PreferencesControl.tsx:5` `DIETARY_OPTIONS=["vegetarian","vegan","gluten-free"]`; checkboxes 47-57; `<select id="prefs-time">` 65-77 (Any/15/30/45/60 from TIME_OPTIONS 8-14); mounted at `App.tsx:92`. |
| Selected prefs in `/api/recipes` body | ✓ | `App.tsx:52` `getRecipes(names, cleanPreferences(preferences))`; `api.ts:59` forwards `{ ingredients, preferences }`; UI writes `dietary` (PreferencesControl.tsx:31) + `maxTimeMinutes` (35); server reads at `gemini.ts:110-111`. |
| Persist within session (phase nav + reload) | ✓ | App-level `useState(loadPreferences)` (`App.tsx:18`) reads sessionStorage (134); `useEffect` writes on change (25-31); `reset()` (62-68) omits preferences. |
| No selection → omits empty prefs | ✓ | `cleanPreferences({})` → `undefined` (`App.tsx:153-158`); `getRecipes(ingredients, undefined)` → `JSON.stringify` drops the `preferences` key (`api.ts:30,59`). |
| Graceful no-key, zero console errors on load | ✓ | Control mutates only local state (no fetch); sole network call is the existing "Get meal ideas" click (`App.tsx:48-60`); storage I/O try/catch-wrapped (26-30, 133-148); 503 message at 163-165. (Traced statically — smoke skipped.) |
| `bun run typecheck` passes | ✓ | `tsc --noEmit` → exit 0, no diagnostics. |

**Commands run:**
- `git diff -- src/App.tsx src/styles.css`
- `bun run typecheck`

**Notes:** Contract fully reused — no change to `types.ts`/`api.ts`/server, as intended. `PreferencesControl` is presentational/controlled with state owned by App.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not installed in `.weave` — `bun run install:browsers` not run; browser provisioning is out of this worker's scope)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | skipped: driver absent |

A skip is not a pass and never fails the ticket (per test-ticket gate). `bun run build` exit 0 and the static console-error trace (control triggers no network/Gemini on render or toggle) cover the load-time console-clean requirement in lieu of the runtime smoke.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `App.tsx:52` changes the dead `getRecipes(names)` call to `getRecipes(names, cleanPreferences(preferences))`, threading prefs through the EXISTING field; control emits the 3 named dietary strings + `maxTimeMinutes` the server prompt consumes verbatim (`gemini.ts:110-111`). No drift. |
| Context constraints | ✓ | All four CLAUDE.md hard rules honored — `git diff --stat -- server/ src/lib/ vite.config.ts` is EMPTY (no key code, no `VITE_`, no `src/` key ref); ONE data path (control calls only its `onChange`; App calls the single `getRecipes`; zero raw `fetch` added); AI lazy (toggles mutate local state only; sole network call is the existing "Get meal ideas" click); manifest/SW untouched. Architecture coherence CONFIRMED — reuses `RecipePreferences` + `getRecipes`, adds no route/type/server code. |
| Sprawl | ✓ | `git status --short` = exactly `M src/App.tsx`, `M src/styles.css`, `?? src/components/PreferencesControl.tsx` (node_modules ignored) — matches `files_touched`. CSS adds only scoped `.prefs*` rules reusing existing tokens. |
| Follow-up surfacing | ✓ | Two non-blocking gaps: no unit test for the prefs round-trip; runtime smoke skipped (driver absent). Observations only. |

**Suggested new tickets:** 2 surfaced.
- Filed **TKT-122** (`0-backlog`, defer) — Unit tests for the recipe-preferences pure functions (`cleanPreferences`/`loadPreferences`), mirroring the TKT-121 pattern; notes they are currently module-private in `App.tsx` and need extraction.
- Not filed — "provision `.weave` Playwright browser so smoke runs": a harness/environment condition (browser provisioning is blocked in the chaos worker's scope and owned by the supervisor/human), not feature work. Recorded here for the reviewer rather than added as board noise.

**Reviewer notes (verbatim):** "Textbook pure-frontend wiring ticket — all four axes pass. The implementation reuses the established contract exactly as the ticket predicted (RecipePreferences type, single getRecipes helper, untouched server/route/prompt) with no parallel data path. Accessibility built in by construction (fieldset/legend, real label htmlFor, :has(input:focus-visible) focus ring) so it does not regress sibling TKT-110. typecheck exit 0."
