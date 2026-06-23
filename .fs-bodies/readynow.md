## Objective
Rank and filter recipe results by how **ready-to-cook** they are: a "✅ Ready now"
badge when nothing is missing, a default sort by *fewest missing ingredients* (then
most on-hand ingredients used), and a one-tap "Zero shopping" filter chip.

## Context
The core promise is "use what's in your fridge," yet `RecipeList` renders recipes in
raw model order and only uses `missingIngredients.length` for a text line
(`src/components/RecipeList.tsx:16,30`) — never for sort or filter. Both
`usesIngredients[]` and `missingIngredients[]` already arrive in the response
(`src/lib/types.ts:30-31`), so this is pure client over data we already pay Gemini
for. Distinct from the shopping-list feature (TKT-105), which *builds a list* from
missing items; this *ranks the recipe cards themselves*.

## Acceptance Criteria
- [ ] Cards default-sort by `missingIngredients.length` asc, then `usesIngredients.length` desc.
- [ ] A "✅ Ready now" badge renders when `missingIngredients.length === 0`.
- [ ] A "Zero shopping" filter chip shows only ready-now recipes; toggling restores all.
- [ ] Each card shows a small "uses N of your ingredients" count.
- [ ] No `/api` or types change; zero console errors with no API key.

### Value Hypothesis
**Lens:** Data-leverage
**Who benefits:** Anyone who wants dinner without a store run.
**Why useful:** Delivers the app's actual value — "what can I make right now?" — at a
glance instead of forcing the user to read every card.
**Plugs in at:** `src/components/RecipeList.tsx:16,30`; fields `Recipe.usesIngredients/missingIngredients` (`types.ts:30-31`).
**Score:** value h · fit h · feasibility h · novelty h
