---
id: TKT-135
title: "Tappable step timers parsed from recipe text, with haptics"
status: "Complete"
priority: "Medium"
assignee: "Claude-Agent"
created: 2026-06-21
completed: 2026-06-22
domain: "app"
tags:
  - feature
  - ai-proposed
depends_on: [TKT-126]
blocks: []
related: []
files_touched:
  - "src/components/RecipeList.tsx"
  - "src/components/StepText.tsx"
  - "src/styles.css"
complexity: 3
next_step_hint: Human review: inline step timers (StepText.tsx) wired at RecipeList.tsx:42; validated, awaiting acceptance + merge with Cook Mode (TKT-126).
chaos_branch: chaos/TKT-135
merged: 2026-06-22
merge_commit: 20575aabfab6
---

## Objective
Turn passive step text into an active sous-chef: scan each recipe step for a duration
("simmer 10 minutes") and render the matched phrase as a **tappable countdown timer**,
with a haptic buzz + visible flash when it finishes.

## Context
Recipes constantly say "bake 20 min" / "rest 5 minutes" — making the user leave the app
to set a phone timer breaks cooking flow. The step strings already exist
(`src/components/RecipeList.tsx:39`, `<li>{step}</li>`), so a client-side regex
(`/(\d+)\s*(min|minute|hour|sec)/i`) can detect durations and make them interactive
with `setInterval` + `navigator.vibrate(...)` on completion. No contract change — parsing
is purely client-side over the existing `Recipe.steps`. This composes directly into the
Cook Mode step view, so it **depends on** that ticket for its primary surface.

## Acceptance Criteria
- [ ] A duration in a recipe step (`min`/`minute(s)`/`hour(s)`/`hr(s)`/`sec`/`second(s)`, e.g. "simmer 10 minutes", "bake 20 min") is detected by a client-side regex and rendered, in place, as a tappable `<button>` timer chip at the existing step surface (`src/components/RecipeList.tsx:39`, `<li>{step}</li>`); the surrounding step text is preserved verbatim.
- [ ] Tapping an idle chip starts a visible 1-second-tick countdown (MM:SS); on reaching 0 it fires `navigator.vibrate(...)` (behind a feature-detect) and shows a visible completion cue (a flash / "done" state). Tapping a running chip stops/resets it.
- [ ] Multiple chips run concurrently and independently — two durations in one recipe (or chips across different recipe cards) each keep their own countdown; a step with no duration renders as unchanged plain text (no chip, no output change).
- [ ] Where `navigator.vibrate` is absent the completion path is a silent no-op (no throw, no unhandled rejection); `bun run typecheck` passes and the headless `/` smoke is green with zero console errors when no Gemini key is configured.

### Value Hypothesis
**Lens:** Delight / platform
**Who benefits:** Anyone cooking along step-by-step.
**Why useful:** Keeps the cook inside the app instead of fumbling for the phone's clock —
the kind of detail that makes Freat feel like an appliance, not a web page.
**Plugs in at:** `src/components/RecipeList.tsx:39` + the Cook Mode step view; `navigator.vibrate`.
**Score:** value h · fit h · feasibility m · novelty h

### Pass-2 review

**Run:** 2026-06-21
**Reader:** cold (no pass-1 context carried)

- **AC tightening:** 4 bullets rewritten for independent verifiability — pinned the unit vocabulary + render surface (`RecipeList.tsx:39`), the countdown format (MM:SS) + feature-detected `navigator.vibrate` + a visible completion cue + tap-to-stop, concurrent-independent chips + unchanged non-duration text, and the green gate (`bun run typecheck` + the `/` smoke with no key; no throw on absent Vibration API).
- **Blockers:** `depends_on` TKT-126 (Cook Mode) is in `5-validating/` — validated, not yet merged to `main`. NOT a hard build blocker: the AC's primary surface is the step `<li>` at `src/components/RecipeList.tsx:39`, which exists on this branch independently of TKT-126's unmerged code; "inside Cook Mode" is an *e.g.* surface, not a required one. Plan: build a **reusable `StepText`** component wired at `RecipeList.tsx:39` now; Cook Mode adopts the same component (a one-line import) when the branches merge — no contract fork. (See the Autonomous Decision block appended at build.)
- **Context drift:** ok — `src/components/RecipeList.tsx:39` is `<li key={i}>{step}</li>` as cited; `Recipe.steps` is `string[]` at `src/lib/types.ts:32`; parsing is purely client-side over existing step strings, so no `/api` route and no `types.ts` change (per CLAUDE.md "No contract change").
- **Complexity:** 3 (medium) — confirmed. One new client component + a one-line RecipeList hook-in + CSS; no shared-contract or server change, so no decomposition.

**Verdict:** build-ready

### Implementation Summary

- Added `src/components/StepText.tsx` — a reusable component that scans a recipe step string with a client-side regex (`/\b(\d+)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi`) and renders each matched duration **in place** as a tappable `<button>` `TimerChip`; surrounding text is emitted verbatim via keyed `<Fragment>`s (no extra DOM). A step with no duration renders as unchanged plain text.
- `TimerChip` is a self-contained countdown: idle shows the matched phrase ("10 min"); tap starts a 1s-tick MM:SS countdown (`window.setInterval`); at 0 it fires `navigator.vibrate([200,100,200])` behind a `"vibrate" in navigator` feature-detect + `try/catch`, and flashes a "done" state (🔔) that auto-clears after 4s; tapping a running chip stops/resets it.
- Each chip owns its own `running`/`remaining`/`done` state, so multiple chips (two durations in one recipe, or chips across different cards) run **concurrently and independently**. Completion fires exactly once on the `running→0` transition (a dedicated effect whose deps flip `running` false so it can't re-fire); tick / completion / flash-clear are three separate effects to avoid cleanup races — StrictMode-safe (no buzz at mount).
- Wired `src/components/RecipeList.tsx:39` — the steps `<li>{step}</li>` now renders `<StepText text={step} />`; the `<details>` steps accordion and all other markup are unchanged.
- Added `.step-timer` styles to `src/styles.css`, reusing existing tokens (`--surface-2`, `--border`, `--brand`, `--text`) and the pill / `:focus-visible` conventions; a `@keyframes step-timer-flash` completion flash with a `prefers-reduced-motion` fallback.

**Deviations from plan:**
- Built the feature as a **reusable `StepText` component** wired at `RecipeList.tsx:39` (not inline) and against RecipeList alone rather than the cited "Cook Mode step view": Cook Mode (`depends_on` TKT-126) sits in `5-validating/`, not merged to `main`, so its code isn't on this branch. The reusable shape lets Cook Mode adopt the same `StepText` with a one-line import at merge — no rework, no contract fork. See the Autonomous Decision below. Easily reversible.
- Compound durations ("1 hour 30 minutes") render as two independent chips rather than one combined timer — lean, and still satisfies the multiple-concurrent-timers AC. A possible future polish, not a defect.

**Implementation notes:**
- Pure client-side per ADR-001 / CLAUDE.md: no Gemini call, no `/api` route, no `Recipe`-type change, no server edit. Timers run only on user tap, so the no-key `/` smoke stays green.
- `navigator.vibrate` is typed in `lib.dom.d.ts` (tsconfig `lib: ["ES2022","DOM","DOM.Iterable"]`), so no ambient shim; the runtime `"vibrate" in navigator` guard covers iOS Safari / desktop where the API is absent.

### Autonomous Decision

**Made:** 2026-06-21 (chaos mode — no human input)
**Question:** Given `depends_on` Cook Mode (TKT-126) is validated-but-unmerged, where should the duration-timer logic live and which surface should it target?

**Options considered:**
- **A — Inline in RecipeList** — parse + render timers directly inside the `<li>` map in `RecipeList.tsx`.
- **B — Reusable `StepText` component wired at `RecipeList.tsx:39`** — extract a step-renderer that Cook Mode can also import.
- **C — `mark-stuck` until TKT-126 merges** — treat the Cook Mode dependency as a hard blocker.

**Chosen:** B — the codebase consistently factors UI into small components (`PhotoCapture` / `IngredientList` / `RecipeList`, and TKT-126's `CookMode`), and the AC's primary surface (`src/components/RecipeList.tsx:39`) exists on this branch independently of TKT-126's unmerged code, with "inside Cook Mode" only an *e.g.* surface. A reusable `StepText` delivers the full feature now and lets Cook Mode adopt it with a one-line import at merge — extending the existing contract instead of forking one. **C is wrong:** a senior engineer can deliver the whole feature against the existing step `<li>` with no business input, so the unmerged dependency is not a blocker (chaos discriminator → proceed). Routine call — no viewpoint-agent deliberation needed; the codebase convention decides it.
**Reversibility:** easy — inlining `StepText` back into RecipeList, or pointing Cook Mode's single-step view at it, are both mechanical.

### Test Results

**Verifier:** fresh subagent (`general-purpose`, cold reader — did not implement)
**Run:** 2026-06-21
**Overall:** PASS

| AC | Pass | Evidence |
|---|---|---|
| 1: duration detected by client-side regex, rendered in place as a tappable `<button>` chip, surrounding text verbatim | ✓ | `StepText.tsx:8` `DURATION_RE=/\b(\d+)\s*(hours?\|hrs?\|minutes?\|mins?\|seconds?\|secs?)\b/gi` covers all units; regex exercise: "simmer 10 minutes"→600s, "bake 20 min"→1200s, "2 hrs"→7200s, "45 sec"→45s. Chip is `<button type="button" onClick={toggle}>` (`StepText.tsx:92-102`); text emitted verbatim via keyed `<Fragment>` (`:122,130`); wired at `RecipeList.tsx:42` inside `<li>`. |
| 2: tap idle → 1s-tick MM:SS countdown; at 0 fires feature-detected `navigator.vibrate` + visible cue; tap running stops/resets | ✓ | 1s `window.setInterval(...,1000)` gated on `running` (`:46-52`); `fmt()` MM:SS (`:16-20`); completion effect fires once on `running&&remaining<=0` → `setDone(true)+buzz()` (`:56-61`); `buzz()` guarded by `"vibrate" in navigator`+try/catch → `navigator.vibrate([200,100,200])` (`:24-32`); done flash `@keyframes step-timer-flash` (`styles.css`) + 🔔; `toggle()` stops/resets when running (`:70-80`). |
| 3: multiple chips concurrent + independent; no-duration step renders unchanged plain text | ✓ | Each `TimerChip` owns local `running/remaining/done` state (`:41-43`) → independent; "1 minute 30 seconds" → two separate `<TimerChip>`; no-duration steps ("2 cups flour", "3 eggs", "season to taste") → no chip, full text pushed as a single Fragment (`:129-131`). |
| 4: absent `navigator.vibrate` is a silent no-op; `typecheck` passes; `/` smoke green, zero console errors, no key | ✓ | `buzz()` wholly inside the feature-detect + try/catch (`:24-32`) → absent API = no throw; `bun run typecheck` exit 0; `bun run build` exit 0 (PWA precache 7 entries, `sw.js`); `grep -nE 'fetch\|GEMINI\|/api\|VITE_\|@google'` on both components → no matches; timers fire only inside `onClick→toggle` (`:95`), never at load; `git diff` of `types.ts`/`server/`/`vite.config.ts` empty (no contract/api/precache change). |

**Commands run:**
- `bun run typecheck` → exit 0
- `bun run build` → exit 0 (vite v6.4.3, PWA precache 7 entries, `sw.js` generated)
- `bun -e '<duration regex + unitToSeconds exercise over 12 sample step strings>'`
- `grep -nE 'fetch|GEMINI|/api|VITE_|@google' src/components/StepText.tsx src/components/RecipeList.tsx` → no matches (exit 1)
- `git status --porcelain`; `git diff --stat -- src/lib/types.ts server/ vite.config.ts` → empty

**Notes:** All 4 ACs pass on a cold read with cited evidence. Hard rules respected — no key/fetch/`@google`/`/api` in the client components, parsing pure client-side, no `Recipe`-type or server change, AI never called on load. Regex correctly excludes non-duration numerics ("2 cups", "3 eggs"). Completion effect is StrictMode-conscious (single fire on `running→0`). Smoke is SKIPPED (browser binaries unprovisioned), so AC4's smoke clause is verified by construction. Non-defects: compound durations render as two independent chips (acceptable per ticket); a vibrate rejected by the browser is swallowed silently as intended.

### Smoke Check

**Headless Chromium:** SKIPPED (Playwright driver not provisioned in `.weave`; `install:browsers` must not run during a chaos run — a machine-global browser download would trip the repo-scoping guard).

| Route | Result | Console | Page errors | Failed req | Notes |
|---|---|---|---|---|---|
| / | — | — | — | — | smoke status: skipped (driver absent) |

Per the test-ticket protocol a skip is NOT a pass and never fails the ticket. The production `bun run build` is clean and the timer components are pure client-side, mount with the recipe list, and run only on user tap (no Gemini call on load, `navigator.vibrate` invoked only inside `onClick`), so the `/` route renders with zero console errors by construction.

Smoke output (verbatim): `{"status":"skipped","reason":"playwright not installed in .weave — run: bun run install:browsers","routes":[],"ticketId":"TKT-135"}`

### Validation Review

**Reviewer:** fresh subagent (`general-purpose`, distinct from the test subagent)
**Run:** 2026-06-21
**Overall:** PASS

| Axis | Pass | Evidence |
|---|---|---|
| Objective fidelity | ✓ | `StepText.tsx:8` `DURATION_RE` detects durations; `:120-128` splits step text emitting the matched phrase as a real `<button>` `TimerChip` (`:92`) in place with surrounding text verbatim (keyed Fragments); 1s tick (`:46-52`), MM:SS `fmt()` (`:16-20`), completion fires `buzz()→navigator.vibrate([200,100,200])` once on `running→0` (`:56-61`) + 🔔 flash; `toggle()` stops/resets (`:70-80`). Delivers the objective verbatim, not an adjacent thing. |
| Context constraints | ✓ | `grep -nE 'fetch\|GEMINI\|/api\|VITE_\|@google\|process.env'` on both client files → no matches; `git diff --stat -- src/lib/types.ts server/ vite.config.ts` → empty (contract / proxy / precache untouched); `buzz()` feature-detects `"vibrate" in navigator` + try/catch (`:24-32`); timers fire only inside `onClick→toggle` (`:95`), never at mount (`running` starts false) → AI-lazy, zero-console-error-no-key holds; `typecheck` exit 0. ADR-001 honored (pure client). |
| Sprawl | ✓ | `git status --short` shows exactly the 3 declared files (M `RecipeList.tsx`, M `styles.css`, ?? `StepText.tsx`) matching `files_touched`; `node_modules` is an untracked build artifact, not part of the change; RecipeList diff is a 1-import + 1-line swap (`:2,41-42`); styles.css adds one isolated `.step-timer` block. No extra files. |
| Follow-up surfacing | ✓ | Two in-scope gaps, correctly deferred (not blockers): (1) Cook Mode merge reconciliation — `CookMode.tsx` is absent on this branch, so the TKT-126 view won't render `StepText` until a one-line import at merge; (2) compound durations render as two independent chips (polish beyond AC3). Both filed below. |
| Architecture coherence | ✓ | `StepText` is a small single-purpose default-export component (same shape as `PhotoCapture`/`IngredientList`/`RecipeList`) wired at the existing step surface (`RecipeList.tsx:41-42`), not a forked Cook-Mode-only path; operates purely over the unchanged `Recipe.steps: string[]` contract (`types.ts:32`, diff empty); CSS reuses existing tokens (`--surface-2`/`--border`/`--brand`/`--text`) + the `:focus-visible` convention. Building reusable `StepText` against the real surface (adoptable by Cook Mode via a one-line import at merge) extends the contract rather than forking it — a coherent, sound call. No parallel/conflicting pattern. |

**Suggested new tickets:** 2 filed (both defer-to-backlog) — TKT-147 (wire `StepText` into the Cook Mode step view at the TKT-126 merge) and TKT-148 (combine compound durations into a single timer).

**Reviewer notes (verbatim):** "All four axes plus architecture coherence pass on a cold read. Verified independently (not trusting the ticket): typecheck exit 0; grep for fetch/GEMINI/api/VITE_/@google/process.env on both client files returns no matches; types.ts/server/vite.config.ts diffs empty; all CSS tokens exist; change set == declared files_touched; CookMode.tsx confirmed absent on branch. Correctness crux (haptics fire exactly once) is sound: completion effect setRunning(false) flips its own dep so it can't re-fire, tick interval halts, running starts false so StrictMode double-mount produces no spurious buzz. Smoke was SKIPPED (Playwright driver unprovisioned, correctly not run during chaos) — AC4's smoke clause is verified by construction (pure-client, AI-lazy), the established repo posture. The two follow-ups are observations, not blockers; the Cook-Mode reconciliation is the one worth tracking so the feature isn't half-reachable post-merge."
