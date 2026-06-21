---
id: TKT-109
title: "Recipe detail view and share"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - ux
  - feature
depends_on: []
blocks: []
related: []
files_touched: []
complexity: 2
---

Add a focused recipe detail interaction (expanded card or modal) and a per-recipe share (Web Share API with copy fallback).

## Acceptance criteria
- A recipe can be opened into a detailed view with full steps.
- Sharing a recipe uses Web Share when available, copy otherwise.
- Keyboard accessible (focus trapped if modal, Escape closes).
- typecheck passes; smoke green.
