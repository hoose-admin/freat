---
id: TKT-123
title: "Decide/announce PhotoCapture's transient \"Reading photo…\" state to screen readers"
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
related: [TKT-117, TKT-110]
files_touched:
  - "src/components/PhotoCapture.tsx"
complexity: 1
next_step_hint: Human review: option-b (intentionally-silent) decision + comment landed; re-run smoke with a provisioned browser before merge.
---

## Objective

The capture flow has one async sub-step still silent to screen-reader users: while
`PhotoCapture` reads the chosen file (`FileReader`), the button shows "Reading
photo…" but nothing is announced. TKT-117 deliberately scoped this out (it is
transient and immediately followed by App's "Analyzing photo…" polite
announcement). Decide whether the gap matters and, if so, announce it.

## Context

- `src/components/PhotoCapture.tsx:14-32` — `reading` state set true in `onFile`
  before `FileReader.readAsDataURL`; the trigger button label flips to "Reading
  photo…" (`PhotoCapture.tsx:46`) but there is no `aria-live` channel here. On
  load the reader fires `onPhoto`; the parent then starts the analyze call.
- **Build-context drift (verified against this worktree, off `main` @ `6fff4df`):**
  the App polite `role="status"` live region this ticket's option (a) wants to
  reuse does **not** exist here — it lives only on TKT-117's *unmerged*
  `5-validating` branch (`grep -n "role=\"status\"" src/App.tsx` → no match; only
  `aria-busy` at `App.tsx:64` and the assertive `role="alert"` banner at
  `App.tsx:66` are present). So option (a) is **not** cleanly buildable in
  isolation here: it would require either reconstructing TKT-117's whole App
  live-region apparatus in this branch (a third branch stacking the same region:
  TKT-110 → TKT-117 → here) or adding a forbidden second/component-local region.
- TKT-117 (`5-validating/`) explicitly scoped this exact state **out** as
  "transient, visual-only … immediately followed by the 'Analyzing photo…'
  announcement; no separate SR announcement added" (TKT-117 Out of Scope).
- Keep CLAUDE.md hard rules: one data-fetching path; **no** new/competing
  `aria-live` region (avoid two ways to do the same a11y job); AI is lazy (no
  Gemini-on-load — keyless smoke must stay green).

## Acceptance criteria

- **A decision is recorded** as an `### Autonomous Decision` block in this ticket
  body, naming the chosen option (a: announce / b: intentionally-silent) and its
  rationale with evidence.
- **If (a) announce:** the transient "Reading photo…" message is routed through
  the **existing** App polite `role="status"` region (set once, then
  overwritten/cleared by "Analyzing photo…"); **no** new/second `aria-live`
  region is added anywhere in `src/` (`grep -rn "aria-live\|role=\"status\"" src/`
  shows exactly one polite region); `bun run typecheck` passes.
- **If (b) intentionally-silent:** the rationale is recorded (per the decision
  block) **and** a code comment in `src/components/PhotoCapture.tsx` near the
  `reading` state / `onFile` marks the state as deliberately not announced and
  cross-references this ticket, so a future a11y scan does not re-flag it; **no**
  `aria-live` region is added; `bun run typecheck` still passes (a comment-only
  change must not break the build).
- The capture view renders with **zero console errors** when no Gemini key is
  configured (headless smoke stays green); no Gemini call is added on load.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 2 vague bullets rewritten into 4 independently-verifiable
  ones — the decision must be a named `### Autonomous Decision` block; the (a)
  and (b) paths each get a concrete, greppable check (single live region / code
  comment + cross-ref); a keyless-zero-console-error bullet added (smoke gate).
- **Blockers:** ok — `depends_on` empty. TKT-117/TKT-110 are `related`, not
  `depends_on`; the ticket is buildable in isolation because the chosen path
  need not consume TKT-117's unmerged region (see Context drift note).
- **Context drift:** 1 material correction — the original Context asserted the
  App polite region exists and cited `App.tsx:25`; re-verified against this
  worktree, that region is **absent** (TKT-117 unmerged). The drift is now
  documented and feeds the build decision directly.
- **Complexity:** ok — re-rated, stays 1 (trivial: a decision + at most a
  comment-only edit to one file; no new region, no new data path).

**Verdict:** build-ready

### Why this was spawned mid-stack

**Parent ticket:** TKT-117
**Trigger source:** validation-time
**What was discovered:** TKT-117's validation reviewer flagged that `PhotoCapture`'s transient FileReader "Reading photo…" state (`PhotoCapture.tsx:46`) is the one remaining silent async sub-step; TKT-117 scoped it out as transient/visual-only.
**Ordering decision:** defer-to-backlog
**Rationale:** Pure polish on top of TKT-117's live-region foundation; not required for TKT-117 to be correct, and may resolve to "intentionally silent". Build only after TKT-117 / TKT-110 land so the existing region can be reused.

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** Should `PhotoCapture`'s transient FileReader "Reading photo…" state be announced to screen readers, or documented as intentionally silent?

**Options considered:**
- **A — announce via the existing App polite live region** — restores SR/visual parity (sighted users see "Reading photo…" at `PhotoCapture.tsx:46`); WCAG 2.2 SC 4.1.3 favors surfacing status changes; reuse the single `role="status"` region (lift an `onStatus` callback up), set-then-overwritten by "Analyzing photo…".
- **B — document as intentionally silent** — the meaningful status ("working on your photo") is already announced by App's "Analyzing photo…" (TKT-117); a sub-100ms polite message is coalesced/superseded by assistive tech (announcement churn, not info); option A would require reconstructing TKT-117's *unmerged* region in-branch or a forbidden second region; ponytail/YAGNI + TKT-117 already scoped this out.

**Chosen:** B — document as intentionally silent. Decisive factors:
1. **Spec** — SC 4.1.3 governs user-meaningful status *changes*; that change is already covered by App's "Analyzing photo…" announcement fired immediately after `FileReader.onload` (`PhotoCapture.tsx:26-28`). "Reading photo…" is an implementation phase, not a distinct status.
2. **Reliability** — both viewpoint agents agree a polite message set then overwritten within ~tens of ms is debounced/coalesced by NVDA/JAWS/VoiceOver, so in the common <100ms case it never speaks, and in the slow tail it produces a "Reading… Analyzing…" stutter.
3. **Coherence** — the App polite `role="status"` region does not exist in this worktree (off `main`; `grep -n 'role="status"' src/App.tsx` → no match; only `aria-busy`@`App.tsx:64` + `role="alert"`@`App.tsx:66`). It is on TKT-117's *unmerged* branch. Option A would require reconstructing it here (a third branch stacking the same region) or a forbidden second/competing live region — the exact parallel-contract failure mode CLAUDE.md and the chaos rules forbid — all for a sub-100ms state.
4. **Ponytail/precedent** — TKT-117 already adjudicated this exact state out-of-scope with a recorded rationale; B honors and durably records it.

**Deliberation:** 2 fresh read-only senior-engineer subagents argued A and B respectively (chaos deliberation protocol). The A-advocate's own stated weaknesses (a usually-swallowed sub-50ms message; building against an absent region; reversing a sibling ticket's decision) aligned with B's strengths; judged for B on merit.

**Reversibility:** easy — to adopt A later (once TKT-117's polite region lands on `main`): add an optional `onStatus?(msg: string)` prop to `PhotoCapture`, call `onStatus?.("Reading photo…")` at `setReading(true)` in `onFile`, and wire `onStatus={setStatus}` on `<PhotoCapture>` in `App.tsx`. No structural change; the existing region absorbs it (set-then-overwritten).

### Implementation Summary

- **Decision-only change with durable in-code documentation.** Resolved the ticket's decision to option (b) intentionally-silent and recorded it as the `### Autonomous Decision` block above.
- Added an 8-line a11y comment in `src/components/PhotoCapture.tsx` immediately above the `reading` state (`const [reading, setReading] = useState(false)`), explaining *why* the transient "Reading photo…" state is deliberately not announced (sub-100ms / coalesced by ATs / meaningful status covered by TKT-117's "Analyzing photo…" / a second region is CLAUDE.md-forbidden) and cross-referencing TKT-123, so a future a11y scan (e.g. the `a11y-audit` STATIC pass) does not re-flag the busy-state-without-announcement.
- **No `aria-live` region added** (none existed in this branch; none introduced); no change to the data-fetching path; no Gemini-on-load.

**Deviations from plan:**
- None of substance. The change is confined to a comment in `src/components/PhotoCapture.tsx`, as the (b) path specifies.

**Implementation notes:**
- `bun run typecheck` (`tsc --noEmit`) exits 0 — a comment-only edit does not break the build.
- Spawned follow-up **TKT-124** (`spawn-ticket-mid-flow`, defer-to-backlog): both deliberation subagents independently flagged the adjacent `reader.onerror` path (`PhotoCapture.tsx:30`) as doubly silent (no visible error, no SR announcement on a failed read) — genuinely separate scope from this busy-state decision, filed to `0-backlog`.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader — distinct from the implementer)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| Decision recorded as `### Autonomous Decision` block naming the option + rationale | ✓ | Ticket body contains `### Autonomous Decision`: "Chosen: B — document as intentionally silent" with 4-point rationale (SC 4.1.3 / reliability / coherence / ponytail) citing `PhotoCapture.tsx:26-28`, `App.tsx:64,66`. |
| Shared constraint: NO new/second `aria-live` region added in `src/` | ✓ | `grep -rn "aria-live\|role=\"status\"" src/` → zero matches; only pre-existing `App.tsx:66 role="alert"` (not in diff). `git diff -- src/` touches only a comment block in `PhotoCapture.tsx`. |
| (b) rationale recorded + code comment near `reading` state cross-refs TKT-123; no `aria-live`; typecheck passes | ✓ | `PhotoCapture.tsx` — 8-line comment directly above `const [reading, setReading] = useState(false)`: "a11y (TKT-123): the transient 'Reading photo…' state below is intentionally NOT announced … Decision recorded in TKT-123 (intentionally silent)." `bun run typecheck` → `tsc --noEmit`, EXIT_CODE=0. |
| Capture view zero console errors keyless; no Gemini-on-load added | ✓ | No `useEffect` in `src/`; `analyzeFridge`@`App.tsx:23` and `getRecipes`@`App.tsx:37` are only inside the async user-action handlers, never module/mount scope. Diff is comment-only → adds no call/render path. |

**Commands run:**
- `curl -s http://127.0.0.1:5175/api/tickets/TKT-123`
- `git diff -- src/`
- `grep -rn "aria-live\|role=\"status\"" src/`
- `grep -rn "useEffect\|analyzeFridge\|getRecipes" src/`
- `bun run typecheck` (EXIT 0)

**Notes (subagent, verbatim):** "Cold-read verification, read-only — no edits/commits/installs. All four AC pass. Note: AC4's smoke gate ('zero console errors keyless') was verified statically (comment-only diff adds no call/render path, no useEffect, typecheck clean) rather than by booting headless Chromium. The implementer also spawned follow-up TKT-124 for the adjacent silent reader.onerror path — correctly out of scope for this ticket."

### Smoke Check

**Headless Chromium:** SKIPPED — `bun .weave/scripts/smoke.ts --ticket TKT-123` → `{"status":"skipped","reason":"playwright not installed in .weave — run: bun run install:browsers","routes":[],"ticketId":"TKT-123"}`. The browser engine is not provisioned in this chaos sandbox (same systemic limitation recorded on TKT-110 / TKT-117). A skip is not a pass and never fails the ticket; a human/CI should re-run the full smoke with a provisioned browser. The change is comment-only (no runtime/render-path change), so it is incapable of introducing a console/runtime error a smoke run would catch.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, cold — distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | Decision recorded twice — `### Autonomous Decision` ("Chosen: B — intentionally silent", 4-point rationale) and a durable code comment above `const [reading, setReading] = useState(false)` ("Decision recorded in TKT-123"). Option (b) defensible: meaningful status owned by TKT-117's "Analyzing photo…" after `FileReader.onload`. |
| Context constraints | ✓ | No new `aria-live`/`role="status"` (`grep` = 0); diff is one 8-line comment hunk, no JSX/attr/fetch change; no `useEffect`; `analyzeFridge`/`getRecipes` only in async handlers (`App.tsx:23,37`). App polite region confirmed absent in this worktree (only `aria-busy`@64 + `role="alert"`@66), matching the Context premise. |
| Architecture coherence | ✓ | Avoided the parallel-live-region failure mode (grep = 0). ADR-001 (Gemini key server-side / one `/api` data path / AI on user action) untouched by a comment-only change. Declining a branch-local region keeps this branch merge-coherent with TKT-117's unmerged region; the Decision block documents the reversible `onStatus?` path to adopt (a) once TKT-117 lands. |
| Sprawl | ✓ | `git status --short` shows exactly `M src/components/PhotoCapture.tsx` = declared `files_touched`; single comment hunk, no logic touched. Other dirty entries are untracked agent scratch artifacts, out of deliverable scope. |
| Follow-up surfacing | ✓ | Adjacent silent `reader.onerror` (`PhotoCapture.tsx`) filed as **TKT-124** ([a11y, frontend, bug], `0-backlog`, related TKT-123/TKT-117), confirmed live on the board; correctly out of this ticket's busy-state scope. No other in-scope issue missed. |

**Suggested new tickets:** none (TKT-124 already filed mid-flow).

**Reviewer note (verbatim):** "The deliverable is precisely scoped (one comment hunk in the one declared file), the decision is defensible and durably recorded in both ticket and code, and it correctly avoids the parallel-live-region failure mode while staying merge-coherent with TKT-117. The smoke gate was SKIPPED (Playwright not provisioned in this sandbox — a known systemic limitation, not a regression), but the change is comment-only with no runtime/render-path delta; a human/CI should still re-run smoke with a provisioned browser before merge. All five axes pass → overall PASS."
