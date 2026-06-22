---
id: TKT-142
title: "Promote the amber warning color to a --warn design token"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - refactor
  - ux
depends_on: [TKT-129]
blocks: []
related: [TKT-129]
files_touched: []
next_step_hint: Land TKT-129 to main first; its .chip--unsure/.chip__warn amber literal is the refactor target and is absent from this branch.
complexity: 1
chaos_unstick_count: 1
---

## Objective
Promote the amber "needs-attention" color introduced by TKT-129 to a real `--warn`
design token in `:root`, so future caution/warning UI reuses one source of truth instead
of re-hardcoding the literal.

## Context
TKT-129 added a low-confidence ("Not sure about these") chip cluster and needed a caution
color. The token palette in `src/styles.css:1-14` (`:root`) has only `--danger` (red,
`#f87171`) — semantically wrong for "double-check this", which is a caution, not an error —
so TKT-129 introduced the amber literal `#fbbf24` / `rgba(251, 191, 36, …)` directly in:
- `.chip--unsure` (`src/styles.css`, amber-tinted background + border)
- `.chip__warn` (the ⚠ marker color)

This is a small token-hygiene nit, not a defect — the literal is used consistently. The
fix is to add a `--warn` (and optionally `--warn-soft` for the tint/border alpha) token to
`:root` and swap the two call sites to reference it.

## Acceptance Criteria
- [ ] `:root` declares a `--warn` token (amber, e.g. `#fbbf24`); optionally a soft variant
      for the low-alpha background/border.
- [ ] `.chip--unsure` and `.chip__warn` reference the token(s) instead of the raw literal.
- [ ] No visual change vs. TKT-129 (same rendered amber); `bun run typecheck` passes.
- [ ] No new literal amber values remain in `src/styles.css` outside the token definition.

### Why this was spawned mid-stack

**Parent ticket:** TKT-129
**Trigger source:** validation-time
**What was discovered:** TKT-129's validation reviewer flagged that the amber warning color is a hardcoded literal (`#fbbf24` / `rgba(251,191,36,…)`) in `.chip--unsure` and `.chip__warn` because no warning token exists in `src/styles.css:1-14`.
**Ordering decision:** defer-to-backlog
**Rationale:** Pure token-hygiene refinement, cosmetic and non-blocking; outside TKT-129's objective (surfacing confidence), so it ships as its own low-priority cleanup rather than expanding that ticket's scope.

