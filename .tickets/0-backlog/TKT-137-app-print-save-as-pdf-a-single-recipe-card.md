---
id: TKT-137
title: "Print / Save-as-PDF a single recipe card"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: []
blocks: []
related: []
files_touched:
  - "src/components/RecipeList.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Validation PASS (5/5 axes); awaiting human acceptance. Follow-ups filed: TKT-149 (ingredient list), TKT-150 (print page-breaks).
---

## Objective
Add a **Print / Save-as-PDF** action to a recipe: a print stylesheet that renders one
clean recipe (title, time/difficulty, ingredients, numbered steps) with no app chrome,
so the user can stick it on the fridge or save a PDF.

## Context
People still want a recipe on paper or as a shareable PDF — and on mobile the system
print dialog includes "Save to Files / PDF" for free. A per-card "Print" button calling
`window.print()` plus an `@media print` stylesheet is near-zero-cost and feels premium.
Hooks into the recipe-card meta row (`src/components/RecipeList.tsx:18-26`); the print CSS
hides `app__header`/`app__footer`/`actions` and force-expands the `<details>` steps
(`src/components/RecipeList.tsx:36-43`). Pure client — CSS + one handler, no types/API.
Distinct from the outbound `navigator.share` of TKT-109 (this is a paper/PDF artifact).

## Acceptance Criteria
- [ ] Each recipe card renders a `<button>` Print control whose click handler calls `window.print()` (verify: grep `window.print` in `src/components/RecipeList.tsx`).
- [ ] A new `@media print` block in `src/styles.css` hides the app chrome (`.app__header`, `.app__footer`, `.actions`, and the Print button) and forces the printed recipe's steps visible (the `<details>` does not stay collapsed).
- [ ] Only the clicked recipe prints: non-targeted `.recipe-card`s are `display:none` under `@media print`; the targeted card carries a print modifier class.
- [ ] Pure client: no change to `src/lib/types.ts`, `src/lib/api.ts`, or `server/*`. `bun run typecheck` passes and the headless smoke shows zero console errors with no API key.

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 4 bullets rewritten — each now names a concrete grep/file target, the typecheck command, and the smoke/no-key console check, so each is independently verifiable.
- **Blockers:** ok — `depends_on: []`; nothing active.
- **Context drift:** ok — verified `src/components/RecipeList.tsx` header/meta at lines 18-26 and the `<details>` steps at 36-43, and `src/styles.css` exists with `.recipe-card*` / `.app__header` / `.app__footer` / `.actions` selectors. Cites still accurate.

**Verdict:** build-ready

### Value Hypothesis
**Lens:** Delight / platform
**Who benefits:** Cooks who want a fridge-door card or a saved PDF.
**Why useful:** A high-ratio, near-free touch that turns an ephemeral suggestion into a
keepable artifact via the system print/PDF sheet.
**Plugs in at:** `src/components/RecipeList.tsx:18-26,36-43`; print stylesheet in `src/styles.css`.
**Score:** value m · fit h · feasibility h · novelty h


### Implementation Summary

- Added a per-card **Print** control to `src/components/RecipeList.tsx`: a `<button type="button" class="recipe-card__print">` in each card's `.recipe-card__meta` row, labelled `aria-label="Print recipe: <title>"`.
- Print targeting is React-state driven: `printIndex` marks the clicked card; a `useEffect` attaches a one-shot `afterprint` listener then calls `window.print()`, and clears `printIndex` afterward. The targeted card gets the `recipe-card--print` modifier class and its `<details>` steps are forced open (`open={printing || undefined}`).
- Added the screen style for `.recipe-card__print` plus an `@media print` block in `src/styles.css`: it hides app chrome (`.app__header`, `.app__footer`, `.actions`, `.preview`, `.banner`, `.section-title`, `.recipe-card__print`), sets all `.recipe-card` to `display:none` except `.recipe-card--print`, strips dark surface styling to ink-friendly black-on-white, hides the steps `<summary>`, and sets a `@page` margin.

**Deviations from plan:** None — implementation matched the plan (pure client; only `src/components/RecipeList.tsx` and `src/styles.css` changed; no types/API/server touched).

**Implementation notes:**
- `bun run typecheck` passes; `bun run build` succeeds.
- The Gemini key is never referenced; nothing calls the AI on this path, so the no-key console-clean requirement holds.

### Autonomous Decision

**Made:** 2026-06-22 (chaos mode — no human input)
**Question:** How to make `window.print()` emit only the clicked recipe with its steps expanded, given steps live in a collapsible `<details>` and all cards share one grid?

**Options considered:**
- **A — React state + print modifier class** — track the clicked card index in state, give that card a `recipe-card--print` class and force its `<details open>`, hide siblings + chrome via `@media print`, print in a `useEffect` so the DOM reflects the change first, reset on `afterprint`.
- **B — Imperative DOM in the click handler** — `closest('.recipe-card')`, toggle a class + `details.open` directly, restore on `afterprint`; no state/effect.
- **C — CSS-only forced `<details>` expansion** — rely on `@media print` alone to reveal closed `<details>` content.

**Chosen:** A — keeps the component declarative and consistent with the codebase's React-state style (`src/App.tsx:11-16`); the `useEffect` guarantees the print modifier + forced-open steps are in the DOM before `window.print()` fires, and `afterprint` restores the on-screen layout. C is rejected because forcing a closed `<details>` open purely in CSS is unreliable across browsers; B works but reaches outside React's model for transient UI state.
**Reversibility:** easy — the mechanism is contained in `src/components/RecipeList.tsx` + the `@media print` block in `src/styles.css`; swapping to B or a print-library is a localized change.


### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Print `<button>` per card calls `window.print()` | ✓ | `RecipeList.tsx:45-52` button `onClick={() => setPrintIndex(idx)}`; `useEffect` (15-21) calls `window.print()` at line 19 when `printIndex` changes. |
| `@media print` hides chrome + forces steps visible | ✓ | `styles.css:372-380` hides `.app__header/.app__footer/.actions/.preview/.banner/.section-title/.recipe-card__print`; TSX `open={printing \|\| undefined}` + CSS `.recipe-card--print .recipe-card__steps summary { display:none }`. |
| Only the clicked recipe prints | ✓ | `styles.css` `.recipe-card { display:none !important }` + `.recipe-card--print { display:block !important }`; TSX applies `recipe-card--print` only when `printIndex === idx`. |
| Pure client; typecheck passes | ✓ | `git diff --name-only` → only `RecipeList.tsx` + `styles.css`; diff of `types.ts`/`api.ts`/`server/*` empty; `bun run typecheck` exit 0. |

**Commands run:**
- `git --no-pager diff --name-only`
- `git status --short`
- `grep -n "window.print" src/components/RecipeList.tsx`
- `git --no-pager diff --name-only -- src/lib/types.ts src/lib/api.ts 'server/*'`
- `bun run typecheck`

**Notes:** All four ACs verified against source. Diff of protected paths empty; typecheck clean. Print targeting uses React state + `useEffect` calling `window.print()`, with `afterprint` clearing state — a sound chain.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not installed in `.weave` — `bun run install:browsers` never run in this worktree)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | skipped (browser not provisioned) |

A skip is not a pass and does not fail the ticket. Note: the only configured smoke route is `/` (capture phase); `RecipeList` does not render there without a Gemini key, so this change's surface is outside the smoke route regardless. `bun run build` succeeded independently.


### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Print button (`RecipeList.tsx:45-52`) → `printIndex` → `useEffect` `window.print()`; targeted card forced `<details open>` + `.recipe-card--print`; `@media print` (`styles.css`) hides chrome, shows only the one card, black-on-white, expanded steps. (See note on `usesIngredients` below — follow-up, not a blocker.) |
| Context constraints | ✓ | Pure client UI/CSS. No Gemini key reference in `src/`; no `fetch` added (only `api.ts:27` sanctioned path); no AI call (`window.print()` guarded by `printIndex===null`); `vite.config.ts`/`public/` untouched → manifest/SW intact. `tsc --noEmit` clean. |
| Sprawl | ✓ | Exactly the two `files_touched` changed; CSS appended without altering existing rules; TSX is a minimal wrap of the existing `.map`. |
| Follow-up surfacing | ✓ | 3 real follow-ups surfaced (see below). |
| Architecture coherence | ✓ | Extends `useState`/`useEffect` style of `App.tsx:11-16`; no new dependency; CSS reuses existing custom-property tokens + BEM-ish `.recipe-card__print` / `.recipe-card--print` naming; print button mirrors `.tag` pill. |

**Suggested new tickets:** 3 surfaced; 2 filed to backlog:
- **TKT-149** — Render the recipe's `usesIngredients` on each card (so the printout includes the ingredient list; `usesIngredients` is in `types.ts:30` but rendered nowhere). Highest-value follow-up.
- **TKT-150** — Add `@media print` page-break hints so long recipes paginate cleanly.
- _Not filed (minor):_ an `afterprint` fallback timeout for the rare WebViews lacking the event — `afterprint` is broadly supported (~98%); risk is theoretical, noted here for the record.

**Reviewer note:** The one substantive concern (printout omits `usesIngredients`) is a pre-existing card-content limitation, not drift introduced by this ticket — the card never displayed it. The print mechanism itself is correct; the gap is captured as TKT-149.
