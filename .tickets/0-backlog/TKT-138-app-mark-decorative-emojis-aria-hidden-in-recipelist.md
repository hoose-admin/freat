---
id: TKT-138
title: "Mark decorative emojis aria-hidden in RecipeList"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - a11y
  - ux
depends_on: [TKT-127]
blocks: []
related: [TKT-127, TKT-110]
files_touched:
  - "src/components/RecipeList.tsx"
complexity: 1
next_step_hint: Build only after TKT-127 merges to main — the 🛒/✅ glyphs it targets live in TKT-127's unmerged branch, not in this worktree.
chaos_unstick_count: 1
---

## Objective
Wrap the decorative emoji glyphs in `RecipeList` so screen readers don't announce
their raw names, matching the convention App already uses
(`src/App.tsx:59` — `<span aria-hidden="true">🧊</span>`).

## Context
`RecipeList` renders several decorative emojis whose meaning is already carried by
adjacent text, but they are not hidden from assistive tech:
- `🛒` in the "Zero shopping" filter chip (`src/components/RecipeList.tsx`, the
  `.chip--filter` button — added in TKT-127).
- `✅` in the "Ready now" badge (`.tag--ready` — added in TKT-127).
- `⏱` in the time tag (pre-existing `.tag` with `⏱ {timeMinutes} min`).

`App.tsx:59` and the broader a11y pass (TKT-110) establish that decorative glyphs
should be `aria-hidden`. This is a tiny polish follow-up surfaced during TKT-127
validation; it is orthogonal to TKT-127's ranking/filter objective and to TKT-110's
focus/label/live-region scope, so it lands as its own ticket.

## Acceptance Criteria
- [ ] The `🛒`, `✅`, and `⏱` glyphs in `RecipeList` are wrapped so they are not
      announced by screen readers (e.g. `<span aria-hidden="true">…</span>`), while
      the surrounding text labels ("Zero shopping", "Ready now", "N min") remain.
- [ ] No behavioral/visual change; `bun run typecheck` passes; no `/api` or types change.

### Why this was spawned mid-stack

**Parent ticket:** TKT-127
**Trigger source:** validation-time
**What was discovered:** the validator noted the new `🛒`/`✅` (and pre-existing `⏱`) emojis in `RecipeList` lack `aria-hidden`, unlike the App convention (`src/App.tsx:59`).
**Ordering decision:** defer-to-backlog
**Rationale:** a11y polish orthogonal to TKT-127's ranking/filter objective; no dependency either way, so it belongs in the normal backlog.
