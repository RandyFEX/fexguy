// Builds the article header images in public/images/articles/ from the
// generated originals (image-001.png … image-026.png, 2048×1152 PNG).
// The originals are not committed; keep them outside the repo.
//
//   node scripts/optimize-article-images.mjs <folder with image-NNN.png>
//
// For each image it writes <name>.jpg (full size: <img> fallback and the
// og/twitter/JSON-LD image) plus <name>-{800,1200,1600}.{avif,webp} for the
// <picture> sources. Images missing from the folder are skipped.
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const ARTICLE_IMAGES = {
  '001': 'burial-insurance-high-cholesterol',
  '002': 'american-amicable-burial-insurance-review',
  '003': 'life-insurance-height-weight-guidelines',
  '004': 'americo-quit-smoking-advantage',
  '005': 'how-much-does-a-cremation-cost',
  '006': 'cremation-questions-save-money',
  '007': 'guaranteed-issue-life-insurance-seniors',
  '008': 'senior-legacy-vs-senior-legacy-life',
  '009': 'elks-lodge-life-insurance-options',
  '010': 'final-expense-insurance-vs-dave-ramsey',
  '011': 'final-expense-insurance-retired-truckers',
  '012': 'final-expense-insurance-medicaid',
  '013': 'final-expense-life-insurance-widows',
  '014': 'globe-life-term-life-price-increases',
  '015': 'how-life-insurance-build-charts-work',
  '016': 'iul-church-members-faith-based-communities',
  '017': 'iul-for-teachers',
  '018': 'lions-club-member-life-insurance-options',
  '020': 'prepaid-caskets-pros-cons',
  '021': 'term-life-insurance-doctors',
  '022': 'term-life-insurance-truck-drivers',
  '023': 'vfw-life-insurance-options',
  '024': 'burial-vs-cremation-pros-cons',
  '025': 'final-expense-life-insurance-no-exam',
  '026': 'final-expense-whole-life-insurance-complete-guide',
};

const WIDTHS = [800, 1200, 1600];
const OUT = 'public/images/articles';

const src = process.argv[2];
if (src) {
  mkdirSync(OUT, { recursive: true });
  for (const [num, name] of Object.entries(ARTICLE_IMAGES)) {
    const file = join(src, `image-${num}.png`);
    if (!existsSync(file)) {
      console.log(`skip ${num} (no ${file})`);
      continue;
    }
    const img = sharp(file);
    await img.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);
    for (const w of WIDTHS) {
      const r = img.clone().resize({ width: w });
      await r.clone().avif({ quality: 60, effort: 6 }).toFile(`${OUT}/${name}-${w}.avif`);
      await r.clone().webp({ quality: 80, effort: 6 }).toFile(`${OUT}/${name}-${w}.webp`);
    }
    console.log(`${num} -> ${name}`);
  }
}
