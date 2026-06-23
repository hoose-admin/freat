// Inbound Web Share Target — page side (TKT-134).
//
// When Freat is launched from the OS share sheet, public/share-target-sw.js has
// already received the POST, stashed the shared image in Cache Storage, and
// 303-redirected to /?share-target. This module reads that image back on launch.
//
// This is a Cache-Storage↔page bridge, NOT a network call — so it deliberately
// lives here and NOT in src/lib/api.ts (CLAUDE.md rule 2: api.ts is only for the
// /api/* Gemini proxy; there is no new route and no Gemini key here). The three
// constants below are the shared contract with public/share-target-sw.js — keep
// them in sync across both files.
const SHARE_PARAM = "share-target";
const SHARE_CACHE = "freat-share-target";
const SHARE_KEY = "/__shared-image";

/**
 * If this launch came from the OS share sheet (URL carries `?share-target`),
 * return the shared image as a `data:` URL — the same shape PhotoCapture's
 * FileReader produces, so it feeds straight into the existing analyze flow. The
 * cache entry and the URL param are cleared so a reload never re-triggers.
 *
 * Returns `null` (and touches NOTHING) on a plain load with no `?share-target`
 * param — keeping a normal "/" load side-effect-free so AI stays lazy and the
 * smoke gate sees zero Gemini calls / console errors (CLAUDE.md rule 3).
 */
export async function consumeSharedImage(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  // Fast no-op BEFORE any Cache Storage access: not a share launch → nothing to do.
  if (!params.has(SHARE_PARAM)) return null;

  // We are handling the share launch — strip the param immediately so a reload (or
  // the user navigating back) can't re-enter this path, even if the cache is empty.
  clearShareParam();

  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const res = await cache.match(SHARE_KEY);
    if (!res) return null;
    const blob = await res.blob();
    // One-shot: drop the cached image so it's analyzed once, not on every launch.
    await cache.delete(SHARE_KEY);
    return await blobToDataUrl(blob);
  } catch {
    // Cache Storage unavailable / blocked — degrade to "no shared image" silently
    // (no console error → smoke stays green).
    return null;
  }
}

function clearShareParam(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(SHARE_PARAM);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    /* history API unavailable — harmless; the param just lingers in the address bar */
  }
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
