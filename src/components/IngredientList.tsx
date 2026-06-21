import { useState } from "react";
import type { Ingredient } from "../lib/types";

interface Props {
  ingredients: Ingredient[];
  onChange: (next: Ingredient[]) => void;
}

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

  return (
    <section className="ingredients">
      <h2 className="section-title">
        Ingredients <span className="muted">({ingredients.length})</span>
      </h2>

      {ingredients.length === 0 ? (
        <p className="muted">
          No ingredients yet — add a few below, or start over with a clearer photo.
        </p>
      ) : (
        <ul className="chips">
          {ingredients.map((i) => (
            <li key={i.name} className="chip">
              <span className="chip__label">{i.name}</span>
              <button
                className="chip__remove"
                onClick={() => remove(i.name)}
                aria-label={`Remove ${i.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
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
