import { useRef, useState } from "react";
import type { Recipe } from "../lib/types";
import RecipeDetail from "./RecipeDetail";

interface Props {
  recipes: Recipe[];
}

export default function RecipeList({ recipes }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  if (recipes.length === 0) {
    return <p className="muted">No recipes yet. Try adding a few more ingredients.</p>;
  }

  function open(idx: number, el: HTMLButtonElement) {
    triggerRef.current = el;
    setOpenIndex(idx);
  }

  function close() {
    setOpenIndex(null);
    // Restore focus to the card's trigger so keyboard users aren't dropped to <body>.
    triggerRef.current?.focus();
  }

  const openRecipe = openIndex === null ? null : recipes[openIndex];

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

            <div className="recipe-card__foot">
              <button
                className="btn btn--ghost recipe-card__view"
                onClick={(e) => open(idx, e.currentTarget)}
              >
                View recipe
              </button>
            </div>
          </article>
        ))}
      </div>

      {openRecipe && <RecipeDetail recipe={openRecipe} onClose={close} />}
    </section>
  );
}
