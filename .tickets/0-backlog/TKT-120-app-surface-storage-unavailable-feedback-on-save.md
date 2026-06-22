---
id: TKT-120
title: "Surface storage-unavailable / quota-exceeded feedback on save"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains: []
tags:
  - ux
  - ai-proposed
depends_on: [TKT-104]
blocks: []
related: [TKT-104]
files_touched: []
complexity: 2
next_step_hint: Answer the Stuck Reason: merge dependency TKT-104 (saved-recipes foundation) to main, then re-base and have persist()/saveRecipe() signal write failure.
chaos_unstick_count: 1
---

### Objective
Give the user feedback when a save can't actually persist. Today
`savedRecipes.persist()` swallows `localStorage` write failures (disabled storage,
private mode, quota exceeded), so a save appears to succeed in-memory but silently
fails to persist across reload.

### Context
- Introduced by TKT-104. `src/lib/savedRecipes.ts` `persist()` (≈L34-41) wraps the
  write in try/catch and returns the list regardless — intentionally never throwing
  (CLAUDE.md hard rule #3), but it also can't tell the caller a write was dropped.
- Minimal approach: let `persist()`/`saveRecipe()` signal success/failure (e.g.
  return a boolean or throw a typed soft-error the caller catches) so `App` can show
  a non-blocking banner ("Couldn't save — storage is full or unavailable"), reusing
  the existing `.banner` styles. Must NOT reintroduce a hard crash.

### Acceptance Criteria
- [ ] When a `localStorage` write fails, the user sees a non-blocking message that
      the recipe couldn't be saved; the app does not throw or log a console error.
- [ ] The happy path is unchanged (no message on a successful save); `bun run
      typecheck` passes.

### Why this was spawned mid-stack

**Parent ticket:** TKT-104
**Trigger source:** validation-time
**What was discovered:** `persist()` silently swallows write failures (src/lib/savedRecipes.ts try/catch), so a save can look successful yet never persist, with no user signal.
**Ordering decision:** defer-to-backlog
**Rationale:** Edge-case UX hardening; the core feature works and correctly degrades without crashing.
