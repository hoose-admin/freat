---
id: TKT-141
title: "Make the background inert / aria-hidden while a full-screen dialog (Cook Mode, recipe detail) is open"
status: "Todo"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - a11y
  - ux
depends_on: [TKT-126, TKT-109]
blocks: []
related: [TKT-126, TKT-109, TKT-116]
files_touched: []
complexity: 2
next_step_hint: Blocked: build after CookMode (TKT-126) + RecipeDetail (TKT-109) land on main — neither dialog exists in the codebase yet.
chaos_unstick_count: 1
---

### Objective
The recipe-overlay dialogs (Cook Mode from TKT-126, the recipe detail modal from
TKT-109) render inline (no portal) and do not hide the content behind them, so
screen-reader and keyboard users can still reach the recipe grid underneath an open
`role="dialog"`. Mark the background inert while a dialog is open so focus and the
accessibility tree are correctly contained.

### Context
- `src/components/CookMode.tsx` — full-screen `role="dialog" aria-modal="true"` overlay
  with an internal Tab focus-trap, but nothing makes the rest of the document `inert`;
  `aria-modal` alone does not reliably remove background content from AT navigation.
- `src/components/RecipeList.tsx` mounts `<CookMode>` as a sibling of the recipe grid
  inside `.recipes`, so the grid remains in the a11y tree behind it. The same gap
  applies to TKT-109's `RecipeDetail` modal — fix once for both.
- Modern approach: toggle the `inert` attribute on the background container (or all
  `#root` siblings of the dialog) while a dialog is open. `inert` is widely supported;
  a small helper or a shared `useInertBackground` hook keeps both dialogs consistent.
- Related polish ticket: TKT-116 (recipe-detail modal: body-scroll-lock + reduced-motion)
  — same modal family; consider doing these together.

### Acceptance Criteria
- [ ] While a full-screen/modal dialog is open, the content behind it is `inert`
      (not focusable, not reachable by screen readers); restored on close.
- [ ] Applied to both Cook Mode and the recipe detail modal via a shared mechanism (no
      forked per-component logic).
- [ ] Focus remains trapped within the dialog and is restored to the trigger on close
      (no regression of existing behavior).
- [ ] `bun run typecheck` passes and the `/` smoke is green with no Gemini key.

### Why this was spawned mid-stack

**Parent ticket:** TKT-126
**Trigger source:** validation-time
**What was discovered:** TKT-126's full-screen `role="dialog"` renders inline without a portal and does not hide the background recipe grid, so SR/Tab users can still reach content behind the modal (`CookMode.tsx`, `RecipeList.tsx`); the same gap applies to TKT-109's modal.
**Ordering decision:** defer-to-backlog
**Rationale:** Non-blocking a11y polish that should be solved once across both dialogs; best done after the dialogs are merged, alongside TKT-116.
