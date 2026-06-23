## Objective
Make Freat a **Web Share Target** for images: register the PWA so it appears in the OS
share sheet, and when a user shares a fridge photo *into* Freat (Camera/Photos →
Share → Freat), the app opens pre-loaded with that image and runs analysis.

## Context
Everyone already shares photos via the OS share sheet. Letting Freat *receive* a photo
makes the natural entry point "snap in Camera → Share → Freat," skipping in-app capture
entirely. This is the inverse of the outbound recipe share (TKT-109) and genuinely new.
Add a `share_target` (`method: POST`, `enctype: multipart/form-data`, `image/*`) to the
manifest in `vite.config.ts` (the PWA config block), a small service-worker handler to
receive the POST, and a launch-time read in `src/App.tsx` that feeds the file into the
same path `PhotoCapture` already uses (`FileReader → onPhoto(dataUrl)`) → `handlePhoto`.
No `/api` change — reuses `analyzeFridge`. Must not break the manifest/SW or precache
`/api/*` (CLAUDE.md hard rule #4).

## Acceptance Criteria
- [ ] Manifest declares an image `share_target`; "Freat" appears in the share sheet for images (installed PWA).
- [ ] Shared image opens the app and routes into the existing `handlePhoto` analyze flow.
- [ ] Service worker handles the share POST without breaking offline app-shell (TKT-107) or precaching `/api/*`.
- [ ] App still boots normally when launched without a shared file; zero console errors with no key.

### Value Hypothesis
**Lens:** Integration / ecosystem
**Who benefits:** Mobile users who already live in the OS share sheet.
**Why useful:** Creates a new, frictionless OS-level entry point into the app — the
boldest reach toward feeling like a native, installed kitchen tool.
**Plugs in at:** `vite.config.ts` manifest · service worker · `src/App.tsx` (launch param) → `PhotoCapture` flow.
**Score:** value h · fit h · feasibility m · novelty h
