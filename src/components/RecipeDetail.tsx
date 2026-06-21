import { useEffect, useRef, useState } from "react";
import type { Recipe } from "../lib/types";

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

const TITLE_ID = "recipe-detail-title";

/**
 * Focused recipe detail as an accessible modal dialog: full steps + a per-recipe
 * share (Web Share API, clipboard fallback). Focus is moved in on open, trapped
 * inside, and Escape / the close button / a backdrop click all dismiss it.
 * Restoring focus to the trigger is the caller's job (see RecipeList).
 */
export default function RecipeDetail({ recipe, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));

    // Move focus into the dialog so the title is announced and the trap has an anchor.
    dialog.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const idx = items.indexOf(document.activeElement as HTMLElement);

      if (e.shiftKey) {
        // At the first element (or on the container itself) → wrap to the last.
        if (idx <= 0) {
          e.preventDefault();
          last.focus();
        }
      } else if (idx === -1 || idx === items.length - 1) {
        // On the container or the last element → wrap to the first.
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function copyFallback(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setShareMsg("Recipe copied to clipboard");
    } catch {
      setShareMsg("Couldn't copy the recipe — try again.");
    }
  }

  async function handleShare() {
    const text = recipeToText(recipe);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: recipe.title, text });
      } catch (err) {
        // The user dismissing the native share sheet rejects with AbortError —
        // that's not an error, so don't fall back or surface anything.
        if (!(err instanceof Error) || err.name !== "AbortError") {
          await copyFallback(text);
        }
      }
      return;
    }
    await copyFallback(text);
  }

  return (
    <div
      className="modal"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="modal__head">
          <h2 className="modal__title" id={TITLE_ID}>
            {recipe.title}
          </h2>
          <button className="modal__close" onClick={onClose} aria-label="Close recipe">
            ×
          </button>
        </header>

        {(recipe.difficulty || typeof recipe.timeMinutes === "number") && (
          <div className="modal__meta">
            {recipe.difficulty && (
              <span className={`tag tag--${recipe.difficulty}`}>{recipe.difficulty}</span>
            )}
            {typeof recipe.timeMinutes === "number" && (
              <span className="tag">⏱ {recipe.timeMinutes} min</span>
            )}
          </div>
        )}

        {recipe.description && <p className="modal__desc">{recipe.description}</p>}

        {recipe.usesIngredients.length > 0 && (
          <p className="modal__line">
            <strong>Uses:</strong> {recipe.usesIngredients.join(", ")}
          </p>
        )}
        {recipe.missingIngredients.length > 0 && (
          <p className="modal__line">
            <strong>You'll also need:</strong> {recipe.missingIngredients.join(", ")}
          </p>
        )}

        <h3 className="modal__subtitle">Steps</h3>
        {recipe.steps.length > 0 ? (
          <ol className="modal__steps">
            {recipe.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">No steps provided for this recipe.</p>
        )}

        <div className="modal__actions">
          {shareMsg && (
            <span className="modal__sharemsg" role="status">
              {shareMsg}
            </span>
          )}
          <button className="btn btn--ghost" onClick={handleShare}>
            Share
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Plain-text rendering of a recipe for the share sheet / clipboard. */
function recipeToText(r: Recipe): string {
  const lines: string[] = [r.title];
  if (r.description) lines.push("", r.description);
  if (r.usesIngredients.length > 0) lines.push("", `Uses: ${r.usesIngredients.join(", ")}`);
  if (r.missingIngredients.length > 0) {
    lines.push(`You'll also need: ${r.missingIngredients.join(", ")}`);
  }
  if (r.steps.length > 0) {
    lines.push("", "Steps:");
    r.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  return lines.join("\n");
}
