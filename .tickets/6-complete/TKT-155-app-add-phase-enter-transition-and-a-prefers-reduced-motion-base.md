---
id: TKT-155
title: "Add phase enter transition and a prefers-reduced-motion baseline"
status: "Complete"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-22
completed: 2026-06-22
domain: "app"
tags:
  - ux
  - ai-proposed
depends_on: []
blocks: []
related: []
files_touched:
  - "src/styles.css"
chaos_branch: chaos/TKT-155
complexity: 2
next_step_hint: Validating — CSS-only: phase-enter mount animation on .capture/.stack (App.tsx remounts them per phase) + global prefers-reduced-motion baseline preserving the spinner exception. typecheck+build green; smoke skipped (no playwright).
merged: 2026-06-22
merge_commit: 9f00c64017ea
---

## Objective
Soften the hard-cut between phases with a short, purposeful enter transition, and establish the app's missing `prefers-reduced-motion` baseline.

## Context
`phase` swaps the entire `<main>` body instantly (`src/App.tsx:71`, `:73`, `:92`). After an async wait where the button reads "Thinking…" (`src/App.tsx:86`), a full screen of recipe cards (`src/components/RecipeList.tsx:16`, all cards at once) hard-cuts into place with no visual link between the state the user acted from and the state they land in — a classic abrupt change that forces re-orientation ("did it work? is this the same page?"). The only transition anywhere in the app is on `.btn` (`src/styles.css:122`), and there is **no `@media (prefers-reduced-motion: reduce)` block anywhere in `src/styles.css`**, so any motion the app does/will have is currently unguarded.

## Acceptance Criteria
- The phase container (`PhotoCapture` / `section.stack`) plays a short (~150–200ms) opacity/translateY enter transition when the phase changes, tying the new content to the user's action.
- A global `@media (prefers-reduced-motion: reduce)` block is added to `src/styles.css` that renders content at its final state with no movement (and neutralizes the `.btn` transform/transitions too).
- No layout shift or console errors; works with no Gemini key configured.
- `bun run typecheck` passes.

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** ACs already concrete and checkable; left as-authored. Clarified scope: the enter motion is achieved as a CSS *mount* animation on the phase containers (`.capture` / `.stack`), which React remounts on every phase change (distinct child slots in `<main>`, `src/App.tsx:199/206/229`), so no JS/state is required.
- **Blockers:** ok — `depends_on` empty.
- **Context drift:** partially stale — the Context claims "no `@media (prefers-reduced-motion: reduce)` block anywhere", but two per-component blocks now exist (`.spinner` `src/styles.css:274-279`; `.step-timer--done` `src/styles.css:620-626`). The *global* baseline the ticket asks for is still genuinely missing. `.btn` transition (`src/styles.css:160`), `.btn:active` transform (`:162-164`), phase swaps (`App.tsx:199/206/229`) all verified present.
- **Complexity:** ok — 2 (CSS-only: one keyframe + container rule + one global media block; preserve the deliberate spinner exception).

**Verdict:** build-ready

### UX Finding
**Heuristic:** Motion-for-comprehension; aesthetic & minimalist design (Nielsen #8) — abrupt state change
**Where:** `src/App.tsx:64-105` (phase swaps at `71`/`73`/`92`); `src/styles.css` has no `prefers-reduced-motion` block
**Now:** Phases swap instantly; after a multi-second async wait the recipe screen hard-cuts in, with no continuity cue and no reduced-motion baseline.
**Proposed:** Add a brief phase enter transition that signals "your request produced this," gated behind a newly-added `prefers-reduced-motion` block.
**Why it helps:** Converts a disorienting hard-cut into a "this is the result of your tap" cue, while making the whole app respect reduced-motion for the first time.
**Impact:** med · **Effort:** low

### Implementation Summary

CSS-only change, confined to `src/styles.css` (no JS/TSX touched — the phase containers already remount on phase change, so a CSS *mount* animation needs no state).

- **Phase enter transition** (`src/styles.css:108-126`): added `@keyframes phase-enter` (opacity 0→1, `translateY(8px)`→`0`) and applied `animation: phase-enter 180ms ease-out` to `.capture, .stack`. These are exactly the three phase containers — `.capture` is `PhotoCapture`'s root (`src/components/PhotoCapture.tsx:125`) and `.stack` wraps the ingredients/recipes sections (`src/App.tsx:207,230`); each lives in a distinct child slot of `<main>` (`App.tsx:199/206/229`), so React remounts a fresh node on every phase change and the mount animation re-fires, tying the new screen to the user's tap. Uses only `opacity`/`transform` → no layout shift (CLS unaffected).
- **Global reduced-motion baseline** (`src/styles.css:734-766`): added the app's first app-wide `@media (prefers-reduced-motion: reduce)` block — a `*,*::before,*::after` rule collapsing `animation-duration`/`transition-duration` to `0.01ms` and `animation-iteration-count` to `1` (content snaps to its final state; the phase-enter fade and all `.btn` transitions are neutralized), plus `scroll-behavior:auto`. Explicitly added `.btn:active { transform: none }` to kill the press-nudge (AC: "neutralizes the `.btn` transform/transitions too").
- **Spinner exception preserved**: folded the former standalone `.spinner` reduced-motion rule into the new global block, elevated to `!important` (`animation-duration:1.8s; animation-iteration-count:infinite`) so the wildcard doesn't freeze it — keeping the codebase's deliberate "a stopped spinner reads as broken" decision (was `src/styles.css:274-279`, now `:760-765`). The per-component `.step-timer--done` reduced-motion block (`:626-632`) is untouched — it sets a *final visual state* the wildcard can't express.

**Verification:**
- `bun run typecheck` → exit 0.
- `bun run build` → succeeds; bundle (`dist/assets/index-*.css`) contains `phase-enter` and **both** reduced-motion blocks (step-timer + global w/ spinner exception).
- `git status --short` → only `M src/styles.css` (1 file, +51/-6).

### Autonomous Decision

**Made:** 2026-06-22 (chaos mode — no human input)
**Question:** AC2 asks for "a global `@media (prefers-reduced-motion: reduce)` block". Use a nuclear `*` wildcard baseline (future-proof, but must re-except the deliberate spinner), or a targeted block listing only the elements this ticket touches (`.capture`/`.stack`/`.btn`)?

**Options considered:**
- **A — Global `*` wildcard baseline + spinner exception** — the canonical accessible-motion snippet; makes the *whole app* honor reduced-motion (the ticket's stated objective) and auto-guards any future motion; cost is one `!important` exception to keep the spinner turning.
- **B — Targeted block (`.capture`/`.stack`/`.btn` only)** — minimal churn, no `!important`, touches nothing else; but it only covers what this ticket added, so it isn't really an app "baseline" and under-delivers the objective ("the whole app respect reduced-motion for the first time").

**Chosen:** A — the ticket's thesis is *establishing the missing baseline*, not just guarding this one animation; the `*` wildcard is the industry-standard reduced-motion reset and is exactly what AC2 names. The one nuance — the codebase had already made a deliberate "keep the spinner slowly turning" call (`src/styles.css:274-279`) — is preserved by folding that rule into the new block at `!important` (higher specificity than `*`, so it wins). Documented in-CSS with a comment so future fresh-context workers see why the exception exists. Did not write an ADR: this is a tiny, universally-standard CSS pattern with an in-file comment, not a contested cross-cutting convention.
**Reversibility:** easy — narrow the `*` selector to a list, or delete the block, in `src/styles.css`.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, independent context)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Phase container plays ~150–200ms opacity/translateY enter on phase change | ✓ | `@keyframes phase-enter` (`src/styles.css:113-122`, opacity 0→1 + `translateY(8px→0)`) applied via `.capture, .stack { animation: phase-enter 180ms ease-out }` (`:123-125`). Remount mechanism confirmed: the three phases are mutually-exclusive conditional children of `<main>` (`App.tsx:199/206/229`), so a phase switch mounts a fresh DOM node and the CSS *mount* animation re-fires. `.capture`/`.stack` (full-element classes) used ONLY as phase containers (grep); only opacity/transform → no CLS |
| Global reduced-motion block collapses motion + neutralizes `.btn`; spinner exception preserved | ✓ | Block at `src/styles.css:745-766`: `*,*::before,*::after` collapse animation/transition durations + iteration-count (`:746-753`); `.btn` transition (`:180`) collapsed and press transform `.btn:active{transform:translateY(1px)}` (`:182-184`) killed by `.btn:active{transform:none!important}` (`:756-758`); spinner kept turning via folded-in `.spinner{animation-duration:1.8s!important;animation-iteration-count:infinite!important}` (`:762-765`) — not frozen |
| No layout shift / console errors; works with no Gemini key | ✓ | CSS-only on render paths needing no Gemini call; opacity/transform are compositor-only (no reflow/CLS); CSS emits no console errors. Smoke skips (below) — not a failure |
| `bun run typecheck` passes | ✓ | `tsc --noEmit` exit 0. `bun run build` succeeds; bundle `dist/assets/index-*.css` contains `phase-enter` (2×) and both `prefers-reduced-motion` blocks |

**Scope:** `git status --short` → only `M src/styles.css` (no sprawl).

**Commands:** `git diff -- src/styles.css`; `bun run typecheck` (exit 0); `bun run build` (ok); `grep phase-enter|prefers-reduced-motion dist/assets/index-*.css`; `bun .weave/scripts/smoke.ts --ticket TKT-155` (skipped).

**Note (non-blocking):** the pre-existing `.step-timer--done` reduced-motion rule uses `animation:none` (no `!important`); the global wildcard's `!important` longhands technically win but the net effect is still no perceptible motion (0.01ms on a bg/color-only keyframe) and the rule still pins the final state. Behavior preserved; no action needed.

### Smoke Check

**Headless Chromium:** SKIPPED — `bun .weave/scripts/smoke.ts --ticket TKT-155` returned `{"status":"skipped","reason":"playwright not installed in .weave"}` (exit 0).

Browser binaries are not provisioned in this worktree, so the deterministic smoke no-ops (a skip is not a pass and does not fail the ticket — matches the repo's prior chaos runs, e.g. TKT-154). This change is additive CSS on render paths that require no Gemini call and cannot emit console errors or uncaught exceptions; `bun run typecheck` (exit 0) + `bun run build` (ok) cover compile/bundle correctness, and the reduced-motion cascade was verified by static analysis.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-22
**Overall:** PASS — "land it"

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `@keyframes phase-enter` (`src/styles.css:113-122`, opacity 0→1 + `translateY(8px→0)`) applied via `.capture, .stack { animation: phase-enter 180ms ease-out }` (`:123-125`); 180ms in range; remount-per-phase confirmed (`App.tsx:199/206/229` are mutually-exclusive `<main>` children). Global reduced-motion baseline established (`:745-766`) |
| Context constraints | ✓ | CSS-only; no Gemini/key/fetch/server code touched; opacity/transform only → no reflow/CLS; `bun run typecheck` exit 0; renders on no-key paths |
| Sprawl | ✓ | `git status --short` → only `M src/styles.css`; purely additive + clean relocation of the old `.spinner` RM block into the new block; no dead code |
| Architecture coherence | ✓ | Honors ADR-001 + all 4 CLAUDE.md hard rules (no key/data-path/load-time-AI/manifest changes). Reconciles — does NOT fork — the two pre-existing per-component reduced-motion conventions: `.spinner` slow-turn preserved via folded-in `!important` (specificity beats the `*` wildcard); `.step-timer--done` final-state intact (wildcard never sets `animation-name`, so its `animation:none` + bg/color stand). No ADR warranted (standard CSS pattern, documented in-file) |

**Architecture coherence:** Fully coherent. The `*`-wildcard reduced-motion reset is the industry-standard accessible-motion snippet; folding the spinner exception into the single global block extends the existing convention into one place rather than leaving a parallel block. Cascade reasoning confirms neither `.spinner` (keeps turning) nor `.step-timer--done` (keeps its final state) regresses. The `### Autonomous Decision` (global wildcard over a targeted block) was judged reasonable — AC2 explicitly asks for an app-wide baseline a targeted block would under-deliver.

**Suggested follow-ups (non-blocking, deferred to backlog):**
1. `.step-timer:active` press-transform (`src/styles.css:590-592`) isn't neutralized under reduced motion, unlike `.btn:active` (`:756-758`) — a tiny consistency gap (a press-nudge is a direct response to user action, so arguably acceptable). Filed to backlog.
2. Informational: smoke skipped (no playwright in `.weave`) — no headless run exercised the transition; low-risk for CSS-only, but provisioning browsers would close the gate for future UI tickets.

**Recommendation:** LAND IT — change delivers both halves of the objective, respects every constraint, zero sprawl, and reconciles rather than forks the reduced-motion conventions.
