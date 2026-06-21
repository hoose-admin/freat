import { useMemo, useState } from "react";
import type { Recipe } from "../lib/types";

interface Props {
  recipes: Recipe[];
}

export default function RecipeList({ recipes }: Props) {
  const [onlyReady, setOnlyReady] = useState(false);

  // Rank by "ready to cook": fewest missing first, then most on-hand used.
  // Sort a copy — never mutate the prop, which App owns.
  const sorted = useMemo(
    () =>
      [...recipes].sort(
        (a, b) =>
          a.missingIngredients.length - b.missingIngredients.length ||
          b.usesIngredients.length - a.usesIngredients.length,
      ),
    [recipes],
  );
  const readyCount = useMemo(
    () => sorted.filter((r) => r.missingIngredients.length === 0).length,
    [sorted],
  );
  const visible = onlyReady ? sorted.filter((r) => r.missingIngredients.length === 0) : sorted;

  if (recipes.length === 0) {
    return <p className="muted">No recipes yet. Try adding a few more ingredients.</p>;
  }

  return (
    <section className="recipes">
      <div className="recipes__head">
        <h2 className="section-title">Meal ideas</h2>
        <button
          type="button"
          className={`chip chip--filter${onlyReady ? " chip--active" : ""}`}
          aria-pressed={onlyReady}
          onClick={() => setOnlyReady((v) => !v)}
        >
          🛒 Zero shopping ({readyCount})
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="muted">
          No “ready now” recipes — every idea needs at least one more ingredient. Tap “Zero
          shopping” again to see them all.
        </p>
      ) : (
        <div className="recipe-grid">
          {visible.map((r, idx) => {
            const ready = r.missingIngredients.length === 0;
            return (
              <article className="recipe-card" key={`${r.title}-${idx}`}>
                <header className="recipe-card__head">
                  <h3 className="recipe-card__title">{r.title}</h3>
                  <div className="recipe-card__meta">
                    {ready && <span className="tag tag--ready">✅ Ready now</span>}
                    {r.difficulty && (
                      <span className={`tag tag--${r.difficulty}`}>{r.difficulty}</span>
                    )}
                    {typeof r.timeMinutes === "number" && (
                      <span className="tag">⏱ {r.timeMinutes} min</span>
                    )}
                  </div>
                </header>

                <p className="recipe-card__desc">{r.description}</p>

                <p className="recipe-card__uses">
                  Uses {r.usesIngredients.length} of your ingredients
                </p>

                {r.missingIngredients.length > 0 && (
                  <p className="recipe-card__missing">
                    <strong>You'll also need:</strong> {r.missingIngredients.join(", ")}
                  </p>
                )}

                <details className="recipe-card__steps">
                  <summary>Steps</summary>
                  <ol>
                    {r.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
