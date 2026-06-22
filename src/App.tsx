import { useRef, useState } from "react";
import PhotoCapture from "./components/PhotoCapture";
import IngredientList from "./components/IngredientList";
import RecipeList from "./components/RecipeList";
import ShoppingList from "./components/ShoppingList";
import Loading from "./components/Loading";
import { analyzeFridge, getRecipes, ApiRequestError } from "./lib/api";
import type { Ingredient, Recipe } from "./lib/types";

type Phase = "capture" | "ingredients" | "recipes";

export default function App() {
  const [phase, setPhase] = useState<Phase>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // Indices of the recipes the user has added to the shopping list. Lifted here
  // (the flow's single state owner) so RecipeList toggles and ShoppingList read
  // the same selection — mirrors how IngredientList lifts edits via onChange.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The last AI action attempted, captured so the error banner's Retry can
  // re-run exactly what failed (analyze with the same photo, or recipes with
  // the same ingredients) without the user re-doing the input.
  const lastAction = useRef<(() => void) | null>(null);

  async function handlePhoto(dataUrl: string) {
    lastAction.current = () => handlePhoto(dataUrl);
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
    lastAction.current = () => handleGetRecipes();
    setError(null);
    setBusy(true);
    try {
      const list = await getRecipes(ingredients.map((i) => i.name));
      setRecipes(list);
      // Default-select every recipe so the shopping list is useful with zero
      // extra taps; the per-card toggle narrows it.
      setSelected(new Set(list.map((_, i) => i)));
      setPhase("recipes");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function reset() {
    setPhase("capture");
    setPhoto(null);
    setIngredients([]);
    setRecipes([]);
    setSelected(new Set());
    setError(null);
    lastAction.current = null;
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
        {error && !busy && (
          <div className="banner banner--error" role="alert">
            <span className="banner__msg">{error}</span>
            {lastAction.current && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => lastAction.current?.()}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {phase === "capture" &&
          (busy ? (
            <Loading label="Looking at your fridge…" />
          ) : (
            <PhotoCapture onPhoto={handlePhoto} busy={busy} />
          ))}

        {phase === "ingredients" && (
          <section className="stack">
            {photo && <img className="preview" src={photo} alt="Your fridge" />}
            <IngredientList ingredients={ingredients} onChange={setIngredients} />
            {busy ? (
              <Loading label="Cooking up meal ideas…" />
            ) : (
              <div className="actions">
                <button className="btn btn--ghost" onClick={reset}>
                  Start over
                </button>
                <button
                  className="btn btn--primary"
                  onClick={handleGetRecipes}
                  disabled={ingredients.length === 0}
                >
                  Get meal ideas
                </button>
              </div>
            )}
          </section>
        )}

        {phase === "recipes" && (
          <section className="stack">
            <RecipeList
              recipes={recipes}
              selected={selected}
              onToggleSelect={toggleSelect}
              onEditIngredients={() => setPhase("ingredients")}
            />
            {recipes.length > 0 && (
              <ShoppingList recipes={recipes.filter((_, i) => selected.has(i))} />
            )}
            <div className="actions">
              <button className="btn btn--ghost" onClick={reset} disabled={busy}>
                Start over
              </button>
              <button
                className="btn btn--primary"
                onClick={() => setPhase("ingredients")}
                disabled={busy}
              >
                Edit ingredients
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
