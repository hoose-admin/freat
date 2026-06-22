---
id: TKT-122
title: "Unit tests for recipe-preferences pure functions"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains: []
tags:
  - tests
  - ai-proposed
depends_on: [TKT-106]
blocks: []
related: [TKT-106, TKT-121]
files_touched: []
complexity: 2
next_step_hint: Answer the Stuck Reason: land TKT-106 to main, then re-dispatch — the helpers don't exist on this branch's base.
chaos_unstick_count: 1
---

### Objective
Lock in the preferences request-shaping + session-persistence logic introduced by
TKT-106 with fast unit tests. `cleanPreferences` (drops empty fields → `undefined`)
and `loadPreferences` (sanitizes stale/malformed sessionStorage JSON) are pure,
edge-case-y, and currently covered only by a static trace + `bun run typecheck`.

### Context
- Introduced by TKT-106. Both helpers currently live as **module-private** functions
  at the bottom of `src/App.tsx` (`cleanPreferences`, `loadPreferences`) and are not
  exported — testing them requires extracting them into a small `src/lib/preferences.ts`
  (and importing back into App), or exporting them. Prefer the extraction: it mirrors
  the `src/lib/*` home of the other pure logic (`savedRecipes.ts`).
- The repo has no test runner wired yet — only `bun run typecheck` + the headless
  smoke. Bun ships `bun test`, so this adds zero dependencies. See sibling TKT-121
  (savedRecipes tests) for the same approach; consider sharing a `"test"` script.
- `loadPreferences` reads global `sessionStorage`; the test can install an in-memory
  `globalThis.sessionStorage` shim (Map-backed) before importing, the same shim
  pattern TKT-121 uses for `localStorage`.
- Cases worth covering: `cleanPreferences({})` → `undefined`; `{dietary:[]}` → `undefined`;
  `{maxTimeMinutes:0}` → `undefined`; a populated object round-trips its fields;
  `loadPreferences()` returns `{}` for missing / malformed / throwing store and
  filters non-string dietary entries / drops `maxTimeMinutes <= 0`.

### Acceptance Criteria
- [ ] `cleanPreferences` and `loadPreferences` are unit-testable (extracted to `src/lib` or exported) and `bun run typecheck` still passes.
- [ ] A `bun test` suite exercises the empty-omission, populated round-trip, and malformed/throwing-store cases listed above, and passes.

### Why this was spawned mid-stack

**Parent ticket:** TKT-106
**Trigger source:** validation-time
**What was discovered:** The pure preferences helpers (`App.tsx` cleanPreferences/loadPreferences) carry the AC#4 "no empty noise" + AC#5 "no console error on malformed store" guarantees but have no automated test; the repo has no test runner wired.
**Ordering decision:** defer-to-backlog
**Rationale:** Test-infra investment that outlives TKT-106 and shares setup with TKT-121; not required to ship the feature, which is verified by typecheck + static trace.
