---
id: TKT-146
title: "Deterministic test for the Web Share Target POST->cache->consume round-trip"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains:
  - infra
tags:
  - tests
  - pwa
depends_on: [TKT-134]
blocks: []
related: [TKT-134]
files_touched: []
next_step_hint: Land TKT-134 to main first - its share-target code exists on no branch; then build this test against it.
complexity: 2
chaos_unstick_count: 1
---

## Objective
Add a committed, deterministic check that exercises the inbound Web Share Target
round-trip end to end — the OS POST to `/share-target` is intercepted by the service
worker, the image is cached, the app is redirected to `/?share-target`, and the launch
read consumes the image — so this OS-level entry point (TKT-134) is protected from
regression.

## Context
TKT-134 shipped the share target: `public/share-target-sw.js` (SW `fetch` handler that
caches `formData.get("image")` and 303s to `/?share-target`), `src/lib/shareTarget.ts`
(`consumeSharedImage()`), and the `App.tsx` launch effect. During TKT-134's chaos run the
full `.weave/scripts/smoke.ts` harness was **SIGKILLed (exit 137)** in the sandbox, so the
end-to-end share flow was only verified by a one-off, ad-hoc Playwright drive (proving:
SW caches the POSTed image + 303s; launching `/?share-target` consumes it, strips the
param back to `/`, deletes the cache entry, and fires analyze). There is no committed
guard, so a future SW/manifest change could silently break the round-trip.

The smoke config (`weave.config.json`) only loads `/`, which deliberately does NOT
exercise the share path (it must stay a no-op there per CLAUDE.md hard rule #3). So this
needs its own targeted check, not a new smoke route.

## Acceptance Criteria
- [ ] A committed test (or a `.weave`-style script) boots the production build, registers
      the SW, POSTs a small image to `/share-target`, and asserts: the response 303-redirects
      to `/?share-target` and Cache Storage (`freat-share-target` / key `/__shared-image`)
      holds the image.
- [ ] It then launches `/?share-target` and asserts the app consumes the image — URL is
      stripped back to `/` and the cache entry is deleted.
- [ ] The check exercises only localhost and needs no Gemini key (a keyless analyze →
      graceful 503 banner is an acceptable terminal state for the assertion).
- [ ] It is robust to the sandbox SIGKILL seen in TKT-134 (e.g. serve a pre-built `dist/`
      separately and drive a minimal headless Chromium, rather than the full harness boot).

### Out of Scope
- The cosmetic precache-entry cleanup for `public/share-target-sw.js` (separate triage note).
