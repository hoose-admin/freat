---
id: TKT-136
title: "Offer a retake when analyze returns a suspiciously thin ingredient list"
status: "Todo"
priority: "Low"
assignee: "Claude-Agent"
created: 2026-06-21
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: []
blocks: []
related: [TKT-103]
files_touched:
  - "src/App.tsx"
  - "src/styles.css"
complexity: 1
next_step_hint: Human review: thin-result retake nudge validated (all 5 axes pass incl. architecture coherence); approve to land the chaos/TKT-136 branch.
---

## Objective
When analyze returns a **suspiciously thin** result (very few items and/or low mean
confidence), show a friendly inline "Only spotted a few things — retake with the door
fully open?" prompt offering Retake / Keep-going, instead of silently dropping the user
into a near-empty ingredient list.

## Context
`analyzeIngredients` can legitimately return very few items for a blurry/closed/dark
photo (`server/gemini.ts:80-106`), and `handlePhoto` drops the user into the ingredient
screen regardless (`src/App.tsx:23-25`). A first-timer who sees "2 ingredients" blames
the product when the real culprit was the photo. Branch on `found.length` (and optionally
the mean of the already-present `confidence` field, `src/lib/types.ts:9`) and reuse the
existing `reset()` (`src/App.tsx:47`) to re-enter capture. Pure client; no API or types
change. Distinct from TKT-103's *empty* state — this targets the weak-but-nonempty case.

## Acceptance Criteria
- [ ] After analyze, a **thin nonempty** result — `found.length` of 1–2, **or** (every item carries a numeric `confidence` and their mean is `< 0.5`) — renders an inline retake prompt directly above `IngredientList` in the ingredients phase.
- [ ] "Retake" returns to the capture screen (reuses the existing `reset()`, `src/App.tsx:47`); "Keep going" dismisses the prompt and leaves the ingredient list interactive.
- [ ] A healthy result (≥ 3 items with no confidence signal, or a decent mean confidence) shows **no** prompt; a 0-item result also shows **no** retake prompt (that case is TKT-103's empty state) — no false positives on good photos.
- [ ] No change to `src/lib/api.ts`, `src/lib/types.ts`, `/api/*`, or `server/*`; `bun run typecheck` passes; the app renders `/` with zero console errors when no Gemini key is set.

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 4 bullets rewritten for verifiability — the thin heuristic is now an exact spec (`length 1–2` OR all-items-numeric mean `< 0.5`), the empty (0-item) case is explicitly excluded as a no-prompt outcome, and the no-touch surface is enumerated (`api.ts`/`types.ts`/`/api/*`/`server/*`) alongside `typecheck` + zero-console-error gates.
- **Blockers:** ok — `depends_on: []`. `TKT-103` is `related` only and sits in `5-validating/` (non-blocking); the two are deliberately non-overlapping (thin-nonempty vs. empty).
- **Context drift:** ok — all citations re-verified against the worktree: `server/gemini.ts:80-106` (`analyzeIngredients`, with `confidence` coerced to `number | undefined` at `:104`), `src/App.tsx:23-25` (`handlePhoto` set-and-advance), `src/App.tsx:47` (`reset()`), `src/lib/types.ts:9` (`Ingredient.confidence`).
- **Complexity:** confirmed 1 (trivial) — single-component branch in `App.tsx` + a small CSS notice variant; no contract/server/types change.

**Verdict:** build-ready

## Out of Scope
- The **empty** (zero-ingredient) result — that is TKT-103's helpful empty state. This ticket
  only fires on the weak-but-**nonempty** case (1–2 items, or many low-confidence items).
- Any change to `server/gemini.ts`, the `/api/*` contract, `src/lib/types.ts`, or `src/lib/api.ts`.
- A live Gemini call to validate — the thin/healthy branch is reachable deterministically from a
  small vs. large `found[]`, so no API key is needed for verification.

### Value Hypothesis
**Lens:** New-user onboarding
**Who benefits:** First-timers and anyone whose photo came out poorly.
**Why useful:** Converts a perceived product failure ("it barely found anything") into a
cheap second attempt, protecting the first impression.
**Plugs in at:** `src/App.tsx:23-25,47`; field `Ingredient.confidence` (`types.ts:9`).
**Score:** value m · fit h · feasibility h · novelty h


### Implementation Summary

- `src/App.tsx`: added a `thinPrompt` boolean state. `handlePhoto` now sets it via a new pure helper `isThinResult(found)` right after `setIngredients(found)` (before advancing to the ingredients phase). `reset()` and a successful `handleGetRecipes()` both clear it (so it never lingers after a retake or after the user proceeds to recipes).
- `isThinResult(items)` (module-level, beside `messageFor`): returns `false` for an empty list (that is the empty-state's job — keeps this non-overlapping with TKT-103), `true` for 1–2 items, and `true` only when **every** item carries a numeric `confidence` and the mean is `< 0.5`. The all-items-numeric guard prevents false positives on good photos where confidence is sparse/absent (`gemini.ts:104` coerces non-numbers to `undefined`).
- `src/App.tsx` JSX: an inline `role="status"` notice ("Only spotted a few things — retake with the door fully open?") renders directly above `IngredientList` in the ingredients phase, only while `thinPrompt`. **Retake** reuses the existing `reset()` (back to capture); **Keep going** dismisses via `setThinPrompt(false)` and leaves the list interactive.
- `src/styles.css`: added a neutral `.banner--notice` variant (reuses `--surface-2`/`--border` tokens; flex row that wraps) plus `.banner__msg` / `.banner__actions` — no new dependency, matches the existing `.banner` family.

**Deviations from plan:**
- None — implementation matched the staged AC. Used the existing `.banner` base + a `--notice` modifier rather than a bespoke component (leanest path; consistent with `.banner--error`).

**Implementation notes:**
- No `/api/*`, `src/lib/api.ts`, `src/lib/types.ts`, or `server/*` change — pure client (honors the ticket's no-touch surface and CLAUDE.md's one-fetch-path / lazy-AI rules).
- `isThinResult` runs only after a user-initiated analyze resolves — never on load — so the no-key `/` render stays console-clean for the smoke gate.
- `bun run typecheck` → exit 0; `bun run build` → clean (31 modules, PWA generated).


### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 1 · thin nonempty renders prompt above list | ✓ | `App.tsx:80-99` renders the `{thinPrompt && <div className="banner banner--notice">…}` notice immediately above `<IngredientList>` (`:99`) inside the `phase === "ingredients"` section. `thinPrompt` set from `isThinResult(found)` post-analyze (`:26`); `isThinResult` returns true for 1–2 items (`:147`) and for 3+ items where every item has numeric confidence with mean `< 0.5` (`:148-152`). |
| 2 · Retake resets / Keep going dismisses | ✓ | Retake `App.tsx:86` `onClick={reset}` → `reset()` (`:50-57`) sets `setPhase("capture")` (`:51`), reusing the existing reset. Keep going `:89-92` `onClick={() => setThinPrompt(false)}` only dismisses the notice; `<IngredientList>` (`:99`) stays rendered + interactive. |
| 3 · no false positives (healthy + empty) | ✓ | `isThinResult` (`:145-154`): 0 items → `return false` (`:146`, deferred to TKT-103); 3+ items with no/partial confidence → `.every(typeof === "number")` false (`:149`) → `return false` (`:153`); 3+ all-numeric mean ≥ 0.5 → `:151` false → `return false`. No prompt on good photos. |
| 4 · scope / typecheck / no-key clean | ✓ | `git diff --name-only` = exactly `src/App.tsx` + `src/styles.css` (no api.ts/types.ts/server/* change). `bun run typecheck` (`tsc --noEmit`) → exit 0. `analyzeFridge` called only inside `handlePhoto` (`:24`), wired to `PhotoCapture`'s file-input change (a user action); no `useEffect`/mount-time analyze; `thinPrompt` defaults false → `/` renders console-clean with no key. |

**Commands run:**
- `git diff --name-only`
- `git diff --stat`
- `git diff src/styles.css`
- `bun run typecheck`
- `grep -rn "analyzeFridge|useEffect|analyze" src/`

**Notes:** All four AC pass. The mixed-confidence fallback to the count-only signal (`App.tsx:149`) is the key guard against good-photo false positives. Scope clean (2 files), typecheck green, analyze strictly user-action-driven.

### Smoke Check

**Headless Chromium:** SKIPPED — `playwright not installed in .weave — run: bun run install:browsers`

A chaos run cannot provision the browser engine (the repo-scoping guard correctly treats a machine-global browser install as a violation). Per the `test-ticket` protocol a skipped smoke is recorded as skipped and never fails the ticket. `bun .weave/scripts/smoke.ts --ticket TKT-136` returned `{"status":"skipped","reason":"playwright not installed in .weave …","routes":[],"ticketId":"TKT-136"}`. Substitute runtime evidence: the change adds no load-time AI call or spinner (analyze is strictly user-action-driven, verified above), so the runtime-error class smoke would catch on `/` is not introduced; `bun run build` is clean (31 modules, PWA generated).


### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `App.tsx:26` sets `thinPrompt` from `isThinResult(found)` after `setIngredients(found)` and before advancing phase; `:80-98` renders the `role="status"` notice with the exact ticket copy directly above `<IngredientList>` (`:99`). Retake reuses `reset()` (`:86`→`:50-57`); Keep going dismisses (`:91`) leaving the list interactive. Heuristic matches the AC spec exactly. No drift. |
| Context constraints | ✓ | All four CLAUDE.md hard rules honored: (a) no key in `src/` — `grep -rE 'VITE_|GEMINI' src/` finds only the `GEMINI_KEY_MISSING` error-code compare (`App.tsx:158`); (b) one fetch path — `fetch(` only in `src/lib/api.ts:27`, new code reads no network; (c) AI lazy — `isThinResult` runs only inside `handlePhoto` post-resolve, `thinPrompt` defaults false, no mount call → `/` console-clean with no key; (d) installable — `vite.config.ts`/manifest/SW untouched. No-touch surface respected. |
| Sprawl | ✓ | `git diff --name-only` = exactly `src/App.tsx` + `src/styles.css` (the two declared `files_touched`); +61 lines, no stray files; `bun run typecheck` exit 0. |
| Follow-up surfacing | ✓ | No correctness gap left unfixed; two deferrable polish items surfaced (see below). |
| Architecture coherence | ✓ | Honors ADR-001 fully (no client AI, no new dependency, server/api/types contract untouched, all data access still client→api.ts→/api/*). Extends established patterns: `.banner--notice` modifier parallels `.banner--error`, reuses `--surface-2`/`--border`/`--text` tokens + `.btn--ghost`/`.btn--primary`, default-export component style, reuses `reset()`. `isThinResult` is a local pure helper beside `messageFor` — no parallel/conflicting abstraction. |

**Suggested new tickets (deferred — human's call to file):**
- **Cover `isThinResult` heuristic with unit tests + justify thresholds** (defer) — the `length < 3` and `mean < 0.5` cutoffs are untested magic numbers; a small test pins the thin/healthy/empty branches and documents intent.
- **Coordinate thin-result nudge with TKT-103 empty state via a shared guard** (defer) — the non-overlap between thin (1–2) and empty (0) is enforced only by a convention comment; once TKT-103 lands, a shared predicate prevents double-handling the empty case.

**Reviewer notes:** PASS on all five axes — minimal, on-spec, scope-clean (2 files, +61 lines), typecheck-green, architecturally coherent. Independently confirmed the heuristic, the no-touch surface, the lazy-AI property, and the `confidence` coercion contract (`gemini.ts:104` → `number | undefined`, which the all-numeric guard relies on). Smoke legitimately skipped (no provisioned browser) per protocol. The two suggested tickets are deferrable polish, not blockers.
