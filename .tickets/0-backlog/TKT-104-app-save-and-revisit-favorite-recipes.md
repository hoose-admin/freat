---
id: TKT-104
title: "Save and revisit favorite recipes"
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

Let users save recipes and view them later, persisted in localStorage. No backend.

## Scope
- A small storage helper in src/lib; a "Saved" view/toggle in App.
- Save/remove from RecipeList cards.

## Acceptance criteria
- Saving a recipe persists it across reloads.
- A Saved view lists saved recipes and supports removal.
- Saving works offline.
- typecheck passes; no console errors.
