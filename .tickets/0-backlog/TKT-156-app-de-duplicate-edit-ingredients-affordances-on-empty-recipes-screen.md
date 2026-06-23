---
id: TKT-156
title: "De-duplicate the two Edit ingredients affordances on the empty recipes screen"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - ux
  - ai-proposed
depends_on: []
blocks: []
related:
  - TKT-154
complexity: 1
next_step_hint: Pick up TKT-156 to scaffold AC for hiding one of the duplicate "Edit ingredients" controls when recipes is empty.
---

## Objective
When the recipes screen has zero recipes, the user sees the **Edit ingredients** label twice — once in `RecipeList`'s empty-state and once in the persistent action bar — both firing the same action. Remove the redundancy so the empty state shows a single, unambiguous control.

## Context
- `RecipeList`'s `recipes.length === 0` branch renders an empty-state **Edit ingredients** ghost button (`src/components/RecipeList.tsx:38-43`), wired from `App.tsx:119` (`onEditIngredients={() => setPhase("ingredients")}`).
- The recipes phase ALSO renders a persistent action bar below `RecipeList` with a primary **Edit ingredients** button (`src/App.tsx:124-130`, same `setPhase("ingredients")`).
- So when recipes is empty, two buttons with the identical label and identical behaviour stack on screen (one ghost, one primary). Both affordances pre-date TKT-154 (added by TKT-103 + the App shell); TKT-154 only fixed the empty-state copy to name the control.

## Acceptance Criteria
- When `recipes.length === 0` on the recipes phase, only ONE "Edit ingredients" control is visible (decide: hide the empty-state ghost button, or suppress the action-bar button in the empty case — pick the simpler, document it).
- The non-empty recipes view keeps its persistent action bar exactly as today (`App.tsx:120-131`).
- No new prop/data-flow contract is introduced beyond what already exists; reuse `onEditIngredients` / `setPhase`.
- `bun run typecheck` passes.

### Why this was spawned mid-stack

**Parent ticket:** TKT-154
**Trigger source:** validation-time
**What was discovered:** The validate-ticket reviewer noted the empty recipes screen shows two identical "Edit ingredients" affordances — empty-state ghost button (`RecipeList.tsx:39-43`) + persistent primary button (`App.tsx:124-130`).
**Ordering decision:** defer-to-backlog
**Rationale:** Pre-existing redundancy (not a regression from TKT-154), low priority, and out of scope for TKT-154's copy fix — belongs in its own small UX ticket.
