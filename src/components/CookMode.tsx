import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Recipe } from "../lib/types";

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

/** Reflects whether the screen wake-lock is actually held right now. */
type WakeState = "active" | "inactive" | "unsupported";

const wakeLockSupported = () =>
  typeof navigator !== "undefined" && "wakeLock" in navigator;

/**
 * Cook Mode — a focused, full-screen, one-step-at-a-time view for cooking a
 * recipe hands-free. Holds a screen wake-lock so the phone doesn't sleep while
 * the user follows along, and degrades silently where the API is unavailable.
 *
 * Pure client-side per ADR-001 / CLAUDE.md: reuses the existing `Recipe.steps`
 * contract — no Gemini call, no `/api` route, no `types.ts` change. Mounted only
 * on a user action (opening Cook Mode), so the no-key page-load smoke stays green.
 */
export default function CookMode({ recipe, onClose }: Props) {
  const steps = recipe.steps;
  const total = steps.length;
  const [index, setIndex] = useState(0);
  const [wake, setWake] = useState<WakeState>(() =>
    wakeLockSupported() ? "inactive" : "unsupported",
  );

  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Clamp so a shorter recipe swapping in can never index out of range.
  const step = Math.min(index, Math.max(total - 1, 0));
  const isFirst = step <= 0;
  const isLast = step >= total - 1;

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setIndex((i) => Math.min(total - 1, i + 1)),
    [total],
  );

  // Screen wake-lock: acquire on open, release on close, and re-acquire when the
  // tab returns to the foreground (the platform auto-releases the lock on hide).
  // Every path is wrapped so an absent/denied API neither throws nor leaks an
  // unhandled promise rejection (AC: no-throw / no-unhandled-rejection).
  useEffect(() => {
    if (!wakeLockSupported()) return;

    let cancelled = false;

    const release = async () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) {
        try {
          await sentinel.release();
        } catch {
          /* already released — nothing to do */
        }
      }
    };

    const acquire = async () => {
      if (cancelled || sentinelRef.current) return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          try {
            await sentinel.release();
          } catch {
            /* noop */
          }
          return;
        }
        sentinelRef.current = sentinel;
        setWake("active");
        sentinel.addEventListener("release", () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
          setWake("inactive");
        });
      } catch {
        // e.g. permission denied, or requested while the tab is hidden — degrade.
        setWake("inactive");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
    };
  }, []);

  // Move focus into the overlay on open. Focus is restored to the trigger by the
  // caller (RecipeList) on close, mirroring the recipe-detail dialog convention.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === "ArrowRight" && !isLast) {
      goNext();
      return;
    }
    if (e.key === "ArrowLeft" && !isFirst) {
      goPrev();
      return;
    }
    if (e.key === "Tab") {
      // Keep Tab inside the overlay (a full-screen dialog should trap focus).
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="cook" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="cook__panel" ref={dialogRef} tabIndex={-1} onKeyDown={onKeyDown}>
        <header className="cook__head">
          <div className="cook__heading">
            <h2 id={titleId} className="cook__title">
              {recipe.title}
            </h2>
            <WakeBadge state={wake} />
          </div>
          <button
            type="button"
            className="btn btn--ghost cook__close"
            onClick={onClose}
            aria-label="Close Cook Mode"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <p className="cook__counter" aria-live="polite">
          Step {step + 1} of {total}
        </p>

        <div className="cook__step">
          <p className="cook__step-text">{steps[step]}</p>
        </div>

        <nav className="cook__nav" aria-label="Step navigation">
          <button
            type="button"
            className="btn btn--ghost btn--lg"
            onClick={goPrev}
            disabled={isFirst}
          >
            <span aria-hidden="true">←</span> Prev
          </button>
          {isLast ? (
            <button type="button" className="btn btn--primary btn--lg" onClick={onClose}>
              Done <span aria-hidden="true">✓</span>
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" onClick={goNext}>
              Next <span aria-hidden="true">→</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

/** Visible indicator that reflects the real wake-lock state (AC: actual state). */
function WakeBadge({ state }: { state: WakeState }) {
  if (state === "active") {
    return (
      <span className="cook__wake cook__wake--on" role="status">
        <span aria-hidden="true">🔆</span> Screen staying awake
      </span>
    );
  }
  // supported-but-not-held, or unsupported: be honest that the screen may sleep.
  return (
    <span className="cook__wake cook__wake--off">
      <span aria-hidden="true">🌙</span>{" "}
      {state === "unsupported" ? "Wake-lock unavailable" : "Screen may sleep"}
    </span>
  );
}
