---
id: TKT-103
title: "Polished loading, empty, and error states"
status: "Todo"
priority: "High"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - ux
depends_on: []
blocks: []
related: []
files_touched: []
complexity: 2
---

Add proper loading (skeleton/spinner), empty, and error states across the capture to ingredients to recipes flow, with a retry affordance on errors.

## Scope
- Frontend only; use the existing busy/error state in App.tsx and the api error codes.

## Acceptance criteria
- A visible loading indicator shows during analyze and recipe calls.
- Recipe/ingredient empty states give a helpful next step.
- Errors show a retry button that re-runs the last action.
- typecheck passes; smoke is green.
