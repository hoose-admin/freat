import { useState } from "react";

interface Props {
  staples: string[];
  onChange: (next: string[]) => void;
}

/** "My pantry staples" — a standing list of always-on-hand basics (salt, oil,
 *  garlic…) that App silently unions into every recipe request so they stop
 *  showing up as "missing." Controlled, mirroring IngredientList: App owns the
 *  state and persists it (localStorage, via src/lib/pantry.ts); this component
 *  only edits via onChange. Add normalizes (trim + lowercase) and dedupes, the
 *  same convention IngredientList uses, so the union point can dedupe cleanly. */
export default function PantryStaples({ staples, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function remove(name: string) {
    onChange(staples.filter((s) => s !== name));
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim().toLowerCase();
    if (!name) return;
    if (!staples.includes(name)) onChange([...staples, name]);
    setDraft("");
  }

  return (
    <section className="pantry" aria-label="Pantry staples">
      <h3 className="pantry__title">
        My pantry staples <span className="muted">({staples.length})</span>
      </h3>
      <p className="muted pantry__hint">
        Always-on-hand basics — added to every recipe request so they&rsquo;re never
        flagged as missing.
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
          placeholder="Add a staple…"
          aria-label="Add a pantry staple"
        />
        <button className="btn btn--ghost" type="submit" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </section>
  );
}
