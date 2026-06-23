---
id: TKT-147
title: "Wire StepText step-timers into the Cook Mode step view"
status: "Testing"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: [TKT-126, TKT-135]
blocks: []
related: [TKT-135]
files_touched:
  - src/components/CookMode.tsx
next_step_hint: Verify Cook Mode renders steps via <StepText> with working timer chips; cite CookMode.tsx:170-172 and a green headless / smoke.
complexity: 1
chaos_unstick_count: 1
---

## Objective
Make the tappable step-timers reach the Cook Mode surface: have Cook Mode's
single-step view render each step through `StepText` (from TKT-135) so a cook in
the full-screen guided view gets the same inline countdown chips + haptics, not
plain text.

## Context
TKT-135 built a reusable `src/components/StepText.tsx` and wired it at the recipe
accordion (`src/components/RecipeList.tsx:42`). TKT-126 built `src/components/CookMode.tsx`,
which renders one step at a time in large type (its step render around
`CookMode.tsx:162-164`, `{steps[step]}`). The two tickets were built on separate
chaos branches, so on neither branch does Cook Mode import `StepText`. Once both
are merged to `main`, Cook Mode will still show plain step text until it adopts
the component. This is the one-line reconciliation the TKT-135 Autonomous Decision
named.

## Acceptance Criteria
- [ ] After TKT-126 + TKT-135 are merged, Cook Mode's single-step view renders the
      current step via `<StepText text={steps[step]} />` (or equivalent) instead of
      the raw string.
- [ ] Timer chips inside Cook Mode start/stop and fire `navigator.vibrate` on
      completion exactly as in the recipe accordion; large-type layout is preserved.
- [ ] `bun run typecheck` passes and the headless `/` smoke is green with zero
      console errors when no Gemini key is configured.

### Why this was spawned mid-stack

**Parent ticket:** TKT-135
**Trigger source:** validation-time
**What was discovered:** Cook Mode (`CookMode.tsx`, from unmerged TKT-126) is absent on the TKT-135 branch, so the timer feature only reaches the accordion until Cook Mode imports `StepText` at merge.
**Ordering decision:** defer-to-backlog
**Rationale:** It can only be done once both TKT-126 and TKT-135 land on `main`; it is a small, separable follow-up, not a blocker for TKT-135's own surface.

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — the three AC bullets are already independently verifiable (a `file:line` render check, a behavioral timer/haptic + layout check, and `bun run typecheck` + headless smoke).
- **Blockers:** ok — `depends_on: [TKT-126, TKT-135]` both satisfied: `src/components/CookMode.tsx` and `src/components/StepText.tsx` both present on this branch (TKT-126 landed to main; StepText present).
- **Context drift:** ok — verified `CookMode.tsx:170` renders `{steps[step]}` inside `<p className="cook__step-text">`; `StepText.tsx` exports a default `StepText({ text })`; `RecipeList.tsx:84` already consumes `<StepText text={step} />`.

**Verdict:** build-ready

### Implementation Summary

- Added `import StepText from "./StepText";` to `src/components/CookMode.tsx` (the existing default export already used by `RecipeList.tsx:84`).
- Replaced the raw `{steps[step]}` render at `CookMode.tsx:170` with `<StepText text={steps[step]} />`, kept inside the existing `<p className="cook__step-text">` so the large-type Cook Mode layout is unchanged. The single-step view now renders the same inline countdown chips + haptics as the recipe accordion.

**Deviations from plan:**
- None — implementation matched the plan (the one-line reconciliation the TKT-135 Autonomous Decision named).

**Implementation notes:**
- No contract change: `StepText` is pure client-side (regex over `Recipe.steps` strings), so ADR-001 / CLAUDE.md hard rules (no Gemini on load, key never in client, manifest/SW intact) are untouched. `bun run typecheck` passes.
