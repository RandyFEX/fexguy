// Builds the small copies of Randy's headshot used by the article byline and
// author bio (public/images/randy/) from the portrait the homepage's Meet
// Randy section uses. Resized only (no crop or other change).
//
//   node scripts/optimize-randy-headshot.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'public/wp-content/uploads/2025/11/RANDY-CIRCLE-IMAGE-SMALL.png';
const OUT = 'public/images/randy';
// 96: the 48px byline photo at 2x; 240: the 120px bio photo at 2x.
const WIDTHS = [96, 240];

mkdirSync(OUT, { recursive: true });
for (const w of WIDTHS) {
  const img = sharp(SRC).resize({ width: w });
  await img.clone().avif({ quality: 60, effort: 6 }).toFile(`${OUT}/randy-vandervaate-${w}.avif`);
  await img.clone().webp({ quality: 82 }).toFile(`${OUT}/randy-vandervaate-${w}.webp`);
  await img.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/randy-vandervaate-${w}.jpg`);
}
console.log(`Wrote ${OUT}/randy-vandervaate-{${WIDTHS.join(',')}}.{avif,webp,jpg}`);
