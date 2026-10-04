// Generates the optimized logo files in public/images/logo/ from the original
// WordPress PNG (kept unchanged at its original path). Same image, resized
// only — no crop, recolor or other visual change.
// Run after replacing the source logo: node scripts/optimize-logo.mjs
import sharp from 'sharp';

const SRC = 'public/wp-content/uploads/2026/09/FINAL-EXPENSE-GUY-LOGO-340-X-250.png';
const OUT = 'public/images/logo/final-expense-guy-logo';
const WIDTHS = [400, 800, 1200, 1600];

for (const w of WIDTHS) {
  const img = sharp(SRC).resize({ width: w });
  await img.clone().avif({ quality: 80, effort: 6 }).toFile(`${OUT}-${w}.avif`);
  await img.clone().webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(`${OUT}-${w}.webp`);
}
console.log('Wrote', WIDTHS.map((w) => `${OUT}-${w}.{avif,webp}`).join(', '));
