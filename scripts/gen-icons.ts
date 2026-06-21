// Generates the PWA raster icons from the brand glyph and writes them to public/.
//
// Why committed PNGs (not a build-time step): the production build and smoke gate
// must stay dependency-free — `sharp` is a *local devDependency* used only here, and
// the emitted PNGs are checked in so `vite build` needs nothing extra. Re-run this
// (`bun run scripts/gen-icons.ts`) whenever the brand mark changes. See the
// "Autonomous Decision" block in TKT-107 for the rationale.
//
// Maskable spec: the background must be full-bleed (edge-to-edge, no transparency)
// and the glyph must sit inside the ~80% safe zone, so Android's maskable mask never
// clips the art. We reuse the `public/icon.svg` glyph but on a square (un-rounded)
// background and scaled to 0.8 around the centre.

import sharp from "sharp";
import { join } from "node:path";

const PUBLIC = join(import.meta.dir, "..", "public");

// Full-bleed maskable source. Background fills the whole 512×512 canvas (no rounded
// corners → no transparent corners); the glyph is scaled to 0.8 about the centre so
// it lands well inside the safe zone.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16a34a"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(0.8) translate(-256 -256)">
    <g fill="none" stroke="#eafff2" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
      <rect x="170" y="96" width="172" height="320" rx="34"/>
      <line x1="170" y1="216" x2="342" y2="216"/>
      <line x1="206" y1="150" x2="206" y2="184"/>
      <line x1="206" y1="252" x2="206" y2="300"/>
    </g>
    <circle cx="360" cy="356" r="58" fill="#eafff2"/>
    <g stroke="#16a34a" stroke-width="12" stroke-linecap="round">
      <line x1="360" y1="330" x2="360" y2="382"/>
      <line x1="334" y1="356" x2="386" y2="356"/>
    </g>
  </g>
</svg>`;

const src = Buffer.from(maskableSvg);

// [filename, size] — 192/512 maskable for the manifest, 180 for apple-touch.
const targets: [string, number][] = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of targets) {
  const out = join(PUBLIC, name);
  await sharp(src).resize(size, size).png().toFile(out);
  console.log(`wrote public/${name} (${size}×${size})`);
}
