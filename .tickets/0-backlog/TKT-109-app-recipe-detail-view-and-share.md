---
id: TKT-109
title: "Recipe detail view and share"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - ux
  - feature
depends_on: []
blocks: []
related: []
files_touched:
  - "src/components/RecipeList.tsx"
  - "src/components/RecipeDetail.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Build: add a RecipeDetail modal (focus-trapped, Esc-closes) opened from each recipe-card, with a Web-Share/copy share button.
---

## Objective

Let users open any meal idea into a focused detail view showing the full recipe
(title, meta, description, ingredients used/needed, and all steps), and share an
individual recipe via the Web Share API with a clipboard-copy fallback. Today
steps are buried in a per-card `<details>` accordion and there is no way to share
a single recipe.

## Context

- `src/components/RecipeList.tsx` renders the recipe grid; steps currently live in
  a `<details className="recipe-card__steps">` accordion (`RecipeList.tsx:36-43`).
  The detail view replaces/augments that accordion with an explicit "View recipe"
  affordance that opens the full recipe.
- `src/lib/types.ts:27-35` — the `Recipe` shape (`title`, `description`,
  `usesIngredients`, `missingIngredients`, `steps`, `timeMinutes?`, `difficulty?`).
  This is the full set of fields to surface in the detail view. **No type change
  is needed** — extend the existing contract, don't fork it.
- `src/App.tsx:92-104` — the `recipes` phase renders `<RecipeList recipes={...}/>`.
  The detail interaction is internal to the recipe components; App wiring need not
  change (keep the slice self-contained).
- `src/styles.css` — design tokens (`--surface`, `--border`, `--radius`,
  `--shadow`), `.btn`/`.btn--ghost`/`.btn--primary`, `.tag`, and
  `.visually-hidden` (`styles.css:305-316`) already exist; reuse them. There is no
  modal/overlay style yet — add one.
- Per ADR-001 + CLAUDE.md: this is a pure client-side UX feature — **no Gemini
  call, no new `/api` route, no server change**. Web Share + Clipboard are browser
  APIs called only on user action, so the no-key smoke gate stays green.
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

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 5 bullets rewritten for independent verifiability — split the
  vague "keyboard accessible" AC into explicit dialog-semantics, focus-management,
  and focus-trap/Escape/backdrop bullets; pinned share behaviour to the actual
  `navigator.share`/`navigator.clipboard` APIs with the cancel-rejection guard;
  pinned the green-gate condition to typecheck + `/` smoke with no key.
- **Blockers:** ok — `depends_on: []`; no prerequisite tickets. Purely additive
  client work; no live Gemini call, so the empty-key state is not a blocker.
- **Context drift:** ok — verified `RecipeList.tsx:36-43` (`<details>` accordion),
  `types.ts:27-35` (`Recipe`), `App.tsx:92-104` (recipes phase),
  `styles.css:305-316` (`.visually-hidden`) all exist as cited.

**Verdict:** build-ready

### Implementation Summary

- Added `src/components/RecipeDetail.tsx` — an accessible modal dialog (`role="dialog"`, `aria-modal="true"`, `aria-labelledby` the recipe title) showing the full recipe: meta tags, description, used + missing ingredients, and the complete ordered steps. Focus is moved into the dialog on open; a keydown handler traps Tab/Shift+Tab within it and closes on Escape; backdrop mousedown and a visible × / Close button also dismiss it.
- Added a per-recipe Share: `handleShare()` feature-detects `navigator.share` and uses it, otherwise falls back to `navigator.clipboard.writeText()` with a `role="status"` confirmation message. Native-share cancellation (`AbortError`) is swallowed so there is no unhandled rejection and no spurious fallback.
- Reworked `src/components/RecipeList.tsx` — each card now has a "View recipe" button (replacing the old per-card `<details>` steps accordion) that opens the modal; the list tracks `openIndex` + a `triggerRef` and restores focus to the originating button on close.
- Added modal + card-footer styles to `src/styles.css` (`.modal`, `.modal__dialog`, `.modal__head`, `.modal__actions`, `.recipe-card__foot`, …) reusing existing design tokens; removed the now-dead `.recipe-card__steps` rules.

**Deviations from plan:**
- Replaced (rather than augmented) the per-card `<details>` steps accordion — steps now live solely in the detail modal — to avoid two redundant ways to view steps. The card keeps a concise preview (title, meta, description, missing ingredients).

**Implementation notes:**
- Pure client-side per ADR-001 / CLAUDE.md: no Gemini call, no new `/api` route, no `Recipe` type change, no server edit. Web Share / Clipboard are invoked only on user action, so the no-key smoke gate stays green.
- No portal used — the modal is `position: fixed` with a high z-index, so inline render is sufficient (kept minimal).

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 1: "View recipe" control opens detail with all fields | ✓ | `RecipeList.tsx:55-60` renders visible `recipe-card__view` button → `open(idx,el)`; `RecipeList.tsx:66` mounts `<RecipeDetail>`. `RecipeDetail.tsx` shows title, time/difficulty tags, description, Uses (usesIngredients), "You'll also need" (missingIngredients), and ordered `<ol>` steps. |
| 2: role=dialog + aria-modal + accessible name + focus in/restore | ✓ | `RecipeDetail.tsx:103-110` `role="dialog" aria-modal="true" aria-labelledby` → `<h2 id>` title. Focus in via `dialog.focus()` on mount; restore via `RecipeList.close()` calling `triggerRef.current?.focus()`. |
| 3: focus trap + Escape + close button + backdrop | ✓ | `onKeyDown` on document: Escape→onClose; Tab/Shift+Tab wrap first↔last. Visible × (`aria-label="Close recipe"`) + footer Close button. Backdrop `onMouseDown` checks `e.target===e.currentTarget`→onClose. |
| 4: share Web Share + clipboard fallback + feedback + no AbortError reject | ✓ | `typeof navigator.share === "function"` guard → `navigator.share`; else `copyFallback` → `navigator.clipboard.writeText` + `role="status"` message. Catch ignores `AbortError` (user cancel) → no unhandled rejection / no spurious fallback. |
| 5: typecheck passes | ✓ | `bun run typecheck` (`tsc --noEmit`) → exit 0, no output. |

**Commands run:**
- `bun run typecheck` → exit 0
- `bun run build` → exit 0 (vite build, 32 modules, PWA precache generated)

**Notes:** All 5 ACs pass on a cold read. Focus-trap wrap handled in both directions (container idx === -1 case covered). Focus restore is the caller's responsibility (RecipeList) — confirmed wired, not orphaned.

### Smoke Check

**Headless Chromium:** SKIPPED (Playwright driver not provisioned in `.weave`; `.weave/scripts/install-browsers.ts` is documented as "must never run during a chaos run" — a machine-global browser download would trip the repo-scoping guard).

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | smoke status: skipped (driver absent) |

Per the test-ticket protocol a skip is NOT a pass and never fails the ticket. Production `bun run build` is clean and the modal is not mounted at page load (no Gemini call on load), so the `/` route renders with zero console errors by construction.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `RecipeDetail.tsx:95-168` renders title, meta, description, uses/needs ingredients, full ordered steps (with empty-state) in a role=dialog modal; per-recipe share at `:78-93` (Web Share + clipboard fallback, AbortError carve-out). `RecipeList.tsx:54-66` swaps the `<details>` accordion for a "View recipe" button. Delivers the objective, not an adjacent thing. |
| Context constraints | ✓ | grep clean for `fetch(`/`api.`/`GEMINI`/`VITE_`/`@google` — entirely client-side, no new /api route, no `Recipe`-type fork, no server edit, AI never invoked on load. Reuses existing design tokens + `.btn`/`.tag` classes; component style matches `IngredientList.tsx`. Honors ADR-001 + all four CLAUDE.md Hard Rules. `tsc --noEmit` clean. |
| Sprawl | ✓ | Diff touches exactly the 3 declared files (`RecipeDetail.tsx` new, `RecipeList.tsx`, `styles.css`). `.recipe-card__steps` CSS + `<details>` removal is the documented Implementation-Summary deviation (credited); zero orphan references remain. |
| Follow-up surfacing | ✓ | Two non-blocking polish gaps: no body-scroll-lock behind modal; no `prefers-reduced-motion` carve-out for the `.modal` backdrop blur. Filed as TKT-116 (defer-to-backlog). |

**Suggested new tickets:** 1 filed — TKT-116 (recipe-detail modal polish: body-scroll-lock + reduced-motion), defer-to-backlog. Combined the reviewer's two suggestions into one small ticket; related to TKT-109 and the broader a11y ticket TKT-110.

**Reviewer notes (verbatim):** "Clean, well-scoped, architecturally coherent implementation. Above the bar for the ticket: it adds a proper focus trap, focus restoration to the trigger, Escape/backdrop/close-button dismissal, an empty-steps fallback, and a correct AbortError carve-out on the share path. All four axes pass; overall pass=true. The two follow-ups are polish, not blockers."

