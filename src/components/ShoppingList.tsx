import { useEffect, useState } from "react";
import type { Recipe } from "../lib/types";

/** Collapse the `missingIngredients` of the chosen recipes into one shopping
 *  list: trimmed, de-duplicated **case-insensitively** (first-seen spelling
 *  wins, so "Olive oil" and "olive oil" become one entry), sorted
 *  alphabetically. Exported so the aggregation can be verified directly.
 *  Mirrors the trimmed-lowercase normalization IngredientList already uses. */
export function aggregateMissing(recipes: Recipe[]): string[] {
  const seen = new Map<string, string>();
  for (const r of recipes) {
    for (const raw of r.missingIngredients) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

interface Props {
  /** The recipes the user has selected — already filtered by App. */
  recipes: Recipe[];
}

/** Write to the clipboard, feature-detected and never throwing. Returns whether
 *  the copy actually succeeded so the caller can show honest feedback. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied / insecure context — fall through to the manual hint.
  }
  return false;
}

const COPY_OK = "Copied to clipboard ✓";
const COPY_FAIL = "⚠ Couldn't copy — select the list and copy it manually.";

export default function ShoppingList({ recipes }: Props) {
  const items = aggregateMissing(recipes);
  const [status, setStatus] = useState("");

  // Drop any stale "Copied ✓" once the list changes (a recipe was toggled), so
  // the confirmation never lingers over a list it no longer describes. No I/O.
  useEffect(() => setStatus(""), [recipes]);

  const text = items.join("\n");

  // Color the live status by outcome — green for a real copy, red for the
  // fallback failure — so the rare "couldn't copy" never reads as success.
  const statusModifier =
    status === COPY_OK
      ? " shopping__status--ok"
      : status === COPY_FAIL
        ? " shopping__status--error"
        : "";

  async function handleCopy() {
    setStatus((await copyToClipboard(text)) ? COPY_OK : COPY_FAIL);
  }

  async function handleShare() {
    // Native share where supported (mostly mobile); fall back to copy elsewhere.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Shopping list", text });
        return;
      } catch (e) {
        // The user dismissing the share sheet is not an error — just stop.
        if (e instanceof DOMException && e.name === "AbortError") return;
        // Any other share failure falls through to the copy fallback below.
      }
    }
    setStatus((await copyToClipboard(text)) ? COPY_OK : COPY_FAIL);
  }

  return (
    <section className="shopping">
      <h2 className="section-title">Shopping list</h2>

      {items.length === 0 ? (
        <p className="muted">
          Select recipes above to build a shopping list of the ingredients you
          don't have yet.
        </p>
      ) : (
        <>
          <ul className="chips">
            {items.map((name) => (
              <li className="chip chip--plain" key={name}>
                <span className="chip__label">{name}</span>
              </li>
            ))}
          </ul>
          <div className="actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleCopy}>
              Copy
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={handleShare}>
              Share
            </button>
          </div>
        </>
      )}

      <p className={`shopping__status${statusModifier}`} role="status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
