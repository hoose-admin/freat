import { useEffect, useRef, useState } from "react";
import PhotoCapture from "./components/PhotoCapture";
import IngredientList from "./components/IngredientList";
import PreferencesControl from "./components/PreferencesControl";
import RecipeList from "./components/RecipeList";
import ShoppingList from "./components/ShoppingList";
import Loading from "./components/Loading";
import { analyzeFridge, getRecipes, getHealth, ApiRequestError } from "./lib/api";
import type { Ingredient, Recipe, RecipePreferences, HealthResponse } from "./lib/types";

type Phase = "capture" | "ingredients" | "recipes";

// "Serves N" bounds. The first fetch sends NO servings (model's default); the
// stepper only ever sends a value the user explicitly picked within [MIN,MAX].
const DEFAULT_SERVINGS = 4;
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

// Session-scoped dietary/time preferences (NOT the per-photo flow data). Kept in
// sessionStorage so selections survive a same-tab reload; cleared when the tab
// closes (Out of Scope: cross-session/localStorage persistence).
const PREFS_KEY = "freat:preferences";

export default function App() {
  const [phase, setPhase] = useState<Phase>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // Target headcount for the "Serves N" stepper. Session-only; the first recipe
  // fetch never sends it — only an explicit stepper change re-requests with it.
  const [servings, setServings] = useState(DEFAULT_SERVINGS);
  // Dietary/time preferences for recipe requests. Lazy-initialized from
  // sessionStorage (survives a same-tab reload) and owned here so the control on
  // the ingredients screen and both fetch paths read the same value.
  const [preferences, setPreferences] = useState<RecipePreferences>(loadPreferences);
  // Indices of the recipes the user has added to the shopping list. Lifted here
  // (the flow's single state owner) so RecipeList toggles and ShoppingList read
  // the same selection — mirrors how IngredientList lifts edits via onChange.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Proactive AI-readiness probe (TKT-133). Fetched once on mount from
  // /api/health (NOT a Gemini call — ADR-001), so the header can show whether
  // the key is configured before the user wastes a photo on a dead analyze.
  const [health, setHealth] = useState<HealthResponse | null>(null);
  // The demo-mode banner is dismissible for the session.
  const [demoDismissed, setDemoDismissed] = useState(false);
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

  // Probe AI readiness once on mount. The .catch swallows a down/erroring probe
  // so it never logs a console error (keeps the smoke gate green with no key).
  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => {});
  }, []);

  // Persist preferences for the session. try/catch so blocked storage (private
  // mode) can't throw a console error and trip the smoke gate.
  useEffect(() => {
    try {
      sessionStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch {
      /* storage unavailable — preferences just won't survive reload */
    }
  }, [preferences]);

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
  // runs it with the user's dietary/time choices; `rescale` runs it with those
  // choices PLUS a target headcount. Both ride the same /api/recipes contract —
  // no second data path, no new route (CLAUDE.md rule 2, ADR-001).
  async function fetchRecipes(prefs?: RecipePreferences) {
    setError(null);
    setStatus("");
    setBusy(true);
    try {
      const list = await getRecipes(ingredients.map((i) => i.name), prefs);
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
    // Send the user's dietary/time choices. cleanPreferences → undefined when
    // nothing is selected, so the request stays byte-identical to "no prefs".
    fetchRecipes(cleanPreferences(preferences));
  }

  // "Serves N" stepper handler: clamp to [MIN,MAX], remember the choice, and
  // re-request the whole list for that headcount. No-ops when already at a bound
  // (the clamp leaves the count unchanged) so we don't fire a pointless re-fetch.
  function rescale(next: number) {
    const clamped = Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, next));
    if (clamped === servings) return;
    setServings(clamped);
    // Merge the standing dietary/time filter with the new headcount so re-scaling
    // doesn't drop the user's diet. Spreading `undefined` is a no-op, so with no
    // diet selected this stays exactly `{ servings }`.
    const prefs = { ...cleanPreferences(preferences), servings: clamped };
    lastAction.current = () => fetchRecipes(prefs);
    fetchRecipes(prefs);
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
    // `preferences` is intentionally left intact — dietary/time are session
    // settings, not per-photo data, so "Start over" keeps the user's diet.
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <span aria-hidden="true">🧊</span> Freat
        </h1>
        <p className="app__tagline">Snap your fridge, get dinner ideas.</p>
        {health && (
          <p
            className={`ai-pill ai-pill--${health.geminiConfigured ? "ready" : "off"}`}
            role="status"
          >
            <span className="ai-pill__dot" aria-hidden="true" />
            {health.geminiConfigured ? "AI ready" : "AI not configured"}
          </p>
        )}
      </header>

      <main className="app__main" aria-busy={busy} ref={mainRef}>
        {health && !health.geminiConfigured && !demoDismissed && (
          <div className="banner banner--info" role="status">
            <span className="banner__msg">
              Demo mode — no Gemini key is configured, so analyzing a photo and getting
              meal ideas won&rsquo;t work yet. Add a key to <code>.env</code> and restart
              the server to switch the AI on.
            </span>
            <button
              className="banner__dismiss btn btn--ghost btn--sm"
              onClick={() => setDemoDismissed(true)}
              aria-label="Dismiss demo-mode notice"
            >
              Dismiss
            </button>
          </div>
        )}

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
            <PreferencesControl value={preferences} onChange={setPreferences} />
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

// Lazy state initializer: read saved preferences from sessionStorage. Wrapped in
// try/catch so blocked/malformed storage degrades to empty prefs (no console
// error → smoke stays green).
function loadPreferences(): RecipePreferences {
  try {
    const raw = sessionStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as RecipePreferences;
  } catch {
    /* unavailable or malformed — fall through to empty */
  }
  return {};
}

// Strip empty fields so an untouched control sends NO `preferences` key (returns
// undefined → JSON.stringify drops it), keeping a no-selection request identical
// to before this feature. Never emits `dietary: []`, `maxTimeMinutes: 0`, or `{}`.
function cleanPreferences(p: RecipePreferences): RecipePreferences | undefined {
  const out: RecipePreferences = {};
  if (p.dietary && p.dietary.length) out.dietary = p.dietary;
  if (p.maxTimeMinutes) out.maxTimeMinutes = p.maxTimeMinutes;
  return Object.keys(out).length ? out : undefined;
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
