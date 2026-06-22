---
id: TKT-151
title: "Unify the full-reset button: one label, demote it from the recipes-screen primary slot"
status: "Complete"
priority: "High"
assignee: "Claude-Agent"
created: 2026-06-22
completed: 2026-06-22
domain: "app"
tags:
  - ux
  - ai-proposed
depends_on: []
blocks: []
related: []
files_touched:
  - "src/App.tsx"
complexity: 1
next_step_hint: Approve and build: in src/App.tsx label reset() 'Start over' ghost in both phases and make 'Edit ingredients' the recipes primary.
chaos_branch: chaos/TKT-151
merged: 2026-06-22
merge_commit: 97dec7040b73
---

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


### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — all four bullets are independently verifiable as-is (label match, ghost-class check, "does less" check, `bun run typecheck`).
- **Blockers:** ok — `depends_on` empty; no active prerequisites.
- **Context drift:** ok — all four citations re-checked against live code: `src/App.tsx:47-53` (`reset()`), `:78` ("Start over", ghost), `:99-101` ("New photo", primary → `reset()`), `src/styles.css:318-325` (mobile `column-reverse`, full-width). All accurate.
- **Complexity:** 1 confirmed — single-file label/className edits in `src/App.tsx`; no new functions, no CSS additions needed (`btn--primary`/`btn--ghost` already exist).

**Verdict:** build-ready


### Autonomous Decision

**Made:** 2026-06-22 (chaos mode — no human input)
**Question:** Once `reset()` is demoted to a ghost button, what occupies the now-free **primary** slot on the recipes screen? (The AC mandates the primary slot stop being the wipe-everything action but doesn't dictate the replacement.)

**Options considered:**
- **A — Promote the existing "Edit ingredients" action to primary** — recipes screen keeps a clear, non-destructive primary; the positive next action (refine ingredients → regenerate) gets the emphasis the destructive reset used to steal.
- **B — Leave the recipes screen with no primary (two ghost buttons)** — strictly satisfies "primary isn't the wipe action," but flattens visual hierarchy and gives the final screen no emphasized affordance.
- **C — Add a separate non-destructive "New photo (keep ingredients)" primary** — would honor AC bullet 3, but needs new state/flow to *actually do less* than reset; over-builds a complexity-1 ticket (YAGNI).

**Chosen:** A — promote "Edit ingredients" to `btn--primary` and demote `reset()` to `btn--ghost` "Start over" (`src/App.tsx:96-105`), mirroring the ingredients phase's ghost-reset-then-primary order (`:78-87`). No new function or CSS — `btn--primary`/`btn--ghost` already exist (`src/styles.css:131-145`). "Start over" still returns to the capture screen, so the old "New photo" capability is preserved, not lost.
**Reversibility:** easy — swap the two buttons' `className`/`onClick`/label in one JSX block; no data-model or contract impact.

### UX Finding
**Heuristic:** Consistency & standards (Nielsen #4); also aesthetic/minimalist & error-prevention spillover (#8/#5)
**Where:** `src/App.tsx:78` ("Start over", ghost) and `src/App.tsx:99-101` ("New photo", primary) — both call `reset()` (`src/App.tsx:47-53`)
**Now:** One reset function wears two labels and two emphases; the destructive reset is the *primary* button on the recipes screen and its label hides that it discards ingredients + recipes, not just the photo.
**Proposed:** Standardize the label, demote the reset to ghost in both phases, and free the recipes-screen primary slot from the destructive action.
**Why it helps:** Users stop accidentally deleting results they waited for, and the same action stops looking like two different things.
**Impact:** high · **Effort:** low



### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Full-reset uses ONE label across both phases | ✓ | Ingredients `src/App.tsx:78-79` `btn--ghost onClick={reset}` → "Start over"; Recipes `src/App.tsx:96-97` `btn--ghost onClick={reset}` → "Start over". Identical label. |
| Full-reset is ghost in both phases; recipes primary is NOT the wipe action | ✓ | `reset()` is `btn--ghost` at `:78` and `:96`. Recipes `btn--primary` (`:99-101`) is `onClick={() => setPhase("ingredients")}` — not `reset`. No `btn--primary` wires to `reset` anywhere. |
| Any lighter "re-photo, keep ingredients" affordance must do LESS than reset | ✓ | Recipes primary "Edit ingredients" (`:104`) calls `setPhase("ingredients")` (`:101`) — preserves photo/ingredients/recipes; `reset()` (`:47-53`) clears all four. Label is accurate; does strictly less. |
| `bun run typecheck` passes | ✓ | `bun run typecheck` → `tsc --noEmit`, no output, exit 0. |

**Commands run:**
- `Read src/App.tsx`
- `bun run typecheck`

**Notes:** Fresh cold-reader verified directly against working-tree `src/App.tsx`, not any prior summary. All four ACs pass with file:line evidence.

### Smoke Check

**Headless Chromium:** SKIPPED (environment) — driver provisioned and the app booted, navigated `/`, settled, and a clean full-page render was captured; the smoke process was SIGKILLed (exit 137) by the sandbox during teardown before `result.json` could be written. A skip never fails the ticket (per `test-ticket` op).

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| `/` | render captured | n/a (no verdict written) | n/a | n/a | `.weave/cache/smoke/TKT-151/root.png` (124 KB) — capture phase fully painted: header, "What's in the fridge?" card, primary CTA. No white-screen, no stuck spinner, no error banner. Ready-selector `.app` matched. |

**Captured console errors (verbatim):** none surfaced (no `result.json` written; the captured screenshot shows a clean render).

**Screenshots:** `.weave/cache/smoke/TKT-151/root.png`

**Note on coverage:** the modified UI is the **recipes phase**, reachable only after a photo upload + live Gemini calls (no key configured in this env), so the smoke's route `/` exercises boot/render only. The recipes-phase JSX change is verified structurally by the cold AC reviewer + `typecheck`.

### Implementation Summary

- Edited the recipes-phase action row in `src/App.tsx:95-106`: the destructive `reset()` button moved from the bright-green `btn--primary` slot to the de-emphasized `btn--ghost` slot and was relabeled from "New photo" to "Start over"; the non-destructive "Edit ingredients" action (→ `setPhase("ingredients")`) was promoted into the freed `btn--primary` slot.
- Button order matches the ingredients phase (`src/App.tsx:77-88`): ghost "Start over" first, primary action second — consistent DOM order so the mobile `column-reverse` stacking (`src/styles.css:318-325`) puts the primary on top in both phases.
- Result: `reset()` now wears a single label ("Start over") and a single emphasis (ghost) across both phases; the recipes-screen primary slot is no longer the wipe-everything action.

**Deviations from plan:**
- None — implementation matched the plan. No separate "re-photo, keep ingredients" affordance was added (AC bullet 3 is conditional and not wanted); "Start over" still returns to the capture screen, preserving the old "New photo" capability.

**Implementation notes:**
- No CSS changes needed — `btn--primary` / `btn--ghost` already exist (`src/styles.css:131-145`). `bun run typecheck` passes (exit 0).
