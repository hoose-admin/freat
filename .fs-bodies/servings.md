## Objective
Let the user **scale a recipe by servings**. Add a servings stepper that re-requests
recipes (or a single recipe) with a target headcount, so Gemini rescales quantities
in `steps[]` and `missingIngredients[]` to the number of people being fed.

## Context
Servings are baked silently into the model's head ("serves 4"), but real cooking is
"I'm feeding 2" or "meal-prepping 6" — and `missingIngredients` (`src/lib/types.ts:31`)
is only useful for shopping when it reflects the actual headcount. This extends the
**existing** recipe contract rather than forking it: add `servings?: number` to
`RecipePreferences` (`src/lib/types.ts:22-25`) and weave it into `recipePrompt()`
(`server/gemini.ts:108-122`, which already conditionally builds dietary/time clauses).
A stepper renders in the recipe-card meta row (`src/components/RecipeList.tsx:18-26`).
Distinct from dietary/time preferences (TKT-106) — same contract, new field.

## Acceptance Criteria
- [ ] `RecipePreferences` gains optional `servings?: number` (types + `api.ts` helper).
- [ ] `recipePrompt()` instructs Gemini to write quantities for N servings when set.
- [ ] A "Serves N" stepper UI lets the user pick a headcount and re-fetch.
- [ ] Omitting servings keeps current behavior (no regression); reuses `/api/recipes` (no new route).
- [ ] `bun run typecheck` passes; zero console errors with no API key.

### Value Hypothesis
**Lens:** Power-user
**Who benefits:** Families, batch-cookers, solo cooks scaling down.
**Why useful:** Removes the nightly mental math of rescaling a recipe and makes the
missing-ingredient list actually buyable for the real headcount.
**Plugs in at:** `types.ts:22-25` · `server/gemini.ts:108-122` · `RecipeList.tsx:18-26`.
**Score:** value h · fit h · feasibility h · novelty h
