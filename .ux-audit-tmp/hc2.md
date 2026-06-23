## Objective
Fix the recipes empty-state guidance, which currently tells the user to do something they cannot do from the screen they are on.

## Context
When `recipes.length === 0`, `RecipeList` renders "No recipes yet. Try adding a few more ingredients." (`src/components/RecipeList.tsx:8-9`). But this only appears **after** `handleGetRecipes` resolves and the app is on the recipes phase (`src/App.tsx:33-45`), where there is **no ingredient input** — the only controls are "Edit ingredients" / "New photo" (`src/App.tsx:95-102`). The advice "add a few more ingredients" describes a control that lives on the *previous* screen, so it's a dead-end instruction that forces the user to recall the prior layout. It also implies the user hasn't acted, when in fact the model returned zero recipes.

## Acceptance Criteria
- The empty-state copy references an affordance actually available on the recipes screen — e.g. "No recipes matched. Tap **Edit ingredients** to add a few more, then try again."
- The copy acknowledges that the request came back empty rather than implying inaction.
- `bun run typecheck` passes.

### UX Finding
**Heuristic:** Match between system & real world (Nielsen #2); recognition over recall (#6)
**Where:** `src/components/RecipeList.tsx:8-9`
**Now:** The recipes empty-state tells users to "add ingredients," but that input isn't on the recipes screen — it's behind the "Edit ingredients" button on the previous phase.
**Proposed:** Rewrite the empty-state to point at the on-screen "Edit ingredients" control and acknowledge the empty result.
**Why it helps:** Guidance matches what the user can actually see and do, instead of referencing an off-screen control.
**Impact:** med · **Effort:** low
