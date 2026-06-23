---
id: TKT-131
title: "Remix a recipe — regenerate one dish with a quick tweak"
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
next_step_hint: Verify AC with a fresh subagent — cite remixRecipe (gemini.ts) and POST /api/recipes/remix (handlers.ts) in evidence.
chaos_branch: chaos/TKT-131
merged: 2026-06-22
merge_commit: aaab75ee9965
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

### Autonomous Decision — rebuild from a lost prior run

**Run:** 2026-06-22 (chaos)

- **Question:** This ticket sat in `0-backlog/` but its body carried a complete Implementation Summary / Test Results / Validation Review from an earlier run — yet **none of that code exists** on this worktree's base (`grep -rn remix src/ server/` → no matches; no TKT-131 commit in history). Rebuild, or trust the stale report?
- **Choice:** Treat the prior post-build sections as **lost work** and rebuild from scratch against the *current* codebase. Stripped the stale Implementation Summary / Test Results / Smoke Check / Validation Review so this run's gates write fresh, truthful evidence.
- **Rationale:** A status report describing code that isn't in the tree is exactly the "fabricated status report" failure mode the flow guards against. The refinement (Objective / Context / AC / Pass-2) is still valid and reused as-is.
- **Coherence note:** The codebase has since gained `RecipePreferences` (dietary/time/servings), `CookMode`, `ShoppingList`, a `selected` Set, and a `/api/health` readiness pill (TKT-106 / TKT-126 / TKT-133). The remix build extends those current contracts rather than the older shape the lost summary assumed.
- **Reversibility:** High — pure additive feature on the existing ADR-001 `/api/*` contract.

### Implementation Summary

- **Shared contract** (`src/lib/types.ts`): added `RemixRequest { base: Recipe; tweak: string; ingredients: string[] }` and `RemixResponse { recipe: Recipe }`, reusing the `Recipe` shape verbatim — no fork.
- **Server AI call** (`server/gemini.ts`): added `remixRecipe(req): Promise<Recipe>` + a `remixPrompt` that round-trips the current recipe (`JSON.stringify(req.base)`) back to Gemini and asks for ONE tweaked dish, returning a single JSON object (temp 0.7, same `client()` / `parseJson` fence-stripping path as `suggestRecipes`); shape-guards `title`+`steps` and normalizes the `usesIngredients`/`missingIngredients` arrays.
- **Route** (`server/handlers.ts`): added `POST /api/recipes/remix` after `/api/recipes` — validates `base.title` + a non-empty `tweak`, sanitizes `ingredients`, reuses the shared `errorResponse` so the key-missing path stays the existing `503 GEMINI_KEY_MISSING`, returns `{ recipe } satisfies RemixResponse`.
- **Client helper** (`src/lib/api.ts`): added `remixRecipe(base, tweak, ingredients)` going through the existing `postJson<RemixResponse>` — components add no raw `fetch`.
- **UI** (`src/components/RecipeList.tsx`): extracted a `RecipeCard` sub-component that owns its free-text nudge input and renders preset chips (🌶 Spicier / 🥗 Vegan / ⏱ Faster / 🔁 Different idea) as `.chip--action` buttons; both paths emit `onRemix(index, tweak)` (parent-owns-state, matching `IngredientList`). The card carries `role="group"` + `aria-busy`, an `aria-label`led nudge input, and a `role="status"` "Remixing…" indicator.
- **App wiring** (`src/App.tsx`): added `handleRemix(index, tweak)` + a `remixing: Set<number>` state; swaps the one card in place via `setRecipes(prev => prev.map((r,i) => i===index ? updated : r))`, preserving the index-keyed `selected` set. Errors ride the shared `error`/`messageFor`/`lastAction`-Retry path. `reset()` clears `remixing`.
- **Styles** (`src/styles.css`): added `.recipe-card__remix`, `.recipe-card__remix-label`, `.recipe-card__remix-status`, `.remix-chips`, `.chip--action`, `.remix-nudge`, reusing existing CSS tokens (`--brand`, `--surface-2`, `--border`, `.input`).

**Deviations from plan:**
- Types named `RemixRequest`/`RemixResponse` (Context suggested `RecipeRemixRequest`) to match the established `AnalyzeRequest`/`RecipesRequest` convention. Flagged in Pass-2; trivial and reversible.
- **Per-card concurrency, not a global freeze.** Remix uses a `remixing: Set<number>` rather than the global `busy` flag, so only the active card disables its own chips/input + shows a spinner while siblings stay fully interactive. This intentionally resolves the limitation the prior (lost) run had filed as a follow-up — building it correctly the first time here is cheaper than a follow-up ticket.

**Implementation notes:**
- `bun run typecheck` (exit 0) and `bun run build` (exit 0, PWA precache regenerated) both pass. Remix calls Gemini only on a user action (chip click / nudge submit) — no `useEffect`/render/module-load AI call — so the recipes view still boots with zero console errors when no key is set.
- Verified live (`PORT=8811 GEMINI_API_KEY="" bun run serve`): `POST /api/recipes/remix` → `HTTP 503 {"code":"GEMINI_KEY_MISSING"}` via the shared `errorResponse`; missing-tweak → `HTTP 400 {"code":"BAD_REQUEST"}`; no console errors in the server log.
- No raw `fetch(` in `src/components` (grep exit 1); no Gemini key string in the built client bundle (grep exit 1).

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Route accepts `{base,tweak,ingredients}` → `{recipe}`, no new fields | ✓ | `handlers.ts` route validates `base.title`+non-empty `tweak`, returns `json({ recipe } satisfies RemixResponse)`; `gemini.ts remixRecipe` parses a single object, guards title/steps, normalizes only `usesIngredients`/`missingIngredients`; `types.ts` `Recipe` unchanged, `RemixResponse = { recipe: Recipe }`. Live curl hit the route (not 404). |
| Types + typed api helper; no raw fetch in components | ✓ | `types.ts` adds `RemixRequest`/`RemixResponse`; `api.ts remixRecipe()` calls `postJson<RemixResponse>("/api/recipes/remix", …)`; `grep -rn "fetch(" src/components` → exit 1 (none); broader `grep` over `src/` minus `api.ts` → exit 1. |
| Per-card preset chips + free-text; in-place swap, siblings untouched | ✓ | `RecipeList.tsx` `PRESETS` (spicier/vegan/faster/different) as `.chip--action` + nudge `<form onSubmit>`; `App.tsx handleRemix` swaps via `setRecipes(prev => prev.map((r,i)=> i===index ? updated : r))`; per-card `remixing: Set<number>` → `remixing.has(idx)` so only the active card disables, siblings interactive. |
| No-key → existing 503 `GEMINI_KEY_MISSING`, friendly msg, no new shape | ✓ | Keyless server: `POST /api/recipes/remix` → HTTP 503 `{…,"code":"GEMINI_KEY_MISSING"}`, **byte-identical** to `POST /api/recipes`; `errorResponse` maps `GeminiKeyMissingError`→503; `App.messageFor` reuses the existing `GEMINI_KEY_MISSING` branch. Bonus: empty tweak → 400 BAD_REQUEST. |
| `bun run typecheck` passes; recipes view boots clean, remix lazy | ✓ | `tsc --noEmit` exit 0; keyless server log shows only startup + SIGTERM (no errors); all three `useEffect` in `App.tsx` do focus/`getHealth().catch`/sessionStorage only — no Gemini call; remix fires only from chip `onClick` / nudge `onSubmit`. |

**Commands run:**
- `git diff -- src/ server/`
- `grep -rn "fetch(" src/components` (exit 1); `grep -rn "fetch(" src/ | grep -v src/lib/api.ts` (exit 1)
- `bun run typecheck` (exit 0)
- `PORT=8822 GEMINI_API_KEY="" bun run serve` + `curl` of `/api/health`, `/api/recipes/remix` (503), `/api/recipes` (identical 503), empty-tweak remix (400)

**Notes (verbatim):** All 5 ACs pass under cold-read verification. Recipe interface is unchanged — RemixRequest/RemixResponse reuse it verbatim, satisfying 'no new fields'. Remix and recipes routes return byte-identical 503 GEMINI_KEY_MISSING bodies (no new error shape). The in-place swap (setRecipes map by index) and per-card remixing Set correctly leave sibling cards interactive. Did not exercise a live Gemini success path (no key set, as expected); success-shape normalization verified by code read. Server started for testing was killed and confirmed gone.

### Smoke Check

**Headless Chromium:** SKIPPED (Playwright not provisioned in `.weave`; `install:browsers` must not run during a chaos run per its repo-scoping guard — a skip is not a pass and does not fail the ticket)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | smoke harness skipped (no browser engine) |

Smoke output (verbatim): `{"status":"skipped","reason":"playwright not installed in .weave — run: bun run install:browsers","routes":[],"ticketId":"TKT-131"}`. Note the recipes phase is a client-state view reached only after a keyed analyze call, so smoke's `/` route can't exercise remix directly even when provisioned; lazy-AI + zero-console-error boot were verified statically + via the keyless live server above.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | True in-place single-dish regenerate (not a fresh roll): `remixPrompt` round-trips the card via `Current recipe (JSON):\n${JSON.stringify(req.base)}` and asks for ONE revised dish (single object). `handleRemix` swaps only the target via `setRecipes(prev => prev.map((r,i)=> i===index ? updated : r))`; per-card `remixing: Set<number>` keeps siblings interactive; both chips and free-text submit; user stays on the recipes view (no `setPhase`). |
| Context constraints | ✓ | Key server-side only: `grep -rniE 'GEMINI_API_KEY|import.meta.env|VITE_' src/` → exit 1. One data path: `App` imports `remixRecipe` from `./lib/api`; helper uses shared `postJson`; `grep -rn "fetch(" src/components` → exit 1. AI lazy (chip/submit only, no useEffect). `vite.config.ts` untouched → manifest/SW/precache intact. |
| Sprawl | ✓ | Working tree = exactly the 7 declared `files_touched`, no extras. `RecipeCard` extraction is behavior-preserving (non-remix markup copied verbatim; only the remix block + nudge state added). No dead code — every new style class is referenced and reuses existing tokens + `btn--ghost`/`btn--sm`. |
| Follow-up surfacing | ✓ | Per-card `remixing: Set<number>` judged sound (scopes disable/spinner to one card; `if (remixing.has(index)) return` guards double-fire). Two minor, non-blocking observations filed as deferred follow-ups (below). |
| Architecture coherence | ✓ | Extends, does not fork: route in the single `handlers.ts` router mirroring `/api/recipes` with the same `try/errorResponse` shape; shared 503 `GEMINI_KEY_MISSING` (no new code); `RemixRequest`/`RemixResponse` reuse `Recipe` verbatim (no parallel type); `remixRecipe` mirrors `suggestRecipes` (`client()`/`parseJson`/temp 0.7/JSON mime); helper reuses `postJson`; App reuses `lastAction`/`messageFor`/`setStatus`. |

**Suggested new tickets:** 2 (both deferred to backlog) → filed as TKT-162, TKT-163.

**Notes (verbatim):** All five axes pass; overall PASS. The TKT-131 implementation is uncommitted in the worktree (HEAD == main) — diffing against HEAD~1 misleadingly pulled in committed TKT-106 work (PreferencesControl.tsx); the real change is the 7-file working-tree diff, which matches the declared files_touched exactly. Verified independently: typecheck exit 0; no key/VITE_/import.meta.env in src/; no raw fetch in components; vite.config.ts untouched; gemini remix call byte-mirrors suggestRecipes; shared 503/error/status paths reused; RecipeCard refactor behavior-preserving. Did not exercise a live Gemini success path (no key configured, which is the expected/documented state).
