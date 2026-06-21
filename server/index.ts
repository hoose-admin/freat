// The Bun server. Two jobs:
//   1. Serve /api/* (the Gemini proxy — see handlers.ts).
//   2. Serve the built SPA from dist/ with an index.html fallback, when dist/
//      exists (prod / `bun run preview` / smoke). In dev (no dist/) Vite serves
//      the SPA and proxies /api here.
//
// One port for everything in prod/smoke. PORT env (default 8787 so it doesn't
// collide with the weave dashboard on 5174/5175 or Vite on 5173).

import { join, normalize } from "node:path";
import { existsSync } from "node:fs";
import { handleApi } from "./handlers.ts";

const PORT = Number(process.env.PORT ?? 8787);
const DIST = join(import.meta.dir, "..", "dist");
const hasDist = existsSync(DIST);

async function serveStatic(url: URL): Promise<Response | null> {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = normalize(join(DIST, pathname));
  // Path-traversal guard: never serve outside dist/.
  if (filePath !== DIST && !filePath.startsWith(DIST + "/")) {
    return new Response("Forbidden", { status: 403 });
  }
  const file = Bun.file(filePath);
  if (await file.exists()) return new Response(file);
  // SPA fallback — let the client router handle unknown paths.
  const index = Bun.file(join(DIST, "index.html"));
  if (await index.exists()) {
    return new Response(index, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  return null;
}

const server = Bun.serve({
  port: PORT,
  idleTimeout: 120, // Gemini vision calls can take a while
  async fetch(req) {
    const apiResponse = await handleApi(req);
    if (apiResponse) return apiResponse;

    if (hasDist) {
      const staticResponse = await serveStatic(new URL(req.url));
      if (staticResponse) return staticResponse;
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(
  `[freat] server on http://127.0.0.1:${server.port} ` +
    `(${hasDist ? "serving dist/ + /api" : "API only — run Vite for the UI in dev"})`,
);
