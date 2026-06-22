import { useState } from "react";
import { normalizeStaple } from "../lib/pantry";

interface Props {
  /** The persisted always-on-hand staples (normalized lowercase names). */
  staples: string[];
  /** Lift edits up to App (which owns state + persistence). */
  onChange: (next: string[]) => void;
}

/**
 * Editor for always-on-hand pantry staples. Controlled like IngredientList:
 * App owns the list and persists it; this component just renders + emits edits.
 * Staples are unioned into the recipe request so the app stops flagging things
 * the user always has as "missing".
 */
export default function PantryStaples({ staples, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function remove(name: string) {
    onChange(staples.filter((s) => s !== name));
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const name = normalizeStaple(draft);
    if (!name) return;
    if (!staples.includes(name)) {
      onChange([...staples, name]);
    }
    setDraft("");
  }

  return (
    <section className="pantry">
      <h2 className="section-title">
        My pantry staples <span className="muted">({staples.length})</span>
      </h2>
      <p className="muted pantry__hint">
        Always-on-hand basics (salt, oil, garlic…). Added to every recipe search so
        they stop showing up as “missing.”
      </p>

      {staples.length > 0 && (
        <ul className="chips">
          {staples.map((name) => (
            <li key={name} className="chip chip--pantry">
              <span className="chip__label">{name}</span>
              <button
                className="chip__remove"
                onClick={() => remove(name)}
                aria-label={`Remove ${name} from pantry staples`}
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
          placeholder="Add a pantry staple…"
          aria-label="Add a pantry staple"
        />
        <button className="btn btn--ghost" type="submit" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </section>
  );
}
