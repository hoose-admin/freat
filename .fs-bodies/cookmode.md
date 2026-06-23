## Objective
Add a **Cook Mode**: a focused, full-screen, one-step-at-a-time view for actually
cooking a chosen recipe — large type, Prev/Next, a step counter, and a **screen
wake-lock** so the phone doesn't sleep with messy hands.

## Context
Today the recipe steps live in a cramped `<details>` disclosure that the user has
to scroll and pinch while cooking (`src/components/RecipeList.tsx:36-43`). This is
the natural next step *after* getting recipes, and is distinct from the static
recipe-detail/share view (TKT-109): that one is for reading/sharing, this one is a
hands-free cooking surface. `viewport-fit=cover` is already set in `index.html`, so
a full-bleed overlay lands cleanly. Pure client — reuses the existing `Recipe.steps`
contract (`src/lib/types.ts:33`); no `/api` or types change.

## Acceptance Criteria
- [ ] A "Cook this" control on each recipe card opens a full-screen step view.
- [ ] One step shown at a time in large type, with Prev/Next and a "3 of 6" counter.
- [ ] `navigator.wakeLock.request("screen")` is acquired on open and released on
      close / `visibilitychange`; gracefully degrade where the API is unavailable.
- [ ] A visible indicator shows the screen is being kept awake.
- [ ] Closing returns to the recipe grid; zero console errors with no API key.

### Value Hypothesis
**Lens:** Adjacent-workflow + Delight/platform
**Who benefits:** Anyone actually cooking from a propped-up phone.
**Why useful:** The moment after picking a recipe you stop reading and start
cooking; a screen that won't sleep and shows one big step at a time is the
highest-ratio native touch in the app.
**Plugs in at:** `src/components/RecipeList.tsx:36-43`; new overlay + `App` state; `navigator.wakeLock`.
**Score:** value h · fit h · feasibility h · novelty h
