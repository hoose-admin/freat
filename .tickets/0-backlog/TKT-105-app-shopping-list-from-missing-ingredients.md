---
id: TKT-105
title: "Shopping list from missing ingredients"
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

Aggregate the missingIngredients of recipes the user is interested in into a de-duplicated shopping list they can copy or share.

## Acceptance criteria
- A shopping list view aggregates and de-dupes missing ingredients across chosen recipes.
- Copy-to-clipboard works; Web Share is used when available with a copy fallback.
- typecheck passes; smoke green.
