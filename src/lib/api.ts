// The ONE client-side data-fetching module. All network access goes through
// here so error handling and the request shape stay consistent — components
// never call fetch() directly. Extend this when you add a route.

import type {
  AnalyzeResponse,
  ApiError,
  HealthResponse,
  Ingredient,
  RecipePreferences,
  RecipesResponse,
} from "./types";

export class ApiRequestError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiRequestError("Network error — is the server running?", 0, "NETWORK");
  }
  const data = (await res.json().catch(() => ({}))) as Partial<ApiError> & Record<string, unknown>;
  if (!res.ok) {
    throw new ApiRequestError(data.error ?? `Request failed (${res.status})`, res.status, data.code);
  }
  return data as T;
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Proactive readiness probe — safe to call on mount (no Gemini call server-side). */
export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

/** Strip the `data:<mime>;base64,` prefix a FileReader data URL carries. */
export function splitDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!match) throw new ApiRequestError("Unsupported image format", 0, "BAD_IMAGE");
  return { mimeType: match[1], base64: match[2] };
}

export async function analyzeFridge(dataUrl: string): Promise<Ingredient[]> {
  const { mimeType, base64 } = splitDataUrl(dataUrl);
  const res = await postJson<AnalyzeResponse>("/api/analyze", { image: base64, mimeType });
  return res.ingredients;
}

export async function getRecipes(
  ingredients: string[],
  preferences?: RecipePreferences,
): Promise<RecipesResponse["recipes"]> {
  const res = await postJson<RecipesResponse>("/api/recipes", { ingredients, preferences });
  return res.recipes;
}
