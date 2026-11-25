// Resizes the APPROVED Appalachian Trail photographs (downloaded once from the
// source pages recorded in docs/investigations/appalachian-trail-2026-11/
// C-photography-manifest.csv) to 1200 px JPEG (quality 82, progressive) and
// WebP (quality 80), like the national parks guide, and writes the rights
// records to src/data/appalachian-trail/image-rights.json.
// Usage: node scripts/appalachian-trail/optimize-images.mjs <download-dir>
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = process.argv[2];
if (!src) throw new Error('usage: optimize-images.mjs <download-dir>');
const CC0 = { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' };
const PD = { name: 'Public domain' };

// One record per approved photo; alt text from the manifest's description of
// what the photograph shows (checked against the thumbnail).
const PHOTOS = [
  { id: 'hero', file: 'kuwohi.jpg', dir: 'tennessee', name: 'kuwohi-sunset-hero', alt: 'Sunset over layered blue ridges of the Great Smoky Mountains, seen from the Kuwohi observation tower', caption: 'Sunset from the Kuwohi Observation Tower, Great Smoky Mountains National Park', credit: 'NPS', sourceUrl: 'https://npgallery.nps.gov/AssetDetail/2845f95e-1dd8-b71c-072b-8d90f8c9136b', license: PD },
  { id: 'te-kuwohi-formerly-clingmans-dome', file: 'kuwohi.jpg', dir: 'tennessee', name: 'kuwohi', alt: 'Sunset over layered blue ridges of the Great Smoky Mountains, seen from the Kuwohi observation tower', caption: 'Sunset from the Kuwohi Observation Tower', credit: 'NPS', sourceUrl: 'https://npgallery.nps.gov/AssetDetail/2845f95e-1dd8-b71c-072b-8d90f8c9136b', license: PD },
  { id: 'we-harpers-ferry-lower-town-and-the-point', file: 'hf-lowertown.jpg', dir: 'west-virginia', name: 'harpers-ferry-lower-town', alt: 'Snow-covered brick buildings of Harpers Ferry Lower Town with Loudoun Heights behind', caption: 'Lower Town in winter, Harpers Ferry National Historical Park', credit: 'NPS / Amy Dozier', sourceUrl: 'https://npgallery.nps.gov/AssetDetail/d98c62d5-c163-4e4f-b88a-ad4b6ea077ac', license: PD },
  { id: 'ge-springer-mountain', file: 'springer.jpg', dir: 'georgia', name: 'springer-mountain', alt: 'View from the Springer Mountain summit area over forest to distant ridges', caption: 'Springer Mountain', credit: 'Thomson200 / Wikimedia Commons', title: 'Springer Mountain view', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Springer_Mountain_view.JPG', license: CC0 },
  { id: 'ge-blood-mountain-via-byron-reece-trail', file: 'blood.jpg', dir: 'georgia', name: 'blood-mountain', alt: 'Blood Mountain in fall color, seen from Vogel State Park', caption: 'Blood Mountain from Vogel State Park', credit: 'Thomson200 / Wikimedia Commons', title: 'Blood Mountain from Vogel State Park, Oct 2016 1', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Blood_Mountain_from_Vogel_State_Park,_Oct_2016_1.jpg', license: CC0 },
  { id: 'no-max-patch', file: 'maxpatch.jpg', dir: 'north-carolina', name: 'max-patch', alt: 'The Appalachian Trail crossing the open grassy bald on top of Max Patch', caption: 'The Appalachian Trail on Max Patch', credit: 'Washedwithblood7 / Wikimedia Commons', title: 'Appalachian Trail crosses the grassy bald area atop Max Patch Mountain', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Appalachian_Trail_crosses_the_grassy_bald_area_atop_Max_Patch_Mountain.jpg', license: PD },
  { id: 'no-wayah-bald-lookout-tower', file: 'wayah.jpg', dir: 'north-carolina', name: 'wayah-bald', alt: 'Layered ridges and valley fog east of Wayah Bald before sunrise', caption: 'View east from Wayah Bald before sunrise', credit: 'Jud McCranie', title: 'Wayah Bald, NC, view to the east before sunrise', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wayah_Bald,_NC,_view_to_the_east_before_sunrise.jpg', license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' }, changed: true },
  { id: 'te-charlies-bunion', file: 'charlies.jpg', dir: 'tennessee', name: 'charlies-bunion', alt: 'The rock outcrop of Charlies Bunion with forested ridges beyond', caption: 'Charlies Bunion', credit: 'Brian Stansberry', title: 'Charlies-bunion-protrusion', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Charlies-bunion-protrusion.jpg', license: { name: 'CC BY 2.5', url: 'https://creativecommons.org/licenses/by/2.5/' }, changed: true },
];

// Further approved photos from the November 24, 2026 photo research
// (docs/investigations/appalachian-trail-2026-11/photos-2026-11-24.json):
// downloaded once as <download-dir>/<id>.jpg.
const LICENSE_URLS = {
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};
const extraFile = path.join(root, 'docs/investigations/appalachian-trail-2026-11/photos-2026-11-24.json');
if (existsSync(extraFile)) {
  const dest = JSON.parse(readFileSync(path.join(root, 'src/data/appalachian-trail/destinations.json'), 'utf8')).destinations;
  for (const r of JSON.parse(readFileSync(extraFile, 'utf8'))) {
    if (r.status !== 'APPROVED' || PHOTOS.some((p) => p.id === r.id)) continue;
    const d = dest.find((x) => x.id === r.id);
    if (!d) throw new Error(`photo for unknown destination ${r.id}`);
    const name = r.license;
    const url = r.licenseUrl || LICENSE_URLS[name];
    PHOTOS.push({
      id: r.id,
      file: `${r.id}.jpg`,
      dir: d.state.toLowerCase().replace(/[^a-z]+/g, '-'),
      name: r.id.replace(/^[a-z]{2}-/, ''),
      alt: r.depicts,
      caption: r.caption,
      credit: r.author,
      ...(/^CC BY/.test(name) ? { title: r.fileTitle.replace(/\.(jpe?g|png|tiff?)$/i, '').replace(/_/g, ' ') } : {}),
      sourceUrl: r.sourcePageUrl,
      license: /^public domain/i.test(name) ? PD : { name, ...(url ? { url } : {}) },
      ...(/^CC BY/.test(name) ? { changed: true } : {}),
      ...(r.cropAlign ? { cropAlign: r.cropAlign } : {}),
    });
  }
}

const out = { checked: '2026-11-24', note: 'Only APPROVED rows of C-photography-manifest.csv. A record whose file is missing is left out (the page shows its placeholder).', hero: null, photos: {} };
// Destination photographs were replaced by locator maps (Randy, November 2026):
// only the hero is built.
for (const p of PHOTOS.filter((x) => x.id === 'hero')) {
  const input = path.join(src, p.file);
  if (!existsSync(input)) { console.log(`skip ${p.id}: ${p.file} not downloaded`); continue; }
  const dir = path.join(root, 'public/images/appalachian-trail', p.dir);
  mkdirSync(dir, { recursive: true });
  const width = p.id === 'hero' ? 1600 : 1200;
  // Very wide panoramas are center-cropped to 16:9 so they fill a destination photo.
  const meta = await sharp(input).rotate().metadata();
  let base = sharp(input).rotate();
  if (meta.width / meta.height > 2) {
    const w = Math.round((meta.height * 16) / 9);
    base = base.extract({ left: p.cropAlign === 'right' ? meta.width - w : Math.round((meta.width - w) / 2), top: 0, width: w, height: meta.height });
  }
  const img = base.resize({ width, withoutEnlargement: true });
  await img.clone().jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(path.join(dir, `${p.name}.jpg`));
  await img.clone().webp({ quality: 80 }).toFile(path.join(dir, `${p.name}.webp`));
  const rec = { src: `/images/appalachian-trail/${p.dir}/${p.name}.jpg`, srcWebp: `/images/appalachian-trail/${p.dir}/${p.name}.webp`, alt: p.alt, caption: p.caption, credit: p.credit, sourceUrl: p.sourceUrl, license: p.license, ...(p.title ? { title: p.title } : {}), ...(p.changed ? { changed: true } : {}) };
  if (p.id === 'hero') out.hero = rec; else out.photos[p.id] = rec;
  console.log(`ok ${p.id}`);
}
writeFileSync(path.join(root, 'src/data/appalachian-trail/image-rights.json'), JSON.stringify(out, null, 2) + '\n');
