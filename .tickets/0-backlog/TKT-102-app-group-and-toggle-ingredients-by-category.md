---
id: TKT-102
title: "Group and toggle ingredients by category"
status: "Todo"
priority: "High"
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

Group the detected ingredients by their `category` field and let the user toggle each ingredient on/off; deselected ones are excluded from the recipe request.

## Scope
- Extend IngredientList; keep the onChange(Ingredient[]) contract.
- Use the existing Ingredient.category; bucket unknowns under "other".

## Acceptance criteria
- Ingredients render grouped by category with headings.
- Each ingredient can be toggled; only selected names are sent to getRecipes().
- Manual add still works and lands in the right group.
- typecheck passes; no console errors.
