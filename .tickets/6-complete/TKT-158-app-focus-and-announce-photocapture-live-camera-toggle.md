---
id: TKT-158
title: "A11y: focus + announce PhotoCapture live-camera toggle"
status: "Complete"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-22
completed: 2026-06-22
domain: "app"
tags:
  - a11y
  - frontend
depends_on: []
blocks: []
related: [TKT-110, TKT-123]
files_touched:
  - "src/components/PhotoCapture.tsx"
complexity: 2
next_step_hint: Build: add a focusable live-panel heading + focus-restore to Open camera in PhotoCapture.tsx, mirroring TKT-110/Cook Mode.
chaos_branch: chaos/TKT-158
merged: 2026-06-22
merge_commit: 0733d0e37f30
---

### Objective

The capture step has a sub-view swap that the app's phase-change focus pass
(TKT-110) does not cover: `PhotoCapture` toggles between an `idle` panel and a
live `live` camera-preview panel via *local component state*, not an App
`phase`. So when "Open camera" swaps in the `<video>` preview (or "Cancel" swaps
back), a keyboard/screen-reader user gets no focus move and no announcement, and
the live panel has no heading to land on. Give that toggle the same
focus-management + polite-announcement treatment the phase machine already has.

### Context

- `src/components/PhotoCapture.tsx:25` — `const [mode, setMode] = useState<Mode>("idle")`;
  `mode === "live"` renders the `<video aria-label="Live camera preview">` panel
  (`PhotoCapture.tsx:126-144`), `idle` renders the `<h2 class="capture__heading">`
  panel (`:145-178`). The swap is local state, invisible to App's `[phase]`
  focus effect (`src/App.tsx:54-60`).
- TKT-110 established the pattern to mirror: a focusable heading
  (`tabIndex={-1}`) focused programmatically on view change, plus a polite
  `role="status"` / `aria-live` region for async feedback. Reuse the existing
  `.visually-hidden` utility (`src/styles.css:559`) — do not invent a new
  SR-only class.
- The live panel currently has no heading; either add a focusable heading for
  the live view or move focus to the "Capture photo" control on enter, and
  restore focus to "Open camera" on Cancel (the focus-restore pattern already
  used by Cook Mode in `src/components/RecipeList.tsx:33-38`).
- `getUserMedia` must still only fire on the user action (CLAUDE.md: AI/camera
  is lazy; zero console errors on load).

### Acceptance Criteria

- Entering live camera mode moves keyboard focus to a sensible target in the
  live panel (a focusable heading made via `tabIndex={-1}`, or the "Capture
  photo" button), so a keyboard/SR user is not stranded on the now-unmounted
  "Open camera" button.
- Cancelling the live preview restores focus to the control that opened it
  ("Open camera"), mirroring the Cook Mode focus-restore pattern.
- The idle↔live swap is announced (or the focus move alone conveys it) without a
  second competing live region — reuse the established `.visually-hidden`
  `role="status"` approach; do not regress the single-live-region contract from
  TKT-110.
- `bun run typecheck` passes and the capture view still renders with zero
  console errors when no camera/permission is available (the file-picker
  fallback path is unaffected).

### Pass-2 review

**Run:** 2026-06-22
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — the four AC bullets are each independently verifiable (focus target on enter, focus-restore on cancel, single-live-region, typecheck + zero-console-error). Left as-is.
- **Blockers:** ok — depends_on is empty; related TKT-110 is the already-landed phase-focus pass this mirrors.
- **Context drift:** 2 file:line citations updated — App phase-focus effect `:33-39`→`:54-60`; `.visually-hidden` `:445`→`:559`. PhotoCapture line ranges (`:25`, `:126-144`, `:145-178`) and RecipeList Cook Mode (`:33-38`) still accurate.

**Verdict:** build-ready

### Why this was spawned mid-stack

**Parent ticket:** TKT-110
**Trigger source:** validation-time
**What was discovered:** The phase-change focus pass does not reach the
`PhotoCapture` idle↔live camera toggle, which is local state outside App's phase
machine (`src/components/PhotoCapture.tsx:25`, `:126-144`) and has no focus
target — a genuine a11y gap adjacent to, but out of scope for, TKT-110.
**Ordering decision:** defer-to-backlog
**Rationale:** Independent of TKT-110's diff; a self-contained follow-up, not a
blocker for the foundational phase-focus pass.

### Autonomous Decision

**Made:** 2026-06-22 (chaos mode — no human input)
**Question:** What should keyboard/SR focus land on when the live camera panel swaps in — and how should the swap be announced — given the AC offered "a focusable heading" *or* "the Capture photo button"?

**Options considered:**
- **A — visible focusable `<h2>` heading ("Camera preview", `tabIndex={-1}`)** — most faithfully mirrors the TKT-110 pattern every other view uses (a per-view `<h2 tabIndex={-1}>` landmark focused on change); gives the live sub-view the heading it lacked; focusing it announces the swap for free, so no second live region is needed (honors the single-live-region AC).
- **B — focus the "Capture photo" button directly** — fewer DOM nodes, lands the user on the primary action, but skips the "you are now in camera mode" context a heading conveys and gives the live view no heading landmark.
- **C — visually-hidden heading** — same a11y benefit as A with no visual change, but breaks the established "every view has a *visible* focusable h2" convention and reads as an inconsistent one-off to a coherence reviewer.

**Chosen:** A — a visible `.capture__heading` h2 mirrors the existing landmark convention (idle panel `PhotoCapture.tsx:150`; `App.tsx:54-60` focuses each view's h2), satisfies "a heading to land on," and lets the focus move alone convey the swap so no competing live region is introduced. Focus is restored to "Open camera" on Cancel/failure via the Cook Mode rAF pattern (`RecipeList.tsx:33-38`).
**Reversibility:** easy — swap the focus target to the Capture button (drop the heading) or hide the heading with `.visually-hidden`; both are one-line changes in `PhotoCapture.tsx`.


### Implementation Summary

- Added two refs in `src/components/PhotoCapture.tsx` — `liveHeadingRef` (live-panel heading) and `openCameraRef` ("Open camera" button) — the two ends of the idle↔live focus management.
- Live panel now renders a focusable `<h2 className="capture__heading" tabIndex={-1}>Camera preview</h2>`; the `[mode]` effect focuses it on the idle→live swap (alongside the existing stream-attach), so a keyboard/SR user lands in the new sub-view and the focus move alone announces the swap — no second live region added.
- `cancelCamera` and the `openCamera` getUserMedia-failure path both call a new `restoreOpenCameraFocus()` helper that `requestAnimationFrame`-focuses "Open camera" after it remounts — the Cook Mode focus-restore pattern (`RecipeList.tsx:33-38`). Failure path also covers the focus dropped when the button self-disables during `starting`.
- Reused the existing `.capture__heading` style (focus-ring already suppressed for tabIndex={-1} headings at `styles.css:311-314`); no CSS change.

**Deviations from plan:**
- Added focus-restore to the camera-open *failure* path too (not just Cancel) — the AC only named Cancel, but the button disables itself while `starting` and drops focus to `<body>`, so restoring there keeps the keyboard user anchored. Reversible, additive.

**Implementation notes:**
- No new live region: the single-live-region contract from TKT-110 is preserved (App keeps its one polite `status` region; PhotoCapture keeps only the pre-existing `hint` `role="status"`). The swap is conveyed by the focus move, which the AC explicitly permits.
- AI/camera laziness preserved: the focus effect early-returns unless `mode === "live"`, which is only reachable via the user clicking "Open camera"; nothing fires on mount.


### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-22
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Entering live mode moves focus to a sensible live-panel target | ✓ | `[mode]` effect `PhotoCapture.tsx:57-67` (`if (mode !== "live") return; … liveHeadingRef.current?.focus()`); target `<h2 className="capture__heading" tabIndex={-1} ref={liveHeadingRef}>` at `:157-159`, rendered only in the `mode === "live"` branch. |
| Cancel restores focus to "Open camera" (Cook Mode pattern) | ✓ | `cancelCamera` `:120-127` → `restoreOpenCameraFocus()` `:131-133` (`requestAnimationFrame(() => openCameraRef.current?.focus())`); ref on button `:188-195`. Mirrors `RecipeList.tsx:33-37`. |
| Swap conveyed without a second competing live region | ✓ | `git diff` adds no `aria-live`/`role="status"`; PhotoCapture's only `role="status"` is the pre-existing `hint` (`:206`); App's single polite region remains at `App.tsx:287`. Swap carried by the focus move (`:66`). |
| typecheck passes; zero console errors on load (file-picker path unaffected) | ✓ | `bun run typecheck` → `tsc --noEmit` exit 0. Focus effect early-returns unless `mode === "live"` (`:58`), only reachable via user click `openCamera` `setMode("live")` (`:87`); `mode` starts `"idle"` (`:30`). |

**Commands run:**
- `git diff`
- `bun run typecheck`
- `grep -rn 'aria-live\|role="status"' src/`

**Notes:** Focus-restore was additionally wired into the camera-open *failure* path (`PhotoCapture.tsx:96`) beyond the AC's named Cancel case — additive, not a regression. Live heading reuses the existing `.capture__heading` class (no new SR-only class). Build also confirmed clean: `bun run build` → 35 modules, PWA generated, exit 0.

### Smoke Check

**Headless Chromium:** SKIPPED (harness SIGKILL'd in sandbox — exit 137, no `SmokeResult` emitted, across 3 attempts after provisioning the repo-local browser; a sandbox memory/resource limit on the build+serve+Chromium boot, not an app fault).

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | not executed — harness killed before boot |

**Captured console errors (verbatim):** none captured — process killed before any console output.

**Screenshots:** none — `.weave/cache/smoke/TKT-158/result.json` not produced.

_Skip is not a pass and never fails the ticket. Runtime sanity covered out-of-band: `bun run typecheck` (exit 0) and `bun run build` (exit 0, 35 modules) both clean; the diff adds no on-load code path (focus effect early-returns unless mode === "live", which only a user click reaches), so the zero-console-error-on-load contract is preserved by construction._


### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-22
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Adds focusable `<h2 tabIndex={-1}>Camera preview</h2>` (`PhotoCapture.tsx:157-159`) focused on idle→live via the `[mode]` effect (`:58-66`); restores focus to "Open camera" (`ref` `:189`) on Cancel via rAF (`:120-133`). Exactly the focus+announce treatment the Objective demands. |
| Context constraints | ✓ | Reuses `.capture__heading` (no new SR-only class); diff adds zero `aria-live`/`role="status"` (single-live-region contract held — only pre-existing `hint` `:206` + App `:287`); camera stays lazy (effect early-returns off `idle` default, only a user click reaches `live`); typecheck exit 0. |
| Architecture coherence | ✓ | Extends TKT-110 h2-focus, Cook Mode rAF restore (`RecipeList.tsx:33-38`), and the per-view focusable-h2 landmark — no parallel pattern. Inherits existing focus-ring suppression (`styles.css:311-314`); no CSS added. ADR-001 untouched (UI-only, no /api/manifest/SW/fetch). CLAUDE.md hard rules preserved. |
| Sprawl | ✓ | `git diff` touches only `src/components/PhotoCapture.tsx` (matches `files_touched`). Failure-path focus-restore is justified (button self-disables during `starting`, dropping focus to `<body>`), additive, honestly disclosed under Deviations. |
| Follow-up surfacing | ✓ | One adjacent out-of-scope observation filed as a deferred backlog ticket (conditionally-mounted `hint` live region). No in-scope a11y gap left unfixed. |

**Suggested new tickets:** 1 (filed → 0-backlog, defer-to-backlog)

