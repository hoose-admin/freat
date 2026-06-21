---
id: TKT-101
title: "Live camera capture with file-input fallback"
status: "Todo"
priority: "High"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ux
  - camera
depends_on: []
blocks: []
related: []
files_touched: []
complexity: 3
---

Replace the file-input-only capture with a live rear-camera preview using getUserMedia, falling back to the existing `<input capture>` when the camera API is unavailable or denied.

## Why
Snapping in-app is the core interaction; bouncing to the OS picker is clunky.

## Scope
- Component in src/components (extend/replace PhotoCapture); keep the onPhoto(dataUrl) contract in App.tsx unchanged.
- Capture a frame to a data URL and feed it to the existing analyze flow.

## Acceptance criteria
- On a camera-capable browser, a live preview shows and a capture button grabs a still.
- When getUserMedia is unavailable/denied, the file-input fallback still works.
- Camera tracks are stopped when leaving the capture phase (no hot camera).
- No console errors on load; typecheck passes.
