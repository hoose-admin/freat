// Pantry staples — a small, persisted set of always-on-hand items (salt, oil,
// garlic…) the user never wants flagged as "missing." This is pure client-side
// persistence: no Gemini call and no /api route (ADR-001) — the list is unioned
// into the recipe request on the client. Self-contained localStorage module
// whose every access is try/catch-guarded, so a blocked/full/corrupt store
// degrades to a default or a no-op instead of throwing (keeps the smoke gate
// console-error-free). Namespaced + versioned key, mirroring the sibling
// persistence tickets' convention — NOT a shared global storage abstraction.

const KEY = "freat.pantry.v1";

/** Read the saved staples. Returns [] on a blocked / empty / corrupt store. */
export function loadPantry(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/** Persist the staples. No-ops when storage is unavailable or full — the
 *  in-memory list still works for the rest of the session. */
export function savePantry(items: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* unavailable or full — degrade silently */
  }
}
