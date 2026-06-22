---
id: TKT-103
title: "Polished loading, empty, and error states"
status: "Complete"
priority: "High"
assignee: "Claude-Agent"
created: 2026-06-21
completed: 2026-06-22
domain: "app"
tags:
  - ux
  - frontend
depends_on: []
blocks: []
related: []
files_touched:
  - "src/App.tsx"
  - "src/components/Loading.tsx"
  - "src/components/IngredientList.tsx"
  - "src/components/RecipeList.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Human review: loading/empty/error/retry polish validated (all axes pass); approve to land the chaos/TKT-103 branch.
chaos_branch: chaos/TKT-103
merged: 2026-06-22
merge_commit: e532222cf85b
---

## Objective

Make the capture → ingredients → recipes flow feel responsive and forgiving:
show a clear loading indicator while Gemini is working, give the empty
ingredient/recipe states a concrete next step, and turn errors into something
the user can recover from with a single retry tap. Frontend-only — no API or
contract changes.

## Context

- `src/App.tsx` owns the whole flow's busy/error state: `busy` (`:15`) and
  `error` (`:16`). `handlePhoto` (`:18`) and `handleGetRecipes` (`:33`) are the
  two async actions that call Gemini through `src/lib/api.ts`. The error banner
  at `:65-69` is `role="alert"` but has **no retry affordance** — the user must
  re-trigger the action manually (re-pick a photo, or hit "Get meal ideas"
  again). This is the main gap.
- During **analyze**, `phase` stays `"capture"` until success (`:25`), so the
  only feedback is `PhotoCapture`'s button flipping to "Reading photo…"
  (`src/components/PhotoCapture.tsx:45-47`) — which actually means "reading the
  file", and stays stuck on that label through the whole network call. There is
  no spinner/skeleton.
- During **recipes**, the only feedback is the primary button text flipping to
  "Thinking…" (`src/App.tsx:86`). No skeleton for the incoming cards.
- Empty states already exist but are thin: `IngredientList` (`:33-36`) and
  `RecipeList` (`:8-9`) each render one muted sentence. The "helpful next step"
  bar is low but should point at a concrete action.
- Error typing is already centralized: `ApiRequestError` carries `code` and
  `status` (`src/lib/api.ts:13-22`); `messageFor` (`src/App.tsx:114`) maps
  `GEMINI_KEY_MISSING` to a friendly message. Retry should re-run the **last
  attempted action**, not a hardcoded one.
- Design system is plain CSS in `src/styles.css` (tokens at `:1-14`,
  `.banner--error` `:164-168`, `.btn` family `:114-149`). Add a spinner/skeleton
  there using the existing tokens; do not pull in a UI dependency (matches the
  no-extra-deps posture in `CLAUDE.md` / ADR-001).
- Hard rules from `CLAUDE.md`: AI is lazy (no Gemini on load), one data-fetching
  path (`src/lib/api.ts`), zero console errors with no key set (smoke gate). A
  loading/error pass must not violate any of these.

## Acceptance criteria

- During an analyze call, a **visible, labeled loading indicator** (spinner or
  skeleton, not just a disabled button) is shown in the main area; it appears
  when the call starts and is removed when it resolves or errors.
- During a recipes call, the same loading treatment is shown (spinner or recipe
  skeleton) in place of / above the recipe area.
- The error banner renders a **Retry button** that re-runs the *last attempted
  action* (analyze with the same photo, or recipes with the same ingredients);
  clearing/replacing the input still works.
- The ingredient empty state and the recipe empty state each present a concrete
  next step (e.g. "add an ingredient", "edit ingredients") wired to a real
  control or instruction — not a dead-end sentence.
- `bun run typecheck` passes with no new errors.
- Headless smoke (`bun .weave/scripts/smoke.ts --ticket TKT-103`) is green:
  the app renders `/` with zero console errors and no stuck spinner when no
  Gemini key is configured.

## Out of scope

- Any change to the `/api/*` contract, `src/lib/types.ts`, or server code.
- Live-AI validation (no key is set; loading/empty/error states are all
  reachable without a real Gemini call by exercising the error path).

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — six bullets, each independently verifiable (a visible
  spinner during analyze / during recipes, a retry button re-running the last
  action, concrete empty-state next steps, `bun run typecheck`, headless smoke).
- **Blockers:** ok — `depends_on: []`; this is a self-contained frontend pass.
- **Context drift:** ok — all citations verified against the worktree:
  `App.tsx:15/16/18/33/65-69/86/114`, `PhotoCapture.tsx:45-47`,
  `IngredientList.tsx:33-36`, `RecipeList.tsx:8-9`, `api.ts:13-22`,
  `styles.css` tokens + `.banner--error` + `.btn`.
- **Complexity:** confirmed 2 (small) — localized to App.tsx + two components +
  CSS; no contract/server changes.

**Verdict:** build-ready


### Implementation Summary

- Added `src/components/Loading.tsx` — a small `role="status"` / `aria-live="polite"` spinner+label block. Rendered in `App.tsx` for both AI calls: "Looking at your fridge…" during analyze (capture phase, replaces `PhotoCapture` while `busy`) and "Cooking up meal ideas…" during recipes (ingredients phase, replaces the action buttons while `busy`).
- `App.tsx`: captured the last attempted AI action in a `lastAction` ref (set at the top of `handlePhoto`/`handleGetRecipes`, cleared in `reset`). The error banner now renders a **Retry** button that re-invokes `lastAction.current` — re-running analyze with the same photo or recipes with the same ingredients, no re-input needed. Banner hides while `busy`.
- `RecipeList.tsx`: empty state is now a full card with a heading and an **Edit ingredients** button (new optional `onEditIngredients` prop, wired by `App.tsx` to jump back to the ingredients phase) instead of a dead-end sentence.
- `IngredientList.tsx`: reworded the empty state to a concrete next step that points at the add-ingredient input directly below it.
- `styles.css`: added `.loading` / `.spinner` (CSS keyframe, with a `prefers-reduced-motion` slow-turn fallback so the spinner never reads as frozen), `.btn--sm`, `.banner--error` flex layout + `.banner__msg`, and `.recipes--empty`. No new dependencies (honors ADR-001 / CLAUDE.md no-extra-deps posture).

**Deviations from plan:**
- None — implementation matched the plan. Loading is a single reusable component used for both calls rather than two inline blocks; that was the intended lean approach.

**Implementation notes:**
- No load-time AI calls or spinners added, so the smoke gate's `/` render stays spinner-free and console-clean with no Gemini key set.
- No `/api/*`, `types.ts`, or server changes — frontend-only, as scoped.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 1 · loading during analyze | ✓ | `App.tsx:87-92` renders `<Loading label="Looking at your fridge…" />` while `busy` (set `:27`, cleared `:35`) else `PhotoCapture`. `Loading.tsx:11-17` is a real `role="status"` div with a `.spinner` span; `styles.css` `.spinner` is a 36px `animation: spin 0.8s` circle — not just a disabled button. |
| 2 · loading during recipes | ✓ | `App.tsx:98-100` ingredients phase renders `<Loading label="Cooking up meal ideas…" />` while `busy` (set `:42`, cleared `:50`) in place of the action buttons. Same Loading/spinner. |
| 3 · error banner Retry re-runs last action | ✓ | `App.tsx:21` `lastAction` ref; set `:24` `() => handlePhoto(dataUrl)` (analyze, same photo) and `:40` `() => handleGetRecipes()` (recipes, same ingredients). Banner `:73-85` renders Retry button `:77-83` → `lastAction.current?.()`. Input editing unaffected (`IngredientList.tsx:13-25`). |
| 4 · actionable empty states | ✓ | `IngredientList.tsx:33-37` empty copy "type one in the box below to start" → add form `:55-66`. `RecipeList.tsx:10-23` empty state renders an "Edit ingredients" button via `onEditIngredients`, passed from `App.tsx:119`. Both wired, no dead ends. |
| 5 · typecheck passes | ✓ | `bun run typecheck` → `tsc --noEmit`, zero output, exit 0. |
| 6 · smoke green / AI is lazy | ⚠ smoke skipped (see below); lazy ✓ | `analyzeFridge`/`getRecipes` invoked only at `App.tsx:29` (in `handlePhoto`) and `:44` (in `handleGetRecipes`) — no `useEffect`/mount-time fetch anywhere. Supplementary: prod server boots, `GET /api/health` → `{"ok":true,"geminiConfigured":false}` (no crash with empty key), `/` serves the app shell, JS bundle → HTTP 200. |

**Commands run:**
- `bun run typecheck` (exit 0)
- `bun run build` (clean, 32 modules, PWA generated)
- `bun .weave/scripts/smoke.ts --ticket TKT-103` → `{"status":"skipped"}`
- `PORT=8799 bun run server/index.ts` + `curl /api/health` + `curl /`

### Smoke Check

**Headless Chromium:** SKIPPED — `playwright not installed in .weave — run: bun run install:browsers`

A chaos run cannot provision the browser engine: `.weave/scripts/install-browsers.ts` documents that it "must never run during a chaos run (the repo-scoping guard would, correctly, treat a machine-global install as a violation)." Per the `test-ticket` protocol a skipped smoke is recorded as skipped and never fails the ticket. Substitute runtime evidence (prod server boot + `/api/health` + `/` + JS bundle 200, all clean with no key) is captured above; the verifier confirmed no load-time AI call exists, which is the runtime-error class smoke would catch on `/`.

**Notes:** Verifier note — the error banner is gated on `!busy` (`App.tsx:73`) so the spinner and error never show together; spinner respects `prefers-reduced-motion`. The `.btn--sm` Retry class is defined at `styles.css` (`.btn--sm`).

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Loading rendered while `busy` in both phases (`App.tsx:88-92`, `:98-99`) via `role="status"` spinner (`Loading.tsx:13`); empty states reworded/actionable (`IngredientList.tsx:34-37`, `RecipeList.tsx:10-24` "Edit ingredients"); error banner Retry re-runs the exact failed call (`App.tsx:73-85`, `lastAction` set `:24`/`:40`). |
| Context constraints | ✓ | No key/env read in `src/` (only footer text + `GEMINI_KEY_MISSING` code compare); single fetch path — `fetch(` only in `src/lib/api.ts:27`; AI lazy (Loading only in `busy` branches, never load-time); `vite.config.ts` unchanged (PWA/manifest/`NetworkOnly /api` intact); no new deps. |
| Sprawl | ✓ | `git diff --name-only` = exactly the declared set (App.tsx, IngredientList, RecipeList, styles.css) + new Loading.tsx. Zero extra files. |
| Follow-up surfacing | ✓ | No in-scope omissions warranting a ticket; only non-blocking nits (intentional `!busy` banner gate, Retry unreachable while busy). |
| Architecture coherence | ✓ | Extends, doesn't fork: reuses `ApiRequestError`/`messageFor` + existing `.banner--error` base (flex added in place); `onEditIngredients` is an additive optional prop; `types.ts`/`api.ts`/server untouched; new component follows the default-export+Props convention. Honors ADR-001 spine. |

**Suggested new tickets:** none

**Reviewer notes:** Tight, well-scoped frontend-only change; all four CLAUDE.md hard rules hold; typecheck clean; coherent with ADR-001. All five axes pass.
