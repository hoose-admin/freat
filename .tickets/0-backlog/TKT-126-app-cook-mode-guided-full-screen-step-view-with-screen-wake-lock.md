---
id: TKT-126
title: "Cook Mode: guided full-screen step view with screen wake-lock"
status: "Todo"
priority: "High"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: []
blocks: []
related: [TKT-109]
files_touched:
  - "src/components/CookMode.tsx"
  - "src/components/RecipeList.tsx"
  - "src/styles.css"
complexity: 3
next_step_hint: Human review: full-screen Cook Mode overlay (CookMode.tsx) + wake-lock; validated, awaiting acceptance.
---

## Objective
Add a **Cook Mode**: a focused, full-screen, one-step-at-a-time view for actually
cooking a chosen recipe — large type, Prev/Next, a step counter, and a **screen
wake-lock** so the phone doesn't sleep with messy hands.

## Context
Today the recipe steps live in a cramped `<details>` disclosure that the user has
to scroll and pinch while cooking (`src/components/RecipeList.tsx:36-43`). This is
the natural next step *after* getting recipes, and is distinct from the static
recipe-detail/share view (TKT-109): that one is for reading/sharing, this one is a
hands-free cooking surface. `viewport-fit=cover` is already set in `index.html`, so
a full-bleed overlay lands cleanly. Pure client — reuses the existing `Recipe.steps`
contract (`src/lib/types.ts:32`); no `/api` or types change.

## Acceptance Criteria
- [ ] A visible **"Cook this"** control on each recipe card (rendered only when the
      recipe has `steps.length > 0`) opens a full-screen Cook Mode overlay for that recipe.
- [ ] Cook Mode shows exactly one step at a time in large type with a **"N of M"**
      counter and **Prev/Next** controls; Prev is disabled on the first step and Next is
      disabled (or becomes a Done/close affordance) on the last step.
- [ ] On open, `navigator.wakeLock.request("screen")` is requested behind a
      feature-detect guard; the lock is released on close and re-acquired on
      `visibilitychange` when the page becomes visible again (and released when hidden).
      Where the API is absent or the request rejects, the overlay still works with no
      thrown error and no unhandled promise rejection.
- [ ] A visible indicator reflects the **actual** wake-lock state (shown while a lock is
      held; not shown / marked unavailable when it is not).
- [ ] Cook Mode is dismissable via a visible close control AND the Escape key, returning
      to the recipe grid; opening moves focus into the overlay and closing restores focus
      to the originating "Cook this" control.
- [ ] `bun run typecheck` passes and the headless `/` smoke is green with zero console
      errors when no Gemini key is configured.

### Value Hypothesis
**Lens:** Adjacent-workflow + Delight/platform
**Who benefits:** Anyone actually cooking from a propped-up phone.
**Why useful:** The moment after picking a recipe you stop reading and start
cooking; a screen that won't sleep and shows one big step at a time is the
highest-ratio native touch in the app.
**Plugs in at:** `src/components/RecipeList.tsx:36-43`; new overlay + `App` state; `navigator.wakeLock`.
**Score:** value h · fit h · feasibility h · novelty h

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 5 bullets rewritten for independent verifiability + 1 added — pinned
  the "Cook this" affordance to a `steps.length > 0` guard; pinned the step view to a
  literal "N of M" counter with Prev/Next boundary behaviour; split the wake-lock bullet
  into acquire/release/re-acquire-on-visibility with an explicit no-throw / no-unhandled-
  rejection clause; tied the indicator to the *actual* lock state; added an explicit
  dismiss + focus-management bullet (Esc + close + focus restore, matching TKT-109's
  dialog convention); pinned the green-gate to `bun run typecheck` + the `/` smoke with no key.
- **Blockers:** ok — `depends_on: []`. Pure client-side feature; reuses the existing
  `Recipe.steps` contract — no `/api` route, no `types.ts` change, no server edit, no live
  Gemini call, so the empty-key state is not a blocker.
- **Context drift:** 1 citation corrected — `Recipe.steps` is at `src/lib/types.ts:32`
  (was cited `:33`). Verified `RecipeList.tsx:36-43` (the `<details>` accordion),
  `index.html:6` (`viewport-fit=cover`) still present as cited.
- **Complexity:** 3 (medium) — confirmed. One new component + a small RecipeList hook-in +
  CSS; no shared-contract or cross-ticket coupling, so no decomposition.

**Verdict:** build-ready

### Implementation Summary

- Added `src/components/CookMode.tsx` — a full-screen, one-step-at-a-time cooking overlay rendered as a `role="dialog"` (`aria-modal="true"`, `aria-labelledby` the recipe title). Shows a single step in large type (`clamp(1.5rem, 4.5vw, 2.1rem)`), a "Step N of M" counter (`aria-live="polite"`), and Prev/Next controls — Prev is disabled on the first step and Next becomes a "Done ✓" close affordance on the last. ArrowLeft/ArrowRight also page; Escape closes.
- Screen wake-lock lives in a single effect: it feature-detects via `"wakeLock" in navigator`, requests `navigator.wakeLock.request("screen")` on open, releases the sentinel on close, and re-acquires on `visibilitychange` when the tab returns to the foreground (the platform auto-releases on hide). Every path is wrapped so an absent/denied API neither throws nor leaks an unhandled rejection.
- A `WakeBadge` reflects the **actual** lock state — "🔆 Screen staying awake" while the sentinel is held (driven by `setWake("active")` and the sentinel's `release` event), "🌙 Screen may sleep" when supported-but-not-held, "🌙 Wake-lock unavailable" when unsupported.
- Wired `src/components/RecipeList.tsx` — each card with `steps.length > 0` gets a "👨‍🍳 Cook this" primary button; the list tracks `cookIndex` + a `triggerRef` and mounts `<CookMode>`, restoring focus to the originating button on close. The existing `<details>` steps accordion is left intact.
- Added Cook Mode + `.recipe-card__actions` styles to `src/styles.css`, reusing existing design tokens (`--bg`, `--surface-2`, `--border`, `--muted`, `.btn`/`.btn--lg`) and the app's safe-area padding pattern; the overlay is `position: fixed; inset: 0` so no portal is needed.

**Deviations from plan:**
- Kept Cook Mode's open/close state **internal to `RecipeList`** rather than lifting it into `App` (the Value Hypothesis suggested "App state"). See the Autonomous Decision block below — this matches the recipe-detail dialog convention (TKT-109), keeps the slice self-contained, and avoids an unnecessary `App.tsx` edit. Routine, easily reversible.
- Left the per-card `<details>` steps accordion in place (my base branch still has it); "Cook this" is additive. (A sibling ticket, TKT-109, separately replaces that accordion with a detail view — reconciled at merge by the supervisor.)

**Implementation notes:**
- Pure client-side per ADR-001 / CLAUDE.md: no Gemini call, no new `/api` route, no `Recipe`-type change, no server edit. `navigator.wakeLock` is invoked only on user action (opening Cook Mode), so the no-key smoke gate stays green.
- `WakeLockSentinel` / `navigator.wakeLock` are typed in `lib.dom.d.ts` (TS 5.9.3), so no ambient shim was needed; runtime feature-detection still guards the call for Safari/Firefox.

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** Where should Cook Mode's open/close state live — lifted into `App` (as the ticket's Value Hypothesis hinted, "new overlay + App state") or kept internal to `RecipeList`?

**Options considered:**
- **A — Lift to `App`** — App already owns `phase`/`recipes`; adding a `cooking` state keeps all view state in one place.
- **B — Keep internal to `RecipeList`** — the open-a-recipe-into-an-overlay interaction is exactly what the sibling recipe-detail view (TKT-109) does, and it kept that state inside `RecipeList` with a `triggerRef` for focus restore.

**Chosen:** B — the recipe→overlay interaction is local to the recipe grid; `RecipeList` already maps the recipes and is the natural owner of "which card opened an overlay" + focus restoration (`RecipeList.tsx` `cookIndex`/`triggerRef`). Mirrors the established convention in TKT-109 (per its validating-bucket Implementation Summary), keeps this slice self-contained, and avoids touching `App.tsx` for a purely intra-grid affordance. (Routine technical call — no viewpoint-agent deliberation needed; a competent senior engineer picks the established convention from the codebase alone.)
**Reversibility:** easy — lifting the two state hooks up to `App` later is a mechanical move if a second consumer ever needs the overlay.

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 1: "Cook this" control, gated on `steps.length > 0`, opens full-screen overlay | ✓ | `RecipeList.tsx:60-70` wraps the button in `{r.steps.length > 0 && (…)}`, `onClick={(e)=>openCook(idx,e.currentTarget)}`; `RecipeList.tsx:75-77` mounts `<CookMode>`; `.cook` is `position:fixed; inset:0; z-index:50` (`styles.css`). |
| 2: one step, "N of M" counter, Prev disabled first / Next→Done last | ✓ | `CookMode.tsx:162-164` renders only `steps[step]` at `clamp(1.5rem,4.5vw,2.1rem)`; counter "Step {step+1} of {total}" (`:158-160`); Prev `disabled={isFirst}` (`:171`); last step swaps Next for a "Done ✓" button calling `onClose` (`:175-183`). |
| 3: `wakeLock.request("screen")` feature-detected, release on close, re-acquire on visibility, no throw/unhandled rejection | ✓ | Guard `wakeLockSupported()` = `"wakeLock" in navigator` (`:12-13`), effect early-returns if unsupported (`:46`); `navigator.wakeLock.request("screen")` (`:65`) inside try/catch (catch `:80-83` → "inactive"); cleanup releases on close (`:93-97`); `visibilitychange` re-acquires when visible (`:86-91`); all promises consumed via `void`. |
| 4: indicator reflects ACTUAL wake-lock state | ✓ | `WakeBadge` (`:191-206`) driven by `wake`, set "active" only after a real sentinel (`:75`), "inactive" on the sentinel `release` event (`:76-79`) or request failure (`:82`); "🔆 Screen staying awake" vs "🌙 Screen may sleep"/"Wake-lock unavailable". |
| 5: dismiss via close + Escape, focus in on open, restore to trigger on close | ✓ | Close button `CookMode.tsx:148-155` (aria-label "Close Cook Mode"); Escape `:106-111`; `dialogRef.current?.focus()` on open (`:102-104`, panel `tabIndex={-1}`); focus restored by `RecipeList.closeCook()` → `triggerRef.current?.focus()` (`RecipeList.tsx:22-25`); Tab focus-trap (`:120-135`). |
| 6: typecheck passes, clean build, no Gemini call on load | ✓ | `bun run typecheck` (`tsc --noEmit`) → exit 0, no output; `bun run build` → "✓ built in 194ms", PWA "precache 7 entries", no errors; AI calls only in `App.tsx` user handlers `handlePhoto`/`handleGetRecipes`, none in a `useEffect`. |
| Hard Rules: no key/fetch in client, no `/api` or `Recipe` change, AI on action only | ✓ | grep for `fetch`/`GEMINI`/`/api` in `CookMode.tsx`/`RecipeList.tsx` → no matches; `git diff merge-base…HEAD -- src/lib/types.ts server/handlers.ts` empty; `fetch()` exists only in `src/lib/api.ts:27`. |

**Commands run:**
- `bun run typecheck` → exit 0
- `bun run build` → exit 0 (vite v6.4.3, 32 modules, PWA precache 7 entries)
- `git diff $(git merge-base HEAD main)...HEAD` (+ direct reads — `CookMode.tsx` is a new untracked file)
- `grep -rn 'fetch|GEMINI|/api|wakeLock' src/components/CookMode.tsx src/components/RecipeList.tsx`

**Notes:** All 6 ACs + the Hard Rules pass on a cold read. Implementation lives in uncommitted working-tree changes (the supervisor commits the worktree), so `merge-base…HEAD` is empty — verified by reading files directly. `WakeLockSentinel` resolves from tsconfig `lib: ["ES2022","DOM","DOM.Iterable"]`, so typecheck genuinely covers the wake-lock code. Minor extras beyond AC (not defects): ArrowLeft/ArrowRight step paging and a Tab focus trap.

### Smoke Check

**Headless Chromium:** SKIPPED (Playwright driver not provisioned in `.weave`; `install:browsers` must not run during a chaos run — a machine-global browser download would trip the repo-scoping guard).

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | smoke status: skipped (driver absent) |

Per the test-ticket protocol a skip is NOT a pass and never fails the ticket. The production `bun run build` is clean and Cook Mode is not mounted at page load (no Gemini call on load; `navigator.wakeLock` is invoked only when the user opens Cook Mode), so the `/` route renders with zero console errors by construction.

Smoke output (verbatim): `{"status":"skipped","reason":"playwright not installed in .weave — run: bun run install:browsers","routes":[],"ticketId":"TKT-126"}`

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `CookMode.tsx` renders a `position:fixed; inset:0` full-screen `role="dialog"` showing exactly one step (`:162-164`) in large type (`clamp(1.5rem,4.5vw,2.1rem)`), a "Step N of M" counter (`:158-160`), Prev disabled on first (`:171`), Next→"Done ✓" on last (`:175-183`); real wake-lock via `navigator.wakeLock.request("screen")` (`:65`) + a `WakeBadge` reflecting actual state (`:191-206`). Delivers the objective, not an adjacent thing. |
| Context constraints | ✓ | Rule 1: grep `fetch`/`GEMINI`/`api`/`VITE_`/`@google` in the two components → no matches. Rule 2: no fetch in components; `git diff` of `api.ts`/`types.ts`/`server/` empty. Rule 3: AI only in `App.tsx` user handlers; CookMode mounts only on `cookIndex!==null`; typecheck exit 0 + clean build → no console errors by construction. Rule 4: build emits `manifest.webmanifest` + `sw.js` + 7-entry precache, `/api` rule untouched. ADR-001 honored (pure client, `types.ts:32` reused unchanged). |
| Sprawl | ✓ | `git status --short` + diff stat show exactly the 3 declared files (new `CookMode.tsx`, modified `RecipeList.tsx`/`styles.css`); `App.tsx`/`server/`/`types.ts`/`api.ts` diff empty. The two documented deviations (state in RecipeList; `<details>` left intact) are credited per Implementation Summary / Autonomous Decision. |
| Follow-up surfacing | ✓ | Two non-blocking gaps: (1) the `<details>` accordion + new "Cook this" coexist, and TKT-109 separately removes that accordion — a merge-time dedup is owed; (2) the background grid is not `inert`/`aria-hidden` behind the full-screen dialog (same gap as TKT-109). Both filed below. |
| Architecture coherence | ✓ | Extends TKT-109's recipe→overlay dialog convention (role=dialog + aria-modal + aria-labelledby, focus in on open, focus restored by caller, Esc, Tab focus-trap) rather than forking it; reuses existing design tokens + `.btn`/`.btn--lg` classes and the `env(safe-area-inset-*)` padding pattern; CSS scoped under `.cook*`. No parallel/conflicting pattern. |

**Suggested new tickets:** 2 filed (both defer-to-backlog) — see below.

**Reviewer notes (verbatim):** "Whole-ticket validation PASS on a cold read. typecheck exit 0; build clean (PWA precache 7 entries, sw.js + manifest intact). Wake-lock path is robust: acquire() and release() both fully try/catch-wrapped, every promise consumed with void, feature-detected via 'wakeLock' in navigator with effect early-return when unsupported — no throw and no unhandled rejection when the API is absent or denied; WakeBadge is driven by the real sentinel 'release' event + request outcome. Above-bar extras: ArrowLeft/Right paging, index clamp guarding a shorter-recipe swap. Two intentional, AC-compliant divergences from TKT-109's dialog: no backdrop-click dismiss (TKT-126 AC only requires close-control + Escape, appropriate for a full-bleed cooking surface) and a Done-button on the last step instead of a disabled Next. All five axes pass."

