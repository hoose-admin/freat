import { useRef, useState } from "react";
import type { Recipe } from "../lib/types";
import CookMode from "./CookMode";

interface Props {
  recipes: Recipe[];
}

export default function RecipeList({ recipes }: Props) {
  const [cookIndex, setCookIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  if (recipes.length === 0) {
    return <p className="muted">No recipes yet. Try adding a few more ingredients.</p>;
  }

  function openCook(idx: number, el: HTMLButtonElement) {
    triggerRef.current = el;
    setCookIndex(idx);
  }

  function closeCook() {
    setCookIndex(null);
    triggerRef.current?.focus();
  }

  return (
    <section className="recipes">
      <h2 className="section-title">Meal ideas</h2>
      <div className="recipe-grid">
        {recipes.map((r, idx) => (
          <article className="recipe-card" key={`${r.title}-${idx}`}>
            <header className="recipe-card__head">
              <h3 className="recipe-card__title">{r.title}</h3>
              <div className="recipe-card__meta">
                {r.difficulty && <span className={`tag tag--${r.difficulty}`}>{r.difficulty}</span>}
                {typeof r.timeMinutes === "number" && (
                  <span className="tag">⏱ {r.timeMinutes} min</span>
                )}
              </div>
            </header>

            <p className="recipe-card__desc">{r.description}</p>

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

            {r.steps.length > 0 && (
              <div className="recipe-card__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={(e) => openCook(idx, e.currentTarget)}
                >
                  <span aria-hidden="true">👨‍🍳</span> Cook this
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {cookIndex !== null && recipes[cookIndex] && (
        <CookMode recipe={recipes[cookIndex]} onClose={closeCook} />
      )}
    </section>
  );
}
