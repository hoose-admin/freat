---
id: TKT-108
title: "Persist last session photo and ingredients"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ux
depends_on: []
blocks: []
related: []
files_touched: []
complexity: 2
---

Persist the most recent photo and ingredient list to localStorage so a refresh or relaunch restores the user's place instead of resetting to capture.

## Acceptance criteria
- After analyzing, a reload restores the photo and ingredients and the ingredients phase.
- "Start over" clears the persisted session.
- typecheck passes; no console errors.
