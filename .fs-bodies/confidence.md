## Objective
Surface the per-ingredient **detection confidence** the model already returns:
cluster low-confidence items under a subtle "Not sure about these — keep or remove?"
group so users review uncertain detections before building recipes on a wrong inventory.

## Context
`analyzeIngredients` returns `confidence` (0..1) per item (`server/gemini.ts:99-105`)
and the field is carried through the contract (`src/lib/types.ts:9`) — but the UI
renders only `i.name` and drops it on the floor (`src/components/IngredientList.tsx:41`).
That makes the review step cosmetic; a hallucinated/uncertain item silently flows into
the shopping list and recipe request. This is pure client — the data is already on the
wire. Distinct from category grouping (TKT-102), which groups by a different field.

## Acceptance Criteria
- [ ] Items with `confidence < ~0.6` are visually distinguished (dimmed / ⚠ chip style).
- [ ] Low-confidence items are grouped or sorted under a "Not sure about these" affordance.
- [ ] The confidence value is available (e.g. on hover/`title` or a small label).
- [ ] Items without a `confidence` value render normally (no regression).
- [ ] No `/api` or types change; zero console errors with no API key.

### Value Hypothesis
**Lens:** Data-leverage
**Who benefits:** Everyone — it makes the inventory trustworthy.
**Why useful:** Turns the ingredient-review step from cosmetic into meaningful by
spotlighting exactly the detections worth a second look, using data already paid for.
**Plugs in at:** `server/gemini.ts:104` → `types.ts:9` → `src/components/IngredientList.tsx:41`.
**Score:** value h · fit h · feasibility h · novelty h
