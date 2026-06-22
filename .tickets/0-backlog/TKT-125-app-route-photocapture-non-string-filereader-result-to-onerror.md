---
id: TKT-125
title: "Route PhotoCapture's non-string FileReader result through the onError channel"
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
related: [TKT-124, TKT-123]
files_touched:
  - "src/App.tsx"
  - "src/components/PhotoCapture.tsx"
complexity: 1
next_step_hint: Human review: non-string FileReader result now routes through App role=alert banner; re-run smoke with a provisioned browser before merge.
---

## Objective

`PhotoCapture`'s FileReader **success** path silently no-ops when `reader.result`
is not a string: the `onload` handler only calls `onPhoto` inside
`if (typeof reader.result === "string")`, with no `else`. A non-string result
therefore produces no photo and no error — a residual silent failure that mirrors
the `reader.onerror` gap TKT-124 just fixed. Route it through the same `onError`
channel for symmetry.

## Context

- `src/components/PhotoCapture.tsx:26-29` — `reader.onload` does
  `setReading(false); if (typeof reader.result === "string") onPhoto(reader.result);`.
  When `reader.result` is `null`/`ArrayBuffer` (not expected for `readAsDataURL`,
  but possible on a partial/aborted read), the branch is skipped and nothing is
  reported.
- TKT-124 (`5-validating/`) added a required `onError: (message: string) => void`
  prop wired to App's existing assertive `role="alert"` banner
  (`onError={setError}`, `App.tsx`). **Reuse that exact channel** — do NOT add a
  new error mechanism or a second `aria-live` region (CLAUDE.md: one error path).
- This was surfaced by TKT-124's validation reviewer and consciously deferred from
  TKT-124's scope (TKT-124 was scoped to the `reader.onerror` path).

## Acceptance criteria

- The `reader.onload` non-string branch routes a user-facing message through the
  **existing** `onError` callback / App `role="alert"` banner (e.g. an `else` that
  calls `onError("Couldn't read that image. Please try another photo.")`), reusing
  the channel TKT-124 added — no new error mechanism, no second `aria-live` region.
- `bun run typecheck` passes; the capture view still renders with zero console
  errors when no Gemini key is configured (headless smoke stays green).

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** none — both bullets are already independently verifiable (a `file:line` grep that the `reader.onload` else routes through the existing `onError`/`role="alert"` banner; `bun run typecheck` + keyless zero-console-error smoke). No rewrite needed.
- **Blockers:** `depends_on` empty (kept). TKT-124 (`5-validating/`) is the **source** of the `onError` prop this ticket reuses, but its code is on an unmerged sibling branch and is NOT in this worktree's base (`6fff4df`). It is recorded as `related`, not `depends_on`, because the contract is fully specified in both tickets and can be reconstructed exactly without a merge — so this is NOT a hard blocker. See the `### Autonomous Decision` block (added at build) for the reconstruct-vs-wait call.
- **Context drift:** ok — re-verified cold: `src/components/PhotoCapture.tsx:26-29` in this worktree is `reader.onload = () => { setReading(false); if (typeof reader.result === "string") onPhoto(reader.result); };` (no `else`, and crucially **no `onError` prop yet** — TKT-124's prop is absent here). `src/App.tsx:65-69` is the `{error && (<div ... role="alert">{error}</div>)}` banner fed by `error` state (`App.tsx:16`); `PhotoCapture` is mounted at `App.tsx:71` with only `onPhoto`/`busy`.
- **Complexity:** ok — stays 1 (trivial: add the `onError` prop + `onError={setError}` wiring matching TKT-124's exact shape, plus the one-line `else` branch).

**Verdict:** build-ready

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** TKT-125 reuses TKT-124's `onError` prop / `onError={setError}` wiring, but TKT-124 is in `5-validating/` on an **unmerged** sibling branch — its code is absent from this worktree's base (`6fff4df`). Reconstruct the contract here, or block on the merge?

**Options considered:**
- **A — Reconstruct TKT-124's exact `onError` contract in this branch, then add only the non-string `else`** — the contract is fully specified in both tickets (`onError: (message: string) => void` required, mirroring `onPhoto`; wired `onError={setError}` at the `PhotoCapture` mount). Matching it byte-for-byte extends the same contract rather than forking it; the eventual cross-branch merge sees identical prop/wiring lines (trivial resolution).
- **B — `mark-stuck` until TKT-124 merges** — guarantees no duplicate prop declaration, but parks a complexity-1 robustness fix on a sibling that a human reconstruct makes unnecessary; the discriminator ("could a senior engineer pick a defensible answer from the codebase alone?") is clearly YES.
- **C — Invent a new error path (local state / second region)** — rejected outright: violates CLAUDE.md's one-error-path rule and TKT-124/TKT-125's explicit "reuse the existing channel, no second `aria-live` region".

**Chosen:** A — resolved directly (clear technical call, not a true blocker, so no 3-subagent deliberation spent). Reconstructed `onError` to TKT-124's exact shape (`src/components/PhotoCapture.tsx:4-5`, `src/App.tsx:71-73`) and added only TKT-125's non-string `else` (`PhotoCapture.tsx:29-33`); left `reader.onerror = () => setReading(false);` untouched (TKT-124's lane) to minimise cross-branch divergence. `bun run typecheck` EXIT 0; exactly one error region (pre-existing `App.tsx:66 role="alert"`).
**Reversibility:** easy — if a human prefers to wait for the merge, revert this branch's prop/wiring lines; the one-line `else` is the only TKT-125-unique change and drops onto TKT-124's merged `onError` prop cleanly.

### Why this was spawned mid-stack

**Parent ticket:** TKT-124
**Trigger source:** validation-time
**What was discovered:** TKT-124's validation reviewer flagged that `PhotoCapture.tsx:29`'s `onload` success path silently drops a non-string `reader.result` with no `onError` fallback — a residual silent failure symmetric to the `reader.onerror` gap TKT-124 fixed.
**Ordering decision:** defer-to-backlog
**Rationale:** Genuinely separate from TKT-124's `reader.onerror` scope and not required for TKT-124 to be correct; the branch is practically unreachable for `readAsDataURL`, so it is low-priority robustness/symmetry work. Trivially reuses TKT-124's `onError` channel once that lands.

### Implementation Summary

- **Added the `onError` non-string fallback to `PhotoCapture`** (`src/components/PhotoCapture.tsx`): `reader.onload`'s success path now has an `else` that calls `onError("Couldn't read that image. Please try another photo.")` when `reader.result` is not a string (`PhotoCapture.tsx:29-33`) — the previously-silent branch now reports through the same channel as the read-error path. Added a 3-line comment explaining why (TKT-125).
- **Reconstructed TKT-124's exact `onError` contract** (absent from this worktree's base): added required `onError: (message: string) => void` to `Props` mirroring `onPhoto` (`PhotoCapture.tsx:4-5`), destructured it in the signature, and wired `onError={setError}` at the `PhotoCapture` mount in `App.tsx` (`App.tsx:71-73`) — routing the message into App's existing `error` state → assertive `role="alert"` banner (`App.tsx:66`).

**Deviations from plan:**
- Had to add the `onError` prop + App wiring itself, not just the `else` branch: TKT-124 (the ticket that introduced `onError`) is in `5-validating/` on an unmerged sibling branch, so its prop/wiring is not in this worktree. Reconstructed it byte-for-byte to TKT-124's shape (required prop, `onError={setError}`) so the branches converge cleanly rather than fork. Documented in the `### Autonomous Decision` block.
- Used the **same** message string TKT-124 uses for the read-error path (the AC's suggested copy), so both failure paths read identically.

**Implementation notes:**
- Reused the existing single error channel end-to-end: `grep -rn 'aria-live|role="status"|role="alert"' src` → exactly ONE region (pre-existing `App.tsx:66 role="alert"`). No new mechanism, no second `aria-live` region.
- `reader.onerror = () => setReading(false);` left untouched — that path is TKT-124's scope; touching it would duplicate TKT-124 and add cross-branch merge friction.
- `bun run typecheck` (`tsc --noEmit`) exits 0. No `GEMINI_API_KEY`/`VITE_`/`process.env` in `src`; no Gemini-on-load (the new callback fires only on a user-triggered read).

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader — distinct from the implementer)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| `reader.onload` non-string branch routes a user-facing message through the EXISTING `onError`/`role="alert"` channel; no new mechanism, no second `aria-live` region | ✓ | `PhotoCapture.tsx:32-33` — `if (typeof reader.result === "string") onPhoto(reader.result);` / `else onError("Couldn't read that image. Please try another photo.");` calls the `onError` prop added at `PhotoCapture.tsx:5`. Wired at `App.tsx:72` `<PhotoCapture onPhoto={handlePhoto} onError={setError} busy={busy} />` → `error` state (`App.tsx:16`) → `App.tsx:65-67` `{error && (<div className="banner banner--error" role="alert">{error}</div>)}`. `grep -rn 'aria-live\|role="status"\|role="alert"' src` → EXACTLY ONE hit (`App.tsx:66`). |
| `bun run typecheck` passes; capture view zero console errors keyless (AI stays lazy / smoke green) | ✓ | `bun run typecheck` → `tsc --noEmit` EXIT 0. No `useEffect` in src (nothing on mount); `analyzeFridge` only in `handlePhoto` (`App.tsx:23`), `getRecipes` only in `handleGetRecipes` (`App.tsx:37`) — user actions, not load. No key leak: only `GEMINI` hit is `e.code === "GEMINI_KEY_MISSING"` (`App.tsx:118`); no `process.env`/`VITE_` in src. New code is a synchronous `onError(...)` string call — no network/Gemini call added. Headless smoke SKIPPED (Playwright unprovisioned) — see Smoke Check; substituted by inspection. |

**Commands run:**
- `git --no-pager diff $(git merge-base HEAD main)...HEAD`
- `git --no-pager diff -- src/App.tsx src/components/PhotoCapture.tsx`
- `bun run typecheck` (EXIT 0)
- `grep -rn 'aria-live\|role="status"\|role="alert"' src`
- `grep -rn 'useEffect\|analyzeFridge\|getRecipes\|process.env\|GEMINI' src`

**Notes (subagent, verbatim):** "The change is minimal and correct: it adds an onError prop to PhotoCapture and routes the non-string FileReader result through the pre-existing App role=\"alert\" channel introduced by TKT-124, reusing the single error path mandated by CLAUDE.md. typecheck is green; exactly one live region; AI stays lazy; no key leak. The only caveat is that the work has not been committed to the chaos/TKT-125 branch — if the lifecycle gate expects a committed/pushed diff, that is an out-of-band concern (not an acceptance criterion). [Note: in chaos mode the supervisor commits the worktree after the run — expected.]"

### Smoke Check

**Headless Chromium:** SKIPPED — `bun .weave/scripts/smoke.ts --ticket TKT-125` → `{"status":"skipped","reason":"playwright not installed in .weave — run: bun run install:browsers","routes":[],"ticketId":"TKT-125"}`. The browser engine is not provisioned in this chaos sandbox (same systemic limitation recorded on TKT-110 / TKT-117 / TKT-123 / TKT-124). A skip is not a pass and never fails the ticket; a human/CI should re-run the full smoke with a provisioned browser. The change adds no on-load render path — the new `onError` call fires only on a user-triggered non-string `FileReader` result and routes into the already-rendered `role="alert"` banner — so it cannot introduce a console/runtime error a smoke run on the keyless capture view would catch.

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, cold — distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `PhotoCapture.tsx:32-33` adds the previously-absent `else onError("Couldn't read that image. Please try another photo.")` on the non-string branch; message reaches the user via `App.tsx:72` `onError={setError}` → `error` state (`App.tsx:16`) → `role="alert"` banner (`App.tsx:65-67`). Directly addresses the Objective; no drift. |
| Context constraints | ✓ | All four CLAUDE.md hard rules honored. One error path: `grep -rn 'aria-live\|role="status"\|role="alert"' src` → exactly ONE hit (`App.tsx:66`). No key in src: no `VITE_`/`GEMINI_API_KEY`/`process.env`. AI lazy: new `onError(...)` is a synchronous string call inside `reader.onload` (user-triggered); no `useEffect`/on-load AI call. Installability untouched (no manifest/SW/vite.config change). |
| Sprawl | ✓ | `git diff --name-only` → exactly `src/App.tsx` + `src/components/PhotoCapture.tsx` (= `files_touched`); `git status --porcelain` otherwise only untracked `node_modules`. Diff +6/-1, all on the FileReader success path. No scope creep. |
| Follow-up surfacing | ✓ | No in-scope issue left unfixed. `reader.onerror = () => setReading(false);` (`PhotoCapture.tsx:35`) is correctly left untouched — TKT-124's lane; touching it would duplicate TKT-124 and add cross-branch merge friction. Scoped out explicitly in the `### Autonomous Decision`. No new ticket warranted. |
| Architecture coherence (chaos-required) | ✓ | Honors ADR-001 (no data-fetching path added; `/api` + `types.ts`/`api.ts` contract untouched). Extends, not forks, the established upward-report convention: `onError: (message: string) => void` (`PhotoCapture.tsx:5`) mirrors the required `onPhoto` (`PhotoCapture.tsx:4`), feeding App's single `error` state. The reconstruct-TKT-124 decision is a clean extension: TKT-124's own Implementation Summary documents the byte-for-byte identical `onError` shape + `onError={setError}` wiring, so the two branches converge on merge (identical lines) rather than conflict; the only TKT-125-unique line is the `else`, which drops onto TKT-124's merged prop cleanly. |

**Suggested new tickets:** none.

**Reviewer note (verbatim):** "Overall PASS — all five axes pass with cited evidence. The situational risk (reconstructing TKT-124's onError contract from an unmerged sibling branch) is the right call and well-handled: the reconstructed prop/wiring is identical to TKT-124's documented shape, so a cross-branch merge resolves trivially rather than conflicting — a coherent extension of the same contract, not a divergent fork. Caveat (non-blocking): headless smoke was SKIPPED (Playwright unprovisioned in the chaos sandbox); a human/CI should re-run the full smoke with a provisioned browser before merge, though the change adds no on-load render path so console-error risk on the keyless capture view is negligible."

