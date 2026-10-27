// Builds the Funeral Funds logo and favicon files from their SVG masters
// (Randy-approved artwork, October 2026, traced to vectors from the supplied
// images; fill #173F35, the logo on a transparent background, the FF favicon
// on white). Run after changing a master: node scripts/build-brand-assets.mjs
//
// public/images/logo/funeral-funds-logo.svg      -> funeral-funds-logo.png (full size,
//   the structured-data logo) and -{400,800,1200,1600}.webp (header from
//   40rem, landing pages). No AVIF: lossy AVIF shifts the green, and lossless
//   WebP is already smaller than the old logo's AVIF files.
// public/images/logo/funeral-funds-wordmark.svg  -> -{400,800}.webp (the
//   name-only logo the header shows on phones, below 40rem)
// public/images/favicon/funeral-funds-favicon.svg -> -32.png, -180.png (Apple
//   touch icon), -192.png, -512.png and public/favicon.ico (16, 32, 48)
// Lossless output keeps the green exact.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const LOGO = 'public/images/logo/funeral-funds-logo';
const ICON = 'public/images/favicon/funeral-funds-favicon';

const logo = readFileSync(`${LOGO}.svg`);
await sharp(logo).png({ compressionLevel: 9 }).toFile(`${LOGO}.png`);
for (const w of [400, 800, 1200, 1600]) {
  const img = sharp(logo, { density: 144 }).resize({ width: w });
  await img.webp({ lossless: true, effort: 6 }).toFile(`${LOGO}-${w}.webp`);
}

const WORDMARK = 'public/images/logo/funeral-funds-wordmark';
const wordmark = readFileSync(`${WORDMARK}.svg`);
for (const w of [400, 800]) {
  await sharp(wordmark, { density: 144 }).resize({ width: w }).webp({ lossless: true, effort: 6 }).toFile(`${WORDMARK}-${w}.webp`);
}

// The favicon is unchanged since V5.0: rebuild it only when asked
// (node scripts/build-brand-assets.mjs --favicon).
if (!process.argv.includes('--favicon')) {
  console.log('Wrote the Funeral Funds logo files (favicon unchanged).');
  process.exit(0);
}
const icon = readFileSync(`${ICON}.svg`);
const png = (n) => sharp(icon, { density: 300 }).resize(n, n).flatten({ background: '#ffffff' }).png({ compressionLevel: 9 }).toBuffer();
for (const n of [32, 180, 192, 512]) writeFileSync(`${ICON}-${n}.png`, await png(n));

// favicon.ico: PNG-compressed entries (supported by every current browser).
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((n, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(n, e);
  header.writeUInt8(n, e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...images]));
console.log('Wrote the Funeral Funds logo and favicon files.');
