---
id: TKT-108
title: "Persist last session photo and ingredients"
status: "Validating"
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
next_step_hint: Human review: confirm reload-restores-ingredients and Start-over-clears in a browser; merge chaos/TKT-108 on approval.
---

### Objective
Persist the most recent fridge photo and ingredient list to `localStorage` so a
page reload or PWA relaunch restores the user to the ingredients phase instead of
resetting to capture. This is a pure client-side convenience — losing your place
on every refresh is the most jarring rough edge in the current flow.

### Context
- `src/App.tsx` owns all session state (`phase`, `photo`, `ingredients`,
  `recipes`, plus shopping-list `selected`) with `useState` and a `reset()` that
  clears it. There is **no** persistence today — a reload drops everything and
  lands on `phase === "capture"`.
- `phase` is `"capture" | "ingredients" | "recipes"` (`src/App.tsx:10`). The AC
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
  (use a lazy `useState` initializer, not an effect, to avoid a capture->ingredients flash).

### Acceptance Criteria
- [ ] After a successful analyze, reloading the page restores the photo preview,
      the ingredient list (same items), and lands on the ingredients phase — not
      capture.
- [ ] "Start over" (the `reset()` path) clears the persisted session, so a reload
      after it lands on the capture phase.
- [ ] Storage failure (quota exceeded / corrupt JSON / unavailable storage)
      degrades silently to a fresh session with **no** console error.
- [ ] `bun run typecheck` passes.
- [ ] No console errors on initial load with no persisted session and no Gemini
      key configured (smoke gate stays green).

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — all five bullets are independently verifiable (reload
  behavior, reset behavior, silent-failure, typecheck command, console-clean load).
- **Blockers:** ok — `depends_on` empty; no active ticket gates this.
- **Context drift:** ok — `src/App.tsx:10` (`type Phase`), state + `reset()`,
  `src/lib/types.ts:5` (`Ingredient`) all verified present; grep confirms no
  existing `localStorage` usage in `src/`.
- **Complexity:** re-rated -> stays **2** (one new ~50-line module + ~6 lines of
  App.tsx wiring; single coupled slice, no API/server changes).

**Verdict:** build-ready

### Out of Scope
- Persisting the recipes phase or generated recipes (regenerable; AC restores to
  the ingredients phase only).
- Persisting `RecipePreferences` or any future user settings — `session.ts` is the
  seam to extend later, but that is a separate ticket.
- Cross-device / server-side persistence.

### Autonomous Decision

**Question:** The ticket arrived in `0-backlog/` but its body already carried a
full Implementation Summary, Test Results (PASS), Smoke Check, and Validation
Review (PASS) with every AC checked — yet `src/lib/session.ts` does **not** exist
in this worktree and `grep` finds **no** localStorage usage in `src/` (worktree
clean, branched off `main`). Rebuild from scratch, or trust the stale sections?

**Options considered:**
- *(a) Rebuild for real (chosen).* The prior run's code was never merged to `main`,
  so this branch genuinely lacks it. The stale PASS sections describe code that
  does not exist — trusting them would ship a no-op and lie to the reviewer.
- *(b) Trust the existing sections / mark complete.* Rejected — the deliverable is
  absent; the gates would be grading nothing.

**Decision:** Stripped the orphaned Implementation Summary / Test Results / Smoke
Check / Validation Review sections and reset the AC checkboxes, then rebuilt the
feature and re-ran the test + validate gates against the code actually written.

**Rationale:** Honest evidence requires the gate sections to reflect the real
diff. The plan in Context was sound and the architecture had not drifted from it,
so the rebuild matched the original plan (module placement, lazy-initializer
restore, persist-via-effect).

**Reversibility:** Fully reversible — pure client-side addition (one new module +
~6 lines of wiring); no schema, API, or contract change.

### Implementation Summary

- Added `src/lib/session.ts` — a best-effort localStorage helper exporting
  `loadSession()` / `saveSession()` / `clearSession()` keyed on `freat.session.v1`,
  storing `{ photo, ingredients }`. All three wrap their storage call in try/catch:
  `loadSession` shape-guards the parsed JSON via `isSavedSession` (non-empty photo
  string + non-empty ingredient-shaped list) and returns `null` on any
  corruption/absence; `saveSession` swallows `QuotaExceededError`; `clearSession`
  removes the key. Header comment marks it as a sibling-to-`api.ts` persistence
  seam, not the network path.
- Wired `src/App.tsx`: a lazy `useState(loadSession)` initializer (`const [restored]`)
  restores once on first render, seeding `phase` to `"ingredients"` and
  `photo`/`ingredients` from the saved blob when a session exists. A `useEffect`
  on `[photo, ingredients]` persists whenever both are present
  (`ingredients.length > 0`). `reset()` now calls `clearSession()` first so
  "Start over" wipes the saved session.

**Deviations from plan:**
- None — implementation matched the plan. Module placement (`src/lib/session.ts`),
  restore-via-lazy-initializer, and persist-via-effect all as specified in Context.
  (See the `### Autonomous Decision` block for why the feature was rebuilt rather
  than trusted from the stale prior-run sections that arrived with the ticket.)

**Implementation notes:**
- The half-analyzed state (photo set, analyze in flight, ingredients still `[]`)
  is intentionally **not** persisted — the effect guards on
  `ingredients.length > 0`, and `loadSession` requires a non-empty list — so a
  reload mid-analysis correctly falls back to a fresh capture rather than a stuck
  empty ingredients phase.
- Verified locally before handing to gates: `bun run typecheck` → EXIT 0;
  `bun run build` → `✓ built` with PWA `generateSW` precache 10 entries
  (manifest + `sw.js` emitted), so the installable build is intact.

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Reload restores photo + ingredients + ingredients phase | ✓ | `App.tsx` `const [restored] = useState(loadSession)` lazy initializer; `useState<Phase>(restored ? "ingredients" : "capture")`, `useState(restored?.photo ?? null)`, `useState(restored?.ingredients ?? [])`; ingredients render shows `{photo && <img className="preview" src={photo}>}` + `<IngredientList>`. Persist effect saves when `photo && ingredients.length > 0`. |
| "Start over" clears persisted session | ✓ | `reset()` first line `clearSession();` then `setPhase("capture")` / `setPhoto(null)` / `setIngredients([])`; `clearSession` `removeItem(KEY)` (`session.ts`). Persist guard `if (photo && ingredients.length > 0)` blocks re-saving the empty post-reset state; `isSavedSession` also rejects empty ingredients. |
| Storage failure degrades silently, no console error | ✓ | All 3 storage ops try/catch-wrapped with comment-only catch (`session.ts` `loadSession`/`saveSession`/`clearSession`); `grep -n 'console\.' src/lib/session.ts` → NONE. `loadSession` returns `null` on `JSON.parse` throw and on failed `isSavedSession` shape-guard (photo string + non-empty ingredient[] with string name). |
| `bun run typecheck` passes | ✓ | `bun run typecheck` → `$ tsc --noEmit`, `EXIT=0`. |
| No console errors on initial load (no session, no key) | ✓ | Only load-time call is `loadSession` (`App.tsx`), localStorage-only, never `/api`/Gemini; AI calls gated behind `handlePhoto`/`handleGetRecipes`. No session → `restored=null` → `phase="capture"` → `<PhotoCapture>`. `bun run build` → `✓ built`, PWA `generateSW` precache 10 entries, `dist/sw.js` + manifest emitted. |

**Commands run:**
- `git status && git diff --stat`
- `bun run typecheck; echo EXIT=$?`
- `grep -n 'console\.' src/lib/session.ts`
- `bun run build`

**Notes:** All 5 ACs pass. The only `console.` token in the diff is inside a code
comment ("never throws to the console"), not executable code. Half-analyzed state
(photo set, ingredients `[]`) is intentionally not persisted (effect guard +
`isSavedSession` require a non-empty list), so a mid-analysis reload falls back to
capture rather than a stuck empty ingredients phase.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not installed in `.weave` — `.weave/cache/browsers` absent; browsers are not provisioned in this chaos environment)

A skip is not a pass and never fails the ticket. The smoke runner returned
`{"status":"skipped","reason":"playwright not installed in .weave ..."}`. The
production build was verified manually instead: `bun run build` → `✓ built in
204ms`, PWA `generateSW` precache **10 entries**, `dist/sw.js` + manifest emitted —
confirming the change does not break the installable PWA build.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `saveSession` writes `{photo, ingredients}` to key `freat.session.v1`; persist effect runs on `[photo, ingredients]` saving when `photo && ingredients.length > 0`. Restore: `const [restored] = useState(loadSession)` seeds `phase` (`restored ? "ingredients" : "capture"`), `photo`, `ingredients`; ingredients phase renders `{photo && <img className="preview" src={photo}>}` + `<IngredientList ingredients={ingredients}>`. No drift. |
| Context constraints | ✓ | (a) Restore is a lazy `useState` initializer, NOT an effect (in-code comment cites StrictMode + no capture→ingredients flash). (b) Every storage op try/catch-wrapped with no console call (`loadSession`/`saveSession`/`clearSession` in `session.ts`); `grep 'console\.' src/lib/session.ts` → NONE. (c) Reuses canonical `Ingredient` (`import type { Ingredient } from "./types"`), no redefined shape. |
| Sprawl | ✓ | `git status --porcelain` = ` M src/App.tsx` + `?? src/lib/session.ts` — exactly the two declared `files_touched`. `git diff --stat`: App.tsx +24/−4 only. No config/manifest/sw/package.json/api.ts changes. Zero scope creep. |
| Follow-up surfacing | ✓ | The known empty-list-doesn't-clear-session edge is already filed as TKT-115 (`related: [TKT-115]`). Out-of-Scope items (recipes, RecipePreferences, cross-device) correctly deferred. Nothing new to surface. |
| Architecture coherence | ✓ | (a) No Gemini/key/`/api` touched (ADR-001 + rule #1). (b) No second data path — `api.ts` unchanged, no `fetch(` in components (rule #2). (c) `session.ts` placed as sibling to `api.ts`/`types.ts`; `grep localStorage` across `src/` appears ONLY in `session.ts` — no forked helper. (d) manifest/sw/precache untouched (rule #4). (e) No state-management lib added (package.json unchanged). |

**Suggested new tickets:** none — the one known edge case is already tracked as TKT-115.
