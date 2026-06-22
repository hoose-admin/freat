---
id: TKT-139
title: "Sample-specific alt text for the demo fridge preview"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - a11y
  - feature
depends_on: [TKT-128]
blocks: []
related: [TKT-128]
files_touched: []
complexity: 1
next_step_hint: Land TKT-128 to main first; this ticket needs its src/lib/sample.ts (SAMPLE_PREVIEW) + sample path, absent on the main-based build branch.
chaos_unstick_count: 1
---

## Objective
Give the "Try a sample fridge" demo preview an accurate `alt` value so screen-reader
users in the sample path hear "Sample fridge" instead of the photo path's "Your fridge".

## Context
TKT-128 added a one-tap sample demo that sets `photo` to a canned inline-SVG
placeholder (`src/lib/sample.ts` `SAMPLE_PREVIEW`) and reuses the existing preview
`<img>` in the ingredients phase. That `<img>` is hardcoded `alt="Your fridge"`
(`src/App.tsx:88`), which is mildly inaccurate for the demo placeholder (it is not
the user's fridge). The SVG carries its own `aria-label`, but when rendered as an
`<img src>` the wrapping `alt` is what assistive tech announces, so the `alt` wins.

- The preview img: `src/App.tsx:88` (`<img className="preview" src={photo} alt="Your fridge" />`).
- The sample placeholder: `src/lib/sample.ts` (`SAMPLE_PREVIEW`).

## Acceptance Criteria
- [ ] When the preview shows the sample placeholder, its `alt` reads as a sample (e.g. "Sample fridge"); the real-photo path keeps "Your fridge".
- [ ] No new state where one suffices — derive the alt from existing state (e.g. compare `photo === SAMPLE_PREVIEW`) rather than adding a parallel flag if avoidable.
- [ ] `bun run typecheck` passes; zero console errors.

### Why this was spawned mid-stack

**Parent ticket:** TKT-128
**Trigger source:** validation-time
**What was discovered:** The validation reviewer flagged that `src/App.tsx:88` reuses `alt="Your fridge"` for the sample SVG preview, which is inaccurate for the demo placeholder.
**Ordering decision:** defer-to-backlog
**Rationale:** Cosmetic a11y polish outside TKT-128's core objective (the demo flow works and is not a hard a11y failure); deferring keeps TKT-128's already-validated diff intact.
