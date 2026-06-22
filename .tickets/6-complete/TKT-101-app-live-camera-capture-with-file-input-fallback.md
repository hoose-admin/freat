---
id: TKT-101
title: "Live camera capture with file-input fallback"
status: "Complete"
priority: "High"
assignee: "Claude-Agent"
created: 2026-06-21
completed: 2026-06-22
domain: "app"
secondary_domains: []
tags:
  - feature
  - ux
  - camera
depends_on: []
blocks: []
related: [TKT-108, TKT-110]
files_touched:
  - "src/components/PhotoCapture.tsx"
  - "src/styles.css"
complexity: 3
next_step_hint: Verify AC with a fresh subagent — cite PhotoCapture.tsx getUserMedia/capture()/stopStream and bun run typecheck output.
chaos_branch: chaos/TKT-101
merged: 2026-06-22
merge_commit: da9edee44186
---

### Objective
Replace the file-input-only capture with a live **rear-camera preview**
(`getUserMedia`), grabbing a still frame to a data URL on a capture button —
falling back to the existing `<input capture>` picker when the camera API is
unavailable or permission is denied. Snapping in-app is the core interaction;
bouncing to the OS picker is clunky. The `onPhoto(dataUrl)` contract App.tsx
consumes must stay byte-for-byte the same so the analyze flow is untouched.

### Context
- `src/components/PhotoCapture.tsx` — current capture component. File input with
  `accept="image/*" capture="environment"`, reads the file via `FileReader` to a
  data URL, calls `onPhoto(reader.result)` (PhotoCapture.tsx:26-31). Props are
  `{ onPhoto: (dataUrl: string) => void; busy: boolean }` (PhotoCapture.tsx:3-6).
  The component's own doc comment already flags live `getUserMedia` as "a tracked
  enhancement — see the backlog" (PhotoCapture.tsx:8-11) — this is that ticket.
- `src/App.tsx:71` — renders `<PhotoCapture onPhoto={handlePhoto} busy={busy} />`
  only during `phase === "capture"`. `handlePhoto` (App.tsx:18-31) takes a data
  URL and calls `analyzeFridge`. **Leaving the capture phase unmounts
  PhotoCapture** (App.tsx:71 is conditional on phase) — so camera-track cleanup
  belongs in a component-unmount effect, which fires on every phase transition.
- `src/styles.css:79-103` — `.capture`, `.capture__art`, `.capture__heading`,
  `.capture__hint` classes; `.btn`, `.btn--primary`, `.btn--lg` (114-149);
  `.preview` (105-111) for a captured/preview image; `.visually-hidden` (305-316)
  for the hidden file input. Reuse these; add only what a `<video>` preview needs.
- The data URL must keep the `data:<mime>;base64,<data>` shape — `splitDataUrl`
  in `src/lib/api.ts:43-47` regex-matches exactly that, and analyze fails on a
  non-matching string. Canvas `toDataURL("image/jpeg", q)` produces a conforming
  URL; use JPEG so payloads stay small.
- Architecture: ADR-001 (server-side Gemini proxy). This ticket is **client-only**
  — no `/api`, types, or `src/lib/api.ts` changes; the `onPhoto` contract is the
  seam, so ADR-001's data-fetching spine is untouched. Hard rule #3 (AI is lazy /
  zero console errors on load) means `getUserMedia` must **not** auto-run on
  mount in a way that errors when no camera/permission exists — request it on a
  user action or guard it so a denial degrades to the fallback without a thrown,
  unhandled console error.
- Related: TKT-108 (persist last session photo) reuses the produced data URL;
  TKT-110 (a11y pass) will cover the new camera controls' labels/focus.

### Acceptance Criteria
- [ ] On a camera-capable browser with permission granted, a live `<video>`
      preview renders and a capture button grabs a still frame, producing a
      `data:image/*;base64,...` URL passed unchanged to the existing `onPhoto`.
- [ ] When `navigator.mediaDevices.getUserMedia` is undefined OR the
      permission/request rejects, the component falls back to the existing
      `<input type="file" capture="environment">` picker and that path still
      yields a working `onPhoto(dataUrl)`.
- [ ] Camera `MediaStreamTrack`s are stopped (`track.stop()`) when leaving the
      capture phase (component unmount) and after a still is captured — verifiable
      as a cleanup path in an unmount `useEffect` and no retained stream ref.
- [ ] `bun run typecheck` passes with no errors.
- [ ] App loads with **zero console errors** when no camera is present / no key
      configured (smoke gate stays green); `getUserMedia` is never called on page
      load without a user action, and a denied/absent camera does not surface an
      uncaught error.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — all 5 bullets are independently verifiable (a behavioral assertion, a fallback branch, a `track.stop()`/effect check, a `bun run typecheck` command, and the zero-console-errors smoke condition). Left as-is.
- **Blockers:** ok — `depends_on` empty; TKT-108/TKT-110 are weak `related` links, not ordering edges.
- **Context drift:** ok — re-grepped every cite: PhotoCapture.tsx props (3-6), doc comment (8-11), FileReader→onPhoto (26-31); App.tsx handlePhoto (18-31) + conditional render (71); api.ts `splitDataUrl` (43-47); styles.css `.capture`/`.btn`/`.preview`/`.visually-hidden` ranges all present.
- **Complexity:** 3 (medium) confirmed — single client component, getUserMedia + canvas capture + fallback + track cleanup; no API/type/contract changes.

**Verdict:** build-ready

### Out of Scope
- Camera device selection / front-back toggle UI (single rear-facing default).
- Image cropping, filters, or resolution controls.
- Any change to `/api/*`, `src/lib/types.ts`, or `src/lib/api.ts`.
- Persisting the captured photo (that is TKT-108).

### Notes
- `facingMode: { ideal: "environment" }` (not `exact`) so desktops/laptops with
  only a front camera still get a preview instead of an over-constrained reject.
- Headless Chromium (the smoke gate) has no camera; `getUserMedia` will reject or
  be absent there, so the **fallback path must be the default-safe branch** and
  must not log a console error — this is what keeps the smoke gate green.

### Implementation Summary

- Rewrote `src/components/PhotoCapture.tsx` into a two-mode component (`"idle"` | `"live"`). Idle mode shows the existing capture card; when `navigator.mediaDevices.getUserMedia` is supported it offers a primary **"Open camera"** button plus a ghost **"Choose a photo"** fallback. Live mode renders a `<video autoPlay playsInline muted>` preview with **Capture photo** / **Cancel** controls.
- `openCamera()` requests `getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })` only on user click; on success it stores the stream in a ref and flips to live mode; on reject/absent it falls back to the file picker and shows an inline `role="status"` hint — no thrown/uncaught error, so the load path stays console-clean.
- `capture()` draws the current `<video>` frame to an off-DOM `<canvas>` and exports `canvas.toDataURL("image/jpeg", 0.9)` — a `data:image/jpeg;base64,...` URL that satisfies `splitDataUrl`'s regex — then stops tracks and calls the unchanged `onPhoto(dataUrl)`.
- Track lifecycle: `stopStream()` calls `track.stop()` on every track and nulls the ref. It runs on component unmount (`useEffect(() => stopStream, [])` — fires when leaving the capture phase), after a successful capture, and on Cancel — no hot camera.
- A `useEffect` keyed on `mode` attaches `streamRef.current` to `video.srcObject` after the `<video>` has rendered (the element doesn't exist when `getUserMedia` resolves).
- The original file-input path (hidden `<input type="file" accept="image/*" capture="environment">` + `FileReader`) is preserved verbatim as the fallback and as the only control when the camera API is unsupported.
- Added `.capture__video` and `.actions--center` to `src/styles.css`, reusing the existing `--radius`/`--border` design tokens and `.btn` classes.

**Deviations from plan:**
- Camera is **user-gated** ("Open camera" button) rather than auto-started on mount. Dictated by CLAUDE.md hard rule #3 (no expensive/permission ops on load, zero console errors on load) and standard PWA UX (requesting camera permission on page load is an anti-pattern). This also keeps the smoke gate green because `getUserMedia` is never invoked on the initial render the smoke check exercises.

**Implementation notes:**
- No changes to `/api/*`, `src/lib/types.ts`, `src/lib/api.ts`, or the `onPhoto` contract — fully client-side, ADR-001 spine untouched.
- `bun run typecheck` (exit 0) and `bun run build` (exit 0) both pass in the worktree.

### Test Results

**Verifier:** fresh subagent (`general-purpose`)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Live `<video>` preview + capture → `onPhoto(dataURL)` | ✓ | `openCamera()` getUserMedia→`setMode('live')` (PhotoCapture.tsx:70-75); stream attach effect (:47-55); `<video autoPlay playsInline muted>` (:128-135); `capture()` drawImage→`canvas.toDataURL('image/jpeg',0.9)` (:98)→`onPhoto(dataUrl)` (:101); output matches `splitDataUrl` regex `/^data:(.+?);base64,(.*)$/` (api.ts:44). |
| Fallback when getUserMedia undefined / rejects | ✓ | `cameraSupported` guard (:30-33); `!cameraSupported`→`pick()` (:62-66); catch branch→idle+hint (:76-83); preserved `<input type=file accept='image/*' capture='environment' onChange=onFile>` (:180-188)→FileReader→`onPhoto` (:109-120). |
| Tracks stopped on unmount + after capture, no retained ref | ✓ | `stopStream()` = `getTracks().forEach(t=>t.stop())` + `streamRef.current=null` (:35-38); unmount cleanup `useEffect(() => stopStream, [])` (:43); called in `capture()` (:99) and `cancelCamera()` (:104-107). |
| `bun run typecheck` passes | ✓ | Ran `bun run typecheck`: `$ tsc --noEmit`, exit code 0, no errors. |
| Zero console errors on load; no getUserMedia on mount; silent rejection | ✓ | getUserMedia reachable only via `openCamera()` bound to onClick (:158) — not in any mount effect; mount effects (:43, :47-55) never call it; catch branch (:76-83) has no `console.*`/re-throw; `video.play()` rejection swallowed (:51-53); no `console.*` anywhere in the file. |

**Commands run:**
- `grep -n "capture__video|actions--center" src/styles.css`
- `bun run typecheck`
- `git --no-pager diff HEAD --stat`

**Notes:** All 5 ACs verified against source. Changed files: `src/components/PhotoCapture.tsx` (rewrite to idle/live two-mode component) and `src/styles.css` (+13 lines: `.capture__video`, `.actions--center`). Browser-runtime ACs verified by static code trace; headless smoke cannot exercise a real camera (ticket Notes acknowledge this), but the load path smoke exercises has no mount-time getUserMedia and no console-error sources.

### Smoke Check

**Headless Chromium:** SKIPPED (playwright driver not provisioned in this chaos worktree's `.weave` — `{"status":"skipped","reason":"playwright not installed in .weave — run: bun run install:browsers"}`; exit 0)

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | Skipped: no Playwright driver in worktree `.weave/node_modules` (gitignored, not copied into the worktree). A skip is not a failure (smoke gate exits 0). |

**Captured console errors (verbatim):** none (smoke did not run).

A symlinked-driver workaround was attempted to force a real run; the headless Chromium launch was SIGKILL'd (exit 137, no output) under the sandbox's memory/process limits — an environment constraint, not a defect. AC5 (zero console errors on load) was instead verified statically: `getUserMedia` is never invoked on the initial render the smoke would exercise, and the file contains no `console.*` calls.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `openCamera()` getUserMedia on click→live `<video>`; `capture()` drawImage→`toDataURL('image/jpeg',0.9)`→`onPhoto` (PhotoCapture.tsx:70-101); output satisfies `splitDataUrl` regex (api.ts:44); file-input fallback preserved verbatim (:109-120,180-188); `onPhoto` signature unchanged (:3-6), App.tsx:71 consumer untouched. |
| Context constraints | ✓ | Rule#1: no `VITE_`/`GEMINI`/`process.env`/`import.meta.env`/`apiKey` in changed files (grep exit 1). Rule#2: no `fetch(` in component; `api.ts`/`types.ts` unchanged. Rule#3: getUserMedia only via onClick (:158), not in mount effects; catch + `video.play().catch` silent, no `console.*` anywhere → load console-clean. Rule#4: no vite.config/manifest/SW/package.json in diff. Out-of-scope respected. |
| Sprawl | ✓ | `git diff HEAD --stat` = exactly `src/components/PhotoCapture.tsx` (+164/-16) and `src/styles.css` (+13) — both in `files_touched`; no extra files. |
| Follow-up surfacing | ✓ | One non-blocking observation: `capture()` silently no-ops before stream warmup (PhotoCapture.tsx `if (!w||!h) return;`). Filed as TKT-111 (deferred). |
| Architecture coherence (chaos) | ✓ | ADR-001 spine untouched (client-only, `onPhoto` seam, single `api.ts` fetch module unmodified); reuses `--radius`/`--border` tokens + existing `.btn`/`.capture`/`.actions` classes (`.actions--center` is an additive modifier, not a parallel pattern); no npm dependency added; data URL keeps the `data:<mime>;base64,<data>` shape `splitDataUrl` requires; correct React idioms (refs for imperative DOM, effect cleanup for `track.stop()`). |

**Suggested new tickets:** 1 — TKT-111 "PhotoCapture: feedback when capture fires before the camera stream warms up" (ordering: defer-to-backlog, `depends_on: TKT-101`).

**Reviewer notes:** All five axes pass; no blockers. The user-gated "Open camera" deviation from an auto-start plan is the correct call under Hard Rule #3 and is documented. Smoke was SKIPPED (no Playwright driver in the worktree's `.weave`) — an environment constraint; AC5's load-path claim holds under static trace (getUserMedia never invoked on initial render, no `console.*` sinks).
