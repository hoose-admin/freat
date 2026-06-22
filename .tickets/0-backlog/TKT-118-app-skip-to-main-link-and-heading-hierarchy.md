---
id: TKT-118
title: "Add skip-to-main-content link and verify heading hierarchy"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - a11y
  - frontend
depends_on: []
blocks: []
related: [TKT-110]
files_touched:
  - "src/App.tsx"
  - "src/styles.css"
complexity: 1
next_step_hint: Human review queue: skip-link + heading-hierarchy a11y change; smoke skipped (no browser in chaos) — re-run smoke with a provisioned browser.
---

## Objective

Add a "skip to main content" link so keyboard users can bypass the header, and
assert a correct `h1 → h2 → h3` heading hierarchy now that the `<h2>` view
headings are programmatic focus targets (TKT-110).

## Context

- `src/App.tsx`: `<header class="app__header">` (app title `<h1>`) precedes
  `<main class="app__main">`; there is no skip link to jump past the header to
  `<main>`. The capture/ingredients/recipes views each expose one `<h2>`.
- `src/components/RecipeList.tsx`: recipe cards use `<h3 class="recipe-card__title">`
  under the section `<h2>` — confirm the level order holds across all phases.
- `src/styles.css`: a `.visually-hidden` utility exists; the skip link should be
  visually-hidden until focused (a `:focus`-revealed variant).

## Acceptance criteria

- A keyboard-focusable "Skip to main content" link is the first focusable element
  and moves focus to `<main>` (give `<main>` an `id` + `tabIndex={-1}`).
- The link is visually hidden until focused, then visible.
- Heading order is `h1` (app title) → `h2` (view heading) → `h3` (recipe titles)
  with no skipped levels, verified per phase.
- `bun run typecheck` passes; no new console errors.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — all 4 bullets are already independently verifiable (first-focusable + focus-to-`<main>`; hidden-until-focus; h1->h2->h3 per phase; typecheck + no console errors). Left as-is.
- **Blockers:** ok — `depends_on` empty. TKT-110 is `related` only (its focus/live-region work is not a prerequisite for the skip link); note TKT-110 is unmerged, so this branch must not duplicate its RecipeList/`<main>` edits to avoid a merge conflict.
- **Context drift:** ok — all citations re-verified against current `main`: `App.tsx` `<header class="app__header">` (l.57) precedes `<main class="app__main">` (l.64); `<h1 class="app__title">` (l.58); `RecipeList.tsx` `<h3 class="recipe-card__title">` (l.19) under section `<h2>` (l.14); `styles.css` `.visually-hidden` (l.305). No existing skip link.
- **Complexity:** ok — re-rated, stays 1 (trivial: one skip-link anchor + `id`/`tabIndex` on `<main>` + one `:focus`-revealed CSS rule; heading order already correct, AC3 is an assertion).

**Verdict:** build-ready

### Why this was spawned mid-stack

**Parent ticket:** TKT-110
**Trigger source:** validation-time
**What was discovered:** No skip-to-content link past the `app__header`; heading-level order should be asserted now that `<h2>`s are focus targets.
**Ordering decision:** defer-to-backlog
**Rationale:** Separable keyboard-nav enhancement beyond TKT-110's focus/labels/live-region scope.

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** How to implement the visually-hidden-until-focused skip link, and should this ticket also fix the empty-`recipes` view's missing section `<h2>`?

**Options considered:**
- **CSS approach A — slide-in `.skip-link`** — a dedicated class fixed at the top, translated off-screen and revealed on `:focus`. Self-contained (one class on the anchor), stays in the a11y tree + keyboard-focusable, the GOV.UK/WAI textbook recipe.
- **CSS approach B — `.visually-hidden.focusable` clip-reset** — reuse the existing `.visually-hidden` utility and add a `:focus` rule that un-clips it (position/width/height/clip reset). Reuses the utility literally but needs the anchor to carry two classes and resets ~6 properties.
- **RecipeList empty-state `<h2>`** — make `RecipeList` always render `<h2>Meal ideas</h2>` (the empty path early-returns a `<p>` with no heading).

**Chosen:** CSS approach **A** (`.skip-link` in `styles.css`, revealed with the repo's existing `outline` focus convention), and **do NOT** touch `RecipeList`. A is the cleaner, self-contained skip-link pattern and still honors the ticket's "`:focus`-revealed variant of the `.visually-hidden` technique" (off-screen but perceivable to AT, revealed on focus) without forcing a two-class anchor or a verbose clip-reset. RecipeList's empty-state heading gap is already owned by the `related` ticket **TKT-110** (validated, unmerged) which restructures that exact early-return; duplicating it here would guarantee a merge conflict on the same lines for no benefit. AC3 ("no skipped levels") holds regardless: an `<h3>` recipe title only renders inside the populated path beneath the section `<h2>`, so no view ever jumps h1->h3.
**Reversibility:** easy — swap the `.skip-link` block for the `.visually-hidden.focusable` variant, or add the RecipeList always-`<h2>` line, without touching App.tsx's anchor or `<main>` attributes.

### Implementation Summary

- Added a "Skip to main content" anchor as the **first focusable element** in `src/App.tsx` (`<a className="skip-link" href="#main-content">`), placed before `<header class="app__header">`. It targets `<main>`, now `id="main-content"` + `tabIndex={-1}` so the in-page link moves keyboard focus to it.
- Added a `.skip-link` rule in `src/styles.css`: `position: fixed` top-left, translated off-screen by default and `transform: translateY(0)` on `:focus` (a `:focus`-revealed variant of the `.visually-hidden` technique — it stays in the a11y tree and keyboard-focusable while off-screen), styled with the existing `--brand` color and a `2px solid var(--text)` focus outline matching the repo's `.input:focus-visible` convention. Added `.app__main:focus { outline: none }` (the target is only ever programmatically focused, so a full-width ring would read as breakage) and a `prefers-reduced-motion` guard on the transition.
- Heading hierarchy (AC3) verified by audit, **no code change needed**: one `<h1>` (`App.tsx:61` app title), one `<h2>` per view (`PhotoCapture.tsx:41`, `IngredientList.tsx:29`, `RecipeList.tsx:14`), `<h3>` recipe titles (`RecipeList.tsx:19`) only ever under RecipeList's `<h2>`. No phase skips a level.

**Deviations from plan:**
- Did **not** modify `RecipeList.tsx` despite the ticket's Context mentioning it — confirmed the level order already holds; the only gap (empty-recipes view lacks a section `<h2>`) is owned by the `related` TKT-110 and intentionally left to it to avoid a duplicate/conflicting change (see Autonomous Decision).

**Implementation notes:**
- `bun run typecheck` (`tsc --noEmit`) exit 0; `bun run build` exit 0 (PWA precache 7 entries — manifest/SW intact). No Gemini call added (AI-laziness preserved; skip link is pure markup/CSS).

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Skip link is first focusable element + moves focus to `<main>` (id + tabIndex=-1) | ✓ | `App.tsx:57-59` `<a className="skip-link" href="#main-content">` is the FIRST child of `.app`, before `<header>` (l.60); `<main id="main-content" tabIndex={-1}>` (l.67) — href matches id, tabIndex makes `<main>` a programmatic focus target. |
| Link visually hidden until focused, then visible (not display:none/visibility:hidden) | ✓ | `styles.css` `.skip-link { position: fixed; transform: translateY(calc(-100% - 16px)); }` (off-screen but in a11y tree + keyboard-focusable) revealed by `.skip-link:focus { transform: translateY(0); outline: 2px solid var(--text); }`; `prefers-reduced-motion` guard present. |
| Heading order h1->h2->h3, no skipped levels, per phase (incl. empty-recipes) | ✓ | One h1 (`App.tsx:61`); one h2 per view (`PhotoCapture.tsx:41`, `IngredientList.tsx:29`, `RecipeList.tsx:14`); h3 (`RecipeList.tsx:19`) only inside populated RecipeList beneath its h2. Empty-recipes path returns a `<p>` (no h2/h3) — no h1->h3 jump, no orphan h3. |
| `bun run typecheck` passes; build clean; no new console errors | ✓ | `bun run typecheck` -> `tsc --noEmit` exit 0; `bun run build` -> `✓ built`, PWA precache 7 entries, exit 0. Skip link is pure markup/CSS, no JS handler, no Gemini call. |

**Commands run:**
- `git diff $(git merge-base HEAD main)...HEAD --stat`, `git diff src/App.tsx`, `git diff src/styles.css`, `git status --short`
- `bun run typecheck` (exit 0)
- `bun run build` (exit 0)
- `bun .weave/scripts/smoke.ts --ticket TKT-118` (status: skipped, exit 0)

**Notes:** Changes are uncommitted working-tree modifications (expected in chaos — the supervisor commits the worktree later); verification ran against the working-tree files. `RecipeList.tsx` intentionally untouched — heading hierarchy was already correct, and the empty-state `<h2>` is owned by the `related` TKT-110 (avoids a merge conflict).

### Smoke Check

**Headless Chromium:** SKIPPED (Playwright not provisioned in `.weave` — `bun .weave/scripts/smoke.ts --ticket TKT-118` emitted `{"status":"skipped","reason":"playwright not installed — run: bun run install:browsers"}` with exit 0). A skip is not a pass and never fails the ticket.

The change is pure markup/CSS (skip-link anchor + `<main>` attributes + a `.skip-link` style block) with no added JS, network, or Gemini calls, so no new runtime/console surface is introduced. The deterministic smoke should be re-run by a human/CI with a provisioned browser.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Skip link is first focusable element (`App.tsx:57-59`, before `<header>`); `<main id="main-content" tabIndex={-1}>` (`App.tsx:67`) — href matches id. Heading order per phase: one h1 (`App.tsx:61`), one h2 per view (`PhotoCapture:41`, `IngredientList:29`, `RecipeList:14`), h3 only under RecipeList's h2 (`RecipeList:19`). No drift. |
| Context constraints | ✓ | No env/key ref in `src/`; no new `fetch`/JS handler/Gemini call (AI-laziness preserved). `git diff --name-only` = only `src/App.tsx`, `src/styles.css`; `vite.config.ts`/`index.html`/manifest/server untouched (PWA precache + NetworkOnly `/api` intact). `bun run typecheck` exit 0. |
| Architecture coherence | ✓ | Reuses `--brand`/`--text` tokens; skip-link focus outline `2px solid var(--text)` mirrors `.input:focus-visible` convention (styles.css:235-237). Existing `.visually-hidden` (305-316) left intact; `.skip-link` is a documented `:focus`-revealed sibling, not a competing mechanism. `RecipeList.tsx` NOT modified — avoids conflict with unmerged `related` TKT-110. ADR-001 server-side Gemini proxy untouched. |
| Sprawl | ✓ | `git status --short` = exactly `M src/App.tsx`, `M src/styles.css` (matches `files_touched`); 37+/1- across the two declared files. Only other entry is untracked `node_modules` (build artifact). No scope creep. |
| Follow-up surfacing | ✓ | Surfaced: empty-recipes view (`RecipeList.tsx:8-9`) returns a bare `<p>` with no section `<h2>` — deliberately deferred to TKT-110 (which restructures that exact early-return), documented in the Autonomous Decision. Observation, not a blocker. |

**Suggested new tickets:** none filed. The reviewer's one suggestion ("ensure RecipeList always renders a section `<h2>` in the empty-recipes state") is already owned by the validated `related` **TKT-110** — its Implementation Summary restructures that exact early-return to always render `<h2>Meal ideas</h2>`. Filing a new ticket would duplicate existing work; left to TKT-110 to land.

**Reviewer note (verbatim):** "All five axes pass. Change is a textbook GOV.UK/WAI skip-link: minimal, self-contained, pure markup+CSS, honoring the repo's existing color and focus-outline conventions. No hard-rule violations... RecipeList intentionally untouched to prevent a TKT-110 merge conflict — sound chaos-coherence call. typecheck exit 0... Recommend approving."
