# Freat — Fridge to Feast

Snap a photo of your refrigerator → Gemini identifies the ingredients → you get
meal ideas. A local-first **installable PWA**.

> This file is the **architecture spine**. Chaos-mode workers have fresh context
> and cannot see each other's decisions — they rely on this file, the ADRs in
> `.tickets/ADRs/`, and the existing code to stay coherent. **Extend the
> contracts described here; never fork a parallel one.**

## Stack

- **Frontend:** React 18 + TypeScript + Vite, as a PWA via `vite-plugin-pwa`
  (Workbox service worker + web manifest, `registerType: autoUpdate`).
- **Backend:** a small **Bun server** (`server/index.ts`) that (a) serves the
  built `dist/` and (b) exposes `/api/*` — it is the **Gemini proxy**.
- **AI:** Google **Gemini** via the `@google/genai` SDK, **server-side only**
  (`server/gemini.ts`). Model: `gemini-2.5-flash` (override with `GEMINI_MODEL`).

## Layout

```
index.html              vite entry
vite.config.ts          react + PWA + dev proxy (/api → :8787)
src/
  main.tsx, App.tsx     app shell + the capture→ingredients→recipes flow
  lib/types.ts          ← SHARED API contract (client + server import this)
  lib/api.ts            ← the ONE client data-fetching module (no raw fetch in components)
  components/           PhotoCapture, IngredientList, RecipeList
server/
  index.ts              Bun.serve: static dist/ + /api/*
  handlers.ts           ← the /api/* router — add new routes HERE
  gemini.ts             ← the ONLY place the Gemini key is read
scripts/dev.ts          runs Vite + API server together
```

## Commands

- `bun run dev` — Vite (5173) + API server (8787), proxied. Use for local dev.
- `bun run build` — production build to `dist/`.
- `bun run preview` / `bun run serve` — build (if needed) + Bun server serving
  `dist/` + `/api` on `$PORT` (default **8787**). This is what smoke boots.
- `bun run typecheck` — `tsc --noEmit`. **Run before marking a ticket done.**

## The API contract (the shared spine — extend, don't fork)

Types live in `src/lib/types.ts`; the client calls them through `src/lib/api.ts`;
the server implements them in `server/handlers.ts`.

| Route | Request | Response |
|---|---|---|
| `GET /api/health` | — | `{ ok, geminiConfigured, model }` |
| `POST /api/analyze` | `{ image: base64, mimeType }` | `{ ingredients: Ingredient[] }` |
| `POST /api/recipes` | `{ ingredients: string[], preferences? }` | `{ recipes: Recipe[] }` |

Errors are `{ error, code }` with a real HTTP status. `code: "GEMINI_KEY_MISSING"`
→ 503; the UI shows a friendly "add your key" message.

## Hard rules (do not violate)

1. **The Gemini API key NEVER reaches the browser.** It is read only in
   `server/gemini.ts` from `process.env` (`GEMINI_API_KEY` first; a few aliases
   accepted). **Never** prefix it `VITE_` and **never** reference it from `src/`
   — Vite would bundle it into client JS. All AI calls go through `/api/*`.
2. **One data-fetching path.** Client → `src/lib/api.ts` → `/api/*`. Components
   never call `fetch` directly. Add new endpoints in `handlers.ts` + a typed
   helper in `api.ts` + types in `types.ts`, together, in one ticket.
3. **AI is lazy.** Never call Gemini on page load — only on a user action. The
   app (and every route) must render with **zero console errors** when no key is
   configured, so the smoke gate stays green.
4. **Stay installable.** Don't break the manifest or service worker; keep
   `/api/*` out of the precache (it's `NetworkOnly` — see `vite.config.ts`).

> **Current state:** `GEMINI_API_KEY` is present in `.env` but **empty** — set it
> to a real key (from Google AI Studio) and restart the server; the proxy picks
> it up automatically. The app builds and runs without it; only live
> analyze/recipe calls need it. A ticket that genuinely needs a live AI call to
> validate should `mark-stuck` until the key is set (missing-credential blocker).

---

## Working with weave

This repo is wired to **weave** — a local, file-based ticket board plus Claude
Code skills. Tracked work flows through tickets in `.tickets/`; the board is a
local dashboard (`cd .weave && bun run start` → http://127.0.0.1:5175).

- **Just find and fix things.** Don't ask permission for additive, reversible, or
  read-only changes. Ask first only for destructive/irreversible actions.
- Run tracked work through tickets via the `ticket-manager` skill.
- Keep answers and summaries short.

## Ticket lifecycle (the `.tickets/` buckets)

```
scratch → 0-backlog → 1-staging → 3-building → 4-testing → 5-validating → 6-complete → 7-archive
                                  ↘ 2-stuck (blocked) ↗
```

Each ticket is a markdown file with YAML frontmatter (`id`, `title`, `status`,
`priority`, `domain`, `complexity`, `depends_on`, `blocks`, `related`, …).
Domain for this repo is mostly `app` (UI/feature work), with `infra` and `docs`.

## Skills

`ticket-manager` (lifecycle hub), `bug-scan`, `feature-scout`, `ux-audit`,
`a11y-audit`, `smoke`, `adr-manager` / `adr-researcher`, `security`,
`skill-builder` / `skill-generator` / `skill-organizer`. Chaos mode rotates
`feature-scout` / `ux-audit` / `a11y-audit` when the backlog drains.

## Smoke (web target)

`weave.config.json` has a `smoke` block, so the `test-ticket` gate boots the app
in a headless Chromium and fails on console errors / uncaught exceptions / stuck
spinners. Run by hand: `cd .weave && bun run smoke` (needs
`bun run install:browsers` once).
