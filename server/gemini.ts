// Server-side Gemini client. The API key lives ONLY here (process.env) and
// never crosses to the browser — the client talks to /api/*, this talks to
// Gemini. See ADR-0001 and CLAUDE.md before changing the AI surface.

import { GoogleGenAI } from "@google/genai";
import type { Ingredient, Recipe, RecipesRequest } from "../src/lib/types.ts";

// The key may be named any of these (so setup never has to read your .env).
// IMPORTANT: a VITE_-prefixed name would be bundled into client JS by Vite —
// do NOT add one here. Keep the key server-side.
const KEY_ENV_NAMES = [
  "GEMINI_API_KEY",
  "GOOGLE_GENAI_API_KEY",
  "GOOGLE_API_KEY",
  "GENAI_API_KEY",
] as const;

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** Thrown when no Gemini key is present — handlers map this to a 503 so the app
 *  still boots (and smoke stays green) without a key configured. */
export class GeminiKeyMissingError extends Error {
  constructor() {
    super(
      `No Gemini API key found. Set one of: ${KEY_ENV_NAMES.join(", ")} in your .env (server-side, NOT VITE_-prefixed).`,
    );
    this.name = "GeminiKeyMissingError";
  }
}

function resolveKey(): { key: string; name: string } | null {
  for (const name of KEY_ENV_NAMES) {
    const v = process.env[name];
    if (v && v.trim()) return { key: v.trim(), name };
  }
  return null;
}

let cached: GoogleGenAI | null = null;
let loggedName: string | null = null;

function client(): GoogleGenAI {
  const found = resolveKey();
  if (!found) throw new GeminiKeyMissingError();
  if (loggedName !== found.name) {
    // Log the NAME we resolved from — never the value.
    console.log(`[gemini] key from ${found.name}; model ${MODEL}`);
    loggedName = found.name;
  }
  if (!cached) cached = new GoogleGenAI({ apiKey: found.key });
  return cached;
}

/** True when a key is configured (used by /api/health). */
export function geminiConfigured(): boolean {
  return resolveKey() !== null;
}

export function geminiModel(): string {
  return MODEL;
}

// Gemini occasionally wraps JSON in ```json fences even with a JSON mime type.
// Strip them, then parse defensively.
function parseJson<T>(text: string): T {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) t = fence[1].trim();
  return JSON.parse(t) as T;
}

const ANALYZE_PROMPT = `You are a kitchen-inventory assistant. Look at this photo of the inside of a refrigerator (or pantry) and list the distinct food ingredients you can identify.

Return ONLY a JSON array. Each element: {"name": string, "category": string, "confidence": number}
- name: a short, lowercase ingredient name (e.g. "eggs", "cheddar cheese", "spinach").
- category: one of "produce", "dairy", "meat", "seafood", "condiment", "beverage", "leftover", "other".
- confidence: 0..1, how sure you are it is present.
List 5-25 items. Do not include containers, shelves, or non-food items. No prose, JSON only.`;

export async function analyzeIngredients(
  imageBase64: string,
  mimeType: string,
): Promise<Ingredient[]> {
  const ai = client();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: ANALYZE_PROMPT },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const items = parseJson<Ingredient[]>(res.text ?? "[]");
  return items
    .filter((i) => i && typeof i.name === "string" && i.name.trim())
    .map((i) => ({
      name: String(i.name).trim().toLowerCase(),
      category: i.category ? String(i.category) : undefined,
      confidence: typeof i.confidence === "number" ? i.confidence : undefined,
    }));
}

function recipePrompt(req: RecipesRequest): string {
  const prefs = req.preferences;
  const dietary = prefs?.dietary?.length ? `\nDietary constraints (must respect): ${prefs.dietary.join(", ")}.` : "";
  const time = prefs?.maxTimeMinutes ? `\nEach recipe should take at most ${prefs.maxTimeMinutes} minutes.` : "";
  const servings = prefs?.servings
    ? `\nScale every recipe to serve exactly ${prefs.servings} ${prefs.servings === 1 ? "person" : "people"}: write the quantities in steps[] and missingIngredients[] for that headcount.`
    : "";
  return `You are a creative home cook. Given the ingredients a user has on hand, suggest meal ideas they could realistically make.

Ingredients on hand: ${req.ingredients.join(", ")}.${dietary}${time}${servings}

Return ONLY a JSON array of 3-6 recipes. Each element:
{"title": string, "description": string, "usesIngredients": string[], "missingIngredients": string[], "steps": string[], "timeMinutes": number, "difficulty": "easy"|"medium"|"hard"}
- usesIngredients: which of the on-hand ingredients this recipe uses.
- missingIngredients: a SHORT list of common staples the user likely still needs (keep it minimal; assume salt, pepper, oil, water).
- steps: 3-8 concise imperative steps.
Prefer recipes that use the most on-hand ingredients with the fewest missing ones. No prose outside the JSON.`;
}

export async function suggestRecipes(req: RecipesRequest): Promise<Recipe[]> {
  const ai = client();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: recipePrompt(req) }] }],
    config: { responseMimeType: "application/json", temperature: 0.7 },
  });
  const recipes = parseJson<Recipe[]>(res.text ?? "[]");
  return recipes.filter((r) => r && typeof r.title === "string" && Array.isArray(r.steps));
}
