// Generates the PWA / home-screen icons in public/icons/ from public/logo.svg.
//
//   node scripts/generate-icons.mjs
//
// Uses sharp (already installed as an Astro dependency). The outputs are
// committed, so this only needs re-running when the logo changes.
//
// - icon-<n>.png       "any" purpose: the logo on a rounded dark tile.
// - maskable-<n>.png   full-bleed dark square, logo inside the central 60%
//                      so every launcher mask (circle, squircle) keeps it.
// - apple-touch-icon.png  180px, opaque (iOS fills transparency with black).
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logo = readFileSync(join(root, 'public/logo.svg'));
const outDir = join(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

// --bg from src/styles/tokens.css (dark theme), matching the manifest.
const BG = '#07070f';

/** A size×size background (rounded or square) with the logo centred at `scale`. */
async function render(size, { scale, radius }) {
  const inner = Math.round(size * scale);
  const logoPng = await sharp(logo, { density: 72 * Math.ceil((inner / 64) * 2) })
    .resize(inner, inner)
    .png()
    .toBuffer();
  const r = Math.round(size * radius);
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${BG}"/></svg>`,
  );
  const offset = Math.round((size - inner) / 2);
  return sharp(bg)
    .composite([{ input: logoPng, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const jobs = [
  ['icon-192.png', 192, { scale: 0.8, radius: 0.22 }],
  ['icon-512.png', 512, { scale: 0.8, radius: 0.22 }],
  ['maskable-192.png', 192, { scale: 0.6, radius: 0 }],
  ['maskable-512.png', 512, { scale: 0.6, radius: 0 }],
  ['apple-touch-icon.png', 180, { scale: 0.72, radius: 0 }],
];

for (const [name, size, opts] of jobs) {
  const buf = await render(size, opts);
  // Square (non-rounded) icons are fully opaque: drop the alpha channel.
  const img = opts.radius === 0 ? sharp(buf).flatten({ background: BG }) : sharp(buf);
  await img.png({ compressionLevel: 9 }).toFile(join(outDir, name));
  console.log(`wrote public/icons/${name}`);
}
