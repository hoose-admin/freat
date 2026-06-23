---
id: TKT-162
title: "Adapt remix preset chips to active dietary preferences"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - ux
  - ai-proposed
depends_on: [TKT-131]
blocks: []
related: [TKT-131, TKT-106]
files_touched:
  - "src/components/RecipeList.tsx"
complexity: 2
---

## Objective
The per-card remix preset chips added in TKT-131 are a fixed list
(🌶 Spicier / 🥗 Vegan / ⏱ Faster / 🔁 Different idea). When the user has already
selected a matching dietary preference (e.g. "vegan" in `PreferencesControl`), the
duplicate chip is redundant. Adapt the chip set to the active preferences so it stays
useful rather than restating a constraint already in effect.

## Context
- Remix chips: `src/components/RecipeList.tsx` `PRESETS` (added in TKT-131) — a static
  `as const` array rendered as `.chip--action` buttons in `RecipeCard`.
- Active dietary/time prefs live in `RecipePreferences` (`src/lib/types.ts`) and are
  owned by `App` (`preferences` state), surfaced via `PreferencesControl` (TKT-106).
  `DIETARY_OPTIONS = ["vegetarian", "vegan", "gluten-free"]`.
- The recipes are already generated honoring those prefs (`server/gemini.ts` `recipePrompt`),
  so a "make it vegan" remix chip is a no-op when vegan is already set.

## Acceptance Criteria
- [ ] A remix preset chip whose tweak duplicates an already-active dietary preference is hidden (or visibly de-emphasized/disabled) for that session's recipes.
- [ ] The free-text nudge and the non-duplicate chips are unaffected.
- [ ] `bun run typecheck` passes; no new data path or route (pure client-side derivation from existing `preferences`).

## Out of Scope
- Time/servings-aware chips. This ticket is dietary-preference dedup only.

### Why this was spawned mid-stack

**Parent ticket:** TKT-131
**Trigger source:** validation-time
**What was discovered:** The TKT-131 validation reviewer flagged that the fixed 🥗 Vegan remix chip is redundant when the user already set `vegan` in `PreferencesControl` (`src/components/RecipeList.tsx` PRESETS vs `App.preferences`).
**Ordering decision:** defer-to-backlog
**Rationale:** Pure UX polish, fully decoupled from the TKT-131 contract; not a blocker for landing remix.
