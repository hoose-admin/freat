---
id: TKT-106
title: "Dietary and time preferences in recipe requests"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
depends_on: []
blocks: []
related: []
files_touched: []
complexity: 3
---

Add a small preferences control (vegetarian/vegan/gluten-free, max cook time) and pass it through the existing RecipesRequest.preferences the server already accepts.

## Scope
- UI control plus thread preferences through src/lib/api.ts getRecipes(); do NOT fork the request type, extend types.ts if needed.

## Acceptance criteria
- Selected preferences are included in the /api/recipes request body.
- Preferences persist within the session.
- Degrades gracefully when no key is configured (standard 503 message).
- typecheck passes.
