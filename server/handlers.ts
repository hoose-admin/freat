// The /api/* contract. Framework-agnostic: takes a web Request, returns a web
// Response (or null if the path isn't an API route). Shared by the Bun server
// (prod/smoke) — keep all API routes here so there is ONE place to extend.

import {
  analyzeIngredients,
  suggestRecipes,
  geminiConfigured,
  geminiModel,
  GeminiKeyMissingError,
} from "./gemini.ts";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  HealthResponse,
  RecipesRequest,
  RecipesResponse,
} from "../src/lib/types.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(e: unknown): Response {
  if (e instanceof GeminiKeyMissingError) {
    return json({ error: e.message, code: "GEMINI_KEY_MISSING" }, 503);
  }
  const message = e instanceof Error ? e.message : "Unexpected server error";
  console.error("[api] error:", message);
  return json({ error: message, code: "UPSTREAM_ERROR" }, 502);
}

/** Returns a Response for any /api/* route, or null to let the caller serve
 *  static files / fall through. */
export async function handleApi(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/api/")) return null;

  // Health check — cheap, no Gemini call. Useful for smoke + readiness.
  if (url.pathname === "/api/health" && req.method === "GET") {
    return json({ ok: true, geminiConfigured: geminiConfigured(), model: geminiModel() } satisfies HealthResponse);
  }

  if (url.pathname === "/api/analyze" && req.method === "POST") {
    try {
      const body = (await req.json()) as AnalyzeRequest;
      if (!body?.image || !body?.mimeType) {
        return json({ error: "image (base64) and mimeType are required", code: "BAD_REQUEST" }, 400);
      }
      const ingredients = await analyzeIngredients(body.image, body.mimeType);
      return json({ ingredients } satisfies AnalyzeResponse);
    } catch (e) {
      return errorResponse(e);
    }
  }

  if (url.pathname === "/api/recipes" && req.method === "POST") {
    try {
      const body = (await req.json()) as RecipesRequest;
      const ingredients = Array.isArray(body?.ingredients)
        ? body.ingredients.map((s) => String(s).trim()).filter(Boolean)
        : [];
      if (ingredients.length === 0) {
        return json({ error: "at least one ingredient is required", code: "BAD_REQUEST" }, 400);
      }
      const recipes = await suggestRecipes({ ingredients, preferences: body.preferences });
      return json({ recipes } satisfies RecipesResponse);
    } catch (e) {
      return errorResponse(e);
    }
  }

  return json({ error: `no such route: ${req.method} ${url.pathname}`, code: "NOT_FOUND" }, 404);
}
