---
id: TKT-147
title: "Wire StepText step-timers into the Cook Mode step view"
status: "Todo"
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
files_touched: []
next_step_hint: Merge TKT-126 + TKT-135 to main first (CookMode.tsx + StepText.tsx absent on this branch), then re-dispatch TKT-147 for the StepText wire-up.
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
