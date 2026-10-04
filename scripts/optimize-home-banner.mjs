// Generates smaller copies of the homepage banner for phones/tablets into
// public/images/home/. Same image, resized only (no crop or other change);
// the original 1600x800 file stays at its WordPress path and is still used
// as the largest size.
// Run after replacing the banner: node scripts/optimize-home-banner.mjs
import sharp from 'sharp';

const SRC = 'public/wp-content/uploads/2026/06/FEXGUP-HOME-PAGE-BANNER-IMAGE-1732-X-1031-AVIF-1600x800.avif';
const OUT = 'public/images/home/home-banner';

for (const w of [800, 1200]) {
  await sharp(SRC).resize({ width: w }).avif({ quality: 70, effort: 6 }).toFile(`${OUT}-${w}.avif`);
}
console.log(`Wrote ${OUT}-800.avif, ${OUT}-1200.avif`);
