---
id: TKT-107
title: "Real PWA icons and offline app-shell fallback"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - pwa
  - infra
depends_on: []
blocks: []
related: []
files_touched: []
complexity: 3
---

Replace the single SVG icon with proper maskable PNG icons (192 and 512) plus an apple-touch-icon, and add an offline fallback so the app shell loads with no network.

## Constraints
- Any tooling must be installed LOCALLY (no global installs, the chaos guard blocks them).

## Acceptance criteria
- Manifest references 192 and 512 PNG icons (maskable) plus apple-touch-icon.
- App shell loads offline (service worker precache); /api stays NetworkOnly.
- Build and smoke pass.
