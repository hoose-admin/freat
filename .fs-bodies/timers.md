## Objective
Turn passive step text into an active sous-chef: scan each recipe step for a duration
("simmer 10 minutes") and render the matched phrase as a **tappable countdown timer**,
with a haptic buzz + visible flash when it finishes.

## Context
Recipes constantly say "bake 20 min" / "rest 5 minutes" — making the user leave the app
to set a phone timer breaks cooking flow. The step strings already exist
(`src/components/RecipeList.tsx:39`, `<li>{step}</li>`), so a client-side regex
(`/(\d+)\s*(min|minute|hour|sec)/i`) can detect durations and make them interactive
with `setInterval` + `navigator.vibrate(...)` on completion. No contract change — parsing
is purely client-side over the existing `Recipe.steps`. This composes directly into the
Cook Mode step view, so it **depends on** that ticket for its primary surface.

## Acceptance Criteria
- [ ] Durations in step text are detected and rendered as tappable timer chips.
- [ ] Tapping starts a visible countdown; finishing fires `navigator.vibrate` (where supported) + a visual cue.
- [ ] Multiple timers can run at once (e.g. inside Cook Mode); steps without durations are unchanged.
- [ ] Graceful no-op where the Vibration API is unavailable; zero console errors with no key.

### Value Hypothesis
**Lens:** Delight / platform
**Who benefits:** Anyone cooking along step-by-step.
**Why useful:** Keeps the cook inside the app instead of fumbling for the phone's clock —
the kind of detail that makes Freat feel like an appliance, not a web page.
**Plugs in at:** `src/components/RecipeList.tsx:39` + the Cook Mode step view; `navigator.vibrate`.
**Score:** value h · fit h · feasibility m · novelty h
