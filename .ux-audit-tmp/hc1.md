## Objective
Make the full-reset action consistent and stop the destructive "wipe everything" action from occupying the visually-primary button slot on the recipes screen.

## Context
`reset()` (`src/App.tsx:47-53`) clears `photo`, `ingredients`, and `recipes` and returns to the capture phase. It is wired to **two different buttons with two different labels and two different emphases**:

- Ingredients phase: `src/App.tsx:78` — labeled **"Start over"**, rendered as the de-emphasized **ghost** button.
- Recipes phase: `src/App.tsx:99-101` — labeled **"New photo"**, rendered as the bright-green **primary** button.

So the single most prominent control on the results screen (`btn--primary`) throws away every recipe the user just waited several seconds for — with no confirmation. Users learn "the green button moves me forward," and on the final screen that learned rule deletes their results. The label "New photo" also under-states the blast radius: it reads like "just re-shoot," but it nukes the curated ingredient list and recipes too. On mobile the action buttons stack full-width (`src/styles.css:318-324`), making a mis-tap likelier.

## Acceptance Criteria
- The full-reset action uses **one** label across both phases (e.g. "Start over").
- The full-reset is the **ghost** (de-emphasized) button in both phases; the primary slot on the recipes screen is not the wipe-everything action.
- If a distinct lighter "re-photo, keep ingredients" affordance is wanted, it must actually do less than a full reset (otherwise its label misrepresents it).
- `bun run typecheck` passes.

### UX Finding
**Heuristic:** Consistency & standards (Nielsen #4); also aesthetic/minimalist & error-prevention spillover (#8/#5)
**Where:** `src/App.tsx:78` ("Start over", ghost) and `src/App.tsx:99-101` ("New photo", primary) — both call `reset()` (`src/App.tsx:47-53`)
**Now:** One reset function wears two labels and two emphases; the destructive reset is the *primary* button on the recipes screen and its label hides that it discards ingredients + recipes, not just the photo.
**Proposed:** Standardize the label, demote the reset to ghost in both phases, and free the recipes-screen primary slot from the destructive action.
**Why it helps:** Users stop accidentally deleting results they waited for, and the same action stops looking like two different things.
**Impact:** high · **Effort:** low
