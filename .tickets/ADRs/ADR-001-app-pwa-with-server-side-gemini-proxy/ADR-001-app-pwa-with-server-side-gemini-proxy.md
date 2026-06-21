---
id: ADR-001
title: "PWA with a server-side Gemini proxy"
status: accepted
created: 2026-06-21
decided: 2026-06-21
deciders:
  - brendansharris
supersedes: []
superseded_by: null
related_tickets: []
proposed_tickets: []
materialized_tickets: []
tags: [architecture, pwa, gemini, security]
domain: "app"
---

### TL;DR

Freat is a React + Vite installable **PWA** whose AI features (fridge-photo →
ingredients, ingredients → recipes) are powered by **Google Gemini**. The Gemini
API key is held **only on the server**: a small Bun process serves the built app
and proxies all AI calls at `/api/*`. The browser never sees the key. Every
future feature extends this contract rather than calling Gemini from the client.

### Context

The product is "take a picture of your fridge, get meal ideas." That requires a
multimodal LLM call (image → ingredients) and a text LLM call (ingredients →
recipes). The user chose **Gemini** for all AI and a **PWA** deliverable.

A PWA is shipped to the browser. Any secret referenced by client code — including
anything Vite exposes via a `VITE_`-prefixed env var — is bundled into the
downloadable JS. Putting the Gemini key client-side would publish it. So the key
must live behind a server boundary. See `CLAUDE.md` for the file map.

### Decision

#### Approach

- **Frontend:** React 18 + TypeScript + Vite, made installable with
  `vite-plugin-pwa` (Workbox service worker + web manifest).
- **Backend:** a single Bun server (`server/index.ts`) that serves the built
  `dist/` and exposes `/api/*` (`server/handlers.ts`). `server/gemini.ts` is the
  only module that reads the key, via `@google/genai` (model `gemini-2.5-flash`,
  override `GEMINI_MODEL`).
- **Contract:** request/response types in `src/lib/types.ts`, imported by both
  sides; the client funnels all network access through `src/lib/api.ts`.
- **Dev:** Vite (5173) proxies `/api` to the Bun server (8787). Prod/smoke: one
  Bun process on one port.

#### Rationale

One server boundary keeps the key off the client (the only safe option for a
PWA), and a single shared types module + single client fetch module keeps
autonomous, fresh-context workers from inventing parallel data-fetching or API
shapes. Bun is already the repo's runtime (weave dashboard), so no new toolchain.

#### Reversibility

medium — the `/api` contract is stable; swapping Gemini for another provider, or
the Bun server for serverless functions, is contained to `server/` if the
`/api/*` shapes hold.

### Consequences

- New AI or data features add a route in `server/handlers.ts`, a typed helper in
  `src/lib/api.ts`, and types in `src/lib/types.ts` — together, in one ticket.
- Gemini is called **only on user action**, never on load, so the app renders
  with zero console errors when no key is set (keeps the smoke gate green).
- A real `GEMINI_API_KEY` must be set server-side to use live AI; without it the
  proxy returns `503 GEMINI_KEY_MISSING` and the UI degrades gracefully.

### Alternatives considered

- **Client-side Gemini calls (key in the browser).** Rejected — publishes the API
  key to anyone who opens devtools; unacceptable even for a personal app.
- **A separate serverless/edge function provider (Vercel/Cloudflare).** Rejected
  for the foundation — adds a deploy dependency and a second runtime; the local
  Bun server is simpler and matches the weave ecosystem. Revisit if/when the app
  is deployed.
- **No backend; bundle a proxy into the Vite dev server only.** Rejected — leaves
  no production path for the PWA to make AI calls.

### Comments

### Revision Log
