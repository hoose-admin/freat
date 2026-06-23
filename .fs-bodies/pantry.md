## Objective
Add a **pantry staples** list: a small, persisted set of always-on-hand items
(salt, oil, garlic, soy sauce…) that are silently unioned into every recipe request
so the `missingIngredients` list stops nagging about things the user always has.

## Context
A camera can't see what's in the cupboard, so every fresh photo forces the heavy cook
to re-add staples — and recipes keep listing them as "missing." The recipe request is
built from `ingredients.map((i) => i.name)` (`src/App.tsx:37`); unioning a persisted
`pantry: string[]` (localStorage, mirroring the save-recipes persistence pattern) into
that array fixes it with no new API route — `getRecipes(ingredients)` already accepts
the merged list. Surface a "My pantry staples" editor near `IngredientList`. Distinct
from save-recipes (TKT-104) and the shopping list (TKT-105) — this is a standing
inventory, not saved output.

## Acceptance Criteria
- [ ] A small editor to add/remove pantry staples, persisted in `localStorage`.
- [ ] Staples are unioned (deduped) into the ingredient names sent to `/api/recipes`.
- [ ] Pantry items are visually distinct from photo-detected ingredients (so the user knows the source).
- [ ] Empty pantry == current behavior; reuses `getRecipes` (no new route/types).
- [ ] Zero console errors with no API key; `bun run typecheck` passes.

### Value Hypothesis
**Lens:** Power-user
**Who benefits:** Repeat cooks who always have the same basics on hand.
**Why useful:** Stops the app from re-asking for salt/oil/garlic every session and makes
"missing ingredients" mean *actually* missing — a daily-use quality-of-life win.
**Plugs in at:** `src/App.tsx:37` (request build) · localStorage · near `IngredientList.tsx`.
**Score:** value h · fit h · feasibility h · novelty h
