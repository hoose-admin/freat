## Objective
Show AI readiness **proactively**: fetch `GET /api/health` on mount and render a small
status pill in the header ("AI ready" / "AI not configured"), plus a dismissible
demo-mode banner when the key is missing — instead of only discovering it *after* a
failed photo analysis.

## Context
Today the only signal that the AI is unconfigured comes reactively, from a failed
analyze call mapped in `messageFor()` (`src/App.tsx:114-122`, code `GEMINI_KEY_MISSING`)
— so a first-runner wastes their best fridge photo discovering the app is dead. The
health route already exists and is key-safe (`server/handlers.ts:42-44` returns
`{ ok, geminiConfigured, model }` and makes **no** Gemini call), but the client never
calls it. Add a `getHealth()` helper in `src/lib/api.ts` (mirroring `analyzeFridge`)
and surface it in the header (`src/App.tsx:57-62`). Does NOT violate the "AI is lazy /
no Gemini on page load" rule — `/api/health` is not a Gemini call. Distinct from
TKT-103 (loading/empty/error states on *actions*).

## Acceptance Criteria
- [ ] `getHealth()` typed helper in `src/lib/api.ts`; called once on mount.
- [ ] Header pill reflects `geminiConfigured` (ready vs not-configured).
- [ ] When not configured, a dismissible banner explains demo mode before the user shoots a photo.
- [ ] No Gemini call on load; smoke stays green; zero console errors with no key.

### Value Hypothesis
**Lens:** New-user onboarding
**Who benefits:** First-run users and anyone running the app without a configured key.
**Why useful:** Sets honest expectations up front and saves the wasted failed round-trip
of analyzing a photo against a key that isn't there.
**Plugs in at:** `server/handlers.ts:42-44` (existing route) → new `getHealth()` in `api.ts` → `src/App.tsx:57-62`.
**Score:** value h · fit h · feasibility h · novelty h
