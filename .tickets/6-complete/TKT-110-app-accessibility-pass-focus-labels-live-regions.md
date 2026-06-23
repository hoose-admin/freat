---
id: TKT-110
title: "Accessibility pass: focus, labels, live regions"
status: "Complete"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
completed: 2026-06-22
domain: "app"
tags:
  - a11y
  - frontend
depends_on: []
blocks: []
related: []
files_touched:
  - "src/App.tsx"
  - "src/components/IngredientList.tsx"
  - "src/components/PhotoCapture.tsx"
  - "src/components/RecipeList.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Human review queue — a11y focus/label/live-region pass validated; re-run headless smoke with a provisioned browser in CI.
chaos_branch: chaos/TKT-110
merged: 2026-06-22
merge_commit: 6b0c2be2be1f
---

## Objective

Foundational accessibility pass across the capture->ingredients->recipes flow:
move keyboard/screen-reader focus to the new view's heading on phase change,
guarantee every interactive control has an accessible name, and announce async
(analyze / recipe) completion through a polite `aria-live` region.

## Context

- `src/App.tsx` - the phase state machine (`type Phase` line 8, `phase` state
  line 11). Phase changes in `handlePhoto` (line 18->25) and `handleGetRecipes`
  (line 33->39) swap the rendered view but **never move focus** - a keyboard/SR
  user is stranded on a now-unmounted button (focus falls to `<body>`). `<main>`
  carries `aria-busy={busy}` (line 64); the error banner is `role="alert"`
  (line 66). No live region announces successful completion.
- `src/components/PhotoCapture.tsx` - `<h2 class="capture__heading">` (line 41);
  the trigger button has a text label; the file input has `aria-label="Fridge
  photo"` (line 55). **Already labeled** - no change expected.
- `src/components/IngredientList.tsx` - `<h2 class="section-title">` (line 29);
  remove buttons carry an `aria-label` of `Remove <name>` (line 45); the add
  input has an `aria-label` (line 60). **Already labeled** - no change expected.
- `src/components/RecipeList.tsx` - **early-returns a `<p>` with no heading**
  when `recipes.length === 0` (lines 8-9); the populated path's `<h2>` is at
  line 14. The empty path therefore has no focus target for the recipes phase.
- `src/styles.css` - `.visually-hidden` utility already exists (line 305) and is
  the pattern for SR-only content; `.input:focus-visible` outline at line 235.
- `CLAUDE.md` hard rules: AI is lazy (never call Gemini on load); every route
  must render with **zero console errors** when no key is configured (smoke gate).

## Acceptance criteria

- On every phase change (capture->ingredients, ingredients->recipes, and the
  reverse "Edit ingredients" / "Start over" / "New photo" paths), keyboard focus
  moves to the new view's primary `<h2>`, made focusable with `tabIndex={-1}`.
- Focus is **not** stolen on initial page load (the capture view's button stays
  reachable normally; the focus effect skips the first render).
- Every interactive control (buttons, text input, file input, `<summary>`) has a
  non-empty accessible name - verifiable by reading each control across
  `App.tsx` + the three components.
- Analyze completion and recipe completion are each announced via a single,
  always-present `aria-live="polite"` (role `status`) region carrying a
  result-count message (e.g. "Found N ingredients", "N meal ideas ready").
- `bun run typecheck` passes, and the capture view renders with **zero console
  errors** when no Gemini key is configured (headless smoke stays green).

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 1 bullet split - the original "focus moves to new heading/region" now names the concrete mechanism (focusable `<h2 tabIndex={-1}>`) and a separate bullet pins the "no focus-steal on initial load" requirement so it is independently testable.
- **Blockers:** ok - `depends_on` empty; no active prerequisite.
- **Context drift:** ok - all 11 file:line citations (App.tsx, the three components, styles.css) re-verified against current source; the RecipeList empty-state early-return (no heading) confirmed as the one real focus-target gap.
- **Complexity:** ok - re-rated, stays 2 (small: one focus effect + one live region + a RecipeList empty-state tweak + tabIndex on three headings).

**Verdict:** build-ready

## Out of scope

- Live `getUserMedia` camera preview (separate backlog item).
- Full WCAG 2.2 AA audit / color-contrast remediation - this is the focused
  foundational pass only.

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode - no human input)
**Question:** How should App move focus to the new view's heading on phase change, given the three headings live inside child components (PhotoCapture / IngredientList / RecipeList)?

**Options considered:**
- **A - main-ref + `querySelector('h2')`** - App holds one ref on `<main>`; the phase effect queries the new view's single `<h2>` and focuses it. Each heading gets `tabIndex={-1}`. Lean, one effect, no child API changes.
- **B - `forwardRef` on all three child components** - each child forwards a ref to its `<h2>`; App threads three refs and picks the active one. Most "React-idiomatic" but adds a ref-forwarding API to three components for a one-line focus call.
- **C - focus the section container instead of the heading** - focus the wrapping `<section>`; avoids per-heading tabIndex but the SR reads the whole container, not the concise heading.

**Chosen:** A - the phase effect runs `mainRef.current?.querySelector<HTMLElement>("h2")?.focus()` (`src/App.tsx:26-32`). Each view has exactly one primary `<h2>` (`PhotoCapture.tsx:41`, `IngredientList.tsx:29`, `RecipeList.tsx:13`), so the query is unambiguous; `RecipeList` was restructured to always render its `<h2>` (even in the empty state) to guarantee a target. This is the standard SPA route-change focus pattern (WAI/Deque: `tabindex="-1"` heading + programmatic `.focus()`) and avoids burdening three components with a ref API for a single call - far less code than B, more concise SR output than C.
**Reversibility:** easy - swap the one `querySelector` line for forwarded refs (B) without touching the headings' `tabIndex` or the live region.

### Re-build note

**Run:** 2026-06-22 (chaos mode — fresh worktree off current `main`)

A prior chaos attempt (2026-06-21) implemented this ticket but its
`chaos/TKT-110` branch was never merged, so the change was absent from `main`.
This run re-implements the same approach (Autonomous Decision **A**, above)
against current `main` — which has since gained Cook Mode, the shopping list,
and the camera-capture flow. The stale execution sections from that prior run
were removed; the sections below describe THIS diff. One spec note is now
obsolete: `RecipeList` already renders its `<h2>` in the empty state (fixed by
TKT-154), so no restructure was needed here — only `tabIndex={-1}` was added.

### Implementation Summary

- **Phase-change focus effect** in `src/App.tsx`: a `useEffect` keyed on
  `[phase]` focuses the new view's primary `<h2>` via
  `mainRef.current?.querySelector("h2")?.focus()`, guarded by a `firstRender`
  ref so the initial page load does not steal focus from the capture button.
  `ref={mainRef}` added to `<main>`.
- **Always-present polite live region** in `src/App.tsx`: a `visually-hidden`
  `<div role="status" aria-live="polite">{status}</div>` placed outside `<main>`
  (which carries `aria-busy`) and never conditionally unmounted. `status` is set
  to a count message on analyze success (`Found N ingredient(s).`) and recipe
  success (`N meal idea(s) ready.`), and cleared at the start of each async
  action and on `reset()`.
- **Programmatic focus targets**: `tabIndex={-1}` added to the three view
  headings — `PhotoCapture.tsx` (`.capture__heading`), `IngredientList.tsx`
  (`.section-title`), and both `RecipeList.tsx` `<h2>` (empty + populated paths).
- **CSS**: suppressed the focus ring on the programmatic-focus headings
  (`.capture__heading:focus`, `.section-title:focus`) in `src/styles.css` — they
  are never Tab-reachable, so a visible ring would only flash.

**Deviations from plan:**
- The label-audit AC required no code change: every interactive control across
  `App.tsx` + the three components already has a non-empty accessible name
  (verified, not added).
- No `RecipeList` restructure (the prior run's plan) — the empty-state `<h2>`
  already exists on current `main` (TKT-154); only `tabIndex` was added.

**Implementation notes:**
- `bun run typecheck` (exit 0) and `bun run build` (exit 0; PWA precache 10
  entries, no `/api` precached) both pass. AI stays lazy — the sole `useEffect`
  does pure DOM `.focus()`; no Gemini call on mount.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Phase-change focus → new view's `<h2 tabIndex=-1>` (all fwd + reverse paths) | ✓ | `App.tsx:39-45` `useEffect([phase])` runs `mainRef.current?.querySelector("h2")?.focus()`; `ref={mainRef}` on `<main>`. All transitions mutate `phase`: capture→ingredients (`handlePhoto` setPhase), ingredients→recipes (`handleGetRecipes` setPhase), recipes→ingredients ("Edit ingredients" + RecipeList empty-state button → `setPhase("ingredients")`), any→capture ("Start over" = `reset()` `setPhase("capture")`). `tabIndex={-1}` on `PhotoCapture.tsx:150`, `IngredientList.tsx:41`, `RecipeList.tsx:43` (empty) + `:61` (populated). Each view renders exactly one `<h2>`. |
| No focus theft on initial load | ✓ | `App.tsx:40-43` `firstRender` ref guard returns before `.focus()` on first render (`firstRender = useRef(true)`). |
| Every interactive control has a non-empty accessible name | ✓ | 16 controls enumerated across the 4 files: all named by visible text or `aria-label` (`Fridge photo`, `Add an ingredient`, `Remove <name>`); checkbox named by wrapping `<label>` "Add to shopping list"; `<summary>Steps</summary>`; decorative emoji `aria-hidden`. No unnamed control. |
| Analyze + recipe completion announced via single always-present `role=status` / `aria-live=polite` | ✓ | `App.tsx:189-191` one unconditional `visually-hidden` `<div role="status" aria-live="polite">{status}</div>` outside `<main>`; set on analyze (`Found N ingredient(s).`) + recipes (`N meal idea(s) ready.`); cleared at each async start + `reset()`. `.visually-hidden` uses clip/clip-path (not display:none) so it stays announceable. |
| typecheck passes + AI lazy (no load-time Gemini call) | ✓ | `bun run typecheck` → `tsc --noEmit` exit 0; `bun run build` exit 0 (precache 10 entries, no `/api`). Sole App effect does pure DOM `.focus()`; `analyzeFridge`/`getRecipes` only inside user-action handlers; `getUserMedia` only in `openCamera`. |

**Commands run:**
- `git -C <worktree> diff --stat`, `git -C <worktree> diff`
- `bun run typecheck` (exit 0), `bun run build` (exit 0)
- `grep -rnE '<button|<input|<summary|useEffect|analyzeFridge|getRecipes|fetch\(' src/...`

**Notes:** AI-laziness confirmed — the only `useEffect` is the `[phase]` focus effect; analyze/recipes fire only on user action. The ticket's older "New photo" reverse label no longer exists; current reverse controls are "Start over" + "Edit ingredients", both covered by the phase effect (consistent with the Re-build note).

### Smoke Check

**Headless Chromium:** SKIPPED (`playwright not installed in .weave — run: bun run install:browsers`). Per the test gate, a skip is not a pass and never fails the ticket; re-run with a provisioned browser in CI.

Runtime sanity performed manually instead: `PORT=8799 bun run serve` boots; `GET /` → 200 with `<div id="root"></div>`; `GET /api/health` → `{"ok":true,...}`. The app serves and runs with no server error; the diff is load-time-inert (no AI on mount), so the capture view stays console-clean.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | All three goals delivered: phase-focus effect `App.tsx:33-39` (+`firstRender` guard, `ref={mainRef}` on `<main>`, `tabIndex={-1}` on `PhotoCapture.tsx:150` / `IngredientList.tsx:41` / `RecipeList.tsx:43`+`:61`); polite live region `App.tsx:189-191` fed on analyze + recipe success, cleared on each async start + `reset()`; labels verified intact (no control unnamed). No drift. |
| Context constraints | ✓ | CLAUDE.md hard rules honored: no `process.env`/`import.meta.env`/`VITE_`/key read in `src/`; only `src/lib/api.ts` calls `fetch` (no component fetch); sole new `useEffect` does pure DOM `.focus()` — AI stays lazy; `vite.config.ts`/`index.html`/`public/` untouched (manifest/SW/precache intact). typecheck exit 0. |
| Architecture coherence | ✓ | Reuses existing `.visually-hidden` (`styles.css:445`) rather than inventing an SR-only class; keeps App as the single state owner (`status` is plain `useState` alongside `phase`/`busy`/`error`); no live-region conflict — the new `role="status"` is separate from `Loading`'s `role="status"` (only mounted while busy) and the banner's `role="alert"`. Honors ADR-001 (no client Gemini; `/api` contract untouched). Standard WAI/Deque route-change focus pattern. |
| Sprawl | ✓ | `git diff --name-only` = exactly the 5 declared files; `git status --porcelain` shows no untracked/extra files. |
| Follow-up surfacing | ✓ | 2 in-scope-adjacent gaps surfaced (live-camera idle↔live toggle has no focus move/heading; async error banner not folded into focus management) — both correctly out of THIS ticket's phase-change scope; filed to backlog (see below). |

**Reviewer note (verbatim):** "PASS. Clean, minimal, on-spec implementation: one focus effect + one polite live region + tabIndex on three headings + a 4-line CSS focus-ring suppression, across exactly the 5 declared files. Reuses existing utilities/state ownership, no conflict with the Loading role=status or error role=alert regions, all CLAUDE.md hard rules honored, typecheck exit 0."

**Suggested new tickets (routed via spawn-ticket-mid-flow, both `defer-to-backlog`):**
- **TKT-158** — A11y: focus + announce PhotoCapture live-camera toggle (the `idle↔live` swap is local state outside App's phase machine, uncovered by this pass). Filed to `0-backlog`.
- Error-banner focus-management follow-up — **deduped into existing TKT-117** ("Announce async busy and error states to screen readers"); not refiled.
