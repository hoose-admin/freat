---
id: TKT-121
title: "Unit tests for savedRecipes pure functions"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains: []
tags:
  - tests
  - ai-proposed
depends_on: [TKT-104]
blocks: []
related: [TKT-104]
files_touched: []
complexity: 2
next_step_hint: Answer the Stuck Reason: blocked on TKT-104 (src/lib/savedRecipes.ts) not yet landed on main.
chaos_unstick_count: 1
---

### Objective
Lock in the behavior of the saved-recipes store with fast unit tests. The
functions in `src/lib/savedRecipes.ts` (`recipeKey`, `isSaved`, `saveRecipe`,
`removeRecipe`, `loadSaved`) are pure, dedup-by-normalized-title logic and are
currently covered only ad hoc.

### Context
- Introduced by TKT-104. The repo has no test runner wired yet — only `bun run
  typecheck` + the headless smoke. Bun ships a built-in test runner (`bun test`),
  so this can be added with zero new dependencies; consider adding a `"test"` script
  to `package.json`.
- The functions read/write global `localStorage`; the test can install an in-memory
  `globalThis.localStorage` shim (Map-backed) before importing the module — the same
  approach the TKT-104 test step used to prove the round-trip (13/13 assertions).
- Cases worth covering: dedupe (save same normalized title twice → length 1),
  isSaved by normalized title, remove, `loadSaved()` returns `[]` for missing /
  malformed / throwing store.

### Acceptance Criteria
- [ ] A `bun test` suite exercises recipeKey/isSaved/saveRecipe/removeRecipe/loadSaved
      including the dedupe and malformed-store cases, and passes.
- [ ] A `"test"` script is available (or documented) so the suite runs with one command;
      `bun run typecheck` still passes.

### Why this was spawned mid-stack

**Parent ticket:** TKT-104
**Trigger source:** validation-time
**What was discovered:** The pure savedRecipes helpers are trivially testable but uncovered, and the repo has no test runner wired.
**Ordering decision:** defer-to-backlog
**Rationale:** Test-infra investment that outlives TKT-104; not required to ship the feature.
