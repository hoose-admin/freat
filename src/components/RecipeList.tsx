import { useRef, useState } from "react";
import type { Recipe } from "../lib/types";
import StepText from "./StepText";
import CookMode from "./CookMode";

interface Props {
  recipes: Recipe[];
  /** Indices of the recipes the user has added to the shopping list. */
  selected: Set<number>;
  /** Toggle a recipe in/out of the shopping list (lifted to App). */
  onToggleSelect: (index: number) => void;
  /** Jump back to the ingredient editor — wired to the empty-state next step. */
  onEditIngredients?: () => void;
}

export default function RecipeList({
  recipes,
  selected,
  onToggleSelect,
  onEditIngredients,
}: Props) {
  // Which recipe (if any) is open in Cook Mode. State lives here — the grid owns
  // the recipe→overlay interaction and the focus restoration (matches TKT-109).
  const [cookIndex, setCookIndex] = useState<number | null>(null);
  // The "Cook this" button that opened the overlay, so focus can return to it.
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function openCook(idx: number, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setCookIndex(idx);
  }

  function closeCook() {
    setCookIndex(null);
    // Restore focus to the originating control on the next tick (after unmount).
    const trigger = triggerRef.current;
    requestAnimationFrame(() => trigger?.focus());
  }

  if (recipes.length === 0) {
    return (
      <section className="recipes recipes--empty">
        <h2 className="section-title" tabIndex={-1}>Meal ideas</h2>
        <p className="muted">
          No recipes matched those ingredients yet. Tap <strong>Edit ingredients</strong> to
          add a couple more, then try again.
        </p>
        {onEditIngredients && (
          <button className="btn btn--ghost" onClick={onEditIngredients}>
            Edit ingredients
          </button>
        )}
      </section>
    );
  }

  const cooking = cookIndex !== null ? recipes[cookIndex] : null;

  return (
    <section className="recipes">
      <h2 className="section-title" tabIndex={-1}>Meal ideas</h2>
      <div className="recipe-grid">
        {recipes.map((r, idx) => (
          <article
            className={selected.has(idx) ? "recipe-card recipe-card--selected" : "recipe-card"}
            key={`${r.title}-${idx}`}
          >
            <header className="recipe-card__head">
              <h3 className="recipe-card__title">{r.title}</h3>
              <div className="recipe-card__meta">
                {r.difficulty && <span className={`tag tag--${r.difficulty}`}>{r.difficulty}</span>}
                {typeof r.timeMinutes === "number" && (
                  <span className="tag">⏱ {r.timeMinutes} min</span>
                )}
              </div>
            </header>

            <label className="recipe-card__select">
              <input
                type="checkbox"
                checked={selected.has(idx)}
                onChange={() => onToggleSelect(idx)}
              />
              Add to shopping list
            </label>

            <p className="recipe-card__desc">{r.description}</p>

            {r.usesIngredients.length > 0 && (
              <p className="recipe-card__uses">
                <strong>Uses:</strong> {r.usesIngredients.join(", ")}
              </p>
            )}

            {r.missingIngredients.length > 0 && (
              <p className="recipe-card__missing">
                <strong>You'll also need:</strong> {r.missingIngredients.join(", ")}
              </p>
            )}

            <details className="recipe-card__steps">
              <summary>Steps</summary>
              <ol>
                {r.steps.map((step, i) => (
                  <li key={i}>
                    <StepText text={step} />
                  </li>
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

      {cooking && <CookMode recipe={cooking} onClose={closeCook} />}
    </section>
  );
}
