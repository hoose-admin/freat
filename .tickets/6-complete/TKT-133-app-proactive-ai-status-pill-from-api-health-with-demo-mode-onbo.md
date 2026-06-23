---
id: TKT-133
title: "Proactive AI-status pill from /api/health with demo-mode onboarding banner"
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
related: [TKT-103, TKT-144]
files_touched:
  - "server/handlers.ts"
  - "src/App.tsx"
  - "src/lib/api.ts"
  - "src/lib/types.ts"
  - "src/styles.css"
complexity: 2
next_step_hint: Human review queue — validated PASS (5/5 axes, incl. architecture coherence); supervisor commits chaos/TKT-133. Follow-up polish is TKT-144.
planned_files: [src/lib/types.ts, src/lib/api.ts, src/App.tsx, src/styles.css]
chaos_branch: chaos/TKT-133
merged: 2026-06-22
merge_commit: 9631758dd0cb
---

## Objective
Show AI readiness **proactively**: fetch `GET /api/health` on mount and render a small
status pill in the header ("AI ready" / "AI not configured"), plus a dismissible
demo-mode banner when the key is missing — instead of only discovering it *after* a
failed photo analysis.

## Context
Today the only signal that the AI is unconfigured comes reactively, from a failed
analyze call mapped in `messageFor()` (`src/App.tsx:258-266`, code `GEMINI_KEY_MISSING`)
— so a first-runner wastes their best fridge photo discovering the app is dead. The
health route already exists and is key-safe (`server/handlers.ts:42-44` returns
`{ ok, geminiConfigured, model }` and makes **no** Gemini call), but the client never
calls it. Add a `getHealth()` helper in `src/lib/api.ts` (mirroring `analyzeFridge`
at `src/lib/api.ts:49`) and surface it in the header (`src/App.tsx:137-142`). Does NOT
violate the "AI is lazy / no Gemini on page load" rule (ADR-001) — `/api/health` is not
a Gemini call. Distinct from TKT-103 (loading/empty/error states on *actions*).

## Acceptance Criteria
- [ ] `getHealth()` typed helper in `src/lib/api.ts`; called once on mount.
- [ ] Header pill reflects `geminiConfigured` (ready vs not-configured).
- [ ] When not configured, a dismissible banner explains demo mode before the user shoots a photo.
- [ ] No Gemini call on load; smoke stays green; zero console errors with no key.

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — all four bullets are independently verifiable (helper exists + called once on mount; pill reflects `geminiConfigured`; dismissible demo banner when unconfigured; no Gemini call on load + smoke green + zero console errors). Bullet 4 bundles three checks but they are one coherent "lazy-AI invariant" and stay together.
- **Blockers:** ok — `depends_on: []`. `related: TKT-103` is in `6-complete/`; `TKT-144` (the follow-up polish) is in `0-backlog/` and `depends_on` this — neither is a build blocker.
- **Context drift:** refreshed — the codebase grew (cook mode / step timers / shopping list / servings) since pass-1, so the App.tsx cites moved: header now `src/App.tsx:137-142`, `messageFor`/`GEMINI_KEY_MISSING` now `src/App.tsx:258-266`. `server/handlers.ts:42-44` (health route, no Gemini call) and `src/lib/api.ts:49` (`analyzeFridge`) still accurate. Cites above updated.

**Verdict:** build-ready

### Implementation Summary

- Added `HealthResponse` (`ok` / `geminiConfigured` / `model`) to the shared contract in `src/lib/types.ts`, mirroring the existing `/api/health` route shape, and applied `satisfies HealthResponse` to that route in `server/handlers.ts:43` so server output and the client type can never silently diverge (matches the `satisfies AnalyzeResponse`/`RecipesResponse` pattern the other two routes already use).
- Extended the ONE client fetch path in `src/lib/api.ts`: factored the shared fetch+error-handling core out of `postJson` into a private `request<T>(path, init?)` helper (POST path behavior-identical), and added an exported `getHealth(): Promise<HealthResponse>` that GETs `/api/health` through it. No component calls `fetch` directly — CLAUDE.md hard rule #2 honored.
- `src/App.tsx`: probe AI readiness once on mount via `useEffect(() => { getHealth().then(setHealth).catch(() => {}); }, [])` — the `.catch` swallows a down/erroring probe so it never logs a console error. Rendered a header status pill reflecting `geminiConfigured` ("AI ready" vs "AI not configured"), and a dismissible `role="status"` demo-mode banner shown only when `health && !health.geminiConfigured && !demoDismissed`, placed at the top of `<main>` before the photo capture.
- `src/styles.css`: added `.ai-pill` (+ `--ready` / `--off` / `__dot`) and `.banner--info` / `.banner__dismiss` using existing theme tokens (`--surface-2`, `--border`, `--brand`, `--muted`); the demo banner reuses the established `.banner` pattern.

**Deviations from plan:**
- Touched a 5th file beyond the four `planned_files`: `server/handlers.ts` (one `satisfies HealthResponse` annotation). Intentional — it binds the existing route to the new shared type, the architecturally-coherent way to extend the contract, and matches the convention the other two routes already follow. `files_touched` updated to include it.

**Implementation notes:**
- `/api/health` is NOT a Gemini call (it returns synchronously from `resolveKey()` with no model invocation), so the on-mount fetch does not violate the "AI is lazy / no Gemini on load" rule (ADR-001).
- `vite.config.ts`, the manifest, and the service worker were untouched — `/api/*` stays `NetworkOnly` / out of precache; `bun run build` still emits the PWA SW (precache 10 entries).
- Both health branches verified at runtime against the production build (`bun run serve`): key present → `{"ok":true,"geminiConfigured":true,...}`; key env blanked → `{"ok":true,"geminiConfigured":false,...}`; `GET /` → 200 in both, no server errors. `bun run typecheck` clean; `bun run build` succeeds.
- Follow-up polish (single live region on mount + in-flight pill state) was already filed as **TKT-144** by a prior pass; not re-filed.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| `getHealth()` typed helper in `api.ts`; called once on mount | ✓ | `src/lib/api.ts:52-54` exports `getHealth(): Promise<HealthResponse>` → `request<HealthResponse>("/api/health")`; `src/App.tsx:64-68` calls it inside `useEffect(..., [])` (empty deps = once): `getHealth().then(setHealth).catch(() => {})`. |
| Header pill reflects `geminiConfigured` | ✓ | `src/App.tsx:156-164` renders header pill when `health` set: `ai-pill ai-pill--${health.geminiConfigured ? "ready" : "off"}`, text `AI ready` / `AI not configured`; styles `src/styles.css:181-207`. Runtime `/api/health` → `geminiConfigured:false` so pill reflects real state. |
| Dismissible demo banner when not configured, before shooting a photo | ✓ | `src/App.tsx:168-183` banner gated `health && !health.geminiConfigured && !demoDismissed`, at top of `<main>` before capture; dismiss button sets `setDemoDismissed(true)` (state declared `App.tsx:37`). |
| No Gemini call on load; smoke green; zero console errors with no key | ✓ | On load only `getHealth()`→`GET /api/health`; handler `server/handlers.ts:43-45` returns json from `geminiConfigured()`/`geminiModel()` only; `geminiConfigured()` (`server/gemini.ts:55-57`) just calls `resolveKey()` (env check, no model call). `App.tsx:67` `.catch(()=>{})` swallows probe errors. Runtime boot with blanked keys: `/api/health` → `{"ok":true,"geminiConfigured":false,...}`, root → HTTP 200, serve log shows only boot line + SIGTERM. |

**Commands run:**
- `grep -rn "fetch(" src` (excluding api.ts) → no direct fetch in components
- `grep -rniE "GEMINI_API_KEY|GOOGLE_GENAI_API_KEY|GOOGLE_API_KEY|GENAI_API_KEY|VITE_" src` → no key/VITE_ ref in src
- `grep -rniE "<key names>" dist/assets/*.js` → no key in built JS bundle
- `bun run typecheck` → exit 0
- `bun run build` → `✓ built`, exit 0
- `GEMINI_API_KEY= … PORT=8821 bun run serve` + `curl /api/health` → `geminiConfigured:false`; `curl /` → HTTP 200

**Notes:** All 4 AC pass. Independent confirms: no component calls `fetch()` directly (only `api.ts`); `src/` and the built JS leak no Gemini key or `VITE_` secret; typecheck + build exit 0. `HealthResponse` added to the shared contract (`src/lib/types.ts:48-53`) and used `satisfies HealthResponse` on both the client helper and the server handler, keeping the one-contract spine intact. The on-mount probe is `GET /api/health` (no Gemini model call), so the "AI is lazy" rule (ADR-001 / CLAUDE.md #3) holds.

### Smoke Check

**Headless Chromium:** SKIPPED (Playwright not installed in `.weave` — `bun .weave/scripts/smoke.ts --ticket TKT-133` returned `{"status":"skipped","reason":"playwright not installed in .weave …"}`). Per the test-ticket gate, a smoke that cannot run records as skipped — never a pass, never a fail.

**Supplementary runtime evidence (production build, `bun run serve`):**

| Scenario | `/api/health` | `GET /` | Console/server errors |
|---|---|---|---|
| Key present | `{"ok":true,"geminiConfigured":true,"model":"gemini-2.5-flash"}` | 200 | none |
| Key env blanked | `{"ok":true,"geminiConfigured":false,"model":"gemini-2.5-flash"}` | 200 | none |

Confirms the app boots and `/api/health` returns the exact shape the pill/banner consume in both states, with no Gemini call and no server errors.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Delivers the objective exactly: `getHealth()` probed once on mount `src/App.tsx:64-68`; header pill `src/App.tsx:156-164` reflects `geminiConfigured` ("AI ready" / "AI not configured"); dismissible demo banner `src/App.tsx:168-183` gated `health && !health.geminiConfigured && !demoDismissed`, before `PhotoCapture`. No drift. |
| Context constraints | ✓ | #1 key-safe: grep `src` for key names / `VITE_` → none; key still only in `server/gemini.ts`. #2 one data path: no `fetch(` in components; `getHealth()` funnels through shared `request<T>()` `api.ts:52-54`; `HealthResponse` in shared `types.ts:48-53`. #3 AI-lazy: `/api/health` handler returns from `geminiConfigured()`/`geminiModel()` only — no model call. #4 PWA intact: `vite.config.ts`/manifest/SW not in the changeset. |
| Architecture coherence | ✓ | Honors ADR-001's one-contract spine. `HealthResponse` added to shared `types.ts` (not forked); server route uses `satisfies HealthResponse` matching the `satisfies AnalyzeResponse`/`RecipesResponse` pattern; `postJson`→`request<T>()` is a clean behavior-preserving extraction (identical fetch/try-catch/`!res.ok` mapping); styles reuse the `.banner` base via new `.banner--info` and real theme tokens — no parallel design system. |
| Sprawl | ✓ | `git status --short` = exactly the 5 `files_touched`. The 5th (`server/handlers.ts`) is the one `satisfies` annotation, explicitly justified in the Implementation Summary as a contract-coherence touch following the existing convention — credited, not creep. |
| Follow-up surfacing | ✓ | No new in-scope issues unfixed. The known polish (single live region on mount + in-flight pill state) is already covered by **TKT-144** (`depends_on: TKT-133`), so not re-filed. `bun run typecheck` exits 0. |

**Suggested new tickets:** none (the one known follow-up is already filed as TKT-144).

**Reviewer notes (verbatim):** PASS on all five axes. Independently re-verified, not trusting the ticket summary: typecheck clean (exit 0); working tree touches exactly the 5 declared files; no direct fetch in components; no key/VITE_ reference anywhere in src/; /api/health makes no Gemini model call (resolveKey env check only), so the on-mount probe respects the AI-is-lazy rule; vite.config/manifest/SW untouched. The postJson→request<T>() refactor is a faithful behavior-preserving extraction and the new types/route/styles all extend the existing single contract and theme rather than forking. The TKT-133 changes are uncommitted in the worktree — normal pre-land state for chaos validation.

### Value Hypothesis
**Lens:** New-user onboarding
**Who benefits:** First-run users and anyone running the app without a configured key.
**Why useful:** Sets honest expectations up front and saves the wasted failed round-trip
of analyzing a photo against a key that isn't there.
**Plugs in at:** `server/handlers.ts:42-44` (existing route) → new `getHealth()` in `api.ts` → `src/App.tsx:137-142`.
**Score:** value h · fit h · feasibility h · novelty h
