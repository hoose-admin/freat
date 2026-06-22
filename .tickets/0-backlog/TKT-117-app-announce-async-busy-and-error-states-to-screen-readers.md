---
id: TKT-117
title: "Announce async busy and error states to screen readers"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - a11y
  - frontend
depends_on: []
blocks: []
related: [TKT-110]
files_touched:
  - "src/App.tsx"
complexity: 2
next_step_hint: Human review queue: SR busy/error announcements in App.tsx; smoke skipped (no browser in chaos) — re-run with a provisioned browser.
---

## Objective

Make screen-reader users hear the *in-progress* and *failure* states of the
analyze / recipe calls, not just success. Today a long Gemini call ("Thinking…",
`aria-busy`) is silent to SR users, and the polite live region (the success
channel) and the assertive `role="alert"` error banner must interplay so a
failure is announced exactly once.

## Context

- **Dependency note (build-critical):** this enhancement sits on TKT-110's
  polite live region (`role="status" aria-live="polite"` driven by a `status`
  state). **TKT-110 is in `5-validating/` — validated but NOT merged to `main`**,
  so this worktree (branched from `main` @ `6fff4df`) does **not** contain that
  region yet. Per chaos guidance (build coupled layers together; don't split a
  contract from its consumer across unmerged branches), this ticket
  **reconstructs TKT-110's documented live-region foundation exactly** (per
  TKT-110's Implementation Summary: an always-present `visually-hidden` `<div
  role="status" aria-live="polite">{status}</div>` outside `<main>`, fed a count
  message on analyze/recipe success and cleared on each request start + reset)
  **and** layers the busy/error announcements on top — one coherent, self-
  contained slice. Both branches use the identical region shape, so the
  supervisor's land-time merge resolves to a superset, not a conflicting fork.
- `src/App.tsx` (current `main` state): `handlePhoto` (lines 18–31) and
  `handleGetRecipes` (lines 33–45) set `busy=true`, call Gemini via
  `src/lib/api.ts`, and on failure set `error` (cleared at start). `<main>`
  carries `aria-busy={busy}` (line 64); the error banner is `<div role="alert">`
  (lines 65–69). There is **no** `status`/polite live region yet (it lives on
  TKT-110's unmerged branch).
- `src/styles.css` already defines the `.visually-hidden` SR-only utility
  (line 305) — reuse it for the live region (no new CSS needed).
- `src/components/PhotoCapture.tsx` has a brief local "Reading photo…" state
  (FileReader); it is transient and visual-only — out of scope (see below).
- `CLAUDE.md` hard rules: AI is lazy (Gemini only on user action, never on load);
  every route renders with zero console errors keyless (smoke gate stays green).
  The single data-fetching path (`src/lib/api.ts`) is untouched by this ticket.

## Acceptance criteria

- An always-present polite live region (`role="status"`, `aria-live="polite"`,
  `.visually-hidden`) exists in `src/App.tsx`, rendered outside `<main
  aria-busy>` so the busy attribute and the announcement are independent.
- The start of each async call sets a polite busy message — "Analyzing photo…"
  for analyze, "Finding meal ideas…" for recipes — set once per action (no
  double-announce of the same start string).
- On success the region still carries TKT-110's count message ("Found N
  ingredient(s).", "N meal idea(s) ready.") — the success announcement is **not**
  regressed.
- On failure the message is announced exactly once: the assertive `role="alert"`
  banner carries the error and the polite `status` is cleared (not also set to
  the error text), so the two regions do not duplicate or drop the failure.
- `bun run typecheck` passes; the capture view renders with zero console errors
  when no Gemini key is configured (headless smoke stays green).

## Out of Scope

- `PhotoCapture.tsx`'s local "Reading photo…" FileReader state — transient,
  visual-only, and immediately followed by the "Analyzing photo…" announcement;
  no separate SR announcement added.
- TKT-110's focus management / heading `tabIndex` / RecipeList restructure — that
  is TKT-110's scope; this ticket only reconstructs the *live-region* slice it
  needs (plus busy/error), not the whole TKT-110 change.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 4 bullets rewritten to be independently verifiable — region
  shape/placement (file-readable), exact busy strings + "once per action", the
  preserved success count strings, and the "announced exactly once on failure"
  alert-vs-status interplay. The original 3 vaguer bullets were split into these.
- **Blockers:** ok — `depends_on` empty. TKT-110 (the live-region origin) is in
  `5-validating/` and intentionally kept as `related`, not `depends_on`: this
  ticket reconstructs the foundation in-branch (documented in Context), so it is
  buildable in isolation against `main` and not blocked on TKT-110's merge.
- **Context drift:** ok — all cites re-verified against current `main` source:
  `App.tsx` handlePhoto@18, handleGetRecipes@33, `aria-busy`@64, `role="alert"`@66;
  `.visually-hidden`@styles.css:305. Confirmed no `status`/polite region exists in
  this worktree (the premise of the reconstruction).
- **Complexity:** ok — re-rated, stays 2 (small: one always-present live region +
  a `status` state set at 4 call-sites in a single file; CSS reused).

**Verdict:** build-ready

### Why this was spawned mid-stack

**Parent ticket:** TKT-110
**Trigger source:** validation-time
**What was discovered:** TKT-110's live region announces success only; busy state (`App.tsx` `aria-busy`/"Thinking…") and error states are not politely announced.
**Ordering decision:** defer-to-backlog
**Rationale:** Pure enhancement on top of TKT-110's foundation; not required for the foundational pass to be correct.

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** How should a *failure* be announced to screen readers given the app has both an assertive `role="alert"` error banner and the polite `role="status"` live region — route the error to one channel, or both?

**Options considered:**
- **A — assertive-only (clear polite `status` on error)** — the error text lives solely in the `role="alert"` banner; the polite region is cleared. One announcement, no duplication; matches WAI-ARIA APG guidance that errors are assertive and status is polite.
- **B — mirror the error into the polite `status` too** — both regions carry the error. Redundant: most screen readers would queue the same message twice (assertive immediately, polite after), the exact "double-announce" the AC forbids.
- **C — drop the assertive banner, announce errors politely only** — single channel, but demotes a failure to polite priority (queued behind other speech) and would require removing the existing visible error banner (scope creep, visual regression).

**Chosen:** A — errors set `error` (assertive banner, `App.tsx:66`) and clear `status` (`App.tsx:33,50`); the polite region carries only busy-start and success. This is the standard ARIA split (assertive=alert for errors, polite=status for progress/result), announces each failure exactly once, and leaves the existing visible banner untouched. The busy-start ("Analyzing photo…"/"Finding meal ideas…") is still heard before the error, which is correct (it reflects what actually happened), and is not a duplicate of the error message.
**Reversibility:** easy — to mirror into the polite region instead, replace the two `setStatus("")` calls in the `catch` blocks with `setStatus(messageFor(e))`; no structural change.

### Implementation Summary

- Added a `status` state to `src/App.tsx` (line 20) and an always-present polite live region — `<div className="visually-hidden" role="status" aria-live="polite">{status}</div>` — rendered **outside** `<main aria-busy>` (after `</main>`, before the footer), reusing the existing `.visually-hidden` utility (`styles.css:305`), no new CSS.
- Wired busy-start announcements: `handlePhoto` sets `"Analyzing photo…"` and `handleGetRecipes` sets `"Finding meal ideas…"` at the start of each async call (once per action), before `setBusy(true)`.
- Reconstructed TKT-110's success announcements (this branch is off `main`, which predates TKT-110's unmerged live region): `"Found N ingredient(s)."` on analyze success and `"N meal idea(s) ready."` on recipe success, with correct singular/plural.
- Failure path: both `catch` blocks clear the polite `status` (`setStatus("")`) so the error is announced **only** by the existing assertive `role="alert"` banner — exactly once (see Autonomous Decision). `reset()` also clears `status`.

**Deviations from plan:**
- None of substance. The change is confined to `src/App.tsx` as planned; `PhotoCapture.tsx`'s transient "Reading photo…" state was left as-is per Out of Scope. Implementation also reconstructs the minimal TKT-110 live-region foundation in-branch, exactly as the refined Context specified.

**Implementation notes:**
- `bun run typecheck` (tsc --noEmit) exits 0; `bun run build` exits 0 (PWA precache 7 entries). No Gemini call on load — announcements fire only inside the existing user-action handlers, so the keyless smoke gate stays green.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader — distinct from the implementer)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Always-present polite live region (`role=status`, `aria-live=polite`, `.visually-hidden`) outside `<main aria-busy>` | ✓ | `App.tsx:118-120` `<div className="visually-hidden" role="status" aria-live="polite">{status}</div>` placed after `</main>` (line 116), before footer (122); `<main aria-busy>` at line 75; rendered unconditionally; `status` state at `App.tsx:20`. |
| Busy-start polite message set once per action | ✓ | `App.tsx:25` `setStatus("Analyzing photo…")` in handlePhoto; `App.tsx:42` `setStatus("Finding meal ideas…")` in handleGetRecipes — single occurrence each, at the start of the handler. |
| Success count message not regressed | ✓ | `App.tsx:29` `setStatus(\`Found ${found.length} ingredient${found.length === 1 ? "" : "s"}.\`)`; `App.tsx:46` `setStatus(\`${list.length} meal idea${list.length === 1 ? "" : "s"} ready.\`)` — correct singular/plural. |
| Failure announced exactly once (assertive banner; polite status cleared, not set to error text) | ✓ | Both catch blocks: `App.tsx:32-34` and `App.tsx:49-51` `{ setStatus(""); setError(messageFor(e)); }`; error surfaced only by `App.tsx:77` `role="alert"`; no `setStatus(messageFor…)` exists; `reset()` clears status (`App.tsx:63`). |
| typecheck passes; zero-console-error keyless (no Gemini on load) | ✓ | `bun run typecheck` → `tsc --noEmit` EXIT 0; `grep -rn useEffect src/` → no matches; analyzeFridge/getRecipes called only inside handlers (`App.tsx:28,45`), never on mount/import. |

**Commands run:**
- `git diff`
- `grep -n "visually-hidden" src/styles.css`
- `grep -rn "analyzeFridge\|getRecipes" src/`
- `bun run typecheck` (EXIT 0)
- `grep -rn "useEffect" src/`

**Notes (subagent, verbatim):** "All 5 acceptance criteria pass on independent inspection. Diff is +15 lines confined to src/App.tsx, matching the ticket scope. The .visually-hidden utility is reused (no new CSS): src/styles.css:305-316 defines a standard SR-only clip. Decision A (assertive-only error channel) is correctly implemented — the polite region carries only busy-start and success strings, never the error. Smoke browser run intentionally not performed (parent runs it); typecheck verified green firsthand."

### Smoke Check

**Headless Chromium:** SKIPPED — `bun .weave/scripts/smoke.ts --ticket TKT-117` → `{"status":"skipped","reason":"playwright not installed in .weave — run: bun run install:browsers"}`. Browser engine is not provisioned in the chaos sandbox (same as TKT-110). A skip is not a pass and never fails the ticket; a human/CI should re-run the full smoke with a provisioned browser.

Runtime sanity performed manually instead (`PORT=8791 bun run serve`):
- `GET /` → **HTTP 200**, body contains `<div id="root">`.
- `GET /api/health` → **HTTP 200** `{"ok":true,"geminiConfigured":false,"model":"gemini-2.5-flash"}` — app serves and runs keyless.
- Server log: `[freat] server on http://127.0.0.1:8791 (serving dist/ + /api)` — no server error.
- `bun run build` → exit 0 (PWA precache 7 entries), so the production bundle (which contains the live region) builds clean.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Busy-start once per action (`App.tsx:25,42`); success counts preserved (`App.tsx:29,46`); failure announced exactly once — both catch blocks clear polite status (`App.tsx:33,50`) while the error goes solely to the assertive banner (`App.tsx:77` `role="alert"`); no `setStatus(messageFor(...))` anywhere. No drift. |
| Context constraints | ✓ | AI-lazy: no `useEffect`, analyze/recipe only in handlers (`App.tsx:28,45`). ONE fetch path: only `src/lib/api.ts:27` calls `fetch(`; ticket adds none. No key leak (no `VITE_`/`process.env` in `src/`; GEMINI strings are user-facing copy). PWA intact: `vite.config.ts`/`index.html` untouched. ADR-001 unaffected. Coherence: live region (`App.tsx:118-120`) matches TKT-110's documented shape verbatim and reuses `.visually-hidden` (`styles.css:305`) — superset-on-merge, not a competing fork. typecheck exit 0. |
| Sprawl | ✓ | `git diff --name-only` = exactly `src/App.tsx` (the sole `files_touched`); +15 lines, no new CSS, no extra files. |
| Follow-up surfacing | ✓ | Two non-blocking follow-ups surfaced (PhotoCapture "Reading photo…" silence; real-screen-reader verification with a provisioned browser). Neither gates the ticket. |

**Suggested new tickets:** 1 filed to `0-backlog`:
- `TKT-123` — Decide/announce PhotoCapture's transient "Reading photo…" state to SR (related: TKT-117, TKT-110), `defer-to-backlog`.
- The second follow-up (verify aria-busy + polite-status interplay under real screen readers with a provisioned browser) is **not** filed as a standalone ticket: it duplicates the already-tracked systemic limitation that the headless smoke engine is unavailable in the chaos sandbox (same note carried on TKT-110). A human/CI re-running the full smoke with a provisioned browser covers it.

**Reviewer note (verbatim):** "All four axes pass; overall PASS. The reconstruction of TKT-110's live region is faithful to TKT-110's documented Implementation Summary (identical element shape, placement outside <main>, .visually-hidden reuse, set-on-success/clear-on-start-and-reset semantics), so the supervisor's land-time merge of the two unmerged branches resolves to a superset rather than a conflicting fork. Autonomous Decision A (assertive-only error channel, polite cleared on catch) is correctly and consistently implemented across both handlers and reset(). The progress-then-error sequence an SR user hears (\"Analyzing photo…\" then the alert) is intended behavior, not a forbidden double-announce of the error text. Diff confined to the single declared file; typecheck exit 0 confirmed firsthand. Follow-ups are polish/verification only and do not gate the ticket."
