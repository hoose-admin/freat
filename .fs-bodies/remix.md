## Objective
**Remix a recipe**: regenerate one dish in place with a quick tweak — preset chips
("🌶 spicier", "🥗 vegan", "⏱ faster", "🔁 different idea") plus an optional free-text
nudge — without sending the user back to ingredient editing.

## Context
The recipes that come back are a one-shot roll of the dice (`suggestRecipes`,
`server/gemini.ts:124-133`, temp 0.7). The real desire is conversational ("make it
vegan", "I'm out of cheese", "give me something else"). Today the only way to nudge a
single dish is to go back and re-run everything. Add a focused third AI call and a new
route the contract-first way: `remixRecipe()` in `server/gemini.ts`, `POST
/api/recipes/remix` in `server/handlers.ts` (the one place routes are added), a
`RecipeRemixRequest { base, tweak, ingredients }` + helper in `types.ts`/`api.ts`, and
a per-card "Remix" affordance in `src/components/RecipeList.tsx:17`. Reuses the
`Recipe` shape verbatim — no fork.

## Acceptance Criteria
- [ ] New `POST /api/recipes/remix` returns a single regenerated `Recipe` (same shape).
- [ ] Typed helper in `src/lib/api.ts` + request/response types in `src/lib/types.ts`.
- [ ] Per-card preset tweak chips + free-text box; submitting swaps that card in place.
- [ ] Key-missing path returns the existing 503 / friendly message (no new error shape).
- [ ] `bun run typecheck` passes; app boots with zero console errors when no key is set.

### Value Hypothesis
**Lens:** Adjacent-workflow / Power-user
**Who benefits:** Returning cooks who've seen the obvious ideas and want to steer one dish.
**Why useful:** Turns a static result set into a conversation — "almost, but spicier" —
which is how people actually decide what to cook.
**Plugs in at:** `server/gemini.ts:124-133` · `server/handlers.ts` (new route) · `RecipeList.tsx:17`.
**Score:** value h · fit h · feasibility m · novelty h
