---
id: TKT-110
title: "Accessibility pass: focus, labels, live regions"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
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
next_step_hint: Human review queue: a11y focus/label/live-region pass; smoke skipped (no browser in chaos) — re-run smoke with a provisioned browser.
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

### Implementation Summary

- Added a phase-change focus effect in `src/App.tsx:26-32`: a `useEffect([phase])` that focuses the new view's primary `<h2>` via `mainRef.current?.querySelector("h2")`, guarded by a `firstRender` ref so initial page load is not hijacked. `ref={mainRef}` added to `<main>`.
- Added a polite live region in `src/App.tsx:85-89`: an always-present `visually-hidden` `<div role="status" aria-live="polite">{status}</div>`, placed outside `<main>` (which carries `aria-busy`). `status` is set to a count message on analyze success (`Found N ingredient(s).`) and recipe success (`N meal idea(s) ready.`), and cleared at the start of each async action and on reset.
- Made the three view headings programmatic focus targets with `tabIndex={-1}`: `PhotoCapture.tsx:41`, `IngredientList.tsx:29`, `RecipeList.tsx:13`.
- Restructured `src/components/RecipeList.tsx` to always render its `<h2>Meal ideas</h2>` (the empty state was an early `return <p>` with no heading), so the recipes phase always has a focus target.
- Added a small CSS rule in `src/styles.css` suppressing the focus outline on the two programmatic-focus heading classes (`.capture__heading:focus`, `.section-title:focus`) - they are never keyboard-reachable via Tab, so no visible ring is needed.

**Deviations from plan:**
- None of substance. Label-audit AC required no code change: every interactive control was already labeled (verified PhotoCapture/IngredientList controls); the work was focus + live region + the RecipeList empty-state heading fix.

**Implementation notes:**
- All existing controls already had accessible names, so the "labels" AC was satisfied by verification, not new code.
- `bun run typecheck` and `bun run build` both pass (exit 0).

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Phase-change focus → new view's `<h2 tabIndex=-1>` (all fwd+reverse paths) | ✓ | `App.tsx:26-32` `useEffect(...,[phase])` focuses `mainRef` first `h2`; `tabIndex={-1}` on `PhotoCapture.tsx:41`, `IngredientList.tsx:29`, `RecipeList.tsx:13`; reverse paths set `phase` via `setPhase("ingredients")` (App.tsx Edit) and `reset()`. RecipeList now renders `<h2>` even when empty (was early-`return <p>`). |
| No focus theft on initial load | ✓ | `App.tsx:25-30` `firstRender` ref guard returns before `.focus()` on first render. |
| Every interactive control has an accessible name | ✓ | 9 controls audited: photo button (text), file input (`aria-label="Fridge photo"`), chip remove (`aria-label="Remove …"`), add input (`aria-label`), Add/Start over/Get meal ideas/Edit ingredients/New photo (text), `<summary>Steps</summary>` (text). None unnamed. |
| Analyze + recipe completion announced via single `role=status`/`aria-live=polite` | ✓ | `App.tsx:87-89` one always-present `visually-hidden` `<div role="status" aria-live="polite">{status}</div>` outside `<main>`; `setStatus` count message on analyze (App.tsx:42) and recipes (App.tsx:58); cleared on each request + reset. |
| typecheck + build pass | ✓ | `bun run typecheck` → `tsc --noEmit` exit 0; `bun run build` → `✓ built`, PWA precache 7 entries, exit 0. |

**Commands run:**
- `git diff --stat`, `git diff`, `git show HEAD:src/components/RecipeList.tsx`
- `grep -rn "analyzeFridge|getRecipes|useEffect|fetch(" src`
- `bun run typecheck` (exit 0)
- `bun run build` (exit 0)

**Notes:** AI-laziness confirmed — the only `useEffect` is the focus effect keyed on `[phase]`; `analyzeFridge`/`getRecipes` fire only inside user-action handlers, never on mount. Decorative emoji are `aria-hidden`. Live region correctly kept outside `<main aria-busy>` and always mounted.

### Smoke Check

**Headless Chromium:** SKIPPED (engine unavailable in chaos sandbox — `bun .weave/scripts/smoke.ts --ticket TKT-110` exits 137/SIGKILL with no verdict produced; chaos workers cannot run the browser engine, per CLAUDE.md). A skip is not a pass and never fails the ticket.

Runtime sanity performed manually instead: `PORT=8799 bun run serve` boots, `GET /` → 200 with `<div id="root">`, and `GET /api/health` → `{"ok":true,"geminiConfigured":false,...}` — the app serves and runs keyless with no server error. The full deterministic smoke should be re-run by a human/CI with a provisioned browser.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | All three sub-goals delivered: focus effect `App.tsx:24-32` (+`tabIndex={-1}` on the 3 view `<h2>`), polite live region `App.tsx:87-89` fed on analyze (App.tsx:42) + recipe (App.tsx:58) success, labels intact/not regressed. RecipeList now always renders `<h2>` (was early-return `<p>`) — a genuine fix. |
| Context constraints | ✓ | CLAUDE.md hard rules honored: only `fetch` is in `src/lib/api.ts` (no component fetch); the sole `useEffect` does pure DOM `.focus()` — no AI on mount (smoke stays green keyless); `vite.config.ts`/`index.html` untouched (manifest/SW intact); ADR-001 unchanged. Coherence: reuses existing `.visually-hidden` (styles.css), keeps state-in-App structure, introduces no competing focus mechanism. typecheck clean. |
| Sprawl | ✓ | `git diff --name-only` = exactly the 5 declared files, 0 extra. Minimal (53+/11-), reuses utility class, no new abstraction/dead code. |
| Follow-up surfacing | ✓ | 3 polish observations surfaced (busy/error not politely announced; no skip link; generic preview alt) — none blocking. |

**Suggested new tickets:** 2 filed to `0-backlog` (consolidated from 3 observations):
- `TKT-117` — Announce async busy and error states to screen readers (related: TKT-110).
- `TKT-118` — Add skip-to-main-content link and verify heading hierarchy (related: TKT-110).

**Reviewer note (verbatim):** "Clean, minimal, on-objective a11y pass… respects every CLAUDE.md hard rule and ADR-001… touches only the 5 declared files, and typechecks. The RecipeList restructure is a genuine fix, not drift. Follow-ups are polish, not blockers. Overall PASS."
