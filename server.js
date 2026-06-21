// freat backend — keeps the Anthropic key server-side and serves the built PWA.
// Two endpoints: image -> ingredients, ingredients -> recipes. Bun runs this.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the env
const MODEL = process.env.MODEL || "claude-opus-4-8"; // ponytail: opus default per house rule; MODEL env swaps it
const PORT = Number(process.env.PORT || 8787); // 3000 is a common collision; pick something quieter

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

// Pull the structured JSON back out of a messages.create response.
function parseStructured(res) {
  const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
  return JSON.parse(text);
}

const INGREDIENTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ingredients"],
  properties: { ingredients: { type: "array", items: { type: "string" } } },
};

const RECIPES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["recipes"],
  properties: {
    recipes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "time_minutes", "difficulty", "uses", "missing", "steps"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          time_minutes: { type: "integer" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          uses: { type: "array", items: { type: "string" } },
          missing: { type: "array", items: { type: "string" } },
          steps: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

async function detectIngredients({ image, mediaType }) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    output_config: { format: { type: "json_schema", schema: INGREDIENTS_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          {
            type: "text",
            text:
              "This is a photo inside someone's fridge or pantry. List the distinct, edible food ingredients you can identify. " +
              "Use plain everyday names (e.g. 'eggs', 'cheddar', 'spinach'), singular where natural. " +
              "Skip condiments' brand names, non-food items, and anything you're unsure about.",
          },
        ],
      },
    ],
  });
  return parseStructured(res).ingredients;
}

async function suggestRecipes({ ingredients, diet }) {
  const dietLine =
    diet && diet !== "none" ? `The user eats ${diet}; every recipe must comply.` : "No dietary restrictions.";
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { format: { type: "json_schema", schema: RECIPES_SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          `Available ingredients: ${ingredients.join(", ")}.\n${dietLine}\n\n` +
          "Suggest up to 6 recipes someone could realistically make, prioritising ones that use what's available " +
          "with the fewest extra purchases. Assume common pantry staples are on hand (salt, pepper, oil, butter, " +
          "water, flour, sugar, common dried spices) — do NOT list those as missing. " +
          "For each recipe: `uses` = the listed ingredients it uses, `missing` = anything else needed that isn't a " +
          "staple, `steps` = concise numbered instructions. Vary cuisine and effort. Sort easiest/highest-match first.",
      },
    ],
  });
  return parseStructured(res).recipes;
}

let server;
try {
  server = Bun.serve({
  port: PORT,
  // base64 of a 1024px jpeg is well under the default body cap; bump if you raise the client max dim
  maxRequestBodySize: 16 * 1024 * 1024,
  async fetch(req) {
    const url = new URL(req.url);

    try {
      if (req.method === "POST" && url.pathname === "/api/ingredients") {
        const body = await req.json();
        if (!body.image) return json({ error: "no image" }, 400);
        return json({ ingredients: await detectIngredients(body) });
      }
      if (req.method === "POST" && url.pathname === "/api/recipes") {
        const body = await req.json();
        if (!body.ingredients?.length) return json({ error: "no ingredients" }, 400);
        return json({ recipes: await suggestRecipes(body) });
      }
    } catch (err) {
      console.error(err);
      const msg = err?.status === 401 ? "Missing or invalid ANTHROPIC_API_KEY." : err?.message || "request failed";
      return json({ error: msg }, 500);
    }

    // static: serve the built PWA from ./dist, falling back to index.html
    if (req.method === "GET") {
      const path = url.pathname === "/" ? "/index.html" : url.pathname;
      const file = Bun.file("dist" + path);
      if (await file.exists()) return new Response(file);
      return new Response(Bun.file("dist/index.html"), { headers: { "content-type": "text/html" } });
    }
    return new Response("not found", { status: 404 });
  },
  });
} catch (err) {
  console.error(`\n✗ freat could not bind port ${PORT}: ${err.message}`);
  console.error(`  Something else is using it. Run with a free port: PORT=8788 bun server.js\n`);
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("⚠ ANTHROPIC_API_KEY is not set — put it in .env (not .env.example). API calls will fail.");
}
console.log(`freat server on http://localhost:${server.port}  (model: ${MODEL})`);
