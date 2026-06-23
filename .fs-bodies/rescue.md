## Objective
When analyze returns a **suspiciously thin** result (very few items and/or low mean
confidence), show a friendly inline "Only spotted a few things — retake with the door
fully open?" prompt offering Retake / Keep-going, instead of silently dropping the user
into a near-empty ingredient list.

## Context
`analyzeIngredients` can legitimately return very few items for a blurry/closed/dark
photo (`server/gemini.ts:80-106`), and `handlePhoto` drops the user into the ingredient
screen regardless (`src/App.tsx:23-25`). A first-timer who sees "2 ingredients" blames
the product when the real culprit was the photo. Branch on `found.length` (and optionally
the mean of the already-present `confidence` field, `src/lib/types.ts:9`) and reuse the
existing `reset()` (`src/App.tsx:47`) to re-enter capture. Pure client; no API or types
change. Distinct from TKT-103's *empty* state — this targets the weak-but-nonempty case.

## Acceptance Criteria
- [ ] After analyze, a thin result (e.g. `< 3` items or low mean confidence) shows an inline retake prompt above the list.
- [ ] "Retake" returns to capture; "Keep going" dismisses and proceeds normally.
- [ ] Healthy results (enough items / decent confidence) show no prompt (no false positives on good photos).
- [ ] No `/api` or types change; zero console errors with no API key.

### Value Hypothesis
**Lens:** New-user onboarding
**Who benefits:** First-timers and anyone whose photo came out poorly.
**Why useful:** Converts a perceived product failure ("it barely found anything") into a
cheap second attempt, protecting the first impression.
**Plugs in at:** `src/App.tsx:23-25,47`; field `Ingredient.confidence` (`types.ts:9`).
**Score:** value m · fit h · feasibility h · novelty h
