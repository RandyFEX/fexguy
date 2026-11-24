// Appalachian Trail ash-scattering guide (preview, Randy, November 2026).
// Data comes from destinations.json, built by
// scripts/appalachian-trail/build-data.mjs from the research package in
// docs/investigations/appalachian-trail-2026-11/. Photo rights records are in
// image-rights.json (only APPROVED rows of the photography manifest).
import data from './destinations.json';
import rights from './image-rights.json';

export type Classification = 'permitted' | 'permit-required' | 'prohibited' | 'unconfirmed';
export interface AtPoint { kind: 'official' | 'atc'; label: string; lat: number; lon: number; source: string }
export interface AtPhoto {
  src: string;
  srcWebp: string;
  alt: string;
  caption: string;
  credit: string;
  title?: string;
  sourceUrl: string;
  license: { name: string; url?: string };
  changed?: boolean;
}
export interface AtDestination {
  id: string;
  state: string;
  stateOrder: number;
  name: string;
  category: 'accessible' | 'extraordinary';
  onAT: string | null;
  landManager: string;
  distance: number | null;
  distanceSource: string;
  elevation: number | null;
  elevationSource: string;
  time: string | null;
  difficulty: number | null;
  difficultyWord: string | null;
  difficultySource: string | null;
  terrain: string | null;
  accessibility: string | null;
  seasonal: string | null;
  nearestTown: string | null;
  scatter: {
    classification: Classification;
    remembranceOnly: boolean;
    remembranceNote: string | null;
    alternative: string | null;
    conditions: string;
    contact: string | null;
    sourceUrls: string[];
    evidence: string;
  };
  points: AtPoint[];
  links: string[];
  verification: 'verified' | 'partial' | 'unverified';
  description: string[];
}

export const intro = data.intro;
export const destinations = data.destinations as unknown as AtDestination[];
export const states = data.states.map((s) => ({
  ...s,
  id: s.state.toLowerCase().replace(/[^a-z]+/g, '-'),
  destinations: destinations.filter((d) => d.state === s.state),
}));
export const photos = rights.photos as Record<string, AtPhoto>;
export const hero = rights.hero as AtPhoto;

export const CLASS_LABEL: Record<Classification, string> = {
  permitted: 'Permitted',
  'permit-required': 'Permit or permission required',
  prohibited: 'Prohibited',
  unconfirmed: 'Unconfirmed',
};

export { mapsUrl } from '@/data/last-adventure/parks';

// Readable labels for the official links in the dataset (organization: page).
const LINK_LABELS: Record<string, string> = {
  'appalachiantrail.org/hikes/bake-oven-knob/': 'ATC: Bake Oven Knob',
  'appalachiantrail.org/hikes/bear-den-mountain/': 'ATC: Bear Den Mountain',
  'appalachiantrail.org/hikes/bear-mountain/': 'ATC: Bear Mountain',
  'appalachiantrail.org/hikes/blood-mountain-and-freeman-trail/': 'ATC: Blood Mountain and Freeman Trail',
  'appalachiantrail.org/hikes/high-point-monument/': 'ATC: High Point Monument',
  'appalachiantrail.org/hikes/laurel-fork-gorge-and-falls/': 'ATC: Laurel Fork Gorge and Falls',
  'appalachiantrail.org/hikes/little-and-big-niagara-falls/': 'ATC: Little and Big Niagara Falls',
  'appalachiantrail.org/hikes/lovers-leap/': "ATC: Lover's Leap",
  'appalachiantrail.org/hikes/max-patch/': 'ATC: Max Patch',
  'appalachiantrail.org/news/mcafee-knob-pedestrian-bridge-opens/': 'ATC: McAfee Knob Pedestrian Bridge',
  'appalachiantrail.org/hikes/pochuck-boardwalk/': 'ATC: Pochuck Boardwalk',
  'appalachiantrail.org/hikes/rhododendron-gap/': 'ATC: Rhododendron Gap',
  'appalachiantrail.org/hikes/round-bald-and-jane-bald/': 'ATC: Round Bald and Jane Bald',
  'appalachiantrail.org/hikes/springer-mountain/': 'ATC: Springer Mountain',
  'appalachiantrail.org/hikes/three-forks-to-long-creek-falls/': 'ATC: Three Forks to Long Creek Falls',
  'appalachiantrail.org/hikes/thundering-falls/': 'ATC: Thundering Falls',
  'appalachiantrail.org/hikes/wayah-bald-lookout-tower/': 'ATC: Wayah Bald Lookout Tower',
  'appalachiantrail.org/hikes/weverton-cliffs/': 'ATC: Weverton Cliffs',
  'appalachiantrail.org/explore/communities/boonsboro-md/': 'ATC: Boonsboro, MD',
  'appalachiantrail.org/experience/hike-the-trail/day-hiking-backpacking/14-state-challenge/': 'ATC: 14 State Challenge',
  'baxterstatepark.org/general-info/': 'Baxter State Park: General Information',
  'baxterstatepark.org/day-hikes/': 'Baxter State Park: Day Hikes',
  'dnr.maryland.gov/publiclands/Pages/Regulations.aspx': 'Maryland DNR: Park Regulations',
  'mass.gov/locations/mount-greylock-state-reservation': 'Massachusetts DCR: Mount Greylock State Reservation',
  'nps.gov/thingstodo/blackrock-summit.htm': 'NPS: Blackrock Summit',
  'nps.gov/places/charlies-bunion.htm': 'NPS: Charlies Bunion',
  'nps.gov/thingstodo/charlies-bunion-via-appalachian-trail.htm': 'NPS: Charlies Bunion via the Appalachian Trail',
  'nps.gov/blri/learn/management/compendium-cfr-2-62.htm': 'NPS: Blue Ridge Parkway Compendium, 36 CFR 2.62',
  'nps.gov/thingstodo/compton-peak.htm': 'NPS: Compton Peak',
  'nps.gov/dewa/planyourvisit/dunnfield-creek-trail.htm': 'NPS: Dunnfield Creek Trail',
  'nps.gov/shen/learn/news/firefighters-work-to-suppress-bear-den-mountain-fire-in-shenandoah-national-park.htm': 'NPS: Bear Den Mountain (Shenandoah news release)',
  'nps.gov/hafe/learn/historyculture/jefferson-rock.htm': 'NPS: Jefferson Rock',
  'nps.gov/thingstodo/kuwohi.htm': 'NPS: Kuwohi',
  'nps.gov/places/kuwohi-observation-tower.htm': 'NPS: Kuwohi Observation Tower',
  'nps.gov/hafe/planyourvisit/permitsandreservations.htm': 'NPS: Harpers Ferry Permits and Reservations',
  'nps.gov/grsm/planyourvisit/scatter-cremated-ashes.htm': 'NPS: Great Smoky Mountains, Scattering Cremated Ashes',
  'nps.gov/hafe/learn/management/superintendent-s-compendium-live.htm': "NPS: Harpers Ferry Superintendent's Compendium",
  'nps.gov/shen/learn/management/compendium.htm': "NPS: Shenandoah Superintendent's Compendium",
  'nps.gov/appa/learn/management/compendium.htm': "NPS: Appalachian Trail Superintendent's Compendium",
  'nps.gov/places/thunder-ridge.htm': 'NPS: Thunder Ridge',
  'nps.gov/blri/planyourvisit/va-trails.htm': 'NPS: Blue Ridge Parkway Virginia Trails',
  'nps.gov/blri/planyourvisit/waterfall-hikes.htm': 'NPS: Blue Ridge Parkway Waterfall Hikes',
  'blog.nhstateparks.org/at-the-heart-of-the-notch-lafayette-place/': 'NH State Parks: Lafayette Place',
  'dep.nj.gov/wp-content/uploads/parksandforests/NJSPS_AT_information.pdf': 'NJ State Park Service: Appalachian Trail Information',
  'parks.ny.gov/about/contact-us/FAQ': 'New York State Parks: FAQ',
  'ratc.org/at-hiking/mcafee-knob-and-the-triple-crown/': 'Roanoke Appalachian Trail Club: McAfee Knob',
  'fs.usda.gov/r08/northcarolina/recreation/trails/lovers-leap-loop-trail': "Forest Service: Lover's Leap Loop Trail",
  'fs.usda.gov/r08/chattahoochee-oconee/recreation/springer-mountain-trailhead': 'Forest Service: Springer Mountain Trailhead',
  'fs.usda.gov/r09/gmfl/recreation/thundering-falls': 'Forest Service: Thundering Falls',
};
export function linkLabel(url: string): string {
  const u = new URL(url);
  const key = u.hostname.replace(/^www\./, '') + u.pathname;
  const label = LINK_LABELS[key];
  if (!label) throw new Error(`appalachian-trail: no label for ${url}`);
  return label;
}
