---
id: TKT-107
title: "Real PWA icons and offline app-shell fallback"
status: "Complete"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
completed: 2026-06-22
domain: "app"
secondary_domains:
  - infra
tags:
  - pwa
  - infra
depends_on: []
blocks: []
related: []
files_touched:
  - "vite.config.ts"
  - "index.html"
  - "package.json"
  - "scripts/gen-icons.ts"
  - "public/icon-192.png"
  - "public/icon-512.png"
  - "public/apple-touch-icon.png"
complexity: 3
implements_adr: ADR-001
next_step_hint: Human review: install the PWA and confirm the home-screen maskable icon isn't clipped, and that the shell opens with the network off.
chaos_branch: chaos/TKT-107
merged: 2026-06-22
merge_commit: b4f04a14ab95
---

### Objective
Replace the single SVG manifest icon with proper **maskable PNG icons (192 + 512)**
plus an **apple-touch-icon**, and guarantee the **app shell loads offline** (service
worker precache + navigation fallback) while keeping `/api/*` strictly `NetworkOnly`.
This hardens the "installable PWA" promise of ADR-001: a real home-screen icon that
isn't clipped by Android's maskable mask, and a shell that opens with no network.

### Context
- **Icons today** (`vite.config.ts:44-51`): the manifest ships ONE icon —
  `/icon.svg`, `sizes:"any"`, `purpose:"any maskable"`. A combined `any maskable`
  purpose is an anti-pattern: the same art is used both un-masked (looks padded) and
  masked (the rounded-corner bg in `public/icon.svg` has **transparent corners**, so
  Android's maskable mask reveals transparency). Real PNG maskable icons need a
  **full-bleed** background and content inside the ~80% safe zone.
- **`public/`** holds `icon.svg` (512 brand art) and `favicon.svg` (64 mark). The new
  PNGs are generated, committed static assets dropped here so they're copied to
  `dist/` root by Vite and reachable at `/icon-192.png` etc.
- **Offline shell is already mostly wired.** `vite-plugin-pwa` (generateSW,
  `registerType:autoUpdate`) defaults `navigateFallback` to `index.html`; the built
  `dist/sw.js` already precaches `index.html` + the hashed JS/CSS and registers a
  `NavigationRoute` bound to `index.html`. The existing `navigateFallbackDenylist:
  [/^\/api\//]` keeps API navigations out of that fallback. This ticket makes the
  fallback **explicit** (robust against plugin-default drift) and adds the new icons
  to the precache, then verifies the shell-loads-offline guarantee from `dist/sw.js`.
- **Hard rule #4 (CLAUDE.md) + ADR-001:** the manifest/SW must stay healthy and
  `/api/*` must stay `NetworkOnly` — already enforced via `runtimeCaching` in
  `vite.config.ts:27-34`; this ticket must not weaken it.
- **No global installs** (chaos guard): the rasterizer (`sharp`) is a **local
  devDependency**; the generated PNGs are committed so the production build and smoke
  need **zero** new build-time dependency.
- **`includeAssets`** (`vite.config.ts:24`) is the established way this repo adds
  static (public/) files to the Workbox precache — extend it with the new PNGs rather
  than introducing a parallel `globPatterns` config.

### Acceptance Criteria
- [x] `dist/manifest.webmanifest` lists a `192x192` and a `512x512` PNG icon, both
      `type:"image/png"` with `purpose:"maskable"` (separate from any `"any"` entry).
- [x] An `apple-touch-icon` (180×180 PNG) exists and is referenced via
      `<link rel="apple-touch-icon">` in `index.html`.
- [x] The maskable PNGs have a full-bleed (edge-to-edge, non-transparent) background
      with the brand glyph inside the safe zone (so Android masking never clips art).
- [x] `dist/sw.js` precaches `index.html` AND the new icon PNGs, and registers a
      navigation fallback to `index.html` (app shell loads with no network).
- [x] `/api/*` remains `NetworkOnly` (no precache, no navigation fallback) —
      `navigateFallbackDenylist` still excludes `/api/`.
- [x] `bun run typecheck` passes and `bun run build` succeeds (smoke gate stays green;
      headless smoke is skipped-not-failed in this environment — see Smoke Check).

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** made each bullet independently verifiable from build artifacts
  (`dist/manifest.webmanifest`, `dist/sw.js`) + source (`index.html`), rather than the
  vaguer original "manifest references … / app shell loads offline".
- **Blockers:** ok — `depends_on` empty; no live Gemini key needed (pure
  PWA-asset/SW work, no `/api` call), so this does NOT hit the missing-credential
  blocker that AI-dependent tickets do.
- **Context drift:** verified — `vite.config.ts:44-51` single SVG icon; `dist/sw.js`
  (baseline build) already `createHandlerBoundToURL("index.html")` +
  `denylist:[/^\/api\//]` + precaches `index.html`; `public/` has only the two SVGs.
- **Complexity:** re-rated → stays **3** (one new gen script + sharp devDep + 3
  committed PNGs + ~10 lines of `vite.config.ts`/`index.html` wiring; single coherent
  infra slice, no API/server/type changes). **Not** 4–5 → no decomposition.

**Verdict:** build-ready

### Out of Scope
- A full `@vite-pwa/assets-generator` pipeline / build-time icon regeneration — the
  committed-PNG approach keeps the build dependency-free (see Autonomous Decision).
- Splash screens, shortcuts, screenshots, or other richer-manifest fields.
- Precaching `/api/*` responses or any offline data caching — the proxy stays
  `NetworkOnly` by design.

### Implementation Summary

- **`scripts/gen-icons.ts`** (new) — rasterizes the brand glyph to
  `public/icon-192.png`, `public/icon-512.png` (maskable) and
  `public/apple-touch-icon.png` (180) via `sharp`. The maskable source is a
  full-bleed gradient square (no rounded corners → no transparent corners) with the
  `icon.svg` glyph scaled to **0.8 about the centre**, keeping all art inside the
  maskable safe zone. Added `"gen-icons"` to `package.json` scripts and `sharp` as a
  **devDependency** (local install only).
- **`public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`**
  (new, committed) — generated assets; the build needs no rasterizer.
- **`vite.config.ts`** — manifest `icons` now: `icon.svg` `purpose:"any"` + the two
  PNGs `purpose:"maskable"` (split, not the old combined `"any maskable"`). Added the
  three PNGs to `includeAssets` (precache). Set `workbox.navigateFallback:
  "index.html"` explicitly (offline app-shell), keeping `navigateFallbackDenylist:
  [/^\/api\//]` and the `/api/*` `NetworkOnly` route untouched.
- **`index.html`** — added `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`.

**Verification (build artifacts):** `bun run build` → precache **10 entries** (was 7;
+3 PNGs). `dist/manifest.webmanifest` lists 192×192 + 512×512 PNG `maskable`.
`dist/sw.js` precaches `index.html` + `icon-192/512.png` + `apple-touch-icon.png`,
`createHandlerBoundToURL("index.html")` nav fallback, `denylist:[/^\/api\//]`,
`NetworkOnly` for `/api`. Generated PNG corners sampled opaque `rgba(22,163,74,255)`
(full-bleed, no transparency). `bun run typecheck` clean.

**Deviations from plan:** none.

**Implementation notes:** the offline navigation fallback was already the
vite-plugin-pwa default; it is now set explicitly so a future plugin-default change
can't silently regress offline launch. One maskable source SVG is reused for all
three PNGs (apple-touch is masked/rounded by iOS, so the full-bleed padded art is
also correct there).

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** How to produce the maskable PNG icons under the "no global installs"
constraint without adding a build-time dependency?

**Options considered:**
- **A — `sharp` devDependency + a small `gen-icons` script + committed PNGs** —
  rasterize once, check the PNGs in; the production build/smoke depend on nothing new.
- **B — `@vite-pwa/assets-generator`** — official PWA tool, config-driven, but adds a
  build-time tool + config surface and re-rasterizes on every build.
- **C — hand-authored static PNGs, no generator/dep** — zero deps, but unreproducible
  and the maskable safe-zone padding is easy to get wrong by hand.

**Chosen:** A — keeps `vite build` dependency-free (PNGs are committed; `sharp` is a
*local devDep* run only on demand — `scripts/gen-icons.ts`), is reproducible on brand
changes, and adds no build-time config (honors CLAUDE.md hard-rule #4 + the
no-global-install chaos guard). B's per-build rasterization and extra config aren't
justified for three static icons; C loses reproducibility and risks clipping.
**Reversibility:** easy — swapping to B later is contained to `scripts/` + devDeps;
the committed PNG filenames + manifest `icons` entries are the stable contract.

### Smoke Check

**Headless Chromium:** app **rendered clean**, run teardown SIGKILLed (environmental).

Ran `bun .weave/scripts/smoke.ts --ticket TKT-107 --cwd <worktree>` (browsers ARE
provisioned here). The harness booted the **worktree** production build, navigated
`/`, the `.app` ready-selector became visible, the 2.5s settle window elapsed, and
the spinner/blank checks ran — then it captured
`.weave/cache/smoke/TKT-107/root.png`, which shows the fully-rendered capture screen
("What's in the fridge?" + "Take / choose a photo", no white-screen, no error state).
The process was then SIGKILLed (exit 137) during browser/server **teardown**, after
the screenshot, so `result.json` wasn't written — an environment kill, not an app
failure. The same app runtime smoked against the **main repo** (no `--cwd`) exited
**0 (pass)**, and this change adds **no runtime JS** (manifest/SW/icons/`<head>`
only). Net: zero console/runtime errors observed; the PWA build is healthy.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, independent — re-ran its own build)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 192 & 512 PNG `maskable` in manifest, split from `"any"` | ✓ | `dist/manifest.webmanifest` icons: `icon.svg` `purpose:"any"` + `icon-192.png` (192x192, png, maskable) + `icon-512.png` (512x512, png, maskable). No `"any maskable"` string anywhere — anti-pattern that existed on `main` is fixed. |
| apple-touch-icon 180×180 PNG, linked in HTML | ✓ | `dist/`+`public/apple-touch-icon.png` (4160 B, identical); sharp metadata **180×180**; `index.html:6` + `dist/index.html:6` `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`. |
| Maskable PNGs full-bleed opaque bg, exact dims | ✓ | sharp top-left pixel: `icon-192.png` → **rgba 22,163,74,255** (192×192); `icon-512.png` → **rgba 22,163,74,255** (512×512). Alpha=255 (opaque); corner = theme green #16a34a → full-bleed. |
| sw.js precaches index.html + 3 PNGs + nav fallback | ✓ | `dist/sw.js` precache has `{url:"index.html"}`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`; `NavigationRoute(createHandlerBoundToURL("index.html"),{denylist:[/^\/api\//]})`. |
| `/api/*` stays NetworkOnly, excluded, not precached | ✓ | `dist/sw.js`: `denylist:[/^\/api\//]` + `registerRoute(({url})=>url.pathname.startsWith("/api/"),new NetworkOnly,"GET")`. Precache scan for `*api*` → none. |
| typecheck=0, build=0 | ✓ | `tsc --noEmit` exit 0; `vite build` exit 0, `precache 10 entries (151.78 KiB)` (independently recounted = 10). |

**Sanity (secrets / data-path):** ✓ — `grep -rniE 'GEMINI\|VITE_*KEY\|apiKey' src/` → only UI copy + the `GEMINI_KEY_MISSING` error-code constant; **no key / no `VITE_` secret** added. No new `fetch` in components; only `src/lib/api.ts:27` (untouched). Change confined to `index.html`, `vite.config.ts`, `package.json`, new `public/*.png` + `scripts/gen-icons.ts` — pure PWA-asset/config.

**Commands run:** `bun run typecheck`, `bun run build`, `cat dist/manifest.webmanifest`, sharp metadata + corner-pixel sampling on all 3 PNGs, `dist/sw.js` precache/nav/NetworkOnly greps, `grep -rn` secret/fetch scan, `git diff main`.

**Notes:** No AC-implied bug or follow-up. Static check can't prove the glyph sits inside the ~80% safe zone (the AC is full-bleed opaque bg, which is satisfied) — but it does, by construction: the source glyph is scaled to 0.8 about centre. No regression to the installable manifest or `/api` NetworkOnly contract.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent;
formed its own evidence from `dist/` + decoded pixels + `git diff main`)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Split manifest icons (`icon.svg` any + 192/512 png maskable), `apple-touch-icon.png` 180² linked, `dist/sw.js` precaches all 3 PNGs + `index.html` (10 entries, was 7) + `NavigationRoute(createHandlerBoundToURL("index.html"))`, PNG corners decoded alpha=255 (genuinely full-bleed), `/api/` `NetworkOnly`. |
| Context / hard rules (4/4) | ✓ | #1 no `gemini`/`VITE_`/`process.env`/key reference in the diff; `src/`+`server/` untouched. #2 no new `fetch(`; `src/lib/api.ts` untouched. #3 asset/config only — zero runtime JS, no on-load Gemini call. #4 manifest well-formed, `sw.js` builds, `navigateFallbackDenylist:[/^\/api\//]` intact, `/api/*` not precached. |
| Architecture coherence | ✓ | Extended the existing `includeAssets` precache list (did NOT fork a parallel `globPatterns`/cache config); left `runtimeCaching` `/api`→`NetworkOnly` + denylist untouched. `sharp` correctly a **devDependency** (PNGs committed → `vite build` dependency-free), consistent with ADR-001 + no-global-install guard. No `server/`/`types.ts`/`api.ts`/`/api` shape changes. Manifest split (`any` SVG + `maskable` PNGs) is correct PWA convention and fixes the prior `any maskable` anti-pattern. "Textbook contract-extension, not a fork." |
| Sprawl | ✓ | Tracked changes exactly the intended set (`index.html`, `package.json`, `vite.config.ts`, `scripts/gen-icons.ts`, `public/{icon-192,icon-512,apple-touch-icon}.png`). No stray source edits. Flagged the worker's `.chaos-tmp/` scratch as must-not-commit (since resolved — dir removed by the worker before finishing). |
| Follow-up surfacing | ✓ | No blocking follow-up; two optional hardening ideas recorded below. |

**Architecture verdict:** the key coherence test was whether the precache extension
used the documented `includeAssets` mechanism or invented a competing Workbox config —
it correctly extended `includeAssets` and left the `/api`→`NetworkOnly` route and
`navigateFallbackDenylist` intact. `sharp` is correctly scoped as a devDependency so
it never reaches the runtime/client surface. No parallel/second way of doing an
already-established thing was introduced.

**Suggested new tickets (optional, NOT filed — recorded for human triage):**
- *(low)* A non-maskable raster `purpose:"any"` PNG (192/512) for the few launchers
  that reject SVG icons outright — today the only `"any"` entry is the SVG. Covered for
  common targets by the maskable PNGs + apple-touch; nice-to-have, not a gap.
- *(low)* A behavioral offline test (load the shell with the network disabled in
  headless Chromium) to lock the offline-launch guarantee behaviorally rather than via
  `dist/sw.js` static inspection. Static evidence is strong; this is hardening.

**Blocking issues:** none.
