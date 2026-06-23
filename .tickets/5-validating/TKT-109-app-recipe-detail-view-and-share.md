---
id: TKT-109
title: "Recipe detail view and share"
status: "Validating"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - ux
  - feature
depends_on: []
blocks: []
related: [TKT-126, TKT-140]
files_touched:
  - "src/components/RecipeList.tsx"
  - "src/components/RecipeDetail.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: "Build: add a RecipeDetail modal mirroring CookMode's dialog convention (focus-trap, Esc, caller-restored focus) + Web-Share/clipboard, swap the card <details> accordion for a 'View recipe' button."
---

## Objective

Let users open any meal idea into a focused detail view showing the full recipe
(title, meta, description, ingredients used/needed, and all steps), and share an
individual recipe via the Web Share API with a clipboard-copy fallback. Today
steps are buried in a per-card `<details>` accordion and there is no way to share
a single recipe.

## Context

- `src/components/RecipeList.tsx` renders the recipe grid. Steps currently live in
  a `<details className="recipe-card__steps">` accordion (`RecipeList.tsx:101-110`).
  TKT-126 (Cook Mode) since added a "👨‍🍳 Cook this" button (`RecipeList.tsx:112-122`)
  that opens the `CookMode` overlay, and tracks `triggerRef` + restores focus on
  close (`RecipeList.tsx:24-38`). The detail view replaces the `<details>` accordion
  with an explicit "View recipe" affordance opening the full recipe.
- **`src/components/CookMode.tsx` is the established overlay convention to extend,
  not fork.** It is a `role="dialog" aria-modal="true" aria-labelledby={titleId}`
  overlay that moves focus in on open (`dialogRef.current?.focus()`), traps Tab/
  Shift+Tab inside (`CookMode.tsx:126-142`), closes on Escape, and relies on the
  caller (RecipeList) to restore focus to the trigger. RecipeDetail mirrors this
  same pattern. Steps are rendered via the shared `StepText` component
  (`src/components/StepText.tsx`) — reuse it so durations stay tappable.
- `src/lib/types.ts:27-35` — the `Recipe` shape (`title`, `description`,
  `usesIngredients`, `missingIngredients`, `steps`, `timeMinutes?`, `difficulty?`).
  Full set of fields to surface. **No type change is needed** — extend the contract.
- `src/App.tsx:135-159` — the `recipes` phase renders `<RecipeList .../>`. The detail
  interaction is internal to the recipe components; App wiring need not change.
- `src/styles.css` — design tokens (`--surface`, `--border`, `--radius`, `--shadow`),
  `.btn`/`.btn--ghost`/`.btn--primary`, `.tag`, and `.visually-hidden`
  (`styles.css:438-449`) already exist; reuse them. The `.cook` overlay rules
  (`styles.css:521-614`) are the style precedent. There is no modal/backdrop style
  yet — add one (`.modal*`); remove the now-dead `.recipe-card__steps` rules.
- Per ADR-001 + CLAUDE.md: pure client-side UX feature — **no Gemini call, no new
  `/api` route, no server change**. Web Share + Clipboard are browser APIs called
  only on user action, so the no-key smoke gate stays green.
- A11y: an accessible modal needs `role="dialog"` + `aria-modal`, an accessible
  name, focus moved in on open and restored on close, focus trapped within, and
  Escape to close. WAI-ARIA dialog pattern.

## Acceptance criteria

- Each recipe card has a visible control (e.g. "View recipe") that opens a detail
  view (modal/dialog) showing the recipe's title, meta (time/difficulty),
  description, used + missing ingredients, and the complete ordered steps.
- The detail view is a `role="dialog"` with `aria-modal="true"` and an accessible
  name; opening moves focus into the dialog and closing restores focus to the
  control that opened it.
- Focus is trapped inside the dialog (Tab/Shift+Tab cycle within it) and pressing
  Escape closes it; a visible close control also closes it; clicking the backdrop
  closes it.
- A "Share" control in the detail view calls `navigator.share()` when available
  (guarded by feature-detection) and otherwise falls back to
  `navigator.clipboard.writeText()`, with user-visible feedback on the fallback.
  No unhandled promise rejection when the user cancels the native share sheet.
- `bun run typecheck` passes; the headless smoke (`/`) is green with zero console
  errors when no Gemini key is configured.

## Out of scope

- Sharing multiple recipes at once / a share-all action.
- Deep-linking to a recipe via URL (no router exists).
- Any change to `Recipe` types, `src/lib/api.ts`, or `server/*`.
- Body-scroll-lock and `prefers-reduced-motion` polish (owned by TKT-116).
- `inert`-ing the background behind the dialog (owned by TKT-141).

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — the 5 bullets are already independently verifiable
  (dialog semantics, focus-management, focus-trap/Escape/backdrop, the concrete
  `navigator.share`/`navigator.clipboard` APIs + cancel-rejection guard, and the
  typecheck + `/` smoke green-gate). Left as-is.
- **Blockers:** ok — `depends_on: []`. Sibling **TKT-140** (`depends_on` this)
  reconciles any remaining step-surface redundancy across the card *after* both
  this and TKT-126 land; not a blocker for build.
- **Context drift:** several citations refreshed against current `main` — the
  `<details>` accordion moved to `RecipeList.tsx:101-110` and TKT-126's `CookMode`
  overlay + focus-restore machinery now exist; added `CookMode.tsx` as the overlay
  convention to mirror and `StepText` as the step renderer to reuse. **Stripped
  four stale completion blocks** (Implementation Summary / Test Results / Smoke
  Check / Validation Review) carried over from a prior chaos branch whose code was
  never merged to `main` — they described work absent from this worktree and would
  have misled review. They are re-generated by this run's real build/test/validate.

**Verdict:** build-ready

### Autonomous Decision

**Decided:** 2026-06-22 (chaos worker, no human to consult)

**Q1 — Keep or remove the per-card `<details>` "Steps" accordion?**
- Options: (a) keep accordion + add "View recipe" (two read affordances), (b) remove
  accordion, steps live only in the detail modal (read) + Cook Mode (cook).
- **Choice: (b) remove.** This is exactly the resolution TKT-140 anticipates
  ("drop the `<details>` accordion entirely … leaving the card with a concise
  preview + 'View recipe' + 'Cook this'"). Avoids three redundant ways to read the
  same steps. Reversible (re-add a few lines of JSX + CSS).

**Q2 — Should the detail modal also launch Cook Mode (nested overlay)?**
- **Choice: no.** "Cook this" stays a card-level action; nesting dialog→overlay adds
  focus-management complexity for no AC. The card carries both buttons side by side.

**Q3 — Scope of polish (scroll-lock / reduced-motion / inert background)?**
- **Choice: defer.** TKT-116 owns body-scroll-lock + `prefers-reduced-motion`;
  TKT-141 owns `inert`. Keep this build to the ACs (focus trap is sufficient for the
  trap AC). Lean by construction; no animation added so no reduced-motion gap created.

**Reversibility:** all three are low-risk, local, easily reversed.

### Implementation Summary

- Added `src/components/RecipeDetail.tsx` — an accessible modal dialog (`role="dialog"`, `aria-modal="true"`, `aria-labelledby` the recipe title) showing the full recipe: meta tags (difficulty/time), description, used + missing ingredients, and the complete ordered steps (rendered with the shared `StepText` so embedded durations stay tappable; an explicit empty-steps fallback covers stepless recipes). Mirrors the Cook Mode overlay convention exactly — focus moved into the dialog on open via `dialogRef.focus()`, a keydown handler traps Tab/Shift+Tab and closes on Escape, plus a visible × / Close button and a backdrop `mousedown` (not click, to survive drag-select) also dismiss it.
- Added per-recipe Share in the dialog footer: `handleShare()` feature-detects `navigator.share` and uses it, otherwise falls back to `navigator.clipboard.writeText()` with a `role="status"` `aria-live` confirmation. Native-share cancellation (`AbortError`) is swallowed so there is no unhandled rejection and no spurious "copied" message; other share failures degrade to the clipboard path. A `recipeToText()` helper flattens the recipe (title · meta · description · ingredients · numbered steps) for both share and copy.
- Reworked `src/components/RecipeList.tsx` — each card's footer now leads with a "View recipe" ghost button (always shown) that opens the modal, beside the existing "Cook this" primary button (still gated on `steps.length > 0`). Added a `viewIndex` state and `openView`/`closeView`; the single `triggerRef` is shared with Cook Mode (only one overlay is open at a time) and a `restoreFocus()` helper returns focus to the originating button on close. Removed the now-unused `StepText` import.
- Updated `src/styles.css` — added the `.modal*` dialog/backdrop styles (centred over a dimmed backdrop, scrollable body, sticky-feeling footer with reserved status line) reusing the existing design tokens + `.btn`/`.tag` classes, and gave `.recipe-card__actions` a gap + `flex:1` buttons for the two-button footer. Removed the now-dead `.recipe-card__steps` accordion rules.

**Deviations from plan:**
- Removed (rather than augmented) the per-card `<details>` "Steps" accordion — steps now live solely in the detail modal (read) and Cook Mode (cook). This is the resolution sibling **TKT-140** explicitly anticipates, and is recorded as Q1 in the ticket's `### Autonomous Decision` block. The card keeps a concise preview (title, meta, description, uses, missing).

**Implementation notes:**
- Pure client-side per ADR-001 / CLAUDE.md: no Gemini call, no new `/api` route, no `Recipe` type change, no server edit (grep for `fetch(`/`api.`/`GEMINI`/`VITE_`/`@google` over the changed files is clean). Web Share / Clipboard fire only on user action, so the no-key page-load smoke stays green.
- No portal — the modal is `position: fixed` with `z-index: 60` (above Cook Mode's 50), so an inline render is sufficient.
- Body-scroll-lock, `prefers-reduced-motion`, and `inert`-ing the background are deliberately deferred to TKT-116 / TKT-141 (Q3 in the Autonomous Decision block); no entry animation was added, so no reduced-motion gap is introduced here.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold context)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 1: "View recipe" opens detail with all fields | ✓ | `RecipeList.tsx:116-123` always-shown ghost "View recipe" button → `openView(idx, e.currentTarget)` (`:45-48`) → `RecipeList.tsx:139` mounts `<RecipeDetail>`. Dialog renders title (`RecipeDetail.tsx:132`), meta time/difficulty (`:146-155`), description (`:157`), Uses (`:159-163`), missing (`:164-168`), and the full ordered `<ol className="modal__steps">` via `StepText` (`:170-181`) with an empty-steps fallback. |
| 2: role=dialog + aria-modal + accessible name + focus in/restore | ✓ | `RecipeDetail.tsx:122-130` `role="dialog" aria-modal="true" aria-labelledby={titleId}`; `titleId` (`useId`, `:46`) bound to `<h2 id={titleId}>` (`:132`). Focus in: `useEffect` `dialogRef.current?.focus()` (`:51-53`). Restore: `RecipeList.tsx:30-34` `restoreFocus()` → `requestAnimationFrame(() => trigger?.focus())` on the trigger captured at open; `closeView` (`:49-52`) calls it. |
| 3: focus trap + Escape + close button + backdrop | ✓ | Trap: `onKeyDown` (`RecipeDetail.tsx:61-77`) wraps first↔last (and handles `active === dialogRef.current`), identical to `CookMode.tsx:126-142`. Escape: `:56-59` stopPropagation + onClose. Close controls: header × (`:135-142`, `aria-label="Close recipe"`) + footer "Close" (`:192-194`). Backdrop: `.modal` `onMouseDown={onBackdropMouseDown}` (`:121`) closes only when `e.target === e.currentTarget` (`:83-85`), mousedown to survive drag-select. |
| 4: Share Web Share + clipboard fallback + feedback + AbortError swallowed | ✓ | `handleShare` (`:100-116`): `canShare()` (`:11-12`) feature-detects `typeof navigator.share === "function"` → `navigator.share({title,text})`; catch (`:105-112`) swallows `AbortError` (no fallback, no unhandled rejection — promise awaited in try/catch), other errors → `copyToClipboard`. Fallback (`:87-98`) uses `navigator.clipboard?.writeText` + `setShareMsg`, surfaced via `<p role="status" aria-live="polite">` (`:185-187`). |
| 5: typecheck passes | ✓ | `bun run typecheck` (`tsc --noEmit`) → exit 0, no output. Parent re-ran independently → exit 0. Also `bun run build` → exit 0 (vite, PWA precache generated). |

**Commands run (subagent):**
- `bun run typecheck` → exit 0
- `grep -nE 'console.(error|warn)|fetch\(|VITE_|GEMINI|@google'` over changed files → exit 1 (no matches — pure client-side)
- `grep -n recipe-card__steps src/styles.css` → exit 1 (dead accordion CSS removed)

**Notes (subagent, verbatim):** "All 5 ACs pass on disk. The focus-trap is a boundary-wrap implementation (intercepts only at first/last + the dialog container) matching the established CookMode convention and the WAI-ARIA dialog pattern — correct for the trap AC. The dialog container itself takes initial focus (tabIndex=-1) and the Shift+Tab branch explicitly handles `active === dialogRef.current`, so the very first Shift+Tab also wraps correctly. The smoke test for AC5's '/ smoke green' clause was intentionally NOT run here (parent runs it separately); only the typecheck half of AC5 was verified, and it passes. Card 'View recipe' is always rendered; 'Cook this' is correctly gated on steps.length>0. The `<details>` steps accordion was removed per the ticket's Autonomous Decision Q1 (steps now live only in the detail modal + Cook Mode), consistent with sibling TKT-140's intent."

### Smoke Check

**Headless Chromium:** SKIPPED — Playwright is not installed in `.weave` (`smoke: skipped, reason: "playwright not installed in .weave — run: bun run install:browsers"`). Provisioning the browser is a machine-global download and is intentionally NOT run during a chaos worker run (repo-scoping guard).

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | smoke status: skipped (driver absent) |

Per the test-ticket protocol a skip is NOT a pass and never fails the ticket. Production `bun run build` is clean and the detail modal is only mounted on a user action (never at page load, no Gemini call on load), so the `/` route renders with zero console errors by construction (CLAUDE.md hard rule #3 preserved).

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `RecipeList.tsx:117-123` always-shown "View recipe" → `openView` → mounts `<RecipeDetail>` (`:140`). Dialog renders the full recipe: title, meta tags, description, Uses, missing, complete ordered steps via shared `StepText` with empty-state fallback (`RecipeDetail.tsx:132-181`). Per-recipe Share (`:100-116`) = Web Share + clipboard fallback + `role=status` feedback. A focused read view + share — exactly as scoped, no drift. |
| Context constraints (+ architecture coherence) | ✓ | All four CLAUDE.md Hard Rules honored: no key leak (no `fetch`/`VITE_`/`GEMINI`/`@google` in changed files — only `navigator.share`/`clipboard`); one data-fetching path (no raw `fetch` in components); AI lazy (modal mounts only on click, no Gemini on load → zero added console errors); PWA intact (no manifest/SW/`vite.config` change). ADR-001 respected (pure client-side, no `/api`/server/`Recipe`-type change — `types.ts:27-35` diff empty). **Coherence: strong** — `RecipeDetail` extends the `CookMode` dialog convention (same `role=dialog`/`aria-modal`/`aria-labelledby`, byte-equivalent Tab focus-trap, focus-in, Escape, caller-restored focus via shared `triggerRef`), reuses `StepText` + `.btn`/`.tag` tokens, layers a clean additive `.modal*` family at `z-index:60` above `.cook`'s 50. No parallel/conflicting pattern. |
| Sprawl | ✓ | Diff = exactly the 3 declared files (`RecipeDetail.tsx` new, `RecipeList.tsx`, `styles.css`). No leakage into `server/`, `src/lib/`, `App.tsx`, `vite.config.ts`. The `<details>` accordion removal + `.recipe-card__steps` CSS deletion are documented (Autonomous Decision Q1 + Implementation Summary) — credited, not flagged. |
| Follow-up surfacing | ✓ | No in-scope gaps left unfiled. Known polish is already owned by siblings and correctly deferred (not re-filed): body-scroll-lock + reduced-motion → TKT-116; `inert` background → TKT-141; card step-surface reconciliation → TKT-140 (depends on this; unblocked by the `<details>` removal). |

**Suggested new tickets:** none.

**Reviewer notes (verbatim):** "Architecture coherence: PASS. RecipeDetail.tsx is a faithful mirror of the CookMode dialog convention — identical role=dialog/aria-modal/aria-labelledby semantics, byte-equivalent Tab focus-trap, focus-in-on-open, Escape-close, and caller-restored-focus (shared triggerRef in RecipeList); it reuses StepText and the existing .btn/.tag design tokens, and introduces a clean, additive .modal* style family layered above .cook (z-index 60 > 50). No parallel/conflicting dialog pattern, no Recipe-type fork, no second data-fetching path, no /api or server change. The one structural difference (role=dialog on the inner dialog element vs the outer container in CookMode) is semantically equivalent and slightly more correct. Verified independently: typecheck exit 0; types.ts diff empty; no fetch/VITE_/GEMINI/@google in changed files; reused CSS classes all present. The headless smoke for the AC5 '/ green' clause was SKIPPED (Playwright not provisioned in .weave — machine-global download deliberately not run by the chaos worker); since the modal mounts only on user action and makes no Gemini call, the / route renders with zero added console errors by construction, so this is a known-acceptable skip, not a failure. All four axes pass — overall PASS."
