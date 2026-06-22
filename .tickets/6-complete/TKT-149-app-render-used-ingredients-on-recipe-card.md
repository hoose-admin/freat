---
id: TKT-149
title: "Render the recipe's used-ingredients list on each recipe card"
status: "Complete"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-22
completed: 2026-06-22
domain: "app"
tags:
  - feature
  - frontend
  - ai-proposed
depends_on: []
blocks: []
related: [TKT-137]
files_touched:
  - "src/components/RecipeList.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Verify AC with a fresh subagent — cite the new .recipe-card__uses block in src/components/RecipeList.tsx in evidence.
chaos_branch: chaos/TKT-149
merged: 2026-06-22
merge_commit: b0b050e17776
---

### Objective
Render `Recipe.usesIngredients` on each recipe card so the card — and the
Print / Save-as-PDF output from TKT-137 — shows the ingredients the recipe
actually uses, not only the "You'll also need" missing list. A printed/fridge
recipe card without its ingredient list is an incomplete recipe.

### Context
- `Recipe.usesIngredients: string[]` already exists in the shared contract
  (`src/lib/types.ts:30`) and is returned by `/api/recipes`, but it is rendered
  **nowhere** in the UI — `src/components/RecipeList.tsx` only renders
  `description`, `missingIngredients` ("You'll also need:"), and the steps
  `<details>`. The used-ingredient list is silently dropped.
- TKT-137 (Print / Save-as-PDF a single recipe card) renders whatever the card
  contains; its `@media print` block in `src/styles.css` therefore prints a
  recipe with no primary ingredient list. This ticket closes that content gap so
  the printout matches the objective's "title, time/difficulty, ingredients,
  numbered steps".
- Follow the existing card markup/CSS conventions: a `.recipe-card__*` element
  with the existing custom-property tokens; the ingredient chips on the
  ingredients screen (`.chips`/`.chip` in `src/styles.css`) are a styling
  precedent if a chip layout is preferred.

### Acceptance Criteria
- [ ] Each recipe card renders the recipe's `usesIngredients` (when non-empty) as a labeled list/section in `src/components/RecipeList.tsx`.
- [ ] The used-ingredients section is visible in the `@media print` output (not hidden by TKT-137's print rules).
- [ ] Pure client; no change to `src/lib/types.ts` shape or `server/*`. `bun run typecheck` passes; zero console errors with no API key.

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — the three bullets are each independently verifiable (a `RecipeList.tsx` render check, a print-visibility check, a `bun run typecheck` / zero-console-error check).
- **Blockers:** ok — `depends_on` empty; `related: TKT-137` sits in `5-validating/` (non-blocking) and its print CSS is on an unmerged branch, so this ticket must NOT depend on it — build print-safe markup that shows by default.
- **Context drift:** ok — `usesIngredients` at `src/lib/types.ts:30`, `RecipeList.tsx` renders only description/missingIngredients/steps, and `.chips`/`.chip` precedent in `src/styles.css` all verified to still exist.

**Verdict:** build-ready

### Why this was spawned mid-stack

**Parent ticket:** TKT-137
**Trigger source:** validation-time
**What was discovered:** `Recipe.usesIngredients` (`src/lib/types.ts:30`) is rendered nowhere, so the TKT-137 print output omits the recipe's ingredient list that the objective calls for.
**Ordering decision:** defer-to-backlog
**Rationale:** It is a separable on-screen card-content change (affects all users, involves layout/placement) distinct from TKT-137's print-CSS-only scope; the validator graded it a follow-up, not a blocker.


### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| AC1: card renders `usesIngredients` (when non-empty) as a labeled section in RecipeList.tsx | ✓ | `RecipeList.tsx:30-34` — `{r.usesIngredients.length > 0 && (<p className="recipe-card__uses"><strong>Uses:</strong> {r.usesIngredients.join(", ")}</p>)}`, between the description `<p>` and the missing block, guarded by `.length > 0`. |
| AC2: used-ingredients section visible in `@media print` (not hidden) | ✓ | Plain visible card `<p>` at `RecipeList.tsx:31`, OUTSIDE the steps `<details>`; grep of `src/styles.css` for `@media print` / `display:none` finds none — `.recipe-card__uses` (`styles.css:272-275`) only sets `font-size`/`margin`. No print rule exists in this worktree, so it prints by default. |
| AC3: pure client; types.ts shape + server/* unchanged; typecheck passes; zero console errors no-key | ✓ | `git diff --name-only` → only `src/components/RecipeList.tsx` + `src/styles.css` (no `server/*`, no `types.ts`). `bun run typecheck` → `tsc --noEmit` exit 0, no errors. Render-only change from already-present data — no fetch/AI path added. |

**Commands run:**
- `git diff --name-only`
- `git diff -- src/components/RecipeList.tsx src/styles.css`
- `bun run typecheck`
- `grep -n "@media print|display: none|recipe-card__uses" src/styles.css`

**Notes:** All three ACs pass. Minimal print-safe conditional `<p>` rendered as ordinary card content; `usesIngredients` is a required `string[]` so the `.length` guard cannot throw; `types.ts` and `server/*` untouched.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not installed in `.weave` — `bun run install:browsers` is blocked by the chaos worker Bash allowlist; a skip is not a pass and does not fail the ticket)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | driver absent — not executed |

**Captured console errors (verbatim):** none captured (smoke not executed). The change adds no runtime/network code path — AC3's zero-console-error requirement holds by inspection (a conditional `<p>` over data already present in `recipes`).

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `RecipeList.tsx:30-34` renders `<p class="recipe-card__uses"><strong>Uses:</strong> {usesIngredients.join(", ")}</p>` per card, guarded by `.length > 0`; `server/gemini.ts:118` confirms the model populates `usesIngredients`, so real data flows to the card. |
| Context constraints | ✓ | `git diff --name-only` → only the two client files; `types.ts` unchanged (`usesIngredients: string[]` reused, not forked); no `server/*` change; no `fetch` added (renders Props); `bun run typecheck` exits clean. |
| Sprawl | ✓ | Diff touches exactly the declared `src/components/RecipeList.tsx` + `src/styles.css`; zero extra files. |
| Follow-up surfacing | ✓ | Nothing in-scope left unfixed; the steps `<details>` print/expand behavior is TKT-137's scope; omitting an `@media print` rule (to avoid colliding with TKT-137's unmerged print CSS) is the correct call. |
| Architecture coherence (chaos) | ✓ | Honors ADR-001 spine: reuses the shared `Recipe` type (`RecipeList.tsx:1`), no client-side AI/fetch, no parallel contract; `.recipe-card__uses` mirrors the sibling `.recipe-card__missing` within the established `.recipe-card__*` family. |

**Suggested new tickets:** none

### Implementation Summary

- Added a used-ingredients block to each recipe card in `src/components/RecipeList.tsx`: a `<p className="recipe-card__uses"><strong>Uses:</strong> …</p>` rendered only when `r.usesIngredients.length > 0`, comma-joined, placed between the description and the "You'll also need:" missing list (primary list before the supplementary one).
- Added a `.recipe-card__uses` rule to `src/styles.css` mirroring the sibling `.recipe-card__missing` (`font-size: 0.9rem; margin: 8px 0`).

**Deviations from plan:**
- None — implementation matched the plan. Chose the plain `<p>` + `<strong>` label convention (mirroring `.recipe-card__missing`) over a `.chips` layout: it is the leanest option, keeps the two ingredient lines visually consistent, and is print-safe by construction (plain card content, not inside the steps `<details>`, nothing hidden).

**Implementation notes:**
- AC2 (print visibility) is satisfied structurally rather than by adding an `@media print` rule. TKT-137's print CSS lives on an unmerged sibling branch and is absent from this worktree; adding a second `@media print` block here would risk a parallel/conflicting rule on merge. The used-ingredients line is ordinary visible card content, so it prints by default unless TKT-137 explicitly hides it (it has no reason to — the class did not exist when TKT-137 was written).
