// Builds the publication logos shown on /randy-vandervaate/ from the
// migrated WordPress originals in public/wp-content/uploads/. The logo grid
// shows each logo in a box at most 208×48 CSS px, so originals much wider
// than that get a 480px-wide WebP copy (enough for 2x screens) in
// public/images/media/. The originals are left untouched; smaller logos
// keep using them directly (Enterprise League too: its WebP copy came out
// larger than the original PNG).
//
//   node scripts/optimize-media-logos.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'public/wp-content/uploads/2021/04/';
const OUT = 'public/images/media/';
const WIDTH = 480;

export const MEDIA_LOGOS = {
  'BL-Best-Company-Logo-Clear-1024x184.png': 'best-company',
  'BL-Medium-Magazine-Logo-1024x254.png': 'medium',
  'BL-Thrive-Global-Logo-1024x525.jpeg': 'thrive-global',
  'MT-Newsbreak-Logo-1024x168.png': 'newsbreak',
  'MT-Flipboard-Logo.jpg': 'flipboard',
  'BL-CEO-Blog-Nation.png': 'cb-nation',
  'BL-Up-City-Logo-1024x334.png': 'upcity',
  'BL-Cheapism-Logo.jpeg': 'cheapism',
  'BL-Fit-Small-Business-Logo-1024x202.png': 'fit-small-business',
};

mkdirSync(OUT, { recursive: true });
for (const [file, name] of Object.entries(MEDIA_LOGOS)) {
  const info = await sharp(SRC + file)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(`${OUT}${name}.webp`);
  console.log(`${name}.webp ${info.width}x${info.height} ${info.size} bytes`);
}
