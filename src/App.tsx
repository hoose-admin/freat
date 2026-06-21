import { useState } from "react";
import PhotoCapture from "./components/PhotoCapture";
import IngredientList from "./components/IngredientList";
import RecipeList from "./components/RecipeList";
import { analyzeFridge, getRecipes, ApiRequestError } from "./lib/api";
import type { Ingredient, Recipe } from "./lib/types";

type Phase = "capture" | "ingredients" | "recipes";

export default function App() {
  const [phase, setPhase] = useState<Phase>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
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

  async function handleGetRecipes() {
    setError(null);
    setBusy(true);
    try {
      const list = await getRecipes(ingredients.map((i) => i.name));
      setRecipes(list);
      setPhase("recipes");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPhase("capture");
    setPhoto(null);
    setIngredients([]);
    setRecipes([]);
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
