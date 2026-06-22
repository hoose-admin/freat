import { useEffect, useState } from "react";
import type { Recipe } from "../lib/types";

interface Props {
  recipes: Recipe[];
}

export default function RecipeList({ recipes }: Props) {
  // Which card the user asked to print. While set, that card gets the print
  // modifier (so @media print can hide its siblings) and its steps are forced
  // open; window.print() runs after the DOM reflects that, and `afterprint`
  // clears it back to the on-screen layout.
  const [printIndex, setPrintIndex] = useState<number | null>(null);

  useEffect(() => {
    if (printIndex === null) return;
    const done = () => setPrintIndex(null);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    return () => window.removeEventListener("afterprint", done);
  }, [printIndex]);

  if (recipes.length === 0) {
    return <p className="muted">No recipes yet. Try adding a few more ingredients.</p>;
  }

  return (
    <section className="recipes">
      <h2 className="section-title">Meal ideas</h2>
      <div className="recipe-grid">
        {recipes.map((r, idx) => {
          const printing = printIndex === idx;
          return (
            <article
              className={`recipe-card${printing ? " recipe-card--print" : ""}`}
              key={`${r.title}-${idx}`}
            >
              <header className="recipe-card__head">
                <h3 className="recipe-card__title">{r.title}</h3>
                <div className="recipe-card__meta">
                  {r.difficulty && <span className={`tag tag--${r.difficulty}`}>{r.difficulty}</span>}
                  {typeof r.timeMinutes === "number" && (
                    <span className="tag">⏱ {r.timeMinutes} min</span>
                  )}
                  <button
                    type="button"
                    className="recipe-card__print"
                    onClick={() => setPrintIndex(idx)}
                    aria-label={`Print recipe: ${r.title}`}
                  >
                    <span aria-hidden="true">🖨</span> Print
                  </button>
                </div>
              </header>

              <p className="recipe-card__desc">{r.description}</p>

              {r.missingIngredients.length > 0 && (
                <p className="recipe-card__missing">
                  <strong>You'll also need:</strong> {r.missingIngredients.join(", ")}
                </p>
              )}

              <details className="recipe-card__steps" open={printing || undefined}>
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
    </section>
  );
}
