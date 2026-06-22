---
id: TKT-131
title: "Remix a recipe — regenerate one dish with a quick tweak"
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
related: [TKT-145]
files_touched:
  - "src/lib/types.ts"
  - "src/lib/api.ts"
  - "server/gemini.ts"
  - "server/handlers.ts"
  - "src/components/RecipeList.tsx"
  - "src/App.tsx"
  - "src/styles.css"
complexity: 3
next_step_hint: Human review queue — full-ticket validation passed; review the remix diff and approve to land.
---

## Objective
**Remix a recipe**: regenerate one dish in place with a quick tweak — preset chips
("🌶 spicier", "🥗 vegan", "⏱ faster", "🔁 different idea") plus an optional free-text
nudge — without sending the user back to ingredient editing.

## Context
The recipes that come back are a one-shot roll of the dice (`suggestRecipes`,
`server/gemini.ts:124-133`, temp 0.7). The real desire is conversational ("make it
vegan", "I'm out of cheese", "give me something else"). Today the only way to nudge a
single dish is to go back and re-run everything. Add a focused third AI call and a new
route the contract-first way: `remixRecipe()` in `server/gemini.ts`, `POST
/api/recipes/remix` in `server/handlers.ts` (the one place routes are added), a
`RecipeRemixRequest { base, tweak, ingredients }` + helper in `types.ts`/`api.ts`, and
a per-card "Remix" affordance in `src/components/RecipeList.tsx:17`. Reuses the
`Recipe` shape verbatim — no fork.

## Acceptance Criteria
- [ ] `POST /api/recipes/remix` accepts `{ base: Recipe, tweak: string, ingredients: string[] }` and returns `{ recipe: Recipe }` — one regenerated recipe in the existing `Recipe` shape, no new fields.
- [ ] `src/lib/types.ts` gains the request/response types and `src/lib/api.ts` gains a typed helper that POSTs to `/api/recipes/remix`; components add no raw `fetch`.
- [ ] Each recipe card shows preset tweak chips (spicier / vegan / faster / different idea) plus a free-text nudge input; submitting either replaces that card's recipe in place and leaves sibling cards untouched.
- [ ] With no Gemini key set, a remix request returns the existing `503 GEMINI_KEY_MISSING` and the UI shows the existing friendly message — no new error code or shape.
- [ ] `bun run typecheck` passes; the recipes view boots with zero console errors when no key is configured (remix hits Gemini only on a user action).

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 5 bullets rewritten for independent verifiability — pinned the request/response JSON shape, the typed-helper/no-raw-fetch rule, the in-place-swap + siblings-untouched assertion, the exact `503 GEMINI_KEY_MISSING` code, and the lazy-AI/zero-console-error boot condition.
- **Blockers:** ok — `depends_on` empty; no active blocker.
- **Context drift:** ok — verified `server/gemini.ts:124` (`suggestRecipes`, temp 0.7), `server/handlers.ts` route table, and `src/components/RecipeList.tsx:17` (recipe card `.map`) all still exist at the cited anchors.
- **Complexity:** 3 (medium) confirmed — one coherent full-stack slice (shared type + Gemini fn + route + api helper + UI), extends the ADR-001 `/api/*` contract, adds no dependency.
- **Note — type naming:** Context suggests `RecipeRemixRequest`; build will name the types `RemixRequest`/`RemixResponse` to match the established `AnalyzeRequest`/`RecipesRequest` convention. Trivial, reversible; not a scope change.

**Verdict:** build-ready

### Value Hypothesis
**Lens:** Adjacent-workflow / Power-user
**Who benefits:** Returning cooks who've seen the obvious ideas and want to steer one dish.
**Why useful:** Turns a static result set into a conversation — "almost, but spicier" —
which is how people actually decide what to cook.
**Plugs in at:** `server/gemini.ts:124-133` · `server/handlers.ts` (new route) · `RecipeList.tsx:17`.
**Score:** value h · fit h · feasibility m · novelty h

### Implementation Summary

- **Shared contract** (`src/lib/types.ts`): added `RemixRequest { base: Recipe; tweak: string; ingredients: string[] }` and `RemixResponse { recipe: Recipe }`, reusing the `Recipe` shape verbatim — no fork.
- **Server AI call** (`server/gemini.ts`): added `remixRecipe(req): Promise<Recipe>` + a `remixPrompt` that sends the current recipe back to Gemini and asks for ONE tweak, returning a single JSON object (temp 0.7, same JSON-mime + fence-stripping path as `suggestRecipes`); shape-guards the result.
- **Route** (`server/handlers.ts`): added `POST /api/recipes/remix` after the `/api/recipes` route — validates `base` + `tweak`, reuses the shared `errorResponse` so the key-missing path stays the existing `503 GEMINI_KEY_MISSING`, returns `{ recipe } satisfies RemixResponse`.
- **Client helper** (`src/lib/api.ts`): added `remixRecipe(base, tweak, ingredients)` going through the existing `postJson` — components add no raw `fetch`.
- **UI** (`src/components/RecipeList.tsx`): extracted a `RecipeCard` sub-component that owns its free-text nudge input and renders preset chips (🌶 spicier / 🥗 vegan / ⏱ faster / 🔁 different idea); emits tweaks upward via `onRemix` (parent-owns-state convention, matching `IngredientList`).
- **App wiring** (`src/App.tsx`): added `handleRemix(index, tweak)` + `remixingIndex` state; calls the api helper and swaps the one card in place via `setRecipes(prev => prev.map(...))`, reusing the global `busy`/`error`/`messageFor` path.
- **Styles** (`src/styles.css`): added `.recipe-card__remix`, `.remix-chips`, `.chip--action`, `.remix-nudge` reusing existing CSS tokens.

**Deviations from plan:**
- Types named `RemixRequest`/`RemixResponse` (Context suggested `RecipeRemixRequest`) to match the established `AnalyzeRequest`/`RecipesRequest` convention. Flagged in Pass-2; trivial and reversible.

**Implementation notes:**
- `bun run typecheck` passes; `bun run build` succeeds (31 modules, PWA precache regenerated). Remix hits Gemini only on a user action (chip click / form submit), so the recipes view still boots with zero console errors when no key is set.
- A single in-flight remix is enforced via the global `busy` guard; concurrent remixes are intentionally disabled for simplicity.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Route accepts `{base,tweak,ingredients}` → `{recipe}`, no new fields | ✓ | `handlers.ts:78-95` route validates base+tweak, returns `json({ recipe } satisfies RemixResponse)`; `gemini.ts` `remixRecipe` shape-guards title+steps; `types.ts` `RemixRequest`/`RemixResponse` reuse `Recipe` verbatim. Live curl hit the route (not 404). |
| Types + typed api helper; no raw fetch in components | ✓ | `types.ts:50-60` adds types; `api.ts:65-73` `remixRecipe()` calls `postJson<RemixResponse>("/api/recipes/remix", …)`; `grep "fetch(" src/components` → no matches (exit 1). |
| Per-card preset chips + free-text; in-place swap, siblings untouched | ✓ | `RecipeList.tsx` `PRESETS` (spicier/vegan/faster/different) as `.chip--action` + `.remix-nudge` input; `App.tsx handleRemix` swaps via `setRecipes(prev => prev.map((r,i)=> i===index ? updated : r))`. |
| No-key → existing 503 `GEMINI_KEY_MISSING`, friendly msg, no new shape | ✓ | Booted `PORT=8799 bun run serve` (no key); POST remix → HTTP 503 `{"code":"GEMINI_KEY_MISSING"}` via shared `errorResponse`; `App.messageFor` handles that code. 400 BAD_REQUEST for missing tweak/base. |
| `bun run typecheck` passes; recipes view boots clean, remix lazy | ✓ | `tsc --noEmit` exit 0; `bun run build` 31 modules exit 0; no `useEffect`/render/module-load Gemini call — `client()` only inside route handlers fired on user action. |

**Commands run:**
- `bun run typecheck` (exit 0)
- `bun run build` (exit 0, 31 modules)
- `grep -rn "fetch(" src/components` (no matches)
- `PORT=8799 bun run serve` + `curl /api/health` and `curl -X POST /api/recipes/remix` (503 + body; 400 validation)
- `git diff` of all 7 changed files

**Notes (verbatim):** All 5 ACs verified independently from code + live server. Strongest evidence is the runtime curl: 503 GEMINI_KEY_MISSING with the shared error shape + 400 BAD_REQUEST validation. The recipes view is a client-state phase reachable only after a keyed analyze call, so smoke's `/` route can't exercise it directly — lazy-AI verified statically (no useEffect, no render/module-load Gemini call). Inert unrelated observation: a stray `MOdEL=gemini-3.5-flash` env var exists but code reads `GEMINI_MODEL`, so it has no effect.

### Smoke Check

**Headless Chromium:** SKIPPED (Playwright not provisioned in `.weave`; `install:browsers` must not run during a chaos run per its own repo-scoping guard — a skip is not a pass and does not fail the ticket)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | smoke harness skipped (no browser engine) |

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `RecipeList.tsx` PRESETS (spicier/vegan/faster/different) + free-text nudge both route through one `submit(tweak)`; `App.handleRemix` swaps one dish in place; user stays on the recipes phase. Base recipe round-tripped to Gemini (`remixPrompt` "Current recipe (JSON)") — true regenerate, not a fresh roll. |
| Context constraints | ✓ | Key read only in `gemini.ts resolveKey()` (`src/` grep for key/VITE_/import.meta.env = none). One data path: `App` imports `remixRecipe` from `./lib/api` → shared `postJson`; no raw fetch in components. AI lazy: remix only fires from chip click / form submit (no useEffect/module-load). `vite.config.ts` untouched — manifest + SW + `/api/*` NetworkOnly intact. |
| Sprawl | ✓ | `git diff --name-only` = exactly the 7 `files_touched` (+297/-32). RecipeList refactor extracts `RecipeCard` with no behavior change to non-remix portion; new CSS reuses existing tokens; no dead code. |
| Follow-up surfacing | ✓ | One deliberate UX limitation, explicitly flagged not silently dropped: global `busy` disables ALL cards' controls during any single remix. AC ("siblings untouched") refers to the data swap, which holds. Filed as a deferred backlog follow-up. |
| Architecture coherence | ✓ | Pure extension of ADR-001's three contracts, zero forking: route in the one `handlers.ts` router mirroring `/api/recipes`; `RemixRequest`/`RemixResponse` reuse `Recipe` verbatim, imported by both sides; Gemini call in `gemini.ts` reusing `client()`/`parseJson()`/temp 0.7; shared `errorResponse` → existing 503 `GEMINI_KEY_MISSING`, no new code. |

**Suggested follow-up tickets:**
- _Per-card remix concurrency — disable only the active card's remix controls, not all cards_ (defer). The global `busy` guard freezes every card's chips/inputs during one remix; scoping disable to `remixingIndex` would let users explore other cards while one regenerates. → filed to backlog.

**Notes (verbatim):** PASS on all five axes. Verified live: typecheck exit 0, build exit 0 (PWA precache regenerated). Non-blocking nitpicks: handlers forwards `body.base` after validating only `base.title` is a string, but it's the user's own prior server-generated recipe round-tripped (low risk, matches the loose-validation style of `/api/recipes`); the remix prompt is verbose but consistent with `recipePrompt`. Neither warrants a ticket.
