// Inbound Web Share Target — service-worker side (TKT-134).
//
// Workbox's importScripts() (vite.config.ts → workbox.importScripts) injects this
// classic script at the TOP of the generated sw.js, BEFORE precacheAndRoute / the
// NavigationRoute / the /api NetworkOnly route. The Workbox Router only matches GET
// requests, so this POST handler for /share-target is the sole owner of the share
// navigation and never collides with the precache, nav-fallback, or /api routing —
// the generated SW stays byte-for-byte intact (CLAUDE.md rule 4: extend, don't fork).
//
// An image Web Share Target is spec'd as POST multipart/form-data to a
// manifest-declared action; only a service-worker fetch handler can receive it.
// Here we stash the shared file in Cache Storage and 303-redirect to /?share-target,
// where the page (src/lib/shareTarget.ts) reads it back. NOTE: the three constants
// below are the shared contract with src/lib/shareTarget.ts — keep them in sync.
const SHARE_TARGET_ROUTE = "/share-target";
const SHARE_CACHE = "freat-share-target";
const SHARE_KEY = "/__shared-image";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only the inbound share POST is ours. Returning without respondWith() lets every
  // other request (all GETs) fall through to the Workbox-generated routing below.
  if (request.method !== "POST") return;
  const url = new URL(request.url);
  if (url.pathname !== SHARE_TARGET_ROUTE) return;

  event.respondWith(
    (async () => {
      try {
        const form = await request.formData();
        const image = form.get("image");
        if (image && typeof image !== "string") {
          const cache = await caches.open(SHARE_CACHE);
          await cache.put(SHARE_KEY, new Response(image));
        }
      } catch {
        // A malformed share (no file / unreadable form) should still land the user
        // in the app rather than erroring; the page no-ops when the cache is empty.
      }
      // 303 so the browser re-issues the navigation as a GET to the app shell.
      return Response.redirect(
        new URL("/?share-target", self.location.origin).href,
        303,
      );
    })(),
  );
});
