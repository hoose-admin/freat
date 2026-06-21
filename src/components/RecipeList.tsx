import type { Recipe } from "../lib/types";

interface Props {
  recipes: Recipe[];
  /** Indices of the recipes currently added to the shopping list. */
  selected: Set<number>;
  /** Toggle a recipe in/out of the shopping list. */
  onToggleSelect: (index: number) => void;
}

export default function RecipeList({ recipes, selected, onToggleSelect }: Props) {
  if (recipes.length === 0) {
    return <p className="muted">No recipes yet. Try adding a few more ingredients.</p>;
  }

  return (
    <section className="recipes">
      <h2 className="section-title">Meal ideas</h2>
      <div className="recipe-grid">
        {recipes.map((r, idx) => {
          const isSelected = selected.has(idx);
          return (
          <article
            className={`recipe-card${isSelected ? " recipe-card--selected" : ""}`}
            key={`${r.title}-${idx}`}
          >
            <label className="recipe-card__select">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(idx)}
              />
              <span>Add to shopping list</span>
            </label>

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
          </article>
          );
        })}
      </div>
    </section>
  );
}
