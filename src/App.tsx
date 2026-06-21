import { useState } from "react";
import PhotoCapture from "./components/PhotoCapture";
import IngredientList from "./components/IngredientList";
import RecipeList from "./components/RecipeList";
import { analyzeFridge, getRecipes, ApiRequestError } from "./lib/api";
import type { Ingredient, Recipe, RecipePreferences } from "./lib/types";

type Phase = "capture" | "ingredients" | "recipes";

const DEFAULT_SERVINGS = 4;
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

export default function App() {
  const [phase, setPhase] = useState<Phase>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [servings, setServings] = useState(DEFAULT_SERVINGS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhoto(dataUrl: string) {
    setPhoto(dataUrl);
    setError(null);
    setBusy(true);
    try {
      const found = await analyzeFridge(dataUrl);
      setIngredients(found);
      setPhase("ingredients");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  // The ONE recipe-fetch path. The first call (from "Get meal ideas") passes no
  // preferences, so behavior is identical to before; the servings stepper calls
  // it again with `{ servings }` to re-scale quantities via the same /api/recipes.
  async function fetchRecipes(preferences?: RecipePreferences) {
    setError(null);
    setBusy(true);
    try {
      const list = await getRecipes(ingredients.map((i) => i.name), preferences);
      setRecipes(list);
      setPhase("recipes");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  function handleGetRecipes() {
    return fetchRecipes();
  }

  function rescale(next: number) {
    const target = Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, next));
    if (target === servings) return;
    setServings(target);
    return fetchRecipes({ servings: target });
  }

  function reset() {
    setPhase("capture");
    setPhoto(null);
    setIngredients([]);
    setRecipes([]);
    setServings(DEFAULT_SERVINGS);
    setError(null);
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <span aria-hidden="true">🧊</span> Freat
        </h1>
        <p className="app__tagline">Snap your fridge, get dinner ideas.</p>
      </header>

      <main className="app__main" aria-busy={busy}>
        {error && (
          <div className="banner banner--error" role="alert">
            {error}
          </div>
        )}

        {phase === "capture" && <PhotoCapture onPhoto={handlePhoto} busy={busy} />}

        {phase === "ingredients" && (
          <section className="stack">
            {photo && <img className="preview" src={photo} alt="Your fridge" />}
            <IngredientList ingredients={ingredients} onChange={setIngredients} />
            <div className="actions">
              <button className="btn btn--ghost" onClick={reset} disabled={busy}>
                Start over
              </button>
              <button
                className="btn btn--primary"
                onClick={handleGetRecipes}
                disabled={busy || ingredients.length === 0}
              >
                {busy ? "Thinking…" : "Get meal ideas"}
              </button>
            </div>
          </section>
        )}

        {phase === "recipes" && (
          <section className="stack">
            <div className="servings" role="group" aria-label="Scale recipes by servings">
              <span className="servings__label">Serves</span>
              <div className="stepper">
                <button
                  type="button"
                  className="stepper__btn"
                  onClick={() => rescale(servings - 1)}
                  disabled={busy || servings <= MIN_SERVINGS}
                  aria-label="Fewer servings"
                >
                  −
                </button>
                <span className="stepper__value" aria-live="polite" aria-label={`${servings} servings`}>
                  {servings}
                </span>
                <button
                  type="button"
                  className="stepper__btn"
                  onClick={() => rescale(servings + 1)}
                  disabled={busy || servings >= MAX_SERVINGS}
                  aria-label="More servings"
                >
                  +
                </button>
              </div>
              <span className="servings__hint muted">
                {busy ? "Rescaling…" : "Adjust to re-scale quantities for your headcount"}
              </span>
            </div>
            <RecipeList recipes={recipes} />
            <div className="actions">
              <button className="btn btn--ghost" onClick={() => setPhase("ingredients")} disabled={busy}>
                Edit ingredients
              </button>
              <button className="btn btn--primary" onClick={reset} disabled={busy}>
                New photo
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="app__footer">
        Powered by Gemini · meal ideas are suggestions — check labels for allergies.
      </footer>
    </div>
  );
}

function messageFor(e: unknown): string {
  if (e instanceof ApiRequestError) {
    if (e.code === "GEMINI_KEY_MISSING") {
      return "The server has no Gemini API key configured. Add it to your .env and restart.";
    }
    return e.message;
  }
  return "Something went wrong. Please try again.";
}
