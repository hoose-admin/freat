---
id: TKT-144
title: "Polish the AI-status pill: live-region de-dup + in-flight checking state"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - ux
  - a11y
  - ai-proposed
depends_on: [TKT-133]
blocks: []
related: [TKT-133, TKT-110, TKT-117]
files_touched: []
complexity: 1
next_step_hint: Land TKT-133 (AI-status pill + demo banner) on main first; TKT-144 polishes role=status + an in-flight pill state that only exist on the unmerged chaos/TKT-133 branch.
chaos_unstick_count: 1
---

## Objective
Two small refinements to the proactive AI-status pill + demo-mode banner added in
TKT-133: (1) avoid two simultaneous `role="status"` live regions announcing on
mount, and (2) give the pill a brief neutral state while `/api/health` is in
flight so a slow/failed probe still shows a readiness signal.

## Context
TKT-133 added a header status pill and a dismissible demo-mode banner, both fetched
from `/api/health` on mount.
- The pill (`src/App.tsx:75-83`) and the demo banner (`src/App.tsx:87-102`) **both**
  carry `role="status"`. When the key is missing, both render after the async
  health fetch resolves, so two polite live regions announce at once on load —
  slightly noisy for screen-reader users. The banner is the actionable onboarding
  message; the pill is passive header chrome.
- The pill renders nothing while `health` is `null` (`src/App.tsx:75` `health && …`),
  so on a slow or failing probe the header silently shows no readiness signal.
- Related a11y work: TKT-110 (focus/labels/live-regions), TKT-117 (announce
  async busy/error to screen readers) — keep this coherent with those.

## Acceptance Criteria
- [ ] Only one live region announces on mount (e.g. drop `role="status"` from the
      passive pill, keep it on the banner — or otherwise de-duplicate).
- [ ] The pill shows a brief neutral "checking…" state (or equivalent) while
      `/api/health` is in flight, instead of rendering nothing.
- [ ] `bun run typecheck` clean; zero console errors with no key; smoke stays green.

### Why this was spawned mid-stack

**Parent ticket:** TKT-133
**Trigger source:** validation-time
**What was discovered:** the TKT-133 validation subagent flagged that the new pill and demo banner both use `role="status"` (`src/App.tsx:78,88`) and both appear after the async health fetch, double-announcing on mount; and that the pill is hidden until `health` resolves, giving no in-flight signal.
**Ordering decision:** defer-to-backlog
**Rationale:** observational a11y/UX polish beyond TKT-133's acceptance criteria — not a blocker, and a natural fit for the existing a11y ticket family.
