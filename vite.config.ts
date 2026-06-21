import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Dev: Vite serves the SPA on 5173 and proxies /api to the Bun server (8787),
// so the Gemini API key never reaches the browser. Prod/smoke: the Bun server
// (server/index.ts) serves the built dist/ AND /api on a single port.
const API_PORT = Number(process.env.API_PORT ?? 8787);

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg"],
      // The Gemini proxy must always hit the network — never serve a cached
      // response for /api/*.
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Freat — Fridge to Feast",
        short_name: "Freat",
        description: "Snap your fridge, get meal ideas powered by Gemini.",
        theme_color: "#16a34a",
        background_color: "#0b1120",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
