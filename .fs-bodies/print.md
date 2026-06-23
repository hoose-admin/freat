## Objective
Add a **Print / Save-as-PDF** action to a recipe: a print stylesheet that renders one
clean recipe (title, time/difficulty, ingredients, numbered steps) with no app chrome,
so the user can stick it on the fridge or save a PDF.

## Context
People still want a recipe on paper or as a shareable PDF — and on mobile the system
print dialog includes "Save to Files / PDF" for free. A per-card "Print" button calling
`window.print()` plus an `@media print` stylesheet is near-zero-cost and feels premium.
Hooks into the recipe-card meta row (`src/components/RecipeList.tsx:18-26`); the print CSS
hides `app__header`/`app__footer`/`actions` and force-expands the `<details>` steps
(`src/components/RecipeList.tsx:36-43`). Pure client — CSS + one handler, no types/API.
Distinct from the outbound `navigator.share` of TKT-109 (this is a paper/PDF artifact).

## Acceptance Criteria
- [ ] A "Print" control on each recipe card invokes `window.print()`.
- [ ] An `@media print` stylesheet renders a single clean recipe (no header/footer/buttons) with steps expanded.
- [ ] Only the targeted recipe prints (not the whole grid).
- [ ] No types/API change; zero console errors with no API key.

### Value Hypothesis
**Lens:** Delight / platform
**Who benefits:** Cooks who want a fridge-door card or a saved PDF.
**Why useful:** A high-ratio, near-free touch that turns an ephemeral suggestion into a
keepable artifact via the system print/PDF sheet.
**Plugs in at:** `src/components/RecipeList.tsx:18-26,36-43`; print stylesheet in `src/styles.css`.
**Score:** value m · fit h · feasibility h · novelty h
