// Shared API contract between the React client and the Bun server. This is THE
// place new fields/routes get their types — extend here, never fork a parallel
// shape. (Imported type-only by server/* — no runtime coupling.)

export interface Ingredient {
  name: string;
  category?: string;
  /** 0..1 model confidence the item is present in the photo. */
  confidence?: number;
}

/** POST /api/analyze */
export interface AnalyzeRequest {
  /** Base64-encoded image bytes WITHOUT the `data:...;base64,` prefix. */
  image: string;
  mimeType: string;
}
export interface AnalyzeResponse {
  ingredients: Ingredient[];
}

export interface RecipePreferences {
  dietary?: string[];
  maxTimeMinutes?: number;
}

export interface Recipe {
  title: string;
  description: string;
  usesIngredients: string[];
  missingIngredients: string[];
  steps: string[];
  timeMinutes?: number;
  difficulty?: "easy" | "medium" | "hard";
}

/** POST /api/recipes */
export interface RecipesRequest {
  ingredients: string[];
  preferences?: RecipePreferences;
}
export interface RecipesResponse {
  recipes: Recipe[];
}

export interface ApiError {
  error: string;
  code?: string;
}
