# freat 🍳

Open your fridge, point your phone, get dinner. A PWA that identifies ingredients from a
photo (Claude vision) and suggests recipes from what you actually have.

## Stack
- **Vite** — frontend build + dev server (vanilla JS, no framework, zero runtime deps)
- **Bun** — runs the backend (`server.js`) that proxies Anthropic and serves the built PWA
- **Claude (`claude-opus-4-8`)** — vision for ingredient detection, structured JSON for recipes

The API key lives only on the server — the browser never sees it.

## Setup
```bash
bun install
cp .env.example .env        # add your ANTHROPIC_API_KEY
```

## Develop
```bash
bun run dev                 # bun API server (:3000) + vite (:5173) — open the vite URL
```
Vite proxies `/api` to the bun server.

## Production
```bash
bun run preview             # builds, then serves everything from :3000
```
Open http://localhost:3000 (use HTTPS in deployment so the camera + service worker work).

## Flow
1. **Scan your fridge** — native camera (`<input capture>`); the image is downscaled client-side before upload.
2. **Edit the list** — add/remove ingredient chips; the AI isn't perfect.
3. **Find recipes** — pick a diet, get cards with cook time, what you *have* (green) vs *need* (amber), and steps.

Ingredients + diet persist in `localStorage`. Installable & launches offline (recipe generation needs network).

## Knobs
- `MODEL` — defaults to `claude-opus-4-8`; set `claude-haiku-4-5` to cut cost.
- `PORT` — server port (default 3000).
- Image max dimension / quality: `fileToBase64()` in `src/main.js`.
