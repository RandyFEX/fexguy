// Builds the homepage rate-example portraits in public/images/rate-examples/
// from the originals (image-001.png … image-006.png, 2048×1152 PNG, in the
// same order as rateExamples in src/lib/home/content.ts). The originals are
// not committed; keep them outside the repo.
//
//   node scripts/optimize-rate-example-images.mjs <folder with image-NNN.png>
//
// The full frame is kept (no cropping): the rate card's narrow photo panel
// crops with CSS (object-fit: cover plus a per-image horizontal position).
// The panel is at most about 200px tall, so the image is drawn about 360px
// wide; <name>-{640,960}.{avif,webp} cover 1x–3x screens, and <name>.jpg
// (960px) is the <img> fallback.
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const RATE_EXAMPLE_IMAGES = {
  '001': 'rate-burial-15000',
  '002': 'rate-burial-10000',
  '003': 'rate-mortgage-250000',
  '004': 'rate-mortgage-350000',
  '005': 'rate-term-1000000',
  '006': 'rate-term-500000',
};

const WIDTHS = [640, 960];
const OUT = 'public/images/rate-examples';

const src = process.argv[2];
if (src) {
  mkdirSync(OUT, { recursive: true });
  for (const [num, name] of Object.entries(RATE_EXAMPLE_IMAGES)) {
    const file = join(src, `image-${num}.png`);
    if (!existsSync(file)) {
      console.log(`skip ${num} (no ${file})`);
      continue;
    }
    const img = sharp(file);
    await img.clone().resize({ width: 960 }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);
    for (const w of WIDTHS) {
      const r = img.clone().resize({ width: w });
      await r.clone().avif({ quality: 60, effort: 6 }).toFile(`${OUT}/${name}-${w}.avif`);
      await r.clone().webp({ quality: 80, effort: 6 }).toFile(`${OUT}/${name}-${w}.webp`);
    }
    console.log(`${num} -> ${name}`);
  }
}
