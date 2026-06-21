import { defineConfig } from "vite";

// In dev, vite serves the frontend and proxies /api to the bun server.
export default defineConfig({
  server: { proxy: { "/api": "http://localhost:8787" } },
});
