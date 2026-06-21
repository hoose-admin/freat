import { useEffect, useState } from "react";
import type { Recipe } from "../lib/types";

interface Props {
  /** The recipes the user has selected to shop for. */
  recipes: Recipe[];
}

/**
 * Collapse the `missingIngredients` across the chosen recipes into one list:
 * trimmed, de-duplicated **case-insensitively** (so "Olive oil" and "olive oil"
 * become one entry — first spelling wins), and sorted alphabetically.
 * Exported so the aggregation is unit-checkable on its own.
 */
export function aggregateMissing(recipes: Recipe[]): string[] {
  const seen = new Map<string, string>();
  for (const recipe of recipes) {
    for (const raw of recipe.missingIngredients) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Copy text to the clipboard, returning whether it actually landed. */
async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const COPIED = "Copied to clipboard ✓";
const COPY_FAILED = "Couldn't copy automatically — select the list and copy it.";

export default function ShoppingList({ recipes }: Props) {
  const items = aggregateMissing(recipes);
  const text = items.join("\n");
  const [status, setStatus] = useState("");

  // Drop any "Copied"/"Shared" confirmation when the underlying list changes,
  // so stale feedback never lingers after the user re-picks recipes.
  useEffect(() => setStatus(""), [text]);

  async function handleCopy() {
    setStatus((await copyToClipboard(text)) ? COPIED : COPY_FAILED);
  }

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Shopping list", text });
        return; // the native share sheet is its own confirmation
      } catch (err) {
        // User dismissed the sheet — not an error, and not worth a copy fallback.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Anything else (share unsupported for this payload): fall back to copy.
      }
    }
    setStatus((await copyToClipboard(text)) ? COPIED : COPY_FAILED);
  }

  return (
    <section className="shopping" aria-labelledby="shopping-heading">
      <h2 className="section-title" id="shopping-heading">
        Shopping list <span className="muted">({items.length})</span>
      </h2>

      {items.length === 0 ? (
        <p className="muted">
          Select recipes above to build a shopping list from the ingredients
          you're missing.
        </p>
      ) : (
        <>
          <ul className="chips">
            {items.map((item) => (
              <li key={item.toLowerCase()} className="chip chip--plain">
                <span className="chip__label">{item}</span>
              </li>
            ))}
          </ul>
          <div className="actions">
            <button className="btn btn--ghost" onClick={handleCopy}>
              Copy
            </button>
            <button className="btn btn--primary" onClick={handleShare}>
              Share
            </button>
          </div>
          <p className="shopping__status" role="status" aria-live="polite">
            {status}
          </p>
        </>
      )}
    </section>
  );
}
