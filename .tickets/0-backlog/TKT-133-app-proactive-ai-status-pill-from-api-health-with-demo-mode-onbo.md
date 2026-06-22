---
id: TKT-133
title: "Proactive AI-status pill from /api/health with demo-mode onboarding banner"
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
related: [TKT-103]
files_touched:
  - "src/App.tsx"
  - "src/lib/api.ts"
  - "src/lib/types.ts"
  - "src/styles.css"
complexity: 2
next_step_hint: Human review queue — validated PASS (4/4 axes); follow-up polish filed as TKT-144.
planned_files: [src/lib/types.ts, src/lib/api.ts, src/App.tsx, src/styles.css]
---

## Objective
Show AI readiness **proactively**: fetch `GET /api/health` on mount and render a small
status pill in the header ("AI ready" / "AI not configured"), plus a dismissible
demo-mode banner when the key is missing — instead of only discovering it *after* a
failed photo analysis.

## Context
Today the only signal that the AI is unconfigured comes reactively, from a failed
analyze call mapped in `messageFor()` (`src/App.tsx:114-122`, code `GEMINI_KEY_MISSING`)
— so a first-runner wastes their best fridge photo discovering the app is dead. The
health route already exists and is key-safe (`server/handlers.ts:42-44` returns
`{ ok, geminiConfigured, model }` and makes **no** Gemini call), but the client never
calls it. Add a `getHealth()` helper in `src/lib/api.ts` (mirroring `analyzeFridge`)
and surface it in the header (`src/App.tsx:57-62`). Does NOT violate the "AI is lazy /
no Gemini on page load" rule — `/api/health` is not a Gemini call. Distinct from
TKT-103 (loading/empty/error states on *actions*).

## Acceptance Criteria
- [ ] `getHealth()` typed helper in `src/lib/api.ts`; called once on mount.
- [ ] Header pill reflects `geminiConfigured` (ready vs not-configured).
- [ ] When not configured, a dismissible banner explains demo mode before the user shoots a photo.
- [ ] No Gemini call on load; smoke stays green; zero console errors with no key.

### Implementation Summary

- Added `HealthResponse` (`ok` / `geminiConfigured` / `model`) to the shared contract in `src/lib/types.ts`, mirroring the existing `/api/health` route shape in `server/handlers.ts:42-44`.
- Extended the ONE client fetch path in `src/lib/api.ts`: factored the shared fetch/error handling out of `postJson` into a private `request<T>(path, init)` helper (no behavior change), and added an exported `getHealth(): Promise<HealthResponse>` that GETs `/api/health` through it. No component calls `fetch` directly — hard rule #2 honored.
- `src/App.tsx`: probe AI readiness once on mount via `useEffect(() => { getHealth().then(setHealth).catch(() => {}) }, [])`; the `.catch` swallows failures so a down/erroring probe never logs a console error. Rendered a header status pill that reflects `geminiConfigured` ("AI ready" vs "AI not configured"), and a dismissible `role="status"` demo-mode banner shown only when `health != null && !geminiConfigured && !demoDismissed`.
- `src/styles.css`: added `.ai-pill` (+ `--ready` / `--off` / `__dot`) and `.banner--info` / `.banner__dismiss` styles using existing theme tokens (`--surface-2`, `--border`, `--brand`, `--muted`); dismiss button has a `:focus-visible` outline.

**Deviations from plan:**
- None on scope. One implementation choice beyond the AC: generalized `postJson` into a shared `request()` helper rather than duplicating ~12 lines of error handling for GET — keeps the single-fetch-path contract intact instead of forking a parallel one.

**Implementation notes:**
- `/api/health` is NOT a Gemini call (server returns `{ ok, geminiConfigured, model }` with no model invocation), so the on-mount fetch does not violate the "AI is lazy / no Gemini on load" rule (ADR-001).
- `vite.config.ts`, the manifest, and the service worker were untouched — `/api/*` stays `NetworkOnly` / out of precache; `bun run build` still emits 7 precache entries.
- `bun run typecheck` clean; `bun run build` succeeds.

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| `getHealth()` typed helper in `api.ts`; called once on mount | ✓ | `src/lib/api.ts:48-50` `export function getHealth(): Promise<HealthResponse>` routed through private `request<T>()` (api.ts:25-37), no raw fetch in components; called once in mount-only effect `src/App.tsx:23-27` `useEffect(() => { getHealth().then(setHealth).catch(() => {}); }, [])` |
| Header pill reflects `geminiConfigured` | ✓ | `src/App.tsx:75-83` pill inside `<header>`; class `ai-pill ai-pill--${geminiConfigured ? "ready" : "off"}`, text `AI ready` / `AI not configured`; styles `src/styles.css:58-87` |
| Dismissible demo banner when not configured, before shooting a photo | ✓ | gate `src/App.tsx:29` `health != null && !geminiConfigured && !demoDismissed`; banner `src/App.tsx:87-102` at top of `<main>` before `PhotoCapture`; dismiss button with `aria-label` + `onClick={() => setDemoDismissed(true)}` |
| No Gemini call on load; smoke green; zero console errors with no key | ✓ | `server/handlers.ts:42-44` health route returns `{ ok, geminiConfigured(), model }` with no model invocation (`geminiConfigured()` = `resolveKey() !== null`); on-mount fetch swallows errors via `.catch(() => {})` (App.tsx:26); `bun run typecheck` clean; `bun run build` `✓ built` + `precache 7 entries` (PWA intact) |

**Commands run:**
- `bun run typecheck`
- `bun run build`

**Notes:** All four AC pass against the actual code. Implementation refactored `postJson` into a shared `request<T>()` helper, preserving the single-fetch-path contract (hard rule #2) rather than forking a parallel one.

### Smoke Check

**Headless Chromium:** SKIPPED (sandbox killed the harness — `bun .weave/scripts/smoke.ts --ticket TKT-133` exited 137/SIGKILL, no `SmokeResult`/console capture produced; this environment can't boot Chromium+server). Per the test-ticket gate, a smoke that cannot run records as skipped — never a pass, never a fail.

**Supplementary runtime evidence (booted the production build directly, `PORT=8799 bun run serve`):**
- `GET /api/health` → `200 {"ok":true,"geminiConfigured":false,"model":"gemini-2.5-flash"}` — the exact shape the pill/banner consume, with no key configured.
- `GET /` → `200`, serves built app (`id="root"`, `assets/index-mMhVWs3N.js`).
- Confirms the app boots and the health route responds with `geminiConfigured: false` (the demo-mode path) — no 500s, no Gemini call.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Delivers the proactive pill + demo banner exactly: `getHealth()` `api.ts:48-50`, mount-only effect `App.tsx:23-27`, pill reflects `geminiConfigured` `App.tsx:75-83`, dismissible demo banner gated `App.tsx:29` rendered before `PhotoCapture` `App.tsx:87-102`. Not adjacent. |
| Context constraints | ✓ | No key leak — grep `VITE_` / `gemini_api_key` / `process.env` over `src/` = 0 hits; `HealthResponse` carries only the `geminiConfigured` boolean. ONE fetch path — `fetch(` in components/App = 0 hits; only fetch is `api.ts:28` inside `request()`. AI-lazy honored — `/api/health` makes no Gemini call (`handlers.ts:42-44`). PWA intact — `vite.config.ts`/manifest/SW unchanged; `/api/*` still `NetworkOnly` + navigateFallbackDenylist. |
| Architecture coherence | ✓ | Extends, does not fork. `HealthResponse` (`types.ts:46-51`) mirrors the route shape; `api.ts` kept as single fetch path; the `postJson`→`request<T>()` refactor is a clean extraction (POST path behavior-identical) reused by `getHealth`; pill/banner reuse existing theme tokens + the `.banner` pattern — no parallel design system. |
| Sprawl | ✓ | `git diff --stat` = exactly the 4 `files_touched` (129 insertions, 9 deletions); `git status --porcelain` shows only those 4 + untracked `node_modules`. Zero scope creep. |
| Follow-up surfacing | ✓ | 2 observational a11y/UX items (non-blocking): pill + banner both `role="status"` double-announce on mount; pill hidden until health resolves (no in-flight signal). |

**Suggested new tickets:** 1 — filed as **TKT-144** (consolidates both follow-ups, `defer-to-backlog`, `related: [TKT-133]`).

**Reviewer notes (verbatim):** Cold whole-ticket review: PASS. Faithful, constraint-respecting (no key leakage, single fetch path preserved, AI-lazy honored since /api/health is non-Gemini, PWA precache untouched), architecturally coherent (postJson→request<T>() is a sound extraction that keeps the single-fetch-path contract whole), zero sprawl. Smoke was SKIPPED in CI (sandbox SIGKILL); supplementary runtime evidence shows /api/health returning the exact demo-mode shape the UI consumes.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — all four bullets are independently verifiable (helper exists + called once on mount; pill reflects `geminiConfigured`; dismissible demo banner when unconfigured; no Gemini call on load + smoke green + zero console errors). Bullet 4 bundles three checks but they are one coherent "lazy-AI invariant" and stay together.
- **Blockers:** ok — `depends_on: []`. `related: TKT-103` is in `5-validating/` (unmerged, different scope: action-time states) — not a build blocker.
- **Context drift:** ok — verified `server/handlers.ts:42-44` (health route, no Gemini call), `src/App.tsx:57-62` (header), `src/App.tsx:114-122` (`messageFor`/`GEMINI_KEY_MISSING`), `src/lib/api.ts` (`analyzeFridge` shape) all still present at cited lines.

**Verdict:** build-ready

### Value Hypothesis
**Lens:** New-user onboarding
**Who benefits:** First-run users and anyone running the app without a configured key.
**Why useful:** Sets honest expectations up front and saves the wasted failed round-trip
of analyzing a photo against a key that isn't there.
**Plugs in at:** `server/handlers.ts:42-44` (existing route) → new `getHealth()` in `api.ts` → `src/App.tsx:57-62`.
**Score:** value h · fit h · feasibility h · novelty h
