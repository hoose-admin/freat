// Client-only demo data for the "Try a sample fridge" one-tap path. Pure data —
// no Gemini, no fetch — so the app can show off the ingredients → recipes flow
// with no photo and no API key (honors hard-rule #3: AI is lazy, never on load).
// Lives beside the other shared client modules (types.ts, api.ts).

import type { Ingredient } from "./types";

/** A plausible fridge, as if `analyze` had just returned it — editable like any result. */
export const SAMPLE_INGREDIENTS: Ingredient[] = [
  { name: "eggs", category: "dairy", confidence: 0.98 },
  { name: "milk", category: "dairy", confidence: 0.96 },
  { name: "butter", category: "dairy", confidence: 0.92 },
  { name: "cheddar cheese", category: "dairy", confidence: 0.9 },
  { name: "greek yogurt", category: "dairy", confidence: 0.85 },
  { name: "chicken breast", category: "protein", confidence: 0.93 },
  { name: "spinach", category: "vegetable", confidence: 0.88 },
  { name: "tomatoes", category: "vegetable", confidence: 0.91 },
  { name: "carrots", category: "vegetable", confidence: 0.87 },
  { name: "bell pepper", category: "vegetable", confidence: 0.83 },
];

/**
 * A self-contained placeholder "photo" for the preview slot — an inline SVG data
 * URL, so it renders with zero network requests and zero console errors. Drawn to
 * read as a stand-in, not a real fridge shot.
 */
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="Sample fridge placeholder">
  <rect width="640" height="360" fill="#131c31"/>
  <rect x="0.5" y="0.5" width="639" height="359" fill="none" stroke="#2a3a5c"/>
  <text x="320" y="168" text-anchor="middle" font-size="72">🧊🥕🧀🥦</text>
  <text x="320" y="232" text-anchor="middle" font-size="26" fill="#9fb0d0" font-family="system-ui, sans-serif">Sample fridge</text>
</svg>`;

export const SAMPLE_PREVIEW = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`;
