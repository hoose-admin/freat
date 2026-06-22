import type { RecipePreferences } from "../lib/types";

interface Props {
  value: RecipePreferences;
  onChange: (next: RecipePreferences) => void;
}

// These dietary strings are sent verbatim to the Gemini prompt — server/gemini.ts
// joins them into "Dietary constraints (must respect): …" — so they must read as
// plain, prompt-friendly words. Keep the surface to these three (see Out of Scope).
const DIETARY_OPTIONS = ["vegetarian", "vegan", "gluten-free"] as const;

// Max-cook-time choices. 0 = "Any" → emitted as `undefined` (no constraint),
// so an untouched control adds nothing to the request.
const TIME_OPTIONS = [
  { label: "Any", minutes: 0 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "60 min", minutes: 60 },
] as const;

/** Steer recipe suggestions: dietary toggles + a max cook time. Controlled —
 *  state is owned by App and threaded into the existing RecipesRequest.preferences
 *  field (no new data path; mirrors IngredientList's typed-Props + onChange shape).
 *  Only reads/writes `dietary` and `maxTimeMinutes`; any other key on `value`
 *  (e.g. `servings`) is preserved via spread. */
export default function PreferencesControl({ value, onChange }: Props) {
  const dietary = value.dietary ?? [];

  function toggleDiet(tag: string, on: boolean) {
    const next = on ? [...dietary, tag] : dietary.filter((d) => d !== tag);
    // Empty → undefined so the request carries no `dietary: []` noise.
    onChange({ ...value, dietary: next.length ? next : undefined });
  }

  function changeTime(minutes: number) {
    onChange({ ...value, maxTimeMinutes: minutes || undefined });
  }

  return (
    <section className="prefs" aria-label="Recipe preferences">
      <fieldset className="prefs__group">
        <legend className="prefs__legend">Dietary needs</legend>
        <div className="prefs__options">
          {DIETARY_OPTIONS.map((tag) => (
            <label key={tag} className="prefs__check">
              <input
                type="checkbox"
                checked={dietary.includes(tag)}
                onChange={(e) => toggleDiet(tag, e.target.checked)}
              />
              {tag}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="prefs__time">
        <label className="prefs__time-label" htmlFor="prefs-time">
          Max cook time
        </label>
        <select
          id="prefs-time"
          className="prefs__select"
          value={value.maxTimeMinutes ?? 0}
          onChange={(e) => changeTime(Number(e.target.value))}
        >
          {TIME_OPTIONS.map((t) => (
            <option key={t.minutes} value={t.minutes}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
