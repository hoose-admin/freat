// Pantry staples: a small, always-on-hand inventory persisted client-side in
// localStorage. Self-contained and namespaced under `freat.pantry.v1` (same
// `freat.<feature>.vN` convention as the other persistence slices) so it never
// collides with a sibling feature's store. Every localStorage access is
// try/catch-guarded — a disabled, full, or unavailable store degrades to the
// empty list / a no-op instead of throwing, so the app renders cleanly with no
// key configured. Pure client-side: no network, no Gemini, no /api route.

const KEY = "freat.pantry.v1";

/** Normalize a staple name the same way IngredientList keys ingredients. */
export function normalizeStaple(name: string): string {
  return name.trim().toLowerCase();
}

/** Read the persisted staples; returns [] on an empty/unavailable/corrupt store. */
export function loadPantry(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: keep only non-empty strings, normalized + deduped.
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const name = normalizeStaple(item);
      if (name && !seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Persist the staples list; no-ops if the store is unavailable/full. */
export function savePantry(staples: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(staples));
  } catch {
    // Disabled or full store — degrade silently rather than crash the app.
  }
}
