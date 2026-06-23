## Objective
Give visible feedback when the user adds an ingredient that is already in the list, instead of silently doing nothing.

## Context
In `IngredientList.add` (`src/components/IngredientList.tsx:17-25`) the typed name is lowercased (`src/components/IngredientList.tsx:19`) and only pushed if no existing chip matches (`...:21-23`). Either way the input is cleared (`setDraft("")`, `src/components/IngredientList.tsx:24`). So when the user types an ingredient that already exists (case-insensitively — chips render with `text-transform: capitalize`, `src/styles.css:206`, so "Milk" visually matches stored "milk"), they hit Add, the field empties, and **nothing else happens**. From the user's point of view the control looks broken: it visibly "did something" (cleared the field) but produced no result.

## Acceptance Criteria
- Adding a duplicate produces a clear, non-error signal — e.g. briefly highlight/pulse the existing matching chip, or show a small inline note ("Already added").
- The happy path (adding a genuinely new ingredient) is unchanged.
- Any feedback respects `prefers-reduced-motion` if it animates.
- `bun run typecheck` passes.

### UX Finding
**Heuristic:** Visibility of system status (Nielsen #1)
**Where:** `src/components/IngredientList.tsx:17-25`
**Now:** Adding an already-present ingredient clears the input and silently no-ops, with no indication of why.
**Proposed:** Acknowledge the no-op — flash the existing chip or show "Already added".
**Why it helps:** A form action that clears the field but yields no result reads as a bug; feedback turns an invisible no-op into understood behavior.
**Impact:** med · **Effort:** low
