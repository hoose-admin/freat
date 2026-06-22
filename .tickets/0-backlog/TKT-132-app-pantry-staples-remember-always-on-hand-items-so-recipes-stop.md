---
id: TKT-132
title: "Pantry staples — remember always-on-hand items so recipes stop flagging them missing"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: []
blocks: []
related: [TKT-104, TKT-105]
files_touched:
  - "src/lib/pantry.ts"
  - "src/components/PantryStaples.tsx"
  - "src/App.tsx"
  - "src/styles.css"
complexity: 3
next_step_hint: Human review: pantry-staples validated (all 5 axes pass); approve to land the chaos/TKT-132 branch.
---

## Objective
Add a **pantry staples** list: a small, persisted set of always-on-hand items
(salt, oil, garlic, soy sauce…) that are silently unioned into every recipe request
so the `missingIngredients` list stops nagging about things the user always has.

## Context
A camera can't see what's in the cupboard, so every fresh photo forces the heavy cook
to re-add staples — and recipes keep listing them as "missing." This is a **pure
client-side persistence** feature: no Gemini call, no `/api/*` route, no change to the
shared contract (mirrors how the sibling persistence tickets stayed inside ADR-001).

- **Request build (the union point):** `src/App.tsx:37` —
  `getRecipes(ingredients.map((i) => i.name))`. `getRecipes` (`src/lib/api.ts:55`)
  already accepts a `string[]`, so unioning a persisted `pantry: string[]` into that
  array fixes it with **no new route and no `types.ts` change**.
- **Persistence convention (extend, don't fork):** there is no `localStorage` helper
  in this worktree (`grep localStorage src/` is empty), but the sibling tickets
  TKT-104 (save recipes) and TKT-105 (shopping list) — both in `5-validating/` on
  un-merged branches — established the convention: a **self-contained module under
  `src/lib/`** whose every access is **try/catch-guarded** (returns a default / no-ops
  on a disabled or full store), keyed under a **namespaced + versioned** key
  `freat.<feature>.vN`. Follow it exactly: new module `src/lib/pantry.ts`, key
  `freat.pantry.v1`. Do NOT introduce a shared/global storage abstraction (that would
  fork whatever TKT-104 established on its un-merged branch).
- **Editor placement + controlled-component pattern:** surface a "My pantry staples"
  editor in the `ingredients` phase near `IngredientList`
  (`src/components/IngredientList.tsx`), the only phase where it affects the next
  recipe request. Mirror `IngredientList`'s lift-state-up shape (`onChange` prop,
  App owns the state — `src/App.tsx:11-16`) and its normalize-on-add convention
  (`name.trim().toLowerCase()`, dedupe — `IngredientList.tsx:19-24`).
- **Visual distinction:** reuse the existing `chip`/`chips` styles
  (`src/styles.css:188-220`, with `.chip__label { text-transform: capitalize }`) so the
  list looks native, but add a distinct variant (e.g. `.chip--pantry`) using existing
  CSS variables so a pantry staple is visually distinguishable from a photo-detected
  ingredient (the source is clear to the user).
- **Hard rule #3 (smoke stays green):** the feature must add no Gemini call and no
  network request; the editor renders with no key configured and `localStorage` access
  is try/catch-guarded so a disabled/full store degrades instead of throwing — keeping
  the headless `/` smoke console-error-free.

## Acceptance Criteria
- [ ] A new module `src/lib/pantry.ts` reads/writes the staples list in `localStorage`
      under key `freat.pantry.v1`, with all access try/catch-guarded so a throwing /
      unavailable store never crashes the app. It loads on mount and persists on every
      add/remove (the list survives a page reload).
- [ ] A "My pantry staples" editor (`src/components/PantryStaples.tsx`) renders in the
      `ingredients` phase near `IngredientList`, lets the user add (normalized
      trim+lowercase, deduped) and remove staples, and persists each change immediately.
- [ ] On "Get meal ideas" (`src/App.tsx:37`) the staples are unioned and
      **case-insensitively deduped** with the photo-detected ingredient names into the
      single `string[]` passed to `getRecipes` — no new route, no `src/lib/types.ts`
      change.
- [ ] Pantry staples are visually distinct from photo-detected ingredient chips (e.g. a
      `.chip--pantry` variant); an **empty pantry sends exactly the current ingredient
      list** (current behavior unchanged).
- [ ] `bun run typecheck` passes; the headless smoke
      (`bun .weave/scripts/smoke.ts --ticket TKT-132`) boots `/` with zero console
      errors / uncaught exceptions.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 5 bullets rewritten for independent verifiability — pinned the
  storage module + exact key (`freat.pantry.v1`) and the try/catch + reload assertion;
  split the editor behavior (add/remove, normalize, persist) from the union behavior;
  named the case-insensitive dedupe at the union point and the empty-pantry no-op;
  promoted typecheck + the exact smoke command to their own bullet.
- **Blockers:** ok — `depends_on: []`. TKT-104 / TKT-105 are siblings (shared
  persistence convention, no hard ordering); their code is on un-merged branches and is
  NOT visible here, so this ticket namespaces its own key and stays self-contained.
- **Context drift:** ok — re-verified `src/App.tsx:37` (`getRecipes(ingredients.map(...))`),
  `src/lib/api.ts:55` (`getRecipes(ingredients: string[], …)`), `IngredientList.tsx:19-24`
  (lowercase+dedupe add), `src/styles.css:188-220` (`.chip`/`.chips`/`.chip__label`),
  empty `grep localStorage src/`, and the smoke harness (`weave.config.json` smoke block,
  routes `["/"]`, `readySelector .app`) all present.
- **Complexity:** re-rated — stays **3** (new lib + new component + App wiring + CSS;
  no API/server/contract change, no cross-layer coupling — comparable to TKT-104). Not a
  4–5, so no decomposition.

**Verdict:** build-ready

## Out of Scope
- Server-side or cross-device sync of the pantry (localStorage only, no backend).
- Quantities, categories, or expiry tracking — staples are plain name strings.
- Merging/migrating with sibling stores (TKT-104/TKT-105) — each owns its own
  namespaced key.
- Editing the photo-detected `IngredientList` itself (unchanged; the pantry is a
  separate standing inventory).

### Value Hypothesis
**Lens:** Power-user
**Who benefits:** Repeat cooks who always have the same basics on hand.
**Why useful:** Stops the app from re-asking for salt/oil/garlic every session and makes
"missing ingredients" mean *actually* missing — a daily-use quality-of-life win.
**Plugs in at:** `src/App.tsx:37` (request build) · localStorage · near `IngredientList.tsx`.
**Score:** value h · fit h · feasibility h · novelty h

### Implementation Summary

- Added `src/lib/pantry.ts` — a self-contained localStorage module keyed
  `freat.pantry.v1` (the `freat.<feature>.vN` convention). Exposes `loadPantry()`
  (returns `[]` on empty/corrupt/unavailable store; defensively re-normalizes +
  dedupes), `savePantry(list)` (no-ops on a full/disabled store), and
  `normalizeStaple(name)` = `name.trim().toLowerCase()`. Every access is
  try/catch-guarded.
- Added `src/components/PantryStaples.tsx` — a controlled "My pantry staples" editor
  mirroring `IngredientList` (lift-state-up via `onChange`, App owns state). Add
  normalizes + dedupes; remove filters; chips use the existing `chip`/`chips` markup
  with a `chip--pantry` variant and descriptive `aria-label`s.
- Wired `src/App.tsx` — `pantry` state seeded from `loadPantry()`, an `updatePantry`
  handler that persists via `savePantry`, the editor rendered in the `ingredients`
  phase below `IngredientList`, and the recipe request (App.tsx:41-57) now unions the
  photo-detected names with the staples, deduped case-insensitively (first spelling
  wins) into the single `string[]` passed to `getRecipes`. Empty pantry → unchanged.
- Extended `src/styles.css` — added `.pantry` to the card-surface rule, a `.pantry__hint`
  helper, and a `.chip--pantry` variant (brand-tinted `rgba` background + brand border,
  universally supported) so staples are visually distinct from photo-detected chips.

**Deviations from plan:**
- None on scope. One robustness choice: used `rgba(22,163,74,0.18)` for the pantry chip
  tint instead of `color-mix()` so the visual distinction holds on any engine (a dropped
  `color-mix` declaration would have made pantry chips identical to ingredient chips).

**Implementation notes:**
- No change to `src/lib/types.ts`, `src/lib/api.ts`, or anything under `server/` — pure
  client-side persistence + a client-side union, so the API contract and ADR-001's
  server-side-only-Gemini boundary are untouched. `getRecipes` is reused as-is.
- No Gemini call and no network on load: pantry loads from localStorage; the editor only
  mounts in the `ingredients` phase (never on the `/` capture screen the smoke checks).
- `bun run typecheck` → exit 0; `bun run build` succeeds (PWA precache unchanged at 7
  entries, no `/api` precache regression).

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader — did not write the code)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 1 — `pantry.ts` localStorage module, `freat.pantry.v1`, try/catch, load-on-mount, persist-on-edit | ✓ | `pantry.ts:9` `KEY="freat.pantry.v1"`; `loadPantry` try/catch → `[]` (L18-37); `savePantry` try/catch no-op (L41-47); `App.tsx:16` `useState(() => loadPantry())`; `App.tsx:21-24` `updatePantry` → `savePantry(next)` on every edit. |
| 2 — editor in ingredients phase near IngredientList; add (trim+lowercase, dedup) + remove; persists | ✓ | `App.tsx:97` `<PantryStaples …/>` right after `IngredientList` inside `phase==='ingredients'`; `PantryStaples.tsx:26` `normalizeStaple(draft)`; dedup `:28 if(!staples.includes(name))`; remove `:20-22` filter; onChange→updatePantry→savePantry. |
| 3 — union + case-insensitive dedup into one `string[]` to `getRecipes`; no new route/types change | ✓ | `App.tsx:48-57` Set keyed by `name.trim().toLowerCase()` over `[...ingredients.map(i=>i.name), ...pantry]`, first spelling wins, `await getRecipes(names)`; `git status` shows `src/lib/types.ts`, `src/lib/api.ts`, `server/*` UNCHANGED. |
| 4 — pantry chips visually distinct (`.chip--pantry`); empty pantry == current behavior | ✓ | `styles.css:215-218` `.chip--pantry { background: rgba(22,163,74,0.18); border-color: var(--brand) }` vs base `.chip` `--surface-2`; `PantryStaples.tsx:47` applies `chip chip--pantry`; empty `...pantry` ([]) → dedup loop yields exactly ingredient names. |
| 5 — typecheck passes; smoke boots `/` clean | ✓ | `bun run typecheck` → `tsc --noEmit` exit 0. Smoke skipped (below) — not a failure. |

**Commands run:**
- `bun run typecheck`
- `git diff --name-only $(git merge-base HEAD main)...HEAD` · `git status --short`
- `grep -nE "fetch|/api|gemini|GEMINI|VITE_" src/lib/pantry.ts src/components/PantryStaples.tsx`
- `bun .weave/scripts/smoke.ts --ticket TKT-132`

**Notes:** Exactly the 4 declared files changed (M src/App.tsx, M src/styles.css, ?? src/lib/pantry.ts, ?? src/components/PantryStaples.tsx). Contract files `src/lib/types.ts`/`src/lib/api.ts`/`server/*` confirmed unchanged. Only network/Gemini grep hit is the descriptive comment at `pantry.ts:7`. All 5 AC pass.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright not provisioned in `.weave` — browser provisioning is forbidden mid-chaos-run, so the gate records a skip, which is never a failure)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | skipped: `{"status":"skipped","reason":"playwright not installed in .weave — run: bun run install:browsers"}` exit 0 |

**Captured console errors (verbatim):** none (smoke did not execute)

**Screenshots:** none (smoke skipped). Build sanity: `bun run build` succeeds, PWA precache unchanged at 7 entries (no `/api` precache regression); the `/` capture screen never mounts `PantryStaples`, so the no-key render path is unaffected.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Persisted staples (`pantry.ts:9` `freat.pantry.v1`; `App.tsx:16` seed, `:21-24` persist-on-edit) unioned at the real request build `App.tsx:48-57` (Set keyed on `trim().toLowerCase()`, first spelling wins) into the `string[]` passed to `getRecipes` — staples reach Gemini, so `missingIngredients` stops nagging. |
| Context constraints | ✓ | No key path / no `fetch` / no `VITE_` in new files (only the descriptive comment `pantry.ts:7`); reuses `getRecipes` (one data-fetching path); `PantryStaples` only mounts in `phase==='ingredients'` (never on `/`), no network on load, `localStorage` try/catch-guarded → no-key render stays clean; only CSS changed besides TSX, manifest/SW/vite.config untouched (precache 7 entries). |
| Sprawl | ✓ | `git status --short` = exactly the 4 declared files (M App.tsx, M styles.css, ?? pantry.ts, ?? PantryStaples.tsx); matches `files_touched`. `types.ts`/`api.ts`/`server/*` unchanged. |
| Follow-up surfacing | ✓ | No in-scope gaps. Two non-blocking observations: dedupe `includes()` relies on the stored list already being normalized (holds — `loadPantry` re-normalizes on read); staples can't be seeded before the first photo (by design per Context). |
| Architecture coherence | ✓ | Extends, never forks: reuses `getRecipes` (no route/`types.ts` change); `pantry.ts` is self-contained, namespaced+versioned, try/catch-guarded (no global storage abstraction) — matches the sibling convention; `PantryStaples` mirrors `IngredientList`'s controlled lift-state-up `{list,onChange}` + normalize-on-add + `chip` markup; CSS reuses existing tokens (`.chip--pantry` overrides only bg/border with `var(--brand)`). |

**Suggested new tickets:** none

**Notes:** All five axes pass → overall PASS, corroborating the test verdict independently. Clean minimal client-side persistence slice. Confidence caveat: the headless smoke was SKIPPED (playwright not provisioned mid-chaos-run), so the zero-console-error claim rests on code reading + build sanity (`PantryStaples` never mounts on the `/` route the smoke checks, no network on load), not an executed browser run — consistent with the documented missing-browser blocker; a human may run the smoke once playwright is available.
