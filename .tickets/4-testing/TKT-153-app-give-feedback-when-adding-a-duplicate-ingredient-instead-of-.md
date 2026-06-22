---
id: TKT-153
title: "Give feedback when adding a duplicate ingredient instead of a silent no-op"
status: "Testing"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - ux
  - ai-proposed
depends_on: []
blocks: []
related: []
files_touched:
  - src/components/IngredientList.tsx
  - src/styles.css
complexity: 1
next_step_hint: "Approve and build: in IngredientList.add detect the case-insensitive duplicate and signal it instead of silently clearing the input."
---

## Objective
Give visible feedback when the user adds an ingredient that is already in the list, instead of silently doing nothing.

## Context
In `IngredientList.add` (`src/components/IngredientList.tsx:17-25`) the typed name is lowercased (`src/components/IngredientList.tsx:19`) and only pushed if no existing chip matches (`...:21-23`). Either way the input is cleared (`setDraft("")`, `src/components/IngredientList.tsx:24`). So when the user types an ingredient that already exists (case-insensitively — chips render with `text-transform: capitalize`, `src/styles.css:206`, so "Milk" visually matches stored "milk"), they hit Add, the field empties, and **nothing else happens**. From the user's point of view the control looks broken: it visibly "did something" (cleared the field) but produced no result.

- The component is a controlled list: state lives in the parent via `onChange`; `IngredientList` owns only the `draft` input string (`src/components/IngredientList.tsx:11`). Any feedback state is local to this component.
- `styles.css` currently has **no** `@keyframes`, `animation`, or `prefers-reduced-motion` rules — a pulse animation would be the first, so it must ship with the reduced-motion guard.
- Chips key on `i.name` (`src/components/IngredientList.tsx:40`); the stored name is already lowercased, so the duplicate match is `ingredients.some((i) => i.name === name)` — the inverse of the existing guard on line 21.

## Acceptance Criteria
- Adding an ingredient whose lowercased name already exists produces a clear, non-error signal — e.g. briefly pulse/highlight the existing matching chip, or show a small inline note ("Already added"). Verifiable by adding "Milk" when "milk" is already a chip and observing the signal.
- The happy path is unchanged: adding a genuinely new ingredient still appends a chip and clears the input, with no duplicate-feedback shown.
- Any animated feedback is suppressed (or made instant) under `prefers-reduced-motion: reduce` — verifiable by a CSS media-query guard in `src/styles.css`.
- The feedback is non-blocking and self-clearing (no stuck banner / no leftover state that fails the smoke gate).
- `bun run typecheck` passes.

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 4 bullets rewritten/added for independent verifiability — duplicate-signal bullet now names a concrete repro ("Milk" over "milk"); added an explicit happy-path-unchanged check, a `prefers-reduced-motion` media-query check, and a non-blocking/self-clearing bullet so the headless smoke gate can't be tripped by leftover feedback state.
- **Blockers:** ok — `depends_on` empty; self-contained change to one component + one stylesheet.
- **Context drift:** ok — re-grepped all citations cold: `IngredientList.tsx:17-25/19/21-23/24/11/40` and `styles.css:206` all match; confirmed `styles.css` has zero existing `@keyframes`/`animation`/`prefers-reduced-motion` rules, so the reduced-motion guard is genuinely net-new.
- **Complexity:** re-rated — stays **1** (one component method + a small CSS block, no API/contract change).

**Verdict:** build-ready

### UX Finding
**Heuristic:** Visibility of system status (Nielsen #1)
**Where:** `src/components/IngredientList.tsx:17-25`
**Now:** Adding an already-present ingredient clears the input and silently no-ops, with no indication of why.
**Proposed:** Acknowledge the no-op — flash the existing chip or show "Already added".
**Why it helps:** A form action that clears the field but yields no result reads as a bug; feedback turns an invisible no-op into understood behavior.
**Impact:** med · **Effort:** low

### Implementation Summary

- `src/components/IngredientList.tsx`: added a transient `dupName` state + a `useRef` timer. In `add`, a case-insensitive duplicate now sets `dupName` (highlighting the existing chip) and schedules a 1200ms self-clear instead of silently no-op'ing; the happy path explicitly clears `dupName` before appending. Added an `aria-live="polite"` status line that reads "Already added." while flagged, and a `useEffect` unmount cleanup for the timer.
- `src/styles.css`: added a `.chip--dup` pulse (`@keyframes chip-dup-pulse`, brand-tinted, 2 cycles), a `.ingredients__dupe` style for the status line (fixed `min-height` to avoid layout shift), and a `@media (prefers-reduced-motion: reduce)` fallback that swaps the animation for a static highlight ring (cleared by the same JS timer).

**Deviations from plan:**
- Shipped BOTH proposed signals rather than one: the chip pulse (primary) plus an accessible `aria-live` "Already added." line. The text line guarantees the signal is announced to assistive tech and is visible even under reduced motion, at trivial cost.

**Implementation notes:**
- Feedback is self-clearing via a single timer (uniform across animated and reduced-motion paths), so no leftover state can trip the headless smoke gate.
