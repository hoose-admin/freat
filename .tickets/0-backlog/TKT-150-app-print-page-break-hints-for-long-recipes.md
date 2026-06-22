---
id: TKT-150
title: "Add print page-break hints so long recipes paginate cleanly"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - feature
  - frontend
  - ai-proposed
depends_on: [TKT-137]
blocks: []
related: [TKT-137]
files_touched: []
complexity: 1
next_step_hint: Answer the Stuck Reason: land TKT-137 (the @media print block) to main, then re-run TKT-150 so it branches from a base that has the block to extend.
chaos_unstick_count: 1
---

### Objective
Add `break-inside: avoid` / `page-break-inside: avoid` hints to the print
stylesheet so a long numbered-step list doesn't split awkwardly across PDF/paper
pages when a single recipe card is printed.

### Context
- TKT-137 added the `@media print` block in `src/styles.css` that renders one
  recipe card. It has no pagination hints, so long `.recipe-card__steps ol`
  lists can break mid-step across pages.
- Scope is a few CSS declarations inside the existing `@media print` block:
  e.g. `break-inside: avoid` on `.recipe-card__steps li`, and keeping the title
  with the first step. No JS/TS change.

### Acceptance Criteria
- [ ] The `@media print` block in `src/styles.css` adds `break-inside: avoid` (with the `page-break-inside` fallback) to step list items so individual steps aren't split across pages.
- [ ] Pure CSS; `bun run typecheck` passes; no console errors with no API key.

### Why this was spawned mid-stack

**Parent ticket:** TKT-137
**Trigger source:** validation-time
**What was discovered:** TKT-137's `@media print` block has no page-break hints, so long step lists can split unattractively across PDF pages.
**Ordering decision:** defer-to-backlog
**Rationale:** A small print-quality polish that is a natural sibling of TKT-137 but not required for the core Print/Save-as-PDF deliverable.
