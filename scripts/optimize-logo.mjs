// Generates the optimized logo files in public/images/logo/ (and the full-size
// final-expense-guy-logo.png used for structured data) from the original
// WordPress PNG (kept unchanged at its original path). Same image, resized,
// with one approved color change (Randy, October 2026): the logo's blues
// (navy "FINAL", "GUY" and the tagline; bright blue "EXPENSE") become the
// homepage heritage green #173F35. Each blue pixel keeps its mix with white,
// so the white letter outlines and anti-aliased edges are unchanged; every
// other pixel and all transparency are untouched. No crop or other change.
// Run after replacing the source logo: node scripts/optimize-logo.mjs
import sharp from 'sharp';

const SRC = 'public/wp-content/uploads/2026/09/FINAL-EXPENSE-GUY-LOGO-340-X-250.png';
const OUT = 'public/images/logo/final-expense-guy-logo';
const WIDTHS = [400, 800, 1200, 1600];
const GREEN = [0x17, 0x3f, 0x35];

// Resize first (exactly as before, so transparency is unchanged), then recolor.
// Without a width: the full-size original (no resize).
async function recolored(width) {
  const src = width ? sharp(SRC).resize({ width }) : sharp(SRC);
  const { data, info } = await src.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, , b] = [data[i], data[i + 1], data[i + 2]];
    // Blue ink (or ink blended with the white outline): blue clearly above red.
    if (b - r <= 15) continue;
    // Both blues have red ≈ 0 and the outline is white, so red measures how
    // much white is mixed in.
    const ink = 1 - r / 255;
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(GREEN[c] * ink + 255 * (1 - ink));
  }
  return sharp(data, { raw: info });
}

for (const w of WIDTHS) {
  const img = await recolored(w);
  await img.clone().avif({ quality: 80, effort: 6 }).toFile(`${OUT}-${w}.avif`);
  await img.clone().webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(`${OUT}-${w}.webp`);
}
// Full-size green PNG: the stable logo URL for structured data (site.logo.src).
await (await recolored()).png({ compressionLevel: 9 }).toFile(`${OUT}.png`);
console.log('Wrote', WIDTHS.map((w) => `${OUT}-${w}.{avif,webp}`).join(', '), `and ${OUT}.png`);
