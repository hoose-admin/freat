## Objective
Add a "**Try a sample fridge**" path: a one-tap demo that seeds a canned ingredient
list and a placeholder preview, dropping the user straight into the
ingredients → recipes flow **without taking a photo or calling analyze**.

## Context
The first screen is a wall: `PhotoCapture` demands a photo before the user ever sees
ingredients or recipes (`src/components/PhotoCapture.tsx`). A new user on desktop,
with no fridge open — or in this repo, with the Gemini key unset — has nothing to
click that produces output. Seeding `App`'s `ingredients` state from a bundled
`Ingredient[]` fixture and jumping to `setPhase("ingredients")` (`src/App.tsx:13,25`)
lets anyone experience the full flow. Pure client, zero API calls; if the key is
missing, the recipe step then surfaces the existing friendly key-missing message —
the honest next nudge.

## Acceptance Criteria
- [ ] A secondary "Try a sample fridge" button on the capture screen (below capture).
- [ ] Clicking seeds ~10 canned `Ingredient[]` (shape from `types.ts:5-10`) + a placeholder preview and lands on the ingredients phase.
- [ ] Works with no camera, no photo, and no API key — zero console errors.
- [ ] The sample data is clearly editable like any analyzed result (reuses `IngredientList`).

### Value Hypothesis
**Lens:** New-user onboarding
**Who benefits:** First-run users, desktop visitors, and anyone evaluating before installing.
**Why useful:** Lets a newcomer feel the capture→ingredients→recipes payoff in one tap
without a fridge or a configured key — the difference between a dead first screen and a "wow."
**Plugs in at:** `src/components/PhotoCapture.tsx` (new button) → `src/App.tsx:13,25`.
**Score:** value h · fit h · feasibility h · novelty h
