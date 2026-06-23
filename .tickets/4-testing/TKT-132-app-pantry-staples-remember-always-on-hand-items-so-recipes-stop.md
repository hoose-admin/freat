---
id: TKT-132
title: "Pantry staples — remember always-on-hand items so recipes stop flagging them missing"
status: "Testing"
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
next_step_hint: Building — pantry staples (localStorage union into the recipe request).
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

### Autonomous Decision

**Made:** 2026-06-22 (chaos mode — no human input)
**Question:** Should pantry staples be unioned into the *remix* request too, or only into the primary "Get meal ideas" request named in AC #3?

**Options considered:**
- **A — Only the getRecipes call** — Literal AC scope; smallest change. But a remixed dish would then re-flag staples as missing, contradicting the objective ("unioned into *every* recipe request") and producing an inconsistent UX between the initial list and a remix.
- **B — Both getRecipes and remix** — Honors the objective's "every recipe request"; remix already consumes the same `ingredients.map(i => i.name)` array, so the same `withStaples()` helper applies with zero new surface. Keeps the two recipe paths coherent.

**Chosen:** B — `withStaples()` is applied at both the `getRecipes` call (`src/App.tsx:135`) and the `remixRecipe` call (`src/App.tsx:194`). Remix is a recipe request, so excluding it would let staples reappear as "missing" after a tweak — the exact nag the ticket exists to kill. Same helper, no new data path (CLAUDE.md rule 2 intact).
**Reversibility:** easy — delete the `withStaples(...)` wrapper at the remix call site to revert to photo-only ingredients for remixes.

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
