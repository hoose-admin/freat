---
id: TKT-143
title: "Persist chosen servings across session and reload"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - frontend
depends_on: [TKT-130]
blocks: []
related: [TKT-106]
files_touched: []
complexity: 2
next_step_hint: Land TKT-130 (introduces the servings state) to main, then re-queue TKT-143 — the base branch has no servings to persist yet.
chaos_unstick_count: 1
---

## Objective
Persist the user's chosen recipe **servings** across the session (and a same-tab
reload), so a returning cook doesn't re-enter their headcount every time. Today
`servings` is local `App.tsx` state that resets to the default (4) on `reset()`.

## Context
Spawned from TKT-130 (scale recipes by servings). That ticket added
`RecipePreferences.servings` and a screen-level "Serves N" stepper, but kept the
value session-local with no persistence (explicitly out of scope there).

- `src/App.tsx` — `servings` lives in `useState(DEFAULT_SERVINGS)`; `reset()`
  restores it to 4. No storage.
- Sibling TKT-106 already established the persistence pattern to mirror:
  `loadPreferences()` lazy-init from `sessionStorage["freat:preferences"]` + a
  `useEffect` write-back, both try/catch-wrapped so blocked storage (private
  mode) can't throw a console error and trip the smoke gate.
- If TKT-106 lands first, fold `servings` into that same persisted
  `preferences` object rather than a second storage key (one contract).

## Acceptance Criteria
- [ ] Chosen `servings` survives a same-tab reload (read on init, written on change).
- [ ] Storage I/O is try/catch-wrapped — no console error when storage is blocked (smoke stays green).
- [ ] If TKT-106's persisted `preferences` exists, `servings` rides it (no second storage key); otherwise a single scoped key.
- [ ] `bun run typecheck` passes; no regression to the no-servings first fetch.

### Why this was spawned mid-stack

**Parent ticket:** TKT-130
**Trigger source:** validation-time
**What was discovered:** Validation flagged that `servings` resets to 4 on `reset()` and is never stored (`src/App.tsx` `useState`/`reset`), so a returning meal-prepper re-enters their headcount each visit.
**Ordering decision:** defer-to-backlog
**Rationale:** Persistence was explicitly out of scope for TKT-130 and is a natural, non-blocking enhancement; it also wants to coordinate with TKT-106's sessionStorage pattern, so it belongs as its own backlog item.
