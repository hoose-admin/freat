---
id: TKT-161
title: "A11y: persistently mount PhotoCapture's camera-failure hint live region"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-22
domain: "app"
complexity: 1
tags:
  - a11y
  - frontend
depends_on: []
blocks: []
related: [TKT-158, TKT-110]
files_touched: []
next_step_hint: ""
---

### Objective

`PhotoCapture`'s camera-failure / fallback notice is announced via a
`role="status"` paragraph that is conditionally mounted (`{hint && …}`), so the
live region is injected into the DOM at the same moment its text appears. Some
screen-reader / browser pairings do not announce a polite region that did not
exist before its content was set, so the "Couldn't open the camera — choose a
photo instead." message can be silently missed. Mirror the always-mounted
live-region pattern App already uses so the notice is reliably announced.

### Context

- `src/components/PhotoCapture.tsx:205-209` — the notice:
  `{hint && (<p className="capture__hint" role="status">{hint}</p>)}`. The
  `role="status"` element only exists while `hint` is truthy; it is mounted and
  populated in the same render.
- `src/App.tsx:284-289` — the established fix: an **always-present**
  `.visually-hidden` `role="status" aria-live="polite"` region that is never
  conditionally unmounted, with the message text as its (possibly empty)
  payload. The comment there explains the rationale ("never conditionally
  unmounted, so SR registers it").
- This is a follow-up surfaced during TKT-158 validation; it is adjacent to but
  out of scope for that ticket's idle↔live focus/announce objective.
- Keep the single-live-region discipline in mind: the `hint` text is a *visible*
  fallback notice (it must stay on screen for sighted users), so the fix is to
  keep the paragraph always-mounted and toggle its text, OR pair it with a
  persistently-mounted polite region — not to add a second competing announcer
  to App's global one.

### Acceptance Criteria

- The camera-failure / fallback `hint` is announced by a live region that is
  present in the DOM *before* the message text is set (not mounted together with
  it), following the always-mounted pattern at `src/App.tsx:284-289`.
- The visible fallback notice still renders for sighted users when `hint` is set
  and shows nothing when it is empty (no empty box / layout shift regression).
- No second competing live region is introduced — the single-live-region
  contract from TKT-110 is preserved.
- `bun run typecheck` passes and the capture view renders with zero console
  errors when no camera/permission is available.

### Why this was spawned mid-stack

**Parent ticket:** TKT-158
**Trigger source:** validation-time
**What was discovered:** `PhotoCapture`'s `hint` `role="status"` region is
conditionally mounted (`src/components/PhotoCapture.tsx:205-209`), so it can be
missed by SR/browser pairs that ignore a polite region created at announce-time
— the exact pitfall App's always-mounted region (`src/App.tsx:284-289`)
deliberately avoids.
**Ordering decision:** defer-to-backlog
**Rationale:** Independent of TKT-158's idle↔live focus diff; a self-contained
a11y follow-up, not a blocker for it.
