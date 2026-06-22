---
id: TKT-111
title: "PhotoCapture: feedback when capture fires before the camera stream warms up"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
secondary_domains: []
tags:
  - ux
  - camera
depends_on: [TKT-101]
blocks: []
related: [TKT-101]
files_touched: []
complexity: 1
next_step_hint: Land TKT-101 (live camera) on main first; TKT-111 patches a PhotoCapture flow that only exists on the unmerged chaos/TKT-101 branch.
chaos_unstick_count: 1
---

### Objective
The live-camera `capture()` in `PhotoCapture.tsx` silently no-ops when the video
stream hasn't produced its first frame yet (`videoWidth`/`videoHeight` still 0).
A fast tap of "Capture photo" right after "Open camera" therefore does nothing
with no user-visible explanation. Give the user feedback (e.g. disable the
capture button until the stream is ready, or a brief "Hold on, focusing…" hint)
so the control never appears broken.

### Context
- `src/components/PhotoCapture.tsx` (as shipped by TKT-101): `capture()` guards
  with `const w = video.videoWidth; const h = video.videoHeight; if (!w || !h) return;`
  — the defensive early-return that produces the silent no-op.
- A clean fix: track a `ready` state set on the `<video>`'s `onLoadedMetadata`
  (or `onCanPlay`) event and gate the "Capture photo" button's `disabled` on it,
  reusing the existing `disabled` composition (`busy || reading || starting`).
- Surfaced by the TKT-101 validation review (validation-time discovery).

### Acceptance Criteria
- [ ] The "Capture photo" button is disabled (or shows a clear "preparing" state)
      until the live `<video>` has a non-zero frame, so a tap can never silently
      no-op.
- [ ] Once the stream is ready, capture works exactly as before (still → dataURL
      → `onPhoto`).
- [ ] `bun run typecheck` passes; no console errors on load.

### Why this was spawned mid-stack

**Parent ticket:** TKT-101
**Trigger source:** validation-time
**What was discovered:** `capture()` silently returns when `video.videoWidth/Height === 0` (PhotoCapture.tsx, the `if (!w || !h) return;` guard), so an early tap of Capture does nothing with no feedback.
**Ordering decision:** defer-to-backlog
**Rationale:** Minor UX polish on an edge case, separable from TKT-101's core objective (live capture + fallback); not a blocker for shipping TKT-101.
