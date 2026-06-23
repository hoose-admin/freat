import type { Recipe } from "./types";

/** Stable client-side identity for an AI-generated recipe. The `Recipe` shape
 *  carries no server `id`, so identity is *derived* from the title — normalized
 *  the same trim+lowercase way the app already dedupes names
 *  (`src/components/IngredientList.tsx`, `PantryStaples`, `ShoppingList`).
 *
 *  Used to key the shopping-list selection (TKT-157) so it tracks a recipe by
 *  identity rather than its array index — the selection can't mis-map if recipe
 *  ordering (sort/filter in place) is ever introduced.
 *
 *  Convergence note: TKT-104 (favorites, in flight on a sibling branch) derives
 *  the identical identity as `recipeKey` in `src/lib/savedRecipes.ts`. The two
 *  are intentionally the same definition (normalized title); when both land,
 *  unify on one. If a future ticket adds a real `Recipe.id`, prefer it here. */
export function recipeKey(r: Recipe): string {
  return r.title.trim().toLowerCase();
}
