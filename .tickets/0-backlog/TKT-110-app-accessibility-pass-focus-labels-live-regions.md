---
id: TKT-110
title: "Accessibility pass: focus, labels, live regions"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - a11y
depends_on: []
blocks: []
related: []
files_touched: []
complexity: 2
---

Foundational accessibility pass across the flow: manage focus on phase changes, ensure all controls are labeled, and announce async results via an aria-live region.

## Acceptance criteria
- Focus moves to the new heading/region when the phase changes.
- All interactive controls have accessible names.
- Analyze/recipe completion is announced via aria-live=polite.
- No new console errors; typecheck passes.
