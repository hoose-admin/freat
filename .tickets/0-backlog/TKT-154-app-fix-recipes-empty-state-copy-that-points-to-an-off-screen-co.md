---
id: TKT-154
title: "Fix recipes empty-state copy that points to an off-screen control"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - ux
  - ai-proposed
depends_on: []
blocks: []
related: []
files_touched:
  - "src/components/RecipeList.tsx"
complexity: 1
next_step_hint: Approve and build: rewrite RecipeList.tsx:9 empty-state to point at on-screen Edit ingredients, acknowledging the empty result.
---

## Objective
Fix the recipes empty-state guidance, which currently tells the user to do something they cannot do from the screen they are on.

## Context
When `recipes.length === 0`, `RecipeList` renders "No recipes yet. Try adding a few more ingredients." (`src/components/RecipeList.tsx:8-9`). But this only appears **after** `handleGetRecipes` resolves and the app is on the recipes phase (`src/App.tsx:33-45`), where there is **no ingredient input** — the only controls are "Edit ingredients" / "New photo" (`src/App.tsx:95-102`). The advice "add a few more ingredients" describes a control that lives on the *previous* screen, so it's a dead-end instruction that forces the user to recall the prior layout. It also implies the user hasn't acted, when in fact the model returned zero recipes.

## Acceptance Criteria
- `src/components/RecipeList.tsx` empty-state string (the `recipes.length === 0` branch) names the **Edit ingredients** control, which is the button actually rendered on the recipes screen (`src/App.tsx:96-98`) — not the off-screen ingredient input.
- The copy phrases the result as "came back empty" (e.g. "No recipes matched"), not as user inaction ("No recipes yet").
- No other behaviour, props, or markup of `RecipeList` changes; the non-empty render path is untouched.
- `bun run typecheck` passes.

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 3 bullets rewritten — empty-state branch now anchored to the on-screen control (`src/App.tsx:96-98`), the "empty result vs inaction" phrasing made checkable, and a no-collateral-change guard added.
- **Blockers:** ok — `depends_on` empty.
- **Context drift:** ok — `RecipeList.tsx:8-9`, `App.tsx:33-45` (handleGetRecipes), `App.tsx:95-102` (actions), `App.tsx:96-98` (Edit ingredients button) all verified present in the worktree.
- **Complexity:** ok — 1 (single-string copy change in one component).

**Verdict:** build-ready

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Empty-state names the on-screen **Edit ingredients** control | ✓ | `RecipeList.tsx:11` renders `No recipes matched. Tap <strong>Edit ingredients</strong> to add a few more…`; label matches the button at `App.tsx:96-98` |
| Copy frames result as empty, not inaction | ✓ | `RecipeList.tsx:11` starts `No recipes matched.`; old `No recipes yet.` removed |
| No other RecipeList behaviour/props/markup changed | ✓ | `RecipeList.tsx:1-7` props unchanged; non-empty path `16-51` identical to main; only the `recipes.length === 0` `<p>` edited |
| `bun run typecheck` passes | ✓ | `tsc --noEmit` exited 0, no diagnostics |

**Commands run:**
- `bun run typecheck`

**Notes:** Diff confined to `src/components/RecipeList.tsx`, only the empty-state branch. Control name "Edit ingredients" confirmed verbatim against the on-screen button at `App.tsx:96-98`.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not installed in `.weave` — `bun .weave/scripts/smoke.ts --ticket TKT-154` returned `{"status":"skipped"}`)

Browser binaries are not provisioned in this worktree, so the deterministic smoke run no-ops (a skip is not a pass and does not fail the ticket). The change is a static empty-state string in `RecipeList`, on a render path that requires no Gemini call; `bun run typecheck` (exit 0) covers compile-time correctness.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | New copy (`RecipeList.tsx:10-12`) names **Edit ingredients**, the on-screen button (`App.tsx:96-98`, routes to `setPhase("ingredients")`); off-screen-control guidance fixed |
| Context constraints | ✓ | Pure presentational copy — CLAUDE.md rules #2/#3/#4 untouched; `<strong>` reuses in-component precedent (`RecipeList.tsx:36`); ADR-001 governs PWA/Gemini proxy only, no UI-copy directive → no conflicting pattern |
| Sprawl | ✓ | `git status --short` shows only `M src/components/RecipeList.tsx`; matches `files_touched` exactly |
| Follow-up surfacing | ✓ | No in-scope defects left unfixed; no new tickets warranted |

**Suggested new tickets:** none

**Architecture coherence:** Honors the established contracts — change is confined to the presentation layer, introduces no parallel data-fetching/AI path, and reuses the existing `<strong>` emphasis convention already in `RecipeList`. ADR-001 reviewed; nothing governs empty-state copy, so no drift.

### UX Finding
**Heuristic:** Match between system & real world (Nielsen #2); recognition over recall (#6)
**Where:** `src/components/RecipeList.tsx:8-9`
**Now:** The recipes empty-state tells users to "add ingredients," but that input isn't on the recipes screen — it's behind the "Edit ingredients" button on the previous phase.
**Proposed:** Rewrite the empty-state to point at the on-screen "Edit ingredients" control and acknowledge the empty result.
**Why it helps:** Guidance matches what the user can actually see and do, instead of referencing an off-screen control.
**Impact:** med · **Effort:** low

### Implementation Summary

- Rewrote the `recipes.length === 0` branch of `src/components/RecipeList.tsx` from `"No recipes yet. Try adding a few more ingredients."` to `"No recipes matched. Tap <strong>Edit ingredients</strong> to add a few more, then try again."` — the copy now names the **Edit ingredients** button that is actually on the recipes screen (`src/App.tsx:96-98`) and frames the result as empty ("No recipes matched") rather than user inaction.
- Used a `<strong>` tag for the control name, matching the existing `<strong>` usage already in this component (`RecipeList.tsx:32` "You'll also need:"), so no new styling/markup convention is introduced.

**Deviations from plan:**
- None — implementation matched the plan. Single-string copy change in one component; non-empty render path, props, and markup untouched.

**Implementation notes:**
- `bun run typecheck` passes (exit 0).
