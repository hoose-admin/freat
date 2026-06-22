---
id: TKT-124
title: "Announce/show PhotoCapture FileReader read-error to all users"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - a11y
  - frontend
  - bug
depends_on: []
blocks: []
related: [TKT-123, TKT-117]
files_touched:
  - "src/App.tsx"
  - "src/components/PhotoCapture.tsx"
complexity: 2
next_step_hint: Human review: read-error now routes through App's role=alert banner; re-run smoke with a provisioned browser before merge.
---

## Objective

`PhotoCapture`'s FileReader **error** path is silent to *all* users: a failed or
corrupt image read produces no visible error and no screen-reader announcement —
the trigger button just reverts to its default label. Give a read failure real,
perceivable feedback through the existing error channel.

## Context

- `src/components/PhotoCapture.tsx:30` — `reader.onerror = () => setReading(false);`
  only resets the local busy flag. It never calls `onPhoto`, so `App.handlePhoto`
  never runs, so App's `error` state / assertive `role="alert"` banner
  (`src/App.tsx:65-69`) is never set. Sighted *and* SR users get total silence on
  a read failure.
- This is **distinct from TKT-123**, which decided the transient *success-path*
  "Reading photo…" busy state is intentionally silent. The **error** path is a
  genuine feedback gap, not a transient state — surfaced by both viewpoint
  subagents during TKT-123's decision.
- Reuse the **existing** error channel (CLAUDE.md: one error path, no competing
  a11y mechanism): lift an `onError?(msg)` callback into `PhotoCapture` (mirroring
  how `onPhoto` already reports upward) or have `App` own a "couldn't read that
  image" message, routed to the assertive `role="alert"` banner. Do **not** add a
  new live region.

## Acceptance criteria

- A FileReader read failure (`reader.onerror`, `PhotoCapture.tsx:30`) surfaces a
  visible error via App's existing `error` state / `role="alert"` banner — no new
  error mechanism, no second `aria-live` region added.
- The failure is perceivable to SR users through that assertive banner (which is
  already announced); verify by inspection that the error string reaches
  `App.tsx`'s `role="alert"` element.
- `bun run typecheck` passes; the capture view still renders with zero console
  errors when no Gemini key is configured (headless smoke stays green).

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — the 3 AC bullets are already independently verifiable
  (greppable single-live-region check; an inspection trace that the read-error
  string reaches `App.tsx`'s `role="alert"` element; `bun run typecheck` + keyless
  zero-console-error smoke). No rewrite needed.
- **Blockers:** ok — `depends_on` empty. TKT-123 (`5-validating`) / TKT-117 are
  `related`, not blockers. Unlike TKT-123's *polite* region (which lived only on an
  unmerged branch), the **assertive** `role="alert"` banner this ticket reuses
  already exists in this worktree at `src/App.tsx:66` — so the fix is cleanly
  buildable in isolation.
- **Context drift:** ok — re-verified both cites cold: `PhotoCapture.tsx:30` is
  `reader.onerror = () => setReading(false);` (silent reset, no upward report);
  `src/App.tsx:65-69` is the `{error && (<div role="alert">{error}</div>)}` banner
  fed by the `error` state (`App.tsx:16`). Both current.
- **Complexity:** ok — re-rated, stays 2 (small: lift an `onError` callback into
  `PhotoCapture` mirroring `onPhoto`, call it from `reader.onerror`, wire
  `onError={setError}` in `App.tsx`; two files, no new mechanism, no data path).

**Verdict:** build-ready

### Implementation Summary

- **Lifted an `onError` callback into `PhotoCapture`** (`src/components/PhotoCapture.tsx`): added `onError: (message: string) => void` to `Props` (required, mirroring the existing `onPhoto`), destructured it in the component signature, and made `reader.onerror` call it after `setReading(false)` with the copy `"Couldn't read that image. Please try another photo."` — replacing the previously-silent `reader.onerror = () => setReading(false);`.
- **Wired it to App's existing error channel** (`src/App.tsx`): `<PhotoCapture onPhoto={handlePhoto} onError={setError} busy={busy} />` routes the read-failure message straight into App's `error` state, which already renders through the assertive `role="alert"` banner (`App.tsx:66`) — so the failure is now both visible and announced to screen readers.
- **Added a 3-line a11y comment** above `reader.onerror` explaining why the read-error path reports upward (TKT-124), so a future a11y scan sees the rationale.

**Deviations from plan:**
- Made `onError` a **required** prop (not the optional `onError?` the ticket sketched) to mirror the required `onPhoto` exactly — there is a single call site and the error channel is not genuinely optional. Functionally identical; type-safer.

**Implementation notes:**
- Reused the **existing** error mechanism end-to-end: no new `aria-live`/`role="status"` region added (`grep -rn 'aria-live|role=\"status\"' src/` → 0 matches; the only assertive region remains the pre-existing `App.tsx:66 role=\"alert\"`). No new data-fetching path; no Gemini-on-load.
- `bun run typecheck` (`tsc --noEmit`) exits 0.
- Scope held to the `reader.onerror` failure path per the AC; the theoretical `reader.result`-not-a-string branch (unreachable for `readAsDataURL`) was left untouched to avoid scope creep.

### Why this was spawned mid-stack

**Parent ticket:** TKT-123
**Trigger source:** build-time
**What was discovered:** While deciding TKT-123 (transient "Reading photo…" busy state → intentionally silent), both deliberation subagents independently flagged that the adjacent `reader.onerror` path (`PhotoCapture.tsx:30`) is doubly silent — no visible error and no SR announcement on a failed read.
**Ordering decision:** defer-to-backlog
**Rationale:** Genuinely separate scope from TKT-123's busy-state decision (error feedback, not a transient status), and not required for TKT-123 to be correct. Small, self-contained follow-up; reuses the existing error banner.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader — distinct from the implementer)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| FileReader read failure (`reader.onerror`) surfaces a visible error via App's existing `error`/`role="alert"` banner; no new mechanism, no second `aria-live` region | ✓ | `PhotoCapture.tsx:34-37` — `reader.onerror = () => { setReading(false); onError("Couldn't read that image. Please try another photo."); };`. `App.tsx:72` — `<PhotoCapture onPhoto={handlePhoto} onError={setError} busy={busy} />`. `grep -rn 'aria-live\|role="status"\|role="alert"' src` → exactly ONE region: pre-existing `App.tsx:66 role="alert"`; the `PhotoCapture.tsx:32` hit is the explanatory comment, not JSX. No `aria-live`/`role="status"` added. |
| Failure perceivable to SR users; read-error string reaches `App.tsx`'s `role="alert"` element (traced) | ✓ | Trace: `PhotoCapture.tsx:36` `onError(msg)` → `App.tsx:72` `onError={setError}` → `error` state (`App.tsx:16`) → `App.tsx:65-68` `{error && (<div className="banner banner--error" role="alert">{error}</div>)}`. The assertive (already-announced) banner renders the read-error string. |
| `bun run typecheck` passes; capture view zero console errors keyless (no Gemini-on-load added) | ✓ | `bun run typecheck` → `tsc --noEmit` EXIT=0. `grep -rn 'useEffect\|analyzeFridge\|getRecipes' src` → `analyzeFridge`/`getRecipes` only inside `async handlePhoto` (`App.tsx:23`) and `async handleGetRecipes` (`App.tsx:37`); zero `useEffect`; no module/mount-scope AI call. Diff adds only an `onError` prop/callback — no fetch, no Gemini call, no new on-load render path. |

**Commands run:**
- `git -C /Users/bx/code/freat-worktrees/chaos-TKT-124 diff`
- `grep -rn 'aria-live\|role="status"\|role="alert"' src`
- `grep -rn 'useEffect\|analyzeFridge\|getRecipes' src`
- `bun run typecheck` (EXIT 0)

**Notes (subagent, verbatim):** "Diff touches only src/App.tsx (adds onError={setError} prop) and src/components/PhotoCapture.tsx (adds required onError prop + populates reader.onerror to call it). onError was made required (not optional) to mirror onPhoto — single call site, type-safe, functionally equivalent to the ticket sketch. Reuses the existing error mechanism end-to-end; exactly one assertive region (the pre-existing App.tsx:66 role=\"alert\"); no new aria-live/role=status; no Gemini-on-load. All 3 AC pass."

### Smoke Check

**Headless Chromium:** SKIPPED — `bun .weave/scripts/smoke.ts --ticket TKT-124` → `{"status":"skipped","reason":"playwright not installed in .weave — run: bun run install:browsers","routes":[],"ticketId":"TKT-124"}`. The browser engine is not provisioned in this chaos sandbox (same systemic limitation recorded on TKT-110 / TKT-117 / TKT-123). A skip is not a pass and never fails the ticket; a human/CI should re-run the full smoke with a provisioned browser. The change adds no on-load render path — it wires a new `onError` callback that fires only on a user-triggered `FileReader` error and routes into the already-rendered `role="alert"` banner — so it is incapable of introducing a console/runtime error a smoke run on the keyless capture view would catch.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, cold — distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `PhotoCapture.tsx:34-37` replaces the silent `reader.onerror = () => setReading(false);` with one that also calls `onError("Couldn't read that image…")`; `App.tsx:72` wires `onError={setError}` → existing `error` state (`App.tsx:16`) → assertive `role="alert"` banner (`App.tsx:65-68`). Read-failure is now both visible and SR-announced — the Objective, no drift. |
| Context constraints | ✓ | Single error path reused, no competing a11y mechanism: `grep -rn 'aria-live\|role="status"\|role="alert"' src` → only the pre-existing `App.tsx:66 role="alert"` (the `PhotoCapture.tsx:32` hit is a comment). No `VITE_`/`GEMINI_API_KEY`/`process.env` in `src`. AI stays lazy: `analyzeFridge`/`getRecipes` only in async user handlers, zero `useEffect`; the new callback fires only on a user-triggered read error. `tsc --noEmit` EXIT=0. |
| Architecture coherence | ✓ | Extends the established upward-report contract: `onError: (message: string) => void` (`PhotoCapture.tsx:5`) mirrors the existing required `onPhoto` (`PhotoCapture.tsx:4`) — same pattern, not a fork; feeds App's single `error` state rather than parallel state. No new data-fetching path, so ADR-001's `/api` + `types.ts`/`api.ts` contract is untouched. Making `onError` required (vs the ticket's optional sketch) is a sound, type-safer deviation for the single call site. |
| Sprawl | ✓ | `git diff --name-only` → exactly `src/App.tsx`, `src/components/PhotoCapture.tsx` (the declared `files_touched`); `git status --porcelain` otherwise only untracked `node_modules`. Diff is +12/-3, all on the error path. No scope creep. |
| Follow-up surfacing | ✓ | `PhotoCapture.tsx:29` `if (typeof reader.result === "string") onPhoto(...)` silently drops a non-string result with no `onError` fallback — a residual silent branch consciously deferred from TKT-124's scope; filed as **TKT-125** (`0-backlog`, `related: [TKT-124]`). |

**Suggested new tickets:** 1 filed — **TKT-125** "Route PhotoCapture's non-string FileReader result through the onError channel" (defer-to-backlog).

**Reviewer note (verbatim):** "All four blocking axes pass with cited evidence. The change is a minimal, idiomatic extension of the existing onPhoto upward-report pattern into App's single role=\"alert\" error channel: no second live region, no key leakage to src, AI stays lazy, tsc clean, diff confined to declared files. Smoke was SKIPPED (Playwright unprovisioned in sandbox) — a skip, not a pass; a human/CI should re-run the full smoke before merge, though the change adds no on-load render path so console-error risk on the keyless capture view is negligible. Overall: PASS."

