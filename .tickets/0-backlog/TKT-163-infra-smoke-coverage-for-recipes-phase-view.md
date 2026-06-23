---
id: TKT-163
title: "Smoke coverage for the recipes-phase view (incl. remix affordance)"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "infra"
secondary_domains: ["app"]
tags:
  - tests
  - infra
depends_on: []
blocks: []
related: [TKT-131]
files_touched:
  - "weave.config.json"
  - ".weave/scripts/smoke.ts"
complexity: 3
---

## Objective
The headless smoke harness only drives `/` (`weave.config.json` `smoke.routes: ["/"]`).
The recipes-phase view — and therefore the TKT-131 remix UI, Cook Mode, and the shopping
list — is a client-state phase reached only *after* a keyed `analyze` call, so it is never
headless-checked even when Playwright is provisioned. Add a way for smoke to reach (a
mocked/seeded) recipes phase so runtime/console errors in that view are caught.

## Context
- Smoke config: `weave.config.json` `smoke` block (`start`, `url`, `routes: ["/"]`).
- Harness: `.weave/scripts/smoke.ts` — boots the app, drives Chromium over `routes`, fails
  on console errors / pageerror / failed requests / stuck spinners / blank body.
- The recipes phase needs `recipes: Recipe[]` populated; today that requires a live Gemini
  `analyze` + `recipes` round-trip (`src/App.tsx` `phase` state machine), which smoke can't
  do without a key.
- Options to evaluate: a dev-only query param / seed hook that injects sample recipes and
  jumps `phase` to `recipes`; or a mockable `/api/*` fixture mode the smoke `start` command
  enables. Pick the least-invasive that keeps production behavior unchanged.

## Acceptance Criteria
- [ ] Smoke can render the recipes-phase view without a live Gemini key (seeded/mocked state), via a mechanism that is inert in production.
- [ ] A new smoke route (or seeded step) exercises the recipes view and asserts zero console errors / pageerror, including the remix chips + nudge being present.
- [ ] `bun .weave/scripts/smoke.ts` still passes on `/` and the new path when browsers are provisioned; it still no-ops gracefully when they are not.
- [ ] No production behavior change: the seed/mock path is gated to the smoke/dev context only.

### Why this was spawned mid-stack

**Parent ticket:** TKT-131
**Trigger source:** validation-time
**What was discovered:** TKT-131's smoke check could only observe `/`; the remix affordance lives on the recipes phase, which smoke cannot reach without a keyed analyze, so the feature's runtime view is unverified by the deterministic gate (`weave.config.json` `routes: ["/"]`).
**Ordering decision:** defer-to-backlog
**Rationale:** A test-infra enhancement spanning multiple future features (not just remix); decoupled from landing TKT-131 and larger than a same-ticket fix.
