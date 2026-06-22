import { useState } from "react";
import type { Ingredient } from "../lib/types";

interface Props {
  ingredients: Ingredient[];
  onChange: (next: Ingredient[]) => void;
}

/** Below this model confidence, an item is flagged for the user to double-check.
 *  Items with no `confidence` at all (e.g. manual adds) are always treated as sure. */
const LOW_CONFIDENCE = 0.6;

const isUnsure = (i: Ingredient) =>
  typeof i.confidence === "number" && i.confidence < LOW_CONFIDENCE;

/** Review & correct what the model found before asking for recipes. */
export default function IngredientList({ ingredients, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function remove(name: string) {
    onChange(ingredients.filter((i) => i.name !== name));
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim().toLowerCase();
    if (!name) return;
    if (!ingredients.some((i) => i.name === name)) {
      onChange([...ingredients, { name }]);
    }
    setDraft("");
  }

  // Cluster the detections the model was unsure about so the user reviews them
  // before recipes get built on a wrong inventory. No-confidence items stay sure.
  const sure = ingredients.filter((i) => !isUnsure(i));
  const unsure = ingredients.filter(isUnsure);

  return (
    <section className="ingredients">
      <h2 className="section-title">
        Ingredients <span className="muted">({ingredients.length})</span>
      </h2>

      {ingredients.length === 0 ? (
        <p className="muted">
          No ingredients yet — type one in the box below to start, or go back and
          retake the photo with the fridge well-lit.
        </p>
      ) : (
        <>
          {sure.length > 0 && (
            <ul className="chips">
              {sure.map((i) => (
                <Chip key={i.name} ingredient={i} onRemove={remove} />
              ))}
            </ul>
          )}

          {unsure.length > 0 && (
            <div className="unsure">
              <h3 className="unsure__title">Not sure about these — keep or remove?</h3>
              <ul className="chips">
                {unsure.map((i) => (
                  <Chip key={i.name} ingredient={i} onRemove={remove} unsure />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <form className="ingredients__add" onSubmit={add}>
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an ingredient…"
          aria-label="Add an ingredient"
        />
        <button className="btn btn--ghost" type="submit" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </section>
  );
}

function Chip({
  ingredient,
  onRemove,
  unsure = false,
}: {
  ingredient: Ingredient;
  onRemove: (name: string) => void;
  unsure?: boolean;
}) {
  const { name, confidence } = ingredient;
  const pct = typeof confidence === "number" ? Math.round(confidence * 100) : null;
  return (
    <li
      className={unsure ? "chip chip--unsure" : "chip"}
      title={unsure && pct !== null ? `Low confidence: ${pct}% sure it's in the photo` : undefined}
    >
      {unsure && (
        <span className="chip__warn" aria-hidden="true">
          ⚠
        </span>
      )}
      <span className="chip__label">{name}</span>
      {unsure && pct !== null && <span className="chip__confidence">{pct}%</span>}
      <button
        className="chip__remove"
        onClick={() => onRemove(name)}
        aria-label={`Remove ${name}`}
      >
        ×
      </button>
    </li>
  );
}
