import { useEffect, useRef, useState } from "react";
import PhotoCapture from "./components/PhotoCapture";
import IngredientList from "./components/IngredientList";
import RecipeList from "./components/RecipeList";
import ShoppingList from "./components/ShoppingList";
import Loading from "./components/Loading";
import { analyzeFridge, getRecipes, ApiRequestError } from "./lib/api";
import type { Ingredient, Recipe, RecipePreferences } from "./lib/types";

type Phase = "capture" | "ingredients" | "recipes";

// "Serves N" bounds. The first fetch sends NO servings (model's default); the
// stepper only ever sends a value the user explicitly picked within [MIN,MAX].
const DEFAULT_SERVINGS = 4;
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

export default function App() {
  const [phase, setPhase] = useState<Phase>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // Target headcount for the "Serves N" stepper. Session-only; the first recipe
  // fetch never sends it — only an explicit stepper change re-requests with it.
  const [servings, setServings] = useState(DEFAULT_SERVINGS);
  // Indices of the recipes the user has added to the shopping list. Lifted here
  // (the flow's single state owner) so RecipeList toggles and ShoppingList read
  // the same selection — mirrors how IngredientList lifts edits via onChange.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Polite SR announcement for async completion (analyze / recipes). One
  // always-present live region (below) reads this; a count message is the
  // payload. Kept separate from `error` (role="alert") and `busy` (aria-busy).
  const [status, setStatus] = useState("");
  // The last AI action attempted, captured so the error banner's Retry can
  // re-run exactly what failed (analyze with the same photo, or recipes with
  // the same ingredients) without the user re-doing the input.
  const lastAction = useRef<(() => void) | null>(null);
  // The <main> wrapper, so the phase effect can find the new view's heading.
  const mainRef = useRef<HTMLElement>(null);
  // Guards the focus effect from firing on initial mount — load must not steal
  // focus from the capture button.
  const firstRender = useRef(true);

  // SPA route-change focus: on every phase change move keyboard/SR focus to the
  // new view's primary <h2> (each is tabIndex={-1}). Standard WAI/Deque pattern.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [phase]);

  async function handlePhoto(dataUrl: string) {
    lastAction.current = () => handlePhoto(dataUrl);
    setPhoto(dataUrl);
    setError(null);
    setStatus("");
    setBusy(true);
    try {
      const found = await analyzeFridge(dataUrl);
      setIngredients(found);
      setStatus(`Found ${found.length} ingredient${found.length === 1 ? "" : "s"}.`);
      setPhase("ingredients");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  // The single recipe-fetch path (the one getRecipes call). `handleGetRecipes`
  // runs it with no preferences (the first "Get meal ideas" fetch — unchanged);
  // `rescale` runs it with a target headcount. Both ride the same /api/recipes
  // contract — no second data path, no new route (CLAUDE.md rule 2, ADR-001).
  async function fetchRecipes(preferences?: RecipePreferences) {
    setError(null);
    setStatus("");
    setBusy(true);
    try {
      const list = await getRecipes(ingredients.map((i) => i.name), preferences);
      setRecipes(list);
      // Default-select every recipe so the shopping list is useful with zero
      // extra taps; the per-card toggle narrows it.
      setSelected(new Set(list.map((_, i) => i)));
      setStatus(`${list.length} meal idea${list.length === 1 ? "" : "s"} ready.`);
      setPhase("recipes");
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  function handleGetRecipes() {
    lastAction.current = () => handleGetRecipes();
    // No preferences: the first fetch is byte-identical to before this feature.
    fetchRecipes();
  }

  // "Serves N" stepper handler: clamp to [MIN,MAX], remember the choice, and
  // re-request the whole list for that headcount. No-ops when already at a bound
  // (the clamp leaves the count unchanged) so we don't fire a pointless re-fetch.
  function rescale(next: number) {
    const clamped = Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, next));
    if (clamped === servings) return;
    setServings(clamped);
    lastAction.current = () => fetchRecipes({ servings: clamped });
    fetchRecipes({ servings: clamped });
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
    setServings(DEFAULT_SERVINGS);
    setError(null);
    setStatus("");
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

      <main className="app__main" aria-busy={busy} ref={mainRef}>
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
            {recipes.length > 0 && (
              <div className="servings" role="group" aria-label="Servings">
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
                  <span className="stepper__value" aria-live="polite">
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
              </div>
            )}
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

      {/* Always-present polite live region: announces async completion counts
          (analyze / recipes) to screen readers. Outside <main> (which carries
          aria-busy) and never conditionally unmounted, so SR registers it. */}
      <div className="visually-hidden" role="status" aria-live="polite">
        {status}
      </div>

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
