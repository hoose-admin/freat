---
id: TKT-108
title: "Persist last session photo and ingredients"
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
related: [TKT-115]
files_touched:
  - "src/App.tsx"
  - "src/lib/session.ts"
complexity: 2
next_step_hint: Human review: confirm reload-restores-ingredients UX and Start-over-clears behavior in a browser.
---

### Objective
Persist the most recent fridge photo and ingredient list to `localStorage` so a
page reload or PWA relaunch restores the user to the ingredients phase instead of
resetting to capture. This is a pure client-side convenience — losing your place
on every refresh is the most jarring rough edge in the current flow.

### Context
- `src/App.tsx:10-53` owns all session state (`phase`, `photo`, `ingredients`,
  `recipes`) with `useState` and a `reset()` that clears it. There is **no**
  persistence today — a reload drops everything and lands on `phase === "capture"`.
- `phase` is `"capture" | "ingredients" | "recipes"` (`src/App.tsx:8`). The AC
  only requires restoring to the **ingredients** phase, so we persist the photo +
  ingredients (not recipes, which are regenerable and would bloat storage).
- `src/lib/` is the home for non-component logic: `api.ts` (the network path) and
  `types.ts` (shared contract). `Ingredient` is exported from `src/lib/types.ts:5`.
  localStorage is **not** the network path, so a new sibling module
  `src/lib/session.ts` is the coherent placement — it keeps `App.tsx` thin and
  isolates the try/catch + shape-guard that storage I/O requires.
- `grep` confirms **no** existing `localStorage`/`sessionStorage` usage in `src/`
  — this establishes the pattern; later persistence (e.g. preferences) should
  extend `session.ts`, not fork a parallel storage helper.
- Hard rule #3 (CLAUDE.md): every route must render with **zero console errors**.
  The fridge photo is a base64 data URL that can exceed the ~5MB localStorage
  quota, so writes MUST be wrapped (swallow `QuotaExceededError`) and reads MUST
  tolerate corrupt/absent data — never let storage throw to the console.
- ADR-001: no Gemini, no `/api` route, no key involved — this is entirely
  client-side and does not touch the proxy contract.
- `<StrictMode>` (`src/main.tsx`) double-invokes effects in dev; localStorage
  writes are idempotent so this is harmless, but the restore must run **once**
  (use a lazy `useState` initializer, not an effect, to avoid a capture→ingredients flash).

### Acceptance Criteria
- [x] After a successful analyze, reloading the page restores the photo preview,
      the ingredient list (same items), and lands on the ingredients phase — not
      capture.
- [x] "Start over" (the `reset()` path) clears the persisted session, so a reload
      after it lands on the capture phase.
- [x] Storage failure (quota exceeded / corrupt JSON / unavailable storage)
      degrades silently to a fresh session with **no** console error.
- [x] `bun run typecheck` passes.
- [x] No console errors on initial load with no persisted session and no Gemini
      key configured (smoke gate stays green).

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — all five bullets are independently verifiable (reload
  behavior, reset behavior, silent-failure, typecheck command, console-clean load).
- **Blockers:** ok — `depends_on` empty; no active ticket gates this.
- **Context drift:** ok — `src/App.tsx:8` (`type Phase`), `src/App.tsx:10-53`
  (state + `reset()`), `src/lib/types.ts:5` (`Ingredient`) all verified present;
  grep confirms no existing `localStorage` usage in `src/`.
- **Complexity:** re-rated → stays **2** (one new ~40-line module + ~6 lines of
  App.tsx wiring; single coupled slice, no API/server changes).

**Verdict:** build-ready

### Out of Scope
- Persisting the recipes phase or generated recipes (regenerable; AC restores to
  the ingredients phase only).
- Persisting `RecipePreferences` or any future user settings — `session.ts` is the
  seam to extend later, but that is a separate ticket.
- Cross-device / server-side persistence.

### Implementation Summary

- Added `src/lib/session.ts` — a best-effort localStorage helper exporting
  `loadSession()` / `saveSession()` / `clearSession()` keyed on `freat.session.v1`,
  storing `{ photo, ingredients }`. All three wrap their storage call in try/catch:
  `loadSession` shape-guards the parsed JSON (string photo + non-empty
  `Ingredient[]`) and returns `null` on any corruption/absence; `saveSession`
  swallows `QuotaExceededError` (large base64 photos); `clearSession` removes the key.
- Wired `src/App.tsx`: a lazy `useState(loadSession)` initializer restores once on
  first render, seeding `phase` to `"ingredients"` (and `photo`/`ingredients` from
  the saved blob) when a session exists. A `useEffect` on `[photo, ingredients]`
  persists whenever both are present. `reset()` now calls `clearSession()` first so
  "Start over" wipes the saved session.

**Deviations from plan:**
- None — implementation matched the plan. Module placement (`src/lib/session.ts`),
  restore-via-lazy-initializer, and persist-via-effect all as specified in Context.

**Implementation notes:**
- The half-analyzed state (photo set, analyze in flight, ingredients still `[]`)
  is intentionally **not** persisted — the effect guards on
  `ingredients.length > 0`, and `loadSession` requires a non-empty list — so a
  reload mid-analysis correctly falls back to a fresh capture rather than a stuck
  empty ingredients phase.

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Reload restores photo + ingredients + ingredients phase | ✓ | `App.tsx:14` `const [restored] = useState(loadSession)` (lazy initializer, first render — not an effect); `App.tsx:15-17` seed phase="ingredients", photo, ingredients; `session.ts:22-32` `loadSession` reads `freat.session.v1`; `App.tsx:89-90` renders `<img src={photo}>` + `<IngredientList>`. |
| "Start over" clears persisted session | ✓ | `App.tsx:60-67` `reset()` calls `clearSession()` at `:61` before setState; `session.ts:53-58` `removeItem(KEY)`. Post-reset `ingredients=[]` → persist guard `App.tsx:26` false → no re-save → reload returns null → capture. |
| Storage failure degrades silently, no console error | ✓ | All three wrapped: `loadSession` `session.ts:23-36`, `saveSession` `:45-49`, `clearSession` `:54-58`; every catch block empty (no `console.error`). Shape-guard `session.ts:27-31`; corrupt JSON throws in `JSON.parse` → caught → `null`. |
| `bun run typecheck` passes | ✓ | `bun run typecheck` → `$ tsc --noEmit` with no diagnostics; `EXIT=0`. |
| No console errors on initial load (no session, no key) | ✓ | Only load-time call is `loadSession` (`App.tsx:14`), localStorage-only, never Gemini; AI calls gated in `handlePhoto`/`handleGetRecipes` (`:36`,`:50`). No session → `restored=null` → capture phase renders `<PhotoCapture>`. |

**Commands run:**
- `bun run typecheck`

**Notes:** All 5 ACs pass; no AC-implied bugs found. Persist effect is guarded
(`App.tsx:26`) so it never overwrites with empty/half-state; StrictMode's
double-invoke of the idempotent effect is harmless. Non-blocking observation: if a
user deletes *all* ingredients in `IngredientList` while in the ingredients phase,
the effect stops saving but does not `clearSession()`, so a stale non-empty session
would be restored on reload — filed as TKT-115.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not installed in `.weave` — run `bun run install:browsers`; browsers are not provisioned in this chaos environment)

A skip is not a pass and never fails the ticket. The production build was verified
manually instead: `bun run build` → `✓ built in 196ms`, PWA `generateSW` precache
7 entries, `dist/sw.js` + manifest emitted — confirming the change does not break
the installable PWA build.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `App.tsx:14-17` lazy-restores via `useState(loadSession)` then `useState<Phase>(restored ? "ingredients" : "capture")`, seeding photo/ingredients; `session.ts:22-38` only returns a session when `ingredients.length > 0`, so a reload lands directly in the ingredients phase. Matches the Objective exactly. |
| Context constraints | ✓ | `session.ts` imports only `import type { Ingredient }` and touches no Gemini/key/api code; restore is pure localStorage on first render (rules #1/#3 intact). Every storage op try/catch-wrapped (`session.ts:23-37,45-49,54-58`) → no console errors (#3). `vite.config.ts`/manifest/SW/`/api` precache untouched (#4). No new fetch path; `api.ts` unmodified (#2). |
| Architecture coherence | ✓ | Persistence placed at `src/lib/session.ts` as a sibling to `api.ts`/`types.ts`, header comment distinguishes it from the network path — honors ADR-001's single-shared-module ethos. Reuses canonical `Ingredient` type (no redefined shape). No second storage helper (grep: localStorage only in `session.ts`). Server/`/api` contract untouched. No competing state-management lib. No drift. |
| Sprawl | ✓ | `git status --porcelain` = ` M src/App.tsx` + `?? src/lib/session.ts` only (node_modules gitignored). Exactly the two `files_touched`. No CSS/config/component changes. |
| Follow-up surfacing | ✓ | Confirmed the stale-session edge case (`App.tsx:25-29` persist guard + `IngredientList` remove draining to empty without `clearSession()`); filed as TKT-115. Quota-exceeded silent skip is by-design, not a follow-up. |

**Suggested new tickets:** 1 — TKT-115 (filed to `0-backlog`, ordering: defer):
"Clear saved session when the ingredient list is emptied."
