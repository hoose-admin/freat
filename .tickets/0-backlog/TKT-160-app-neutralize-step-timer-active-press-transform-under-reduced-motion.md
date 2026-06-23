---
id: TKT-160
title: "Neutralize .step-timer:active press transform under reduced motion"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
tags:
  - ux
  - a11y
  - ai-proposed
depends_on: []
blocks: []
related: [TKT-155]
files_touched: []
complexity: 1
---

## Objective
Bring `.step-timer:active` to parity with `.btn:active` under `prefers-reduced-motion: reduce` — kill the 1px press-nudge so the reduced-motion baseline is consistent across the app's pressable controls.

## Context
TKT-155 added the global `@media (prefers-reduced-motion: reduce)` baseline (`src/styles.css:745-766`) and explicitly neutralized the button press transform with `.btn:active { transform: none !important }` (`src/styles.css:756-758`). The analogous step-timer control has the same press affordance — `.step-timer:active { transform: translateY(1px) }` (`src/styles.css:590-592`) — but is **not** covered by an override, so it still nudges 1px while pressed under reduced motion. The global wildcard collapses *transitions*, but a `:active` transform applies instantly without a transition, so the nudge survives.

This is a small consistency gap surfaced by TKT-155's validation review, not a regression (it predates that change). A press-state nudge is a direct response to a user action, so it's arguably acceptable — file/close per the reviewer's judgement.

## Acceptance Criteria
- Under `prefers-reduced-motion: reduce`, `.step-timer:active` no longer applies the `translateY(1px)` press transform (mirror the existing `.btn:active { transform: none !important }` treatment in the same media block, `src/styles.css:756-758`).
- No change to the default (motion-allowed) press behaviour, and no other `.step-timer` styling changes.
- `bun run typecheck` passes.

### UX Finding
**Heuristic:** Consistency & standards (Nielsen #4); accessibility (reduced motion)
**Where:** `src/styles.css:590-592` (`.step-timer:active`) vs `:756-758` (`.btn:active` reduced-motion override)
**Now:** Reduced-motion users see no press-nudge on buttons but still get one on step-timer pills — inconsistent motion treatment.
**Proposed:** Add a one-line `.step-timer:active { transform: none !important }` to the existing reduced-motion block.
**Why it helps:** Completes the reduced-motion baseline so every pressable control behaves the same under the setting.
**Impact:** low · **Effort:** low
