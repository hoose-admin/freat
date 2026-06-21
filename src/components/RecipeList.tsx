import type { Recipe } from "../lib/types";
import { recipeKey } from "../lib/savedRecipes";

interface Props {
  recipes: Recipe[];
  /** Section heading. Defaults to the meal-ideas wording for the recipes phase. */
  heading?: string;
  /** Message shown when there are no recipes to list. */
  emptyHint?: string;
  /** Normalized title keys (recipeKey) of currently-saved recipes. */
  savedKeys?: Set<string>;
  /** When provided, each card shows a save/unsave control wired to this. */
  onToggleSave?: (r: Recipe) => void;
}

export default function RecipeList({
  recipes,
  heading = "Meal ideas",
  emptyHint = "No recipes yet. Try adding a few more ingredients.",
  savedKeys,
  onToggleSave,
}: Props) {
  if (recipes.length === 0) {
    return <p className="muted">{emptyHint}</p>;
  }

  return (
    <section className="recipes">
      <h2 className="section-title">{heading}</h2>
      <div className="recipe-grid">
        {recipes.map((r, idx) => {
          const saved = savedKeys?.has(recipeKey(r)) ?? false;
          return (
            <article className="recipe-card" key={`${r.title}-${idx}`}>
              <header className="recipe-card__head">
                <h3 className="recipe-card__title">{r.title}</h3>
                <div className="recipe-card__meta">
                  {r.difficulty && <span className={`tag tag--${r.difficulty}`}>{r.difficulty}</span>}
                  {typeof r.timeMinutes === "number" && (
                    <span className="tag">⏱ {r.timeMinutes} min</span>
                  )}
                  {onToggleSave && (
                    <button
                      type="button"
                      className={`recipe-card__save${saved ? " is-saved" : ""}`}
                      onClick={() => onToggleSave(r)}
                      aria-pressed={saved}
                      aria-label={saved ? `Remove ${r.title} from saved` : `Save ${r.title}`}
                      title={saved ? "Saved — tap to remove" : "Save recipe"}
                    >
                      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
                    </button>
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
