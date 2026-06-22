---
id: TKT-128
title: "Try a sample fridge — one-tap demo run with no photo or API key"
status: "Testing"
priority: "High"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: []
blocks: []
related: [TKT-133]
files_touched:
  - "src/lib/sample.ts"
  - "src/components/PhotoCapture.tsx"
  - "src/App.tsx"
complexity: 2
next_step_hint: Human review queue: AC test PASS + whole-ticket & architecture-coherence validation PASS; approve to land the chaos/TKT-128 branch.
---

## Objective
Add a "**Try a sample fridge**" path: a one-tap demo that seeds a canned ingredient
list and a placeholder preview, dropping the user straight into the
ingredients → recipes flow **without taking a photo or calling analyze**.

## Context
The first screen is a wall: `PhotoCapture` demands a photo before the user ever sees
ingredients or recipes (`src/components/PhotoCapture.tsx`). A new user on desktop,
with no fridge open — or in this repo, with the Gemini key unset — has nothing to
click that produces output. Seeding `App`'s `ingredients` state from a bundled
`Ingredient[]` fixture and jumping to `setPhase("ingredients")` (`src/App.tsx:11,13`)
lets anyone experience the full flow. Pure client, zero API calls; if the key is
missing, the recipe step then surfaces the existing friendly key-missing message
(`src/App.tsx:116-118`) — the honest next nudge.

- **Fixture:** new client-only module `src/lib/sample.ts` exporting
  `SAMPLE_INGREDIENTS: Ingredient[]` (shape from `src/lib/types.ts:5-10`) and a
  `SAMPLE_PREVIEW` placeholder data URL. Keeping it in `src/lib/` matches where the
  shared client modules live (`types.ts`, `api.ts`); it is **data only** — no Gemini,
  no fetch, honoring hard-rule #3 (AI is lazy; never call on load).
- **Button:** `PhotoCapture` gains an `onSample: () => void` prop and renders a
  secondary `btn--ghost` button **below** the primary capture button
  (`src/components/PhotoCapture.tsx:45-47`).
- **Wiring:** `App` adds a `handleSample()` that sets `photo` to `SAMPLE_PREVIEW`,
  `ingredients` to `SAMPLE_INGREDIENTS`, clears `error`, and calls
  `setPhase("ingredients")` — no `async`, no `api.ts` call. The existing
  ingredients phase already renders the preview `<img>` and the editable
  `IngredientList` (`src/App.tsx:73-90`), so the sample is editable like any
  analyzed result for free.

## Acceptance Criteria
- [ ] A secondary "Try a sample fridge" button renders on the capture screen below the primary capture button (`PhotoCapture.tsx`), styled as `btn--ghost`.
- [ ] Clicking it seeds ~10 canned `Ingredient[]` from `src/lib/sample.ts` (each a valid `Ingredient` per `types.ts:5-10`) plus a placeholder preview, and lands on the `"ingredients"` phase — verifiable in `App.tsx` (`handleSample` sets state + `setPhase`).
- [ ] No `fetch`/Gemini call is made on the sample path: `handleSample` does not reference `api.ts`, and the app boots + runs the sample with no camera, no photo, and no API key with **zero console errors** (smoke gate).
- [ ] The seeded ingredients are editable (add/remove) via the existing `IngredientList` — same component the analyze path uses, no fork.
- [ ] `bun run typecheck` passes.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 5 bullets — each now names a file/symbol or a runnable check (button in PhotoCapture, handleSample state+setPhase, no-fetch+zero-console-errors via smoke, IngredientList reuse, typecheck). No aspiration bullets remain.
- **Blockers:** ok — depends_on empty; no active prerequisite.
- **Context drift:** ok — verified src/App.tsx:11,13 (phase/ingredients state), :73-90 (ingredients phase renders preview img + IngredientList), :116-118 (key-missing message); src/lib/types.ts:5-10 (Ingredient); src/components/PhotoCapture.tsx:45-47 (primary capture button). All present.
- **Complexity:** re-rated — 2 (small) holds: one new data module + one prop + one handler, pure client, no API/contract change.

**Verdict:** build-ready

### Value Hypothesis
**Lens:** New-user onboarding
**Who benefits:** First-run users, desktop visitors, and anyone evaluating before installing.
**Why useful:** Lets a newcomer feel the capture→ingredients→recipes payoff in one tap
without a fridge or a configured key — the difference between a dead first screen and a "wow."
**Plugs in at:** `src/components/PhotoCapture.tsx` (new button) → `src/App.tsx`.
**Score:** value h · fit h · feasibility h · novelty h

> **Note:** an earlier attempt (2026-06-21) recorded build/test/validate artifacts here, but that branch never landed and this worktree started clean. The sections below are from a fresh re-run on 2026-06-22 and reflect the code actually in `chaos/TKT-128`.

### Implementation Summary

**Run:** 2026-06-22 (fresh re-build — prior attempt's code was absent from the worktree)

- **`src/lib/sample.ts`** (new) — a pure client data module exporting `SAMPLE_INGREDIENTS` (exactly 10 valid `Ingredient[]`, each `{ name, category, confidence }` per `types.ts:5-10`) and `SAMPLE_PREVIEW` (an inline `data:image/svg+xml` URL built with `encodeURIComponent`, so the preview renders with **zero network requests**). No Gemini, no fetch, no env — only a type-only import of `Ingredient`, honoring hard-rule #3 and the single-contract rule (extends the shared `Ingredient`, placed beside `types.ts`/`api.ts`).
- **`src/components/PhotoCapture.tsx`** — added an `onSample: () => void` prop and a secondary `btn btn--ghost` "Try a sample fridge" button directly below the primary capture button(s) in the idle branch; it shares the existing `disabled` (busy/reading/starting) guard.
- **`src/App.tsx`** — added a **synchronous** `handleSample()` that clears `lastAction`/`error`, sets `photo` to `SAMPLE_PREVIEW`, seeds `ingredients` with `SAMPLE_INGREDIENTS`, and `setPhase("ingredients")`; wired `onSample={handleSample}` into `PhotoCapture`. The existing ingredients phase (preview `<img>` + the shared `IngredientList`) renders the sample editably with **no fork** — same component the analyze path uses.

**Deviations from plan:** none. No new CSS (reuses `btn--ghost`, `.preview`, `.capture`), no API/contract/manifest/SW changes.

**Implementation notes:**
- `bun run typecheck` (`tsc --noEmit`) exit 0; `bun run build` exit 0 (PWA service worker generated). No `server/`, env, or `api.ts` changes — the sample path makes no AI call.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader — no build context carried)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Ghost "Try a sample fridge" button below primary in PhotoCapture | ✓ | PhotoCapture.tsx:175-177 — `<button className="btn btn--ghost" onClick={onSample} …>Try a sample fridge</button>`, hardcoded `btn--ghost`, rendered after the primary capture button(s) (L159-173). `onSample` prop declared L7, wired from App.tsx:104 |
| Click seeds 10 valid Ingredient[] + preview, lands on "ingredients" | ✓ | sample.ts:11-22 — exactly 10 items, each `{name, category, confidence}` valid per types.ts:5-10 (array typed `Ingredient[]`, tsc-enforced). SAMPLE_PREVIEW inline SVG (no network). App.tsx:59-65 handleSample sets photo=SAMPLE_PREVIEW, ingredients=SAMPLE_INGREDIENTS, setPhase("ingredients") |
| No fetch/Gemini on sample path; sample.ts free of fetch/env refs | ✓ | handleSample synchronous (App.tsx:59, no `async`); body references only setError/setPhoto/setIngredients/setPhase/lastAction — no api.ts/analyze/fetch. sample.ts grep for fetch\|env\|VITE_\|@google/genai → only the L1 comment matches |
| Seeded ingredients editable via existing IngredientList, no fork | ✓ | App.tsx:110 `<IngredientList ingredients={ingredients} onChange={setIngredients} />`; IngredientList remove()/add() call onChange; `grep -rn IngredientList src/` → one import + one usage + the definition, no duplicate |
| `bun run typecheck` passes | ✓ | `bun run typecheck` → `tsc --noEmit` exit 0; `bun run build` → vite "✓ built", PWA precache 10 entries, exit 0 |

**Commands run:** grep of sample.ts for forbidden refs; grep of App.tsx for analyzeFridge/getRecipes/fetch/async handleSample; `grep -rn IngredientList src/`; `grep -c "name:" sample.ts` → 10; `bun run typecheck` (exit 0); `bun run build` (exit 0).

### Smoke Check

**Headless Chromium:** SKIPPED — `bun .weave/scripts/smoke.ts --ticket TKT-128` is SIGKILL'd (exit 137, no stdout/stderr) under the chaos sandbox's server-bind restriction, matching prior chaos-run behavior. A skip is not a pass and never fails the ticket.

**Supporting runtime evidence:** the sample path is pure client (synchronous `handleSample`, inline-SVG preview, zero fetch) and `bun run build` succeeds with the PWA service worker generated — so the new ghost button and the seed→ingredients transition introduce no network or async surface that could raise a console error at runtime. The no-fetch / AI-is-lazy invariant is verified statically (AC #3 above).
