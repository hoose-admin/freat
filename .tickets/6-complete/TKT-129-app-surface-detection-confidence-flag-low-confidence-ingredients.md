---
id: TKT-129
title: "Surface detection confidence — flag low-confidence ingredients for review"
status: "Complete"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
completed: 2026-06-22
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: []
blocks: []
related: []
files_touched:
  - "src/components/IngredientList.tsx"
  - "src/styles.css"
complexity: 2
next_step_hint: Build a low-confidence "Not sure about these" group in IngredientList.tsx with dimmed/⚠ chips below the confident ones.
chaos_branch: chaos/TKT-129
merged: 2026-06-22
merge_commit: f633d56a8bf0
---

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
wire. Distinct from category grouping (TKT-102, stuck/unmerged), which groups by a
different field; do **not** depend on its code.

- The chip list lives in `IngredientList.tsx:38-51` (`.chips` `<ul>` → `.chip` `<li>`
  with `.chip__label` + `.chip__remove`). Manual adds (`add`, line 17) create
  `{ name }` with **no** `confidence` → must render as a normal (confident) chip.
- Chip / token styles live in `src/styles.css:188-219` (`.chips`, `.chip`,
  `.chip__label`, `.chip__remove`); reuse the tokens and add minimal group styles there.
- `App.tsx:37` sends `getRecipes(ingredients.map((i) => i.name))` — unchanged; this is a
  pure presentation change with no effect on what reaches `/api` (CLAUDE.md hard rule #2).
- Threshold is `< ~0.6`; pick a single named constant in the component.

## Acceptance Criteria
- [ ] Items with `confidence` below a single named threshold (≈0.6) render in a visually
      distinct style (dimmed and/or a ⚠ marker) vs. confident chips.
- [ ] Those low-confidence items are clustered under a visible "Not sure about these — keep
      or remove?" heading, separate from the confident chips; remove (×) still works on them.
- [ ] The numeric confidence is discoverable on each low-confidence chip (e.g. a `title`
      tooltip or small percent label).
- [ ] Items with **no** `confidence` value (incl. manual adds) render as normal confident
      chips — no warning styling, no "not sure" bucket (no regression to the flat list).
- [ ] No change to `src/lib/types.ts`, `src/lib/api.ts`, `server/*`, or any `/api` route;
      `bun run typecheck` passes.
- [ ] `bun .weave/scripts/smoke.ts --ticket TKT-129` is green: app renders, zero console
      errors, no Gemini call on load.

### Value Hypothesis
**Lens:** Data-leverage
**Who benefits:** Everyone — it makes the inventory trustworthy.
**Why useful:** Turns the ingredient-review step from cosmetic into meaningful by
spotlighting exactly the detections worth a second look, using data already paid for.
**Plugs in at:** `server/gemini.ts:104` → `types.ts:9` → `src/components/IngredientList.tsx:41`.
**Score:** value h · fit h · feasibility h · novelty h

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 6 bullets rewritten for independent verifiability — split the original
  "distinguished / grouped / value-available" trio into discrete heading + styling + tooltip
  checks, made the no-confidence/manual-add no-regression case explicit, and split the combined
  "no /api or types change; zero console errors" bullet into a typecheck check and a smoke check.
- **Blockers:** ok — `depends_on` empty; TKT-102 (category grouping) is in `2-stuck/` and
  unmerged, so this ticket must build against baseline, not its code (noted in Context).
- **Context drift:** ok — all citations verified against the worktree: `server/gemini.ts:99-105`
  (confidence in the returned map), `src/lib/types.ts:9` (`confidence?: number`),
  `src/components/IngredientList.tsx:41` (`.chip__label` renders `i.name`), `styles.css:188-219`
  (chip styles), `App.tsx:37` (`getRecipes(...map name)`).

**Verdict:** build-ready

## Out of Scope
- No filtering/auto-removal of low-confidence items (the user decides — keep or remove).
- No change to the recipe request: uncertain names are still the user's call via the × button.
- No category grouping (that's TKT-102) and no new sort beyond clustering uncertain items.

### Implementation Summary

- `src/components/IngredientList.tsx` — partitioned the flat chip list into `sure` vs `unsure` via an `isUnsure()` predicate gated on a single `LOW_CONFIDENCE = 0.6` constant. Confident chips render in the existing `.chips` list unchanged; low-confidence chips cluster under a new "Not sure about these — keep or remove?" `<h3>`. Extracted a small local `Chip` component so both lists share the remove (×) button markup; the unsure variant adds a ⚠ marker (aria-hidden), a `%` confidence label, and a `title` tooltip ("Low confidence: N% sure...").
- `src/styles.css` — added `.unsure` / `.unsure__title` group styles and `.chip--unsure` (amber-tinted, dimmed), `.chip__warn` (amber ⚠), `.chip__confidence` (small muted, tabular-nums) chip styles, reusing existing tokens.

**Deviations from plan:** None — implementation matched the plan. Items with no `confidence` (incl. manual adds) fall through `isUnsure()` as sure, so the flat-list rendering is unchanged when nothing is low-confidence (no-regression AC).

**Implementation notes:**
- No change to `src/lib/types.ts`, `src/lib/api.ts`, or `server/*` — pure presentation against the existing `Ingredient.confidence?` field; `bun run typecheck` clean.
- Chose amber (`#fbbf24`) over the red `--danger` token: "not sure" is a caution, not an error.

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Low-confidence chips visually distinct (dimmed/⚠) | ✓ | `IngredientList.tsx:11` `LOW_CONFIDENCE = 0.6`; `:101` `chip chip--unsure`; `:104-108` ⚠ span. `styles.css` `.chip--unsure { opacity:0.85; amber bg/border }`, `.chip__warn { color:#fbbf24 }` |
| Clustered under "Not sure about these — keep or remove?" heading; × works | ✓ | `IngredientList.tsx:36-37` partitions sure/unsure; `:59-68` `<h3>Not sure about these — keep or remove?</h3>` + separate `<ul className="chips">`; shared `Chip` wires `onRemove={remove}` → `remove()` at `:20-22` |
| Numeric confidence discoverable (title + % label) | ✓ | `IngredientList.tsx:98` `pct = Math.round(confidence*100)`; `:102` `title="Low confidence: N% sure…"`; `:110` `<span className="chip__confidence">{pct}%</span>` |
| No-confidence / manual adds render normal (no regression) | ✓ | `isUnsure` (`:13-14`) requires `typeof i.confidence === "number"` → `undefined` ⇒ sure; manual add `:29` pushes `{ name }`; `types.ts:9` `confidence?` optional (unchanged) |
| No types/api/server change; typecheck passes | ✓ | `git diff --name-only` → only `src/components/IngredientList.tsx`, `src/styles.css`; `bun run typecheck` → `tsc --noEmit` exit 0 |
| No Gemini call on page load | ✓ | `App.tsx:11` initial phase `"capture"`; `analyzeFridge`/`getRecipes` only fire in `handlePhoto`/`handleGetRecipes` (user actions). No `useEffect`/module-scope fetch |

**Commands run:**
- `git status --short`
- `git diff --name-only`
- `bun run typecheck`

**Notes:** Cold-read verification, no files modified. Change is purely additive presentation against the existing `Ingredient.confidence?` field.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not provisioned in `.weave`; `install:browsers` is forbidden during a chaos run per `.weave/scripts/install-browsers.ts:9-10` — the repo-scoping guard treats a browser install as a violation). A skip is not a pass and does not fail the ticket (test-ticket op). The runtime substance of the smoke for this ticket — zero AI calls on page load — is covered by the AC6 code-read above; the change is presentation-only (CSS + JSX list restructure) with a clean `tsc` pass.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Partitions ingredients into sure/unsure (`isUnsure`, confidence<0.6); unsure cluster under exact heading "Not sure about these — keep or remove?"; each unsure chip surfaces % badge + ⚠ + title tooltip. No-confidence items treated as sure. Cluster-for-review (not auto-remove), per Out of Scope. |
| Context constraints | ✓ | `git diff --stat` empty for `types.ts`/`api.ts`/`server/*`/`vite.config.ts` — none touched; consumes existing `Ingredient.confidence?`. No raw `fetch` in components; no Gemini call on load; typecheck clean. Coherence: new `.chip--unsure`/`.chip__warn`/`.chip__confidence` are BEM modifiers/elements extending the baseline `.chip` pattern + reuse `var(--muted)`; no TKT-102 category code; ADR-001 untouched. |
| Sprawl | ✓ | `git status --short` shows exactly the two declared files (node_modules untracked, ignorable); +92/−14 across the two files; no incidental edits. |
| Follow-up surfacing | ✓ | Recipe path still sends low-confidence names, but Out of Scope explicitly leaves them in (cluster-for-review, not auto-remove) — by design, not a gap. Lone observation: amber warning color is a hardcoded literal (no `--warn` token exists) — cosmetic token-hygiene nit, filed as deferred follow-up. |

**Suggested new tickets:** 1 (deferred → filed as a backlog follow-up)
