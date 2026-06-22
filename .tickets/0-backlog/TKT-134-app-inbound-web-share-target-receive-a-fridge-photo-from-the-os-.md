---
id: TKT-134
title: "Inbound Web Share Target — receive a fridge photo from the OS share sheet"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains:
  - infra
tags:
  - feature
  - ai-proposed
  - pwa
depends_on: []
blocks: []
related: [TKT-107, TKT-109]
files_touched:
  - "public/share-target-sw.js"
  - "src/App.tsx"
  - "src/lib/shareTarget.ts"
  - "vite.config.ts"
complexity: 3
next_step_hint: Human review: install the PWA, share a photo from the OS sheet into Freat, confirm it opens pre-loaded and analyzes.
implements_adr: ADR-001
---

## Objective
Make Freat a **Web Share Target** for images: register the PWA so it appears in the OS
share sheet, and when a user shares a fridge photo *into* Freat (Camera/Photos →
Share → Freat), the app opens pre-loaded with that image and runs the existing analyze
flow — skipping in-app capture entirely.

## Context
The inverse of the outbound recipe share (TKT-109) and a genuinely new OS-level entry
point. Image share targets require a **POST `multipart/form-data`** to a manifest-declared
`action`, which only a **service-worker fetch handler** can receive — there is no
client-JS-only path.

**This worktree branched from `main`, so the offline-shell hardening in TKT-107 is on a
separate, unmerged branch and is NOT present here.** The baseline SW config in this
branch is the foundation one (`vite.config.ts:22-53`): `generateSW` strategy,
`navigateFallbackDenylist: [/^\/api\//]` (line 28), and an `/api/*` `NetworkOnly`
runtime-caching route (lines 29-34); `navigateFallback` is the plugin default
(`index.html`). The chosen approach must preserve that offline app-shell **regardless of
TKT-107 merge order** (see Autonomous Decision).

**Approach (extend, don't fork the SW):**
- **Manifest** (`vite.config.ts`, the `manifest` block ~lines 36-52): add a typed
  `share_target` (`ManifestOptions.share_target` is first-class in vite-plugin-pwa
  0.21.2) — `action: "/share-target"`, `method: "POST"`,
  `enctype: "multipart/form-data"`, `params.files: [{ name: "image", accept: ["image/*"] }]`.
- **Service worker** (`vite.config.ts`, `workbox` block): add
  `importScripts: ["share-target-sw.js"]`. Workbox injects `importScripts(...)` at the
  TOP of the generated `sw.js` (before route registration —
  `node_modules/workbox-build/build/templates/sw-template.js:23-27`), and the Workbox
  Router only matches **GET** requests, so a POST navigation to `/share-target` is handled
  solely by the custom listener with no collision against precache / nav-fallback / `/api`
  routes. This leaves the entire generated SW (precache, `navigateFallback`,
  `navigateFallbackDenylist`, `/api`->`NetworkOnly`) byte-for-byte intact.
- **`public/share-target-sw.js`** (new, committed classic script): a `fetch` listener
  that, for `POST /share-target`, reads `formData.get("image")`, stashes it in Cache
  Storage under a fixed key, and returns `Response.redirect("/?share-target", 303)`.
- **`src/lib/shareTarget.ts`** (new): one helper `consumeSharedImage(): Promise<string | null>`
  that — only when the launch URL carries the `?share-target` param — reads the cached
  blob, returns it as a `data:` URL (the same shape `FileReader` produces in
  `src/components/PhotoCapture.tsx:26-31`), deletes the cache entry, and clears the param.
  The cache name / key / param string are the shared contract between this file and
  `public/share-target-sw.js` (cross-referenced in comments in both).
- **`src/App.tsx`**: a mount `useEffect` that calls `consumeSharedImage()` and, on a
  non-null result, feeds the data URL into the existing `handlePhoto` (`src/App.tsx:18`)
  -> `analyzeFridge`. No `/api` change — reuses `analyzeFridge`.

**Hard-rule alignment:** No new `fetch` in components and no Gemini key in `src/`
(rules #1/#2 untouched — this is a Cache-Storage<->page bridge, not a network route, so it
does NOT belong in `src/lib/api.ts`). Rule #3 (AI is lazy) holds: with no `?share-target`
param the effect is a pure no-op, so a plain `/` load (the smoke route) fires zero Gemini
calls and zero console errors; Gemini runs only after a real user share — a user action.
Rule #4 holds: `/api/*` stays out of precache and `NetworkOnly`; the SW is extended, not
forked.

## Acceptance Criteria
- [ ] `dist/manifest.webmanifest` contains a `share_target` with `method:"POST"`,
      `enctype:"multipart/form-data"`, `action:"/share-target"`, and
      `params.files[0]` = `{ name:"image", accept:["image/*"] }`.
- [ ] `dist/sw.js` calls `importScripts(...)` referencing `share-target-sw.js`, and that
      `importScripts` line appears **before** the `precacheAndRoute` / `NavigationRoute`
      registrations (so the custom POST handler is registered first).
- [ ] `dist/sw.js` still registers the `index.html` navigation fallback with
      `denylist:[/^\/api\//]` and keeps `/api/*` `NetworkOnly` — the offline app-shell and
      `/api` rule are unchanged by this ticket.
- [ ] `dist/share-target-sw.js` exists, adds a `fetch` listener that for a
      `POST` to `/share-target` reads `formData.get("image")`, writes it to Cache Storage,
      and responds with a `303` redirect to `/?share-target`.
- [ ] `src/App.tsx` reads the shared image at launch via `consumeSharedImage()` and routes
      a non-null result into `handlePhoto`; with **no** `?share-target` param the call is a
      no-op (no Cache read side effects, no Gemini call).
- [ ] `bun run typecheck` passes and `bun run build` succeeds; the headless smoke of `/`
      shows zero console errors with no Gemini key (Gemini is never called on plain load).

### Value Hypothesis
**Lens:** Integration / ecosystem
**Who benefits:** Mobile users who already live in the OS share sheet.
**Why useful:** Creates a new, frictionless OS-level entry point into the app — the
boldest reach toward feeling like a native, installed kitchen tool.
**Plugs in at:** `vite.config.ts` manifest · `public/share-target-sw.js` · `src/lib/shareTarget.ts` · `src/App.tsx` -> existing `handlePhoto` flow.
**Score:** value h · fit h · feasibility m · novelty h

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — the 6 bullets are already independently verifiable from build
  artifacts (`dist/manifest.webmanifest`, `dist/sw.js`, `dist/share-target-sw.js`) + source
  (`src/App.tsx`) + commands (`bun run typecheck`/`build`/smoke). Each names a concrete
  string/structure to grep or a behavior to assert.
- **Blockers:** ok — `depends_on` empty. `related:[TKT-107, TKT-109]` are both in
  `5-validating/` (non-blocking). The approach is deliberately independent of TKT-107's
  unmerged offline-shell work (importScripts is purely additive to the generated SW).
- **Context drift:** ok — verified every cite cold: `vite.config.ts:28`
  `navigateFallbackDenylist`, `:29-34` `/api` `NetworkOnly`, manifest block `:36-52`;
  `workbox-build/.../sw-template.js:23-27` injects `importScripts` at top; vite-plugin-pwa
  **0.21.2** types `ManifestOptions.share_target` + `GenerateSWOptions.importScripts`;
  `PhotoCapture.tsx:26-31` FileReader data-URL; `App.tsx:18` `handlePhoto`. Bun server has
  an SPA fallback (`server/index.ts`) so a pre-SW GET to `/share-target` 200s index.html.
- **Complexity:** re-rated → stays **3**. One coherent, tightly-coupled slice (manifest
  action ↔ SW handler ↔ launch read share one contract: route/cache-name/key/param) across
  `vite.config.ts` + one new static SW fragment + one new ~25-line helper + a small
  `App.tsx` effect. Tightly coupled → must stay one ticket; **not** 4–5, no decomposition.

**Verdict:** build-ready

### Out of Scope
- Switching the PWA to the `injectManifest` SW strategy (rejected — see Autonomous Decision).
- Sharing *text/url* into Freat, or outbound sharing (that is TKT-109).
- Multi-file share (only the first shared image is analyzed).

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** How to receive the Web Share Target POST in the service worker without rewriting the generated SW (and risking the offline app-shell)?

**Options considered:**
- **A — `generateSW` + `workbox.importScripts: ["share-target-sw.js"]`** — layer one custom `fetch` listener onto the existing auto-generated SW; precache / nav-fallback / `/api` config untouched.
- **B — switch to the `injectManifest` strategy + author a full `src/sw.ts`** — total control, but reimplements precaching, the `index.html` navigation fallback, and the `/api`→`NetworkOnly` route by hand, with a real chance of regressing the offline shell.
- **C — a GET-based / non-SW transport** — impossible: image share targets are spec'd as `POST multipart/form-data`, which only a service-worker `fetch` handler can receive.

**Chosen:** A. Evidence: Workbox injects `importScripts(...)` at the TOP of the generated `sw.js`, before any route registration (`node_modules/workbox-build/build/templates/sw-template.js:23-27`), and the Workbox Router only matches **GET** requests — so the POST navigation to `/share-target` is handled solely by the custom listener and never collides with the precache / `NavigationRoute` / `/api` routes. Verified in the built artifact (`dist/sw.js`): `importScripts("share-target-sw.js")` precedes `precacheAndRoute(...)`, `NavigationRoute(createHandlerBoundToURL("index.html"),{denylist:[/^\/api\//]})`, and `registerRoute(.../api/...,NetworkOnly,"GET")` — all of which are preserved byte-for-byte. This keeps the change purely additive and independent of TKT-107's unmerged offline-shell work. It also sets the repo pattern for any future custom-SW need (push, background sync): extend the generated SW via `importScripts`, don't fork it.
**Reversibility:** easy — remove the `importScripts` entry + the `share_target` manifest block + `public/share-target-sw.js` + `src/lib/shareTarget.ts` and the one `App.tsx` effect; nothing else depends on them.

### Implementation Summary

- **`vite.config.ts`** — added a typed `manifest.share_target` (`action:"/share-target"`, `method:"POST"`, `enctype:"multipart/form-data"`, `params.files:[{name:"image",accept:["image/*"]}]`) and `workbox.importScripts:["share-target-sw.js"]`. No change to `navigateFallbackDenylist`, the `/api`→`NetworkOnly` route, or `includeAssets`.
- **`public/share-target-sw.js`** (new, committed classic script) — a `fetch` listener that, for a `POST` to `/share-target`, reads `formData.get("image")`, stores it in Cache Storage (`freat-share-target` / key `/__shared-image`), and returns a `303` redirect to `/?share-target`. Returns early (no `respondWith`) for everything else, so all GET routing still flows to Workbox.
- **`src/lib/shareTarget.ts`** (new) — `consumeSharedImage()` reads the cached blob back as a `data:` URL (same shape as PhotoCapture's FileReader), deletes the cache entry, and clears the `?share-target` param. Short-circuits to `null` BEFORE touching Cache Storage when the param is absent — so a plain load has zero side effects. Cache name / key / param are the documented contract shared with the SW script.
- **`src/App.tsx`** — a mount `useEffect` calls `consumeSharedImage()` and routes any non-null result into the existing `handlePhoto` → `analyzeFridge` flow. No `/api` change; no new component `fetch`.

**Deviations from plan:** None — implementation matched the staged plan.

**Implementation notes:**
- Hard rules honored: no Gemini key in `src/` (#1); no component `fetch` and no new `/api` path — the Cache-Storage↔page bridge correctly lives outside `src/lib/api.ts` (#2); Gemini is never called on a plain load, only after a real user share (#3); `/api/*` stays out of precache + `NetworkOnly`, SW extended not forked (#4).
- Behavioral verification (provisioned headless Chromium against the prod server): plain `/` → 200, app rendered, **zero console/page errors**, URL stayed `/`. Full share flow → SW caches the POSTed image + 303s to `/?share-target`; launching that URL consumes the image, strips the param back to `/`, deletes the cache entry, and fires analyze (keyless → graceful 503 banner).
- The full `.weave/scripts/smoke.ts` harness is SIGKILLed (exit 137) in this sandbox during boot (build+serve+Chromium resource pressure) — an environment kill, not an app failure (same as TKT-107). The split check above (pre-built `dist/` served separately + a minimal Chromium pass) provides the equivalent runtime evidence.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, independent — re-ran its own typecheck/build + decoded `dist/`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Manifest `share_target` (POST/multipart/action/files[0]) | ✓ | `dist/manifest.webmanifest`: `"share_target":{"action":"/share-target","method":"POST","enctype":"multipart/form-data","params":{"files":[{"name":"image","accept":["image/*"]}]}}` — exact. |
| `importScripts(...)` before route registration | ✓ | Minified `dist/sw.js` char offsets: `importScripts("share-target-sw.js")` @625 < `precacheAndRoute` @699 < `new e.NavigationRoute` @1257. (The `importScripts` @212 is the AMD define-shim, not the share import.) |
| Nav fallback + `denylist:[/^\/api\//]` + `/api` NetworkOnly intact | ✓ | `dist/sw.js`: `new e.NavigationRoute(e.createHandlerBoundToURL("index.html"),{denylist:[/^\/api\//]})` then `registerRoute(({url:e})=>e.pathname.startsWith("/api/"),new e.NetworkOnly,"GET")`. |
| `dist/share-target-sw.js`: POST handler caches + 303 | ✓ | Byte-identical to source: guard `method!=="POST"\|\|pathname!=="/share-target"`; `formData()` → `form.get("image")` → `caches.open`+`cache.put`; `Response.redirect(new URL("/?share-target",self.location.origin).href,303)`. |
| `App.tsx` consumes at launch; no-op (no Gemini) when no param | ✓ | `src/App.tsx:22-31` mount effect → `consumeSharedImage().then(d => d && handlePhoto(d))`; `src/lib/shareTarget.ts:28` `if(!params.has(SHARE_PARAM)) return null;` returns BEFORE `caches.open` (:36) — no cache read, no analyze on plain load. |
| typecheck + build pass; zero console errors on `/` keyless | ✓ | `bun run typecheck` exit 0; `bun run build` exit 0 (`built in 193ms`, generateSW). Headless Chromium on `/` (no key): HTTP 200, app rendered, URL stayed `/`, **0** console errors / pageerrors / failed requests. |

### Smoke Check

**Headless Chromium:** SKIPPED (full `.weave/scripts/smoke.ts` SIGKILLed — exit 137 — on boot; documented sandbox resource kill, not an app failure) — with direct runtime corroboration instead.

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| `/` | ✓ | 0 | 0 | 0 | Pre-built `dist/` served on :8799, provisioned headless Chromium; app rendered ("What's in the fridge?"), URL stayed `/`, `geminiConfigured:false`. |

**Captured console errors (verbatim):** none on `/`.

(Separately, an explicit end-to-end share-flow drive confirmed: the SW intercepts the `POST /share-target`, caches the image (`image/png`, 69 B), and 303s to `/?share-target`; launching that URL consumes the image, strips the param back to `/`, deletes the cache entry, and fires analyze — keyless → the graceful "no Gemini key" banner. The only console line in THAT flow is the expected `503` from the deliberate keyless analyze, which does not occur on the plain `/` smoke route.)

**Commands run:** `git diff`, `bun run typecheck`, `bun run build`, decode `dist/manifest.webmanifest` + `dist/sw.js` + `dist/share-target-sw.js`, `bun .weave/scripts/smoke.ts --ticket TKT-134` (→137 skipped), prod-server + headless-Chromium `/` drive.

**Notes:** All 6 ACs pass with concrete evidence re-derived cold. vite-plugin-pwa is v0.21.2 as assumed. `dist/share-target-sw.js` is a verbatim copy of `public/share-target-sw.js`. Nothing unverifiable.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent; formed its own evidence from the working-tree diff + decoded `dist/` + ADR-001 / CLAUDE.md)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Manifest gains a valid image `share_target`; `public/share-target-sw.js` POST handler caches the file + 303s to `/?share-target`; `shareTarget.ts:consumeSharedImage()` reads it back as a `data:` URL on launch, deletes it, clears the param; `App.tsx:22-31` feeds a non-null result into the existing `handlePhoto`→`analyzeFridge`. The OS-shared photo opens pre-loaded and analyzes — no drift. |
| Context constraints (hard rules 1–4) | ✓ | #1 no Gemini key / no `VITE_` in the diff. #2 no component `fetch`, no new `/api`; the Cache-Storage↔page bridge correctly lives in `shareTarget.ts` (a cache read, not a network call), NOT `api.ts` — `api.ts`/`types.ts`/`handlers.ts` untouched. #3 launch effect is a true no-op without the param (`shareTarget.ts:28` returns null before any `caches.open`). #4 `dist/sw.js` keeps `NavigationRoute(...,{denylist:[/^\/api\//]})` + `/api`→`NetworkOnly` byte-intact; SW EXTENDED via `importScripts`, not forked to injectManifest. |
| Sprawl | ✓ | Working-tree diff (ex-`node_modules`) is exactly the 4 declared files: `M src/App.tsx`, `M vite.config.ts`, `?? public/share-target-sw.js`, `?? src/lib/shareTarget.ts`. No `server/` or contract-module edits. |
| Follow-up surfacing | ✓ | One benign observation: `public/share-target-sw.js` is also globbed into the precache manifest (harmless — it's a static script `importScripts` loads on SW install; NOT a rule-#4 `/api` violation). Two optional follow-ups recorded below. |

**Architecture coherence:** ✓ — Honors ADR-001: PWA stays `generateSW`, Gemini still only via `/api/*` through `src/lib/api.ts` (reuses `analyzeFridge`, no new route), key never client-side. The Autonomous Decision correctly rejected the `injectManifest` fork (which would hand-reimplement precache/nav-fallback/`/api` and risk the offline shell) and instead extends the generated SW via `workbox.importScripts` — a purely additive layer verified byte-intact in `dist/sw.js`. The launch-bridge module is a legitimately separate concern (Cache-Storage read, not an `/api` fetch), so keeping it out of `api.ts` respects rather than forks the single-data-path contract. "Sets a coherent repo pattern for future custom-SW needs." No parallel/conflicting pattern introduced.

**Suggested new tickets (for human triage):**
- *(defer)* Deterministic test/smoke asserting the `share_target` POST→cache→consume round-trip — the full smoke harness was SIGKILLed in the sandbox and the end-to-end share flow was only verified by a one-off Chromium drive; a committed check would protect this OS-entry-point from regression. **→ filed to `0-backlog/` (see new ticket).**
- *(defer, not filed — cosmetic)* Exclude `public/share-target-sw.js` from the Workbox precache manifest (`globIgnores`) — it's already loaded via `importScripts`, so the precache entry is redundant though harmless. Recorded here for triage; below the bar for a standalone ticket.

**Blocking issues:** none.
