import type { Recipe } from "../lib/types";

interface Props {
  recipes: Recipe[];
}

export default function RecipeList({ recipes }: Props) {
  return (
    <section className="recipes">
      {/* tabIndex=-1: programmatic focus target for the recipes phase (App moves
          focus here on phase change). Always rendered so the empty state still
          has a heading to receive focus. */}
      <h2 className="section-title" tabIndex={-1}>
        Meal ideas
      </h2>
      {recipes.length === 0 ? (
        <p className="muted">No recipes yet. Try adding a few more ingredients.</p>
      ) : (
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
          </article>
        ))}
        </div>
      )}
    </section>
  );
}
