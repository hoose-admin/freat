---
id: TKT-148
title: "Combine compound step durations into a single timer chip"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: [TKT-135]
blocks: []
related: [TKT-135]
files_touched: []
next_step_hint: Answer the Stuck Reason: merge TKT-135 to main first — StepText.tsx (the only file this ticket edits) is absent from this branch.
complexity: 2
chaos_unstick_count: 1
---

## Objective
When a single recipe step states a compound duration ("simmer 1 hour 30 minutes",
"rest 2 hr 15 min"), render it as **one** combined countdown chip rather than two
independent chips, matching the cook's mental model of one waiting period per
instruction.

## Context
TKT-135's `src/components/StepText.tsx` matches each duration token independently
(the `DURATION_RE` exec loop emits one `<TimerChip>` per match), so "1 hour 30
minutes" becomes two chips. This is acceptable per TKT-135 AC3 (multiple
concurrent timers) and was logged there as a known polish gap, but a cook reading
"1 hour 30 minutes" expects a single 90-minute timer. The fix is local to
`StepText.tsx`: coalesce adjacent duration matches (separated only by
whitespace/conjunctions) into one summed-seconds chip before rendering.

## Acceptance Criteria
- [ ] A step with adjacent compound durations ("1 hour 30 minutes") renders a single
      `TimerChip` whose total equals the summed seconds (90 min → 5400s), labelled
      with the full original phrase.
- [ ] Non-adjacent durations in the same step (e.g. "bake 20 min, then rest 5 min")
      still render as two separate chips.
- [ ] Single-duration steps and no-duration steps are unchanged from TKT-135 behavior;
      `bun run typecheck` passes and the `/` smoke stays green with no key.

### Why this was spawned mid-stack

**Parent ticket:** TKT-135
**Trigger source:** validation-time
**What was discovered:** `StepText.tsx`'s per-match loop renders compound durations as two chips; a single combined timer better fits one step instruction.
**Ordering decision:** defer-to-backlog
**Rationale:** Pure polish beyond TKT-135's satisfied AC3; not a defect and not a blocker, so it belongs in the backlog rather than splicing into the current flow.
