// Client-only persistence for "favorite" recipes. No backend, no Gemini, no
// /api/* — saved recipes live in localStorage so they survive reloads and work
// offline. This is deliberately self-contained (its own namespaced key) so it
// never collides with sibling persistence stores (last-session, shopping list).
//
// Recipes are AI-generated and carry no id (see src/lib/types.ts:Recipe), so
// identity is derived from a normalized title. All localStorage access is
// wrapped in try/catch: a disabled, full, or otherwise unavailable store must
// degrade to "nothing saved" rather than throw (CLAUDE.md hard rule #3 — the
// app renders with zero console errors in every environment).

import type { Recipe } from "./types";

const KEY = "freat.savedRecipes.v1";

/** Stable identity for a recipe that has no id field: trimmed, lowercased title. */
export function recipeKey(r: Pick<Recipe, "title">): string {
  return r.title.trim().toLowerCase();
}

/** Read the saved list. Returns [] for an empty, missing, or unreadable store. */
export function loadSaved(): Recipe[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Recipe[]) : [];
  } catch {
    return [];
  }
}

/** Persist the list; swallow storage errors (full/disabled) — never throw. */
function persist(recipes: Recipe[]): Recipe[] {
  try {
    localStorage.setItem(KEY, JSON.stringify(recipes));
  } catch {
    /* storage unavailable or quota exceeded — keep the in-memory list as-is */
  }
  return recipes;
}

/** Is a recipe (by normalized title) present in the given list? */
export function isSaved(recipes: Recipe[], r: Pick<Recipe, "title">): boolean {
  const k = recipeKey(r);
  return recipes.some((s) => recipeKey(s) === k);
}

/** Add (or replace) a recipe at the front; deduped by normalized title. */
export function saveRecipe(recipes: Recipe[], r: Recipe): Recipe[] {
  const k = recipeKey(r);
  return persist([r, ...recipes.filter((s) => recipeKey(s) !== k)]);
}

/** Remove a recipe by normalized title. */
export function removeRecipe(recipes: Recipe[], r: Pick<Recipe, "title">): Recipe[] {
  const k = recipeKey(r);
  return persist(recipes.filter((s) => recipeKey(s) !== k));
}
