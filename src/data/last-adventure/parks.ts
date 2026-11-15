// One Last Amazing Adventure: five-park pilot data (Version 1.1 research,
// Randy, November 2026; editorial redesign Version 1.5). Private preview
// content only. Coordinates are map-verified (OpenStreetMap features matching
// the NPS descriptions) unless marked `source: 'nps'` (published in the
// official NPS map data). None are field-verified. Photographs: official NPS
// images hotlinked from nps.gov with the credit printed on the NPS page, or
// Wikimedia Commons images stored locally in public/images/last-adventure/
// with their license and author.

export interface Point {
  label: string;
  lat: number;
  lon: number;
  source?: 'osm' | 'nps';
}

export interface Photo {
  src: string;
  srcWebp?: string;
  alt: string;
  credit: string;
  license?: { name: string; url: string };
  sourceUrl?: string;
  caption?: string;
  /** CSS object-position for the cropped display. */
  position?: string;
}

export interface Link {
  label: string;
  url: string;
}

export type ScatterStatus = 'permitted' | 'not-here' | 'park-decision' | 'letter' | 'prohibited' | 'unconfirmed';

export interface Destination {
  id: string;
  name: string;
  kinds: Array<'accessible' | 'extraordinary'>;
  photo: Photo | null;
  description: string;
  plan: {
    distance: string;
    difficulty: string;
    time?: string;
    elevation?: string;
    accessibility: string;
    bestTime?: string;
    scattering: string;
  };
  scatterStatus: ScatterStatus;
  drive: { route: string; points: Point[] };
  trail?: { name: string; steps: string[]; notes?: string[] };
  final: Point[];
  scatterNote?: { text: string; points?: Point[] };
  links: Link[];
}

export interface Park {
  id: string;
  name: string;
  short: string;
  /** Display label, e.g. 'Utah' or 'Wyoming, Montana and Idaho'. */
  state: string;
  /** Every state or territory the park lies in (primary first); defaults to [state]. */
  states?: string[];
  tagline: string;
  photo: Photo;
  intro: string;
  homepage: string;
  map: Link[];
  scatterAllowed: 'Permitted with a permit' | 'Permitted with a permission letter' | 'Prohibited' | 'Unconfirmed';
  scatterSummary: string;
  scatterFacts: string[];
  /** Extra explanatory paragraphs shown in the scattering panel. */
  scatterNotes?: string[];
  scatterLink: Link[];
  /** Full-width explanation row under Ash Scattering in each destination's panel. */
  planNote?: { heading: string; text: string };
  beforeYouGo: string;
  destinations: Destination[];
}

export const mapsUrl = (lat: number, lon: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lon.toFixed(5)}`;

const nps = (p: string) => `https://www.nps.gov/common/uploads/cropped_image/primary/${p}.jpg`;
const local = (id: string) => ({ src: `/images/last-adventure/${id}.jpg`, srcWebp: `/images/last-adventure/${id}.webp` });
const ccBy2 = { name: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/' };
const ccBy4 = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' };
const ccBySa3 = { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/' };
const ccBySa4 = { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' };
const commons = (f: string) => `https://commons.wikimedia.org/wiki/File:${f}`;

const tetonScatter = 'Only at a site you propose and the park approves';
const yoseScatter = 'With a free permission letter, away from this spot';
const gcScatter = 'Prohibited throughout the park. See below.';

const paradiseRoadside: Point[] = [
  { label: 'Ricksecker Point', lat: 46.76995, lon: -121.78089, source: 'nps' },
  { label: 'Inspiration Point (roadside)', lat: 46.77338, lon: -121.74431, source: 'nps' },
];

const pilotParks: Park[] = [
  {
    id: 'canyonlands',
    name: 'Canyonlands National Park',
    short: 'Canyonlands',
    state: 'Utah',
    tagline: 'Rim overlooks, sandstone arches and the meeting of two great rivers.',
    photo: {
      src: nps('74177209-01FA-B216-D6D6DE60C5419B5E'),
      alt: 'A green and gray river converge below towering canyon walls',
      credit: 'NPS/Veronica Verdin',
      caption: 'The confluence of the Green and Colorado rivers',
    },
    intro:
      'Canyonlands is a world of mesas, arches and sandstone spires carved by the Green and Colorado rivers. Its two most visited districts, Island in the Sky and The Needles, offer rim overlooks you can reach in minutes and long desert trails that end at the edge of the earth. It is also one of the few parks that names its own places for scattering, so a family can say goodbye and scatter at the same breathtaking overlook.',
    homepage: 'https://www.nps.gov/cany/',
    map: [
      { label: 'Official park maps', url: 'https://www.nps.gov/cany/planyourvisit/maps.htm' },
      { label: 'Island in the Sky map (PDF)', url: 'https://www.nps.gov/cany/planyourvisit/upload/IslandRoadsandTrailsUpdated24-508forweb.pdf' },
      { label: 'Needles map (PDF)', url: 'https://www.nps.gov/cany/planyourvisit/upload/NeedlesTrailsandRoads2026_with-Davis-Road-Setback-update.pdf' },
    ],
    scatterAllowed: 'Permitted with a permit',
    scatterSummary: 'Scattering is permitted with a permit, at six authorized locations only.',
    scatterFacts: [
      'Permit: NPS Form 10-930, $185 application fee paid through Pay.gov.',
      'Island in the Sky: Green River Overlook, Buck Canyon Overlook, White Rim Overlook Trail and Orange Cliffs Overlook.',
      'The Needles: Colorado River Overlook and Confluence Overlook.',
      'The Maze: no authorized locations.',
      'On land only, away from cultural features. No markers and no burial.',
    ],
    scatterLink: [
      { label: 'Memorialization and scattering of ashes (NPS)', url: 'https://www.nps.gov/cany/planyourvisit/memorialization.htm' },
      { label: 'Map of authorized locations (NPS)', url: 'https://www.nps.gov/cany/learn/management/images/CANY_MemorializationMap.jpg' },
    ],
    beforeYouGo:
      'Open all year. The districts do not connect inside the park: Island in the Sky is reached from US 191 north of Moab by UT 313, and The Needles from US 191 south of Moab by UT 211. Winter can bring snow and ice (traction devices recommended). Carry 1 liter of water per person per hour.',
    destinations: [
      {
        id: 'green-river-overlook',
        name: 'Green River Overlook',
        kinds: ['accessible'],
        photo: {
          src: nps('F51E0C49-0994-9EAB-08CC9747581BE46C'),
          alt: 'Two hikers sit on the edge of Green River Overlook at sunset',
          credit: 'NPS/Neal Herbert',
        },
        description:
          'Picture the last light of the day moving across the canyons while the Green River winds through its channel 1,300 feet below you. The park counts this among the best sunset spots at Island in the Sky, and it asks almost nothing of anyone: a few steps from the car, and the whole family is standing together at the rim, looking out toward The Maze. It is also one of the six places in the park where scattering is authorized, so the goodbye and the scattering can happen side by side.',
        plan: {
          distance: 'About 0.1 mi from parking (map estimate)',
          difficulty: 'Easy',
          accessibility: 'Wheelchair accessible (NPS)',
          bestTime: 'Sunset',
          scattering: 'Allowed here with a permit',
        },
        scatterStatus: 'permitted',
        drive: {
          route: 'UT 313 into Island in the Sky, south on Grand View Point Road, then west on Green River Overlook Road to its end.',
          points: [{ label: 'Parking', lat: 38.37958, lon: -109.88785 }],
        },
        final: [{ label: 'Overlook', lat: 38.37818, lon: -109.88819 }],
        links: [{ label: 'Green River Overlook', url: 'https://www.nps.gov/places/green-river-overlook.htm' }],
      },
      {
        id: 'mesa-arch',
        name: 'Mesa Arch',
        kinds: ['accessible'],
        photo: {
          ...local('mesa-arch'),
          alt: 'The view through Mesa Arch to the canyon and distant mountains',
          credit: 'Larry D. Moore',
          license: ccBy4,
          sourceUrl: commons('View_Through_Mesa_Arch_Canyonlands_NP_Utah_2023.jpg'),
        },
        description:
          'There is a hush at Mesa Arch just before dawn, when everyone stops talking and waits. Then the sun clears the horizon and light pours through the 27-foot arch, framing the canyon far below and the La Sal Mountains in the distance. The walk is short enough for most of the family, and the park calls this its classic sunrise spot. Begin your loved one\'s last adventure here, and let the first light of the day belong to them.',
        plan: {
          distance: '0.6 mi round-trip loop',
          difficulty: 'Easy',
          time: '30 minutes',
          elevation: '56 ft',
          accessibility: 'Not wheelchair accessible: rocky hill and stone steps',
          bestTime: 'Sunrise',
          scattering: 'Not at this spot (see below)',
        },
        scatterStatus: 'not-here',
        drive: {
          route: 'UT 313 into Island in the Sky, then Grand View Point Road to the Mesa Arch lot.',
          points: [{ label: 'Parking', lat: 38.38947, lon: -109.86784 }],
        },
        trail: {
          name: 'Mesa Arch Trail (loop)',
          steps: ['To avoid most of the stairs, walk clockwise to the arch, then retrace your steps.'],
        },
        final: [{ label: 'Arch', lat: 38.38805, lon: -109.86345 }],
        scatterNote: {
          text: 'The nearest authorized location is Green River Overlook, on the spur road off the same scenic drive. Permit required.',
          points: [{ label: 'Green River Overlook', lat: 38.37818, lon: -109.88819 }],
        },
        links: [{ label: 'Mesa Arch Trail', url: 'https://www.nps.gov/places/mesa-arch.htm' }],
      },
      {
        id: 'grand-view-point',
        name: 'Grand View Point',
        kinds: ['accessible'],
        photo: {
          src: nps('F458D49C-ACE6-7003-D7E6833813DD455A'),
          alt: 'White snow dusts the tops of the brown and red canyons from Grand View Point',
          credit: 'NPS/Jacob W. Frank',
        },
        description:
          'At the end of the road, Island in the Sky simply runs out of land. From Grand View Point the White Rim spreads out below, The Maze and The Needles lie beyond it, and distant mountains line the horizon. Some of you might follow the rim trail to the second viewpoint while others stay at the paved overlook, and everyone comes back with something to tell. It is a fitting place to look out together and think about how far a life can travel.',
        plan: {
          distance: 'Paved sidewalk to the overlook; full rim trail 1.8 mi round trip',
          difficulty: 'Easy',
          time: '1.5 hours for the full trail',
          elevation: '73 ft',
          accessibility: 'Overlook wheelchair accessible (NPS); trail beyond is rough with stone steps',
          scattering: 'Not at this spot (see below)',
        },
        scatterStatus: 'not-here',
        drive: {
          route: 'UT 313 into Island in the Sky, then to the end of Grand View Point Road.',
          points: [{ label: 'Parking', lat: 38.31147, lon: -109.85619 }],
        },
        trail: {
          name: 'Grand View Point Trail',
          steps: [
            'Follow the short paved sidewalk to the overlook.',
            'For more, continue about 1 mile along the rim to a second viewpoint, then return the same way.',
          ],
        },
        final: [
          { label: 'Paved overlook', lat: 38.31015, lon: -109.85677 },
          { label: 'Trail destination', lat: 38.30335, lon: -109.86782 },
        ],
        scatterNote: {
          text: 'The most practical authorized location is the White Rim Overlook Trail, a short drive north on the same road (easy, 1.8 mi round trip, 159 ft; very limited parking, do not park off the pavement). Orange Cliffs Overlook is also authorized. Permit required.',
          points: [
            { label: 'White Rim Overlook Trail parking', lat: 38.32233, lon: -109.85024 },
            { label: 'White Rim Overlook', lat: 38.31999, lon: -109.83524 },
            { label: 'Orange Cliffs Overlook parking', lat: 38.31338, lon: -109.85712 },
          ],
        },
        links: [
          { label: 'Grand View Point', url: 'https://www.nps.gov/places/grand-view-point.htm' },
          { label: 'White Rim Overlook Trail', url: 'https://www.nps.gov/places/white-rim-overlook-trail.htm' },
        ],
      },
      {
        id: 'confluence-overlook',
        name: 'Confluence Overlook',
        kinds: ['extraordinary'],
        photo: {
          src: nps('74177209-01FA-B216-D6D6DE60C5419B5E'),
          alt: 'A green and gray river converge below towering canyon walls',
          credit: 'NPS/Veronica Verdin',
        },
        description:
          'Two great rivers, the Green and the Colorado, come together 1,000 feet below the cliff where this trail ends, and from that point on they flow as one. It takes a long day of walking across open desert to get here, and that is part of the meaning. Few places say so much about a family without a single word. Because this is one of the park\'s authorized scattering locations, the journey can end with the farewell itself, right where the rivers join.',
        plan: {
          distance: '11 mi round trip',
          difficulty: 'Strenuous',
          time: '5 to 6 hours',
          elevation: '309 ft overall; cumulative gain is much greater',
          accessibility: 'Rough and rocky; not wheelchair accessible',
          scattering: 'Permitted here with a permit',
        },
        scatterStatus: 'permitted',
        drive: {
          route: 'UT 211 to the Needles entrance, then the main park road to its end at Big Spring Canyon Overlook.',
          points: [{ label: 'Trailhead', lat: 38.17823, lon: -109.81716 }],
        },
        trail: {
          name: 'Confluence Overlook Trail',
          steps: [
            'Head west across open country along the northern edge of the Needles faults.',
            'At about 4.0 mi, the Lower Red Lake Canyon route branches south. Continue straight (west).',
            'Walk the final 1.5 mi to the overlook.',
          ],
          notes: ['Mileages from the official Needles map. Trails are marked with cairns, with signs at intersections. Carry all the water you need.'],
        },
        final: [{ label: 'Overlook', lat: 38.18189, lon: -109.88099 }],
        links: [{ label: 'Confluence Overlook Trail', url: 'https://www.nps.gov/places/confluence-overlook-trail.htm' }],
      },
      {
        id: 'druid-arch',
        name: 'Druid Arch',
        kinds: ['extraordinary'],
        photo: {
          src: nps('45DBB986-D73F-3F2A-D10F27667AF909CE'),
          alt: 'A large sandstone arch looms across the skyline on a bright, sunny day',
          credit: 'NPS/Veronica Verdin',
        },
        description:
          'Druid Arch is the kind of destination your loved one might have talked about for years. The trail winds up Elephant Canyon through deep sand and loose rock, climbs a ladder and finishes with a scramble, until a towering stone arch fills the sky at the head of the canyon. The park calls the view one of the most spectacular in The Needles. For the adventurers in your family, carrying someone you love this far is a tribute all its own.',
        plan: {
          distance: '10.8 mi round trip',
          difficulty: 'Strenuous',
          time: '5 to 7 hours',
          elevation: '503 ft overall; cumulative gain is much greater',
          accessibility: 'Deep sand, one ladder and scrambling',
          scattering: 'Not at this spot (see below)',
        },
        scatterStatus: 'not-here',
        drive: {
          route: 'UT 211 to the Needles entrance, the main park road, then the Elephant Hill Access Road. Check road conditions with the park.',
          points: [{ label: 'Elephant Hill Trailhead', lat: 38.14168, lon: -109.8276 }],
        },
        trail: {
          name: 'Chesler Park trail, then the Druid Arch trail in Elephant Canyon',
          steps: [
            'Follow the first part of the Chesler Park trail.',
            'Branch off into the bottom of Elephant Canyon, through deep sand and loose rock.',
            'The final steep pitch includes one ladder and some scrambling.',
          ],
          notes: ['NPS sources differ on the length of the final steep section: 0.25 mi on the park map, 1.25 mi on the trail page.'],
        },
        final: [{ label: 'Arch', lat: 38.08846, lon: -109.83184 }],
        scatterNote: {
          text: 'The most practical authorized location is Confluence Overlook. Colorado River Overlook is also authorized; NPS describes its road as moderate and unpaved, and visitors can avoid the large rocks in the last 1.5 miles by parking and walking. Permit required.',
          points: [
            { label: 'Confluence Overlook', lat: 38.18189, lon: -109.88099 },
            { label: 'Colorado River Overlook', lat: 38.21579, lon: -109.82987 },
          ],
        },
        links: [{ label: 'Druid Arch Trail', url: 'https://www.nps.gov/places/druid-arch-trail.htm' }],
      },
    ],
  },
  {
    id: 'grand-teton',
    name: 'Grand Teton National Park',
    short: 'Grand Teton',
    state: 'Wyoming',
    tagline: 'Jagged peaks rising straight from alpine lakes and the Snake River.',
    photo: {
      src: nps('687B32E9-C51E-B209-01C817A7096A153D'),
      alt: 'A small lake surrounded by mountains reflects the mountainous scenery',
      credit: 'NPS Photo/J. Bonney',
      caption: 'Lake Solitude',
    },
    intro:
      'The Teton Range rises straight out of the valley floor of Jackson Hole, mirrored in glacial lakes and the slow bends of the Snake River. Here a final adventure can be a sunrise at a roadside overlook, an easy morning walk to a lakeshore, or a full day climbing deep into a mountain canyon.',
    homepage: 'https://www.nps.gov/grte/',
    map: [{ label: 'Official park maps', url: 'https://www.nps.gov/grte/planyourvisit/maps.htm' }],
    scatterAllowed: 'Permitted with a permit',
    scatterSummary: 'Scattering is permitted with a permit at a location the family proposes and the park approves.',
    scatterFacts: [
      'Permit application NPS-GRTE-10-930s. Application fee: $0.',
      'Submit at least two weeks ahead to grte_spu_permits@nps.gov. Questions: 307-739-3616.',
      'There are no designated areas. The family proposes a specific location in the application, and the park decides whether to approve it.',
      'At least 100 yards from water; not in developed, historic, private or culturally restricted areas; no exclusive use.',
      'Scatter widely; ashes pulverized, not buried. No flowers, urns, cairns or markers, and no aircraft.',
      'The permit also covers the John D. Rockefeller, Jr. Memorial Parkway.',
    ],
    scatterLink: [
      { label: 'Scattering ashes (NPS)', url: 'https://www.nps.gov/grte/planyourvisit/ashes.htm' },
      { label: 'Application form (PDF)', url: 'https://www.nps.gov/grte/planyourvisit/upload/NPS-GRTE-10-930s-Application-for-SUP-SOA.pdf' },
    ],
    beforeYouGo:
      'The park is open all year, but several road entrances are closed or have limited vehicle access from November to May, and construction is underway across the park in 2026. Every featured destination sits at a lake or river, so plan the farewell there and propose a separate scattering site at least 100 yards from water.',
    destinations: [
      {
        id: 'oxbow-bend',
        name: 'Oxbow Bend',
        kinds: ['accessible'],
        photo: {
          ...local('oxbow-bend'),
          alt: 'Autumn color along the Snake River at Oxbow Bend, with the Teton Range beyond',
          credit: 'Tony Hisgett',
          license: ccBy2,
          sourceUrl: commons('Oxbow_Bend_Grand_Teton_(8047187108).jpg'),
        },
        description:
          'Some of the best goodbyes happen quietly, with a thermos of coffee and a view. At Oxbow Bend the Snake River slows into a lazy curve, and Mount Moran rises above it, mirrored in the water on a still day. You can stand together right beside the turnout, which makes this an ideal stop when grandparents, small children or anyone who can\'t hike is part of the trip. Bring a favorite photograph and let the mountain keep you company.',
        plan: {
          distance: 'Roadside overlook',
          difficulty: 'Easy',
          accessibility: 'View from the turnout; surface details not published',
          scattering: tetonScatter,
        },
        scatterStatus: 'park-decision',
        drive: {
          route: 'East from Jackson Lake Junction on the park highway toward the Moran Entrance, to the Oxbow Bend Turnout.',
          points: [{ label: 'Turnout', lat: 43.86617, lon: -110.54754 }],
        },
        final: [{ label: 'Overlook', lat: 43.86608, lon: -110.54758 }],
        links: [],
      },
      {
        id: 'taggart-lake',
        name: 'Taggart Lake',
        kinds: ['accessible'],
        photo: {
          src: nps('6433D2E0-BABE-9A14-93620C92A3AB28A7'),
          alt: 'A trail winds through bushes towards a mountain range',
          credit: 'NPS Photo/J. Bonney',
        },
        description:
          'The moment the trees open and the Teton Range appears in front of you stays with you. The trail to Taggart Lake climbs gently through aspens and ends at the water\'s edge, right at the foot of the peaks, a view the park counts among the best of the range. It is short enough that three generations can make the walk together, and in winter the same trail welcomes snowshoes. Find a spot along the shore and share a few stories.',
        plan: {
          distance: '3 mi round trip',
          difficulty: 'Easy',
          time: '1 to 2 hours',
          elevation: '360 ft',
          accessibility: 'Average slope 6%, with rocks and steps',
          bestTime: 'Year-round; snowshoes or skis in winter',
          scattering: tetonScatter,
        },
        scatterStatus: 'park-decision',
        drive: {
          route: 'Moose Entrance, then north on Teton Park Road to the trailhead. The lot fills in summer; arrive early.',
          points: [{ label: 'Trailhead', lat: 43.69314, lon: -110.73294 }],
        },
        trail: {
          name: 'Taggart Lake Trail',
          steps: ['Climb the aspen-covered moraine.', 'At the Bradley Lake trail split, stay left for Taggart Lake.', 'The trail flattens out to the lakeshore.'],
        },
        final: [{ label: 'East shore', lat: 43.70513, lon: -110.75014 }],
        links: [{ label: 'Taggart Lake', url: 'https://www.nps.gov/thingstodo/taggartlake.htm' }],
      },
      {
        id: 'inspiration-point',
        name: 'Inspiration Point',
        kinds: ['accessible', 'extraordinary'],
        photo: {
          src: nps('6827ED49-D54A-6883-E2FCA7EE7C00682E'),
          alt: 'Hikers walk up a rocky trail with a cliff on the right',
          credit: 'NPS Photo/J. Bonney',
        },
        description:
          'Start with a boat ride across Jenny Lake, the kind of simple adventure your loved one might have enjoyed most. On the far shore, the trail climbs past Hidden Falls, a 100-foot cascade, and up to a rocky ledge high above the lake. Below you, the water stretches back toward the valley of Jackson Hole. It is a wonderful place to pause, pass around old photographs and let the view do the talking for a while.',
        plan: {
          distance: '1.8 mi round trip by shuttle boat; 5.7 mi on foot',
          difficulty: 'Easy by boat; Moderate on foot',
          time: '2 to 4 hours',
          elevation: '550 ft by boat; 870 ft on foot',
          accessibility: 'Rock stairs, roots and steep switchbacks',
          scattering: tetonScatter,
        },
        scatterStatus: 'park-decision',
        drive: {
          route: 'Teton Park Road, then turn at South Jenny Lake. Parking fills in mid-summer; the park advises arriving before 9 am.',
          points: [{ label: 'Parking', lat: 43.75072, lon: -110.72309 }],
        },
        trail: {
          name: 'Shuttle boat or South Jenny Lake Loop, then the Inspiration Point trail',
          steps: [
            'Take the privately run shuttle boat (check hours and prices; tickets at the dock), or walk the southern shore.',
            'From the west shore boat dock, climb past Hidden Falls.',
            'Continue up the switchbacks to the point.',
          ],
        },
        final: [
          { label: 'West shore boat dock', lat: 43.7672, lon: -110.74421 },
          { label: 'Hidden Falls', lat: 43.76632, lon: -110.7512 },
          { label: 'Inspiration Point', lat: 43.76701, lon: -110.74826 },
        ],
        links: [{ label: 'Inspiration Point', url: 'https://www.nps.gov/thingstodo/inspirationpoint.htm' }],
      },
      {
        id: 'lake-solitude',
        name: 'Lake Solitude',
        kinds: ['extraordinary'],
        photo: {
          src: nps('687B32E9-C51E-B209-01C817A7096A153D'),
          alt: 'A small lake surrounded by mountains reflects the mountainous scenery',
          credit: 'NPS Photo/J. Bonney',
        },
        description:
          'The name says it all. Lake Solitude rests in a basin of peaks at the head of the North Fork of Cascade Canyon, a full day\'s walk from the nearest road. The journey brings mountain views around nearly every bend and plenty of chances to watch for wildlife. For the hikers in your family, sitting together on its shore at the end of that long day, far from everything, could become one of the proudest memories you share.',
        plan: {
          distance: '14.4 mi round trip by shuttle boat; 18.3 mi on foot',
          difficulty: 'Strenuous by boat; very strenuous on foot',
          time: '9 to 13 hours',
          elevation: '2,670 ft by boat; 2,910 ft on foot',
          accessibility: 'Bridges, steps, roots, narrow sections and steep switchbacks',
          bestTime: 'Summer after snowmelt, or fall before the first snow',
          scattering: tetonScatter,
        },
        scatterStatus: 'park-decision',
        drive: {
          route: 'Teton Park Road, then turn at South Jenny Lake. Arrive early.',
          points: [{ label: 'Parking', lat: 43.75072, lon: -110.72309 }],
        },
        trail: {
          name: 'Cascade Canyon Trail and North Fork Cascade Canyon Trail',
          steps: [
            'Cross Jenny Lake by shuttle boat or walk the southern shore.',
            'Hike up Cascade Canyon to the Forks of Cascade Canyon.',
            'At the junction, go right on the North Fork Cascade Canyon Trail to the lake.',
          ],
          notes: ['Do not attempt it on snow without experience and the right equipment.'],
        },
        final: [{ label: 'Lakeshore', lat: 43.79444, lon: -110.84253 }],
        links: [{ label: 'Lake Solitude', url: 'https://www.nps.gov/thingstodo/lakesolitude.htm' }],
      },
    ],
  },
  {
    id: 'yosemite',
    name: 'Yosemite National Park',
    short: 'Yosemite',
    state: 'California',
    tagline: 'Granite walls, waterfalls and the unmistakable shape of Half Dome.',
    photo: {
      src: nps('0CFC2E25-B7B1-A12D-8621A2F88303D8EF'),
      alt: 'Large granite monoliths in the distance with a dense conifer forest below',
      credit: 'NPS Photo/C. Jacoby',
      caption: 'Yosemite Valley from Tunnel View',
    },
    intro:
      'Granite walls, thundering waterfalls and the silhouette of Half Dome make Yosemite Valley one of the most recognizable landscapes on earth. A final adventure here can be as gentle as a short walk to a famous viewpoint or as demanding as a sunrise start for the cables of Half Dome.',
    homepage: 'https://www.nps.gov/yose/',
    map: [
      { label: 'Official park maps', url: 'https://www.nps.gov/yose/planyourvisit/maps.htm' },
      { label: 'Glacier Point Road trail map', url: 'https://www.nps.gov/yose/planyourvisit/images/TrailMaps_GP_2024_V1.jpg' },
    ],
    scatterAllowed: 'Permitted with a permission letter',
    scatterSummary: 'Scattering is permitted with a free permission letter, away from public areas and water.',
    scatterFacts: [
      'Permission letter required; no fee. Email the application to Yose_special_use_permits@nps.gov. Office of Special Park Uses: 209/379-1434.',
      'Out of sight of public use areas: roads, walkways, trails and parking areas.',
      'At least 100 yards from any water source or creek bed, running or dry.',
      'Spread widely, with the ID disc removed. No marker, and no scattering from the air.',
      'Large gatherings may need a separate Special Event permit.',
      'The Yosemite Valley Chapel keeps a Book of Memories: 209/372-4831.',
    ],
    scatterLink: [
      { label: 'Scattering ashes (NPS)', url: 'https://www.nps.gov/yose/planyourvisit/ashes.htm' },
      { label: 'Application (PDF)', url: 'https://www.nps.gov/yose/planyourvisit/upload/ashes.pdf' },
    ],
    beforeYouGo:
      'Highway 41 from Fresno, Highway 140 from Merced and Highway 120 from Manteca lead into the park; Wawona Road continues Highway 41. Glacier Point Road is usually open from May to November. None of the featured viewpoints can be the scattering spot; describe a location that meets the conditions in your request.',
    destinations: [
      {
        id: 'tunnel-view',
        name: 'Tunnel View',
        kinds: ['accessible'],
        photo: {
          src: nps('0CFC2E25-B7B1-A12D-8621A2F88303D8EF'),
          alt: 'Large granite monoliths in the distance with a dense conifer forest below',
          credit: 'NPS Photo/C. Jacoby',
        },
        description:
          'Step out of the Wawona Tunnel and all of Yosemite Valley appears at once: El Capitan on one side, Bridalveil Fall on the other and Half Dome rising in the distance. It is the defining view of the valley, and it waits right beside the parking area, with accessible parking and a short paved walk. Gather everyone at the viewing area, take the photograph you will treasure, and take a quiet moment for the person who brought you all here.',
        plan: {
          distance: 'Roadside; short paved walk',
          difficulty: 'Easy',
          accessibility: 'Designated accessible parking; view from the parking area or a short paved walk (NPS)',
          scattering: yoseScatter,
        },
        scatterStatus: 'letter',
        drive: {
          route: 'Highway 41 (Wawona Road) to the east end of the Wawona Tunnel, just before Yosemite Valley.',
          points: [{ label: 'Parking', lat: 37.71513, lon: -119.67674 }],
        },
        final: [{ label: 'Viewpoint', lat: 37.71557, lon: -119.67689 }],
        links: [{ label: 'Tunnel View', url: 'https://www.nps.gov/places/000/tunnel-view.htm' }],
      },
      {
        id: 'glacier-point',
        name: 'Glacier Point',
        kinds: ['accessible'],
        photo: {
          ...local('glacier-point'),
          alt: 'Half Dome seen from Glacier Point above Yosemite Valley',
          credit: 'Diliff',
          license: ccBySa3,
          sourceUrl: commons('Half_Dome_from_Glacier_Point,_Yosemite_NP_-_Diliff.jpg'),
        },
        description:
          'Standing at Glacier Point feels like looking down on all of Yosemite. The valley floor lies 3,200 feet below the railing, and Half Dome rises directly across from you with the High Sierra beyond. A short paved path leads from the parking area, so nearly everyone can come, whatever their age or mobility. Bring a favorite story, a few photographs and enough time to simply stand together and take it in.',
        plan: {
          distance: '300 yards one way',
          difficulty: 'Easy',
          time: '10 to 15 minutes',
          elevation: 'Paved, gentle incline',
          accessibility: 'Wheelchair accessible via a 300-yard paved switchback path (NPS)',
          bestTime: 'Glacier Point Road is usually open May to November',
          scattering: yoseScatter,
        },
        scatterStatus: 'letter',
        drive: {
          route: 'Highway 41 (Wawona Road), turn at Chinquapin onto Glacier Point Road and follow it to the end, a little under an hour from the valley. No shuttle from the valley.',
          points: [{ label: 'Parking', lat: 37.72733, lon: -119.5759 }],
        },
        final: [{ label: 'Overlook', lat: 37.73067, lon: -119.57367 }],
        links: [
          { label: 'Glacier Point', url: 'https://www.nps.gov/places/000/glacier-point.htm' },
          { label: 'Glacier Point Road hikes', url: 'https://www.nps.gov/yose/planyourvisit/glacierhikes.htm' },
        ],
      },
      {
        id: 'taft-point',
        name: 'Taft Point',
        kinds: ['accessible', 'extraordinary'],
        photo: {
          ...local('taft-point'),
          alt: 'Taft Point on the rim above Yosemite Valley',
          credit: 'Dave from San Jose, CA, USA',
          license: ccBy2,
          sourceUrl: commons('Taft_Point_Panorama.jpg'),
        },
        description:
          'One moment you are walking through quiet forest and meadow; the next, the ground ends at the edge of Yosemite Valley. Deep cracks called The Fissures split the granite beside you, and across the valley stand El Capitan and Yosemite Falls. It is a breathtaking place for the members of your family who are comfortable with heights, and the walk is short enough to leave plenty of time for stories at the rim.',
        plan: {
          distance: '2.2 mi round trip',
          difficulty: 'Easy',
          time: '1 to 2 hours',
          elevation: '200 ft, on the return',
          accessibility: 'Forest and meadow trail; exposed cliff edges',
          bestTime: 'Glacier Point Road is usually open May to November',
          scattering: yoseScatter,
        },
        scatterStatus: 'letter',
        drive: {
          route: 'Highway 41 (Wawona Road), turn at Chinquapin onto Glacier Point Road and drive to the Sentinel Dome/Taft Point Trailhead.',
          points: [{ label: 'Trailhead', lat: 37.71246, lon: -119.58658 }],
        },
        trail: {
          name: 'Taft Point trail',
          steps: [
            'Shortly after the trailhead the trail splits. Bear left (west) for Taft Point; the right fork leads to Sentinel Dome.',
            'Continue through forest and meadow to the rim beside The Fissures.',
          ],
          notes: ['Junction read from the official NPS Glacier Point Road trail map. Keep well back from the cliff edges.'],
        },
        final: [{ label: 'Taft Point', lat: 37.71311, lon: -119.60461 }],
        links: [{ label: 'Glacier Point Road hikes', url: 'https://www.nps.gov/yose/planyourvisit/glacierhikes.htm' }],
      },
      {
        id: 'sentinel-dome',
        name: 'Sentinel Dome',
        kinds: ['extraordinary'],
        photo: {
          ...local('sentinel-dome'),
          alt: 'The bare granite of Sentinel Dome in Yosemite National Park',
          credit: 'Supercarwaar',
          license: ccBySa4,
          sourceUrl: commons('Sentinel_Dome,_Yosemite_NP.jpg'),
        },
        description:
          'Some places make you feel as if you have reached the top of the world, and Sentinel Dome is one of them. From the summit, Yosemite opens in every direction, with Half Dome rising across the valley and the High Sierra stretching toward the horizon. Imagine sitting together up here, telling the stories that still make everyone laugh, and giving someone you love one last extraordinary day in a place none of you will forget.',
        plan: {
          distance: '2 mi round trip',
          difficulty: 'Moderate',
          time: '1 to 2 hours',
          elevation: '400 ft',
          accessibility: 'Final climb is a scramble up granite',
          bestTime: 'Glacier Point Road is usually open May to November',
          scattering: yoseScatter,
        },
        scatterStatus: 'letter',
        drive: {
          route: 'Highway 41 (Wawona Road), turn at Chinquapin onto Glacier Point Road and drive to the Sentinel Dome/Taft Point Trailhead.',
          points: [{ label: 'Trailhead', lat: 37.71246, lon: -119.58658 }],
        },
        trail: {
          name: 'Sentinel Dome trail',
          steps: ['Shortly after the trailhead, bear right (north) at the split.', 'Scramble up the side of the dome to the summit.'],
          notes: ['Stay off the domes during thunderstorms.'],
        },
        final: [{ label: 'Summit', lat: 37.72298, lon: -119.58433 }],
        links: [{ label: 'Glacier Point Road hikes', url: 'https://www.nps.gov/yose/planyourvisit/glacierhikes.htm' }],
      },
      {
        id: 'half-dome',
        name: 'Half Dome',
        kinds: ['extraordinary'],
        photo: {
          ...local('half-dome'),
          alt: 'Hikers climbing the cables up the granite of Half Dome',
          credit: 'Lucas·G',
          license: ccBySa4,
          sourceUrl: commons('California,_Yosemite_National_Park,_Half_Dome,_hiking_up.jpg'),
          position: '50% 35%',
        },
        description:
          'If your loved one ever stood beneath Half Dome and wondered what the top was like, this is a chance to finish that climb for them. The trail passes Vernal and Nevada Falls before the final 400 feet up steel cables to a summit nearly 5,000 feet above Yosemite Valley. It is one of the hardest days in the park and requires a permit, but the moment you stand on top together will stay with you for a lifetime.',
        plan: {
          distance: '14 to 16 mi round trip',
          difficulty: 'Strenuous',
          time: '10 to 12 hours',
          elevation: '4,800 ft',
          accessibility: 'Long, steep climb with cables at the top',
          bestTime: 'Cables up from late May to mid-October; permit required',
          scattering: yoseScatter,
        },
        scatterStatus: 'letter',
        drive: {
          route: 'Into Yosemite Valley by Highway 41, 120 or 140, then to Curry Village. Trailhead parking is just beyond Curry Village; Happy Isles is shuttle stop #16.',
          points: [
            { label: 'Trailhead parking', lat: 37.73501, lon: -119.56646 },
            { label: 'Happy Isles Trailhead', lat: 37.73282, lon: -119.55778 },
          ],
        },
        trail: {
          name: 'Mist Trail or John Muir Trail, then the Half Dome Trail',
          steps: ['Climb past Vernal and Nevada Falls and Liberty Cap.', 'Continue to the subdome and the base of the cables.', 'Climb the final 400 feet on the cables.'],
          notes: [
            'Permit required whenever the cables are up, normally from the Friday before Memorial Day until the day after the second Monday in October. Preseason lottery March 1 to 31, plus daily lotteries. $10 per application, plus $10 per person when awarded.',
            'Set a turnaround time (for example, turn back if you have not reached the top by 3:30 pm). Never climb the cables when the rock is wet.',
          ],
        },
        final: [{ label: 'Summit', lat: 37.746, lon: -119.53325 }],
        links: [
          { label: 'Half Dome day hike', url: 'https://www.nps.gov/yose/planyourvisit/halfdome.htm' },
          { label: 'Half Dome permits', url: 'https://www.nps.gov/yose/planyourvisit/hdpermits.htm' },
        ],
      },
    ],
  },
  {
    id: 'mount-rainier',
    name: 'Mount Rainier National Park',
    short: 'Mount Rainier',
    state: 'Washington',
    tagline: 'An ice-clad volcano rising above wildflower meadows.',
    photo: {
      src: 'https://www.nps.gov/mora/planyourvisit/images/Paradise-Wildflower-Meadow_NPSPhoto_webtop.jpeg',
      alt: 'Wildflowers paint a meadow in blues and purples',
      credit: 'NPS/M. Larson',
      caption: 'Wildflower meadow at Paradise',
    },
    intro:
      'An ice-clad volcano rising above wildflower meadows, waterfalls and old-growth forest. Paradise and Sunrise put the mountain right in front of you, and the park has named roadside places where a family can scatter ashes with a permit.',
    homepage: 'https://www.nps.gov/mora/',
    map: [
      { label: 'Official park maps', url: 'https://www.nps.gov/mora/planyourvisit/maps.htm' },
      { label: 'Paradise area trails (PDF)', url: 'https://www.nps.gov/mora/planyourvisit/upload/2019-Paradise-Area-Trails_508.pdf' },
      { label: 'Sunrise area trails (PDF)', url: 'https://www.nps.gov/mora/planyourvisit/upload/2020-Sunrise-Area-Trails_access.pdf' },
    ],
    scatterAllowed: 'Permitted with a permit',
    scatterSummary: 'Scattering is permitted with a permit in authorized areas and at designated roadside locations.',
    scatterFacts: [
      'Permit: $50 application fee through Pay.gov, plus a $150 management fee before the permit is finalized. Email mora_special_use@nps.gov or call 360-569-6513.',
      'Green areas on the official map: authorized for groups of 12 or fewer, at least 100 yards from any trail, road, developed area, stream or body of water.',
      'Paradise and the Sunrise developed area are not authorized, except at designated roadside locations.',
      'Groups of 13 to 24 may use only pre-determined map locations; groups of 25 to 30 only mapped locations. Groups over 12 may not use Paradise or Sunrise from 12 to 4 pm on weekends.',
      'Not within half a mile of Tipsoo Lake or Reflection Lakes. Above 10,000 ft, airborne only.',
      'Ashes pulverized and fully dispersed. No containers, urns, flowers or markers.',
    ],
    scatterLink: [
      { label: 'Permits and reservations (NPS)', url: 'https://www.nps.gov/mora/planyourvisit/permitsandreservations.htm' },
      { label: 'Special use permit locations map (NPS)', url: 'https://www.nps.gov/maps/stories/mt-rainier-national-park-special-use-permit-locations.html' },
    ],
    beforeYouGo:
      'Paradise: SR 706 to the Nisqually Entrance, then Longmire, then 12 miles to Paradise (the Longmire to Paradise road closes nightly from November 1). Sunrise: SR 410 to the White River Entrance, then 13 miles on the Sunrise road. The Sunrise Visitor Center is open from early July to early September.',
    destinations: [
      {
        id: 'myrtle-falls',
        name: 'Myrtle Falls',
        kinds: ['accessible'],
        photo: {
          src: nps('E110A0B3-D90D-16A0-C52F9A472AEB63BB'),
          alt: 'Braided cascade with glaciated mountain behind it',
          credit: 'NPS Photo',
        },
        description:
          'Mount Rainier never feels closer than it does at Myrtle Falls. A short, paved walk from Paradise leads through the meadows to Edith Creek, where the falls tumble down with the mountain\'s glaciers rising right behind them. Strollers and wheelchairs with help can make the trip, so the youngest and oldest members of the family can stand side by side for this one. Bring a camera; this is the picture everyone will want.',
        plan: {
          distance: '1 mi round trip',
          difficulty: 'Easy',
          time: '35 minutes',
          elevation: '100 ft',
          accessibility: 'Wheelchairs with help, and strollers (NPS); a steep stairway leads down to the best viewpoint',
          scattering: 'Not here; at designated roadside locations (see below)',
        },
        scatterStatus: 'not-here',
        drive: {
          route: 'SR 706 to the Nisqually Entrance, through Longmire and 12 miles on to Paradise. Skyline Trailhead is on the north side of the upper lot, next to the Jackson Visitor Center.',
          points: [{ label: 'Skyline Trailhead', lat: 46.78642, lon: -121.73645 }],
        },
        trail: {
          name: 'Skyline Trail',
          steps: ['Walk northeast on the paved Skyline Trail to Edith Creek.', 'A steep stairway descends to the falls viewpoint.'],
        },
        final: [{ label: 'Falls viewpoint', lat: 46.79137, lon: -121.73249 }],
        scatterNote: {
          text: 'Paradise is not an authorized scattering area. Use a designated roadside location below Paradise: Ricksecker Point (any day, 3 pm to 10 am, up to 30 people, multiple permits a day) or Inspiration Point (any time, up to 30 people, one permit at a time). Permit required.',
          points: paradiseRoadside,
        },
        links: [
          { label: 'Myrtle Falls', url: 'https://www.nps.gov/places/myrtle-falls.htm' },
          { label: 'Paradise area trails (PDF)', url: 'https://www.nps.gov/mora/planyourvisit/upload/2019-Paradise-Area-Trails_508.pdf' },
        ],
      },
      {
        id: 'sunrise-point',
        name: 'Sunrise Point',
        kinds: ['accessible'],
        photo: {
          ...local('sunrise-point'),
          alt: 'Evening light from Sunrise Point in Mount Rainier National Park',
          credit: 'Buidhe',
          license: ccBySa4,
          sourceUrl: commons('Sunset_from_Sunrise_Point_(7_October_2024)_4.jpg'),
          position: '22% 50%',
        },
        description:
          'As the afternoon light softens, Sunrise Point opens a view in almost every direction: deep valleys below, Mount Rainier on the skyline and other Cascade volcanoes such as Mount Adams farther off. It is also one of the park\'s designated scattering locations, so you can share stories, watch the light change and say your goodbye in the same place, just steps from the car.',
        plan: {
          distance: 'Roadside',
          difficulty: 'Easy',
          accessibility: 'View from the parking area; surface details not published',
          scattering: 'Permitted here with a permit: weekdays, 3 pm to 10 am, up to 30 people',
        },
        scatterStatus: 'permitted',
        drive: {
          route: 'SR 410 to the White River Entrance, then the Sunrise road to the Sunrise Point parking area.',
          points: [{ label: 'Parking', lat: 46.91742, lon: -121.58841 }],
        },
        final: [{ label: 'Designated location', lat: 46.91743, lon: -121.58812, source: 'nps' }],
        scatterNote: { text: 'Weekdays only (no federal holidays), 3 pm to 10 am, up to 30 people, one permit at a time.' },
        links: [{ label: 'Sunrise', url: 'https://www.nps.gov/mora/planyourvisit/sunrise.htm' }],
      },
      {
        id: 'panorama-point',
        name: 'Panorama Point',
        kinds: ['extraordinary'],
        photo: {
          ...local('panorama-point'),
          alt: 'Mount Rainier seen from Panorama Point',
          credit: 'NPS photo by Emily Brouwer',
          license: ccBy2,
          sourceUrl: commons('Mount_Rainier_from_Panorama_Point_(14679537685).jpg'),
          position: '50% 40%',
        },
        description:
          'Every step up the Skyline Trail brings Mount Rainier a little closer, until Panorama Point leaves you face to face with its glaciers. It is a real climb, and the effort is part of what makes it meaningful: a few hours of walking side by side above the Paradise meadows, then a moment at the top to rest, look up at the mountain and remember someone who would have loved being here with you.',
        plan: {
          distance: '4 mi round trip',
          difficulty: 'Difficult',
          time: '3 hours',
          elevation: '1,700 ft',
          accessibility: 'Steep mountain trail',
          scattering: 'Not here; at designated roadside locations (see below)',
        },
        scatterStatus: 'not-here',
        drive: {
          route: 'SR 706 to the Nisqually Entrance, through Longmire and 12 miles on to Paradise. Skyline Trailhead is on the north side of the upper lot, next to the Jackson Visitor Center.',
          points: [{ label: 'Skyline Trailhead', lat: 46.78642, lon: -121.73645 }],
        },
        trail: {
          name: 'Skyline Trail and Golden Gate Trail',
          steps: [
            'Climb the Skyline Trail, then the Golden Gate Trail, to Panorama Point.',
            'Alternative: the Deadhorse Creek Trail from the lower lot meets the Skyline Trail near Glacier Vista.',
            'To make a loop, continue on the High Skyline Trail (5.5 mi round trip, about 4.5 hours).',
          ],
          notes: ['A pit toilet at Panorama Point is open in summer only.'],
        },
        final: [{ label: 'Panorama Point', lat: 46.80356, lon: -121.72971 }],
        scatterNote: {
          text: 'Paradise is not an authorized scattering area. Use Ricksecker Point (any day, 3 pm to 10 am, up to 30 people) or Inspiration Point (any time, up to 30 people). Permit required.',
          points: paradiseRoadside,
        },
        links: [{ label: 'Paradise area trails (PDF)', url: 'https://www.nps.gov/mora/planyourvisit/upload/2019-Paradise-Area-Trails_508.pdf' }],
      },
      {
        id: 'mount-fremont-lookout',
        name: 'Mount Fremont Lookout',
        kinds: ['extraordinary'],
        photo: {
          ...local('mount-fremont-lookout'),
          alt: 'The Mount Fremont fire lookout on its rocky ridge',
          credit: 'Steve Redman, NPS',
          license: { name: 'Public domain', url: 'https://commons.wikimedia.org/wiki/Template:PD-USGov-NPS' },
          sourceUrl: commons('Fremont_Lookout_(7a7e9acb7ae747beb074f5bf4111bbc9).JPG'),
        },
        description:
          'Fire lookouts were built so someone could keep watch over the land, and there is something fitting about bringing your loved one to this one. The trail follows a high ridge from Sunrise, past Frozen Lake, to a rocky point where the old lookout faces Mount Rainier across Grand Park. Find a place to sit, share your favorite stories and watch the mountain together for as long as you like.',
        plan: {
          distance: '5.6 mi round trip',
          difficulty: 'Moderate',
          time: '3.5 hours',
          elevation: '900 ft',
          accessibility: 'Mountain trail',
          scattering: 'Not at the lookout; at Sunrise Point (see below)',
        },
        scatterStatus: 'not-here',
        drive: {
          route: 'SR 410 to the White River Entrance, then 13 miles on the Sunrise road to Sunrise. The trail starts at the upper end of the picnic area.',
          points: [
            { label: 'Sourdough Ridge Trailhead', lat: 46.9148, lon: -121.64243 },
            { label: 'Sunrise picnic area', lat: 46.91522, lon: -121.64454 },
          ],
        },
        trail: {
          name: 'Sourdough Ridge Trail and Mount Fremont Trail',
          steps: ['Climb the Sourdough Ridge Trail to the junction at Frozen Lake.', 'Take the Mount Fremont Trail to the old fire lookout.'],
        },
        final: [
          { label: 'Frozen Lake junction', lat: 46.9191, lon: -121.66669 },
          { label: 'Lookout', lat: 46.93404, lon: -121.67574 },
        ],
        scatterNote: {
          text: 'Scatter on the drive out at the designated Sunrise Point location (weekdays, 3 pm to 10 am, up to 30 people). The lookout lies in an authorized area, but the 100-yard rule would mean leaving the trail, so a spot there is possible only if the permit office specifies one.',
          points: [{ label: 'Sunrise Point', lat: 46.91743, lon: -121.58812, source: 'nps' }],
        },
        links: [{ label: 'Sunrise area trails (PDF)', url: 'https://www.nps.gov/mora/planyourvisit/upload/2020-Sunrise-Area-Trails_access.pdf' }],
      },
    ],
  },
  {
    id: 'grand-canyon',
    name: 'Grand Canyon National Park',
    short: 'Grand Canyon',
    state: 'Arizona',
    tagline: 'A mile-deep canyon of changing light, seen from the rim and from the trail.',
    photo: {
      src: nps('DC1C0370-C525-3032-77CC28C8F979E458'),
      alt: 'A circular stone tower, 70 feet tall, perched on the edge of a vast canyon',
      credit: 'NPS/M. Quinn',
      caption: 'Desert View Watchtower',
    },
    intro:
      'A mile deep and endlessly changing with the light, the Grand Canyon is a place families come back to for a lifetime. Scattering is not allowed anywhere in the park, but it remains an extraordinary place to gather, share memories and say goodbye.',
    homepage: 'https://www.nps.gov/grca/',
    map: [{ label: 'Official park maps', url: 'https://www.nps.gov/grca/planyourvisit/maps.htm' }],
    scatterAllowed: 'Prohibited',
    scatterSummary: 'Ash scattering is prohibited throughout Grand Canyon National Park.',
    scatterNotes: [
      'Published park rules prohibit scattering ashes, but do not expressly prohibit bringing securely contained cremated remains for a personal visit. Confirm any planned ceremony with the park.',
      'You can still plan a meaningful farewell here. Bring your loved one’s cremated remains in a secure, non-breakable container, share memories at a spectacular viewpoint, and take the remains with you when you leave. Arrange any scattering separately at a location where it is legally permitted.',
    ],
    scatterFacts: ['Superintendent’s Compendium item (62), citing 36 CFR 1.5(a)(2) and 36 CFR 2.62. No permits are issued for scattering.'],
    planNote: {
      heading: 'A Farewell Without Scattering',
      text: 'Published park rules prohibit scattering ashes but do not expressly prohibit bringing securely contained cremated remains for a personal visit. Bring your loved one’s remains in a secure, non-breakable container, share memories together, and take the remains with you when you leave. Arrange any scattering separately at a legally permitted location. Confirm any planned ceremony with the park.',
    },
    scatterLink: [{ label: 'Superintendent’s Compendium (PDF)', url: 'https://www.nps.gov/grca/learn/management/upload/grca-supt-compendium.pdf' }],
    beforeYouGo:
      'The South Rim is open all year. South Entrance: I-40 to Williams, then Highway 64 north, or Highway 180 from Flagstaff. East Entrance (Desert View): Highway 89 to Cameron, then Highway 64 west. Phantom Ranch, the river bridges and the North Kaibab Trail are closed after flooding; check current trail status before hiking.',
    destinations: [
      {
        id: 'desert-view-watchtower',
        name: 'Desert View Watchtower',
        kinds: ['accessible'],
        photo: {
          src: nps('DC1C0370-C525-3032-77CC28C8F979E458'),
          alt: 'A circular stone tower, 70 feet tall, perched on the edge of a vast canyon',
          credit: 'NPS/M. Quinn',
        },
        description:
          'At the eastern edge of the South Rim, a stone tower rises from the canyon\'s edge as if it had always been there. Mary Colter designed the Watchtower in 1932, and its round View Room was meant as a place to rest and take in the canyon. From the rim nearby, the Colorado River leaves narrow Marble Canyon and opens into the vast Grand Canyon. It is an easy walk from the parking area, and a place made for lingering together.',
        plan: {
          distance: '0.25 mi from the main parking area',
          difficulty: 'Easy',
          accessibility: 'Short walk through the developed area; upper tower floors by stairs',
          bestTime: 'Upper floors 9 am to 4 pm when staffing allows (free timed tickets, 25 at a time)',
          scattering: gcScatter,
        },
        scatterStatus: 'prohibited',
        drive: {
          route: 'Highway 64 to the East Entrance, or Desert View Drive 23 miles east from Grand Canyon Village.',
          points: [{ label: 'Parking', lat: 36.04174, lon: -111.82797 }],
        },
        trail: { name: 'Desert View walkway', steps: ['Walk past the restrooms, market and trading post. The Watchtower is then in plain view.'] },
        final: [{ label: 'Watchtower', lat: 36.04401, lon: -111.82621 }],
        links: [{ label: 'Desert View Watchtower', url: 'https://www.nps.gov/places/000/desert-view-watchtower.htm' }],
      },
      {
        id: 'ooh-aah-point',
        name: 'Ooh Aah Point and Cedar Ridge',
        kinds: ['extraordinary'],
        photo: {
          src: nps('B4E27A94-95C8-0019-58893581D89DFCBD'),
          alt: 'Several trail switchbacks are cut into a cliff of tan rock',
          credit: 'NPS/M. Quinn',
          caption: 'South Kaibab Trail',
        },
        description:
          'From the first switchbacks of the South Kaibab Trail, the canyon opens beneath your feet. Ooh Aah Point, less than a mile down, is the place to stop, catch your breath and simply stare. Go together, find a spot along the ridge and tell the stories that belong to the person you came here for. Hikers who want more can continue to Cedar Ridge, but remember that every step down is one you will climb back up.',
        plan: {
          distance: 'Ooh Aah Point 1.8 mi round trip; Cedar Ridge 3 mi round trip',
          difficulty: 'Moderate to Ooh Aah Point; Difficult to Cedar Ridge',
          time: '1 to 2 hours; 2 to 4 hours',
          elevation: '790 ft; 1,120 ft',
          accessibility: 'Steep canyon trail; not wheelchair accessible',
          scattering: gcScatter,
        },
        scatterStatus: 'prohibited',
        drive: {
          route: 'South Entrance (Highway 64) to the Grand Canyon Visitor Center. No public parking at the trailhead: take the free Kaibab/Rim (Orange) shuttle, a 9-minute ride.',
          points: [
            { label: 'Visitor Center Lot P1', lat: 36.05879, lon: -112.10649 },
            { label: 'South Kaibab Trailhead', lat: 36.05294, lon: -112.08374 },
          ],
        },
        trail: {
          name: 'South Kaibab Trail',
          steps: ['Descend the switchbacks to Ooh Aah Point.', 'For Cedar Ridge, continue down the ridgeline.'],
          notes: ['All trails into the canyon are steep and difficult. There is no water on the trail, and the trailhead water station is currently off.'],
        },
        final: [
          { label: 'Ooh Aah Point', lat: 36.06151, lon: -112.08702 },
          { label: 'Cedar Ridge', lat: 36.06416, lon: -112.08961 },
        ],
        links: [{ label: 'South Kaibab Trail', url: 'https://www.nps.gov/places/000/south-kaibab-trail.htm' }],
      },
      {
        id: 'plateau-point',
        name: 'Plateau Point',
        kinds: ['extraordinary'],
        photo: {
          src: nps('3CF1FA2F-F5C3-E839-3CE0746FFE55B295'),
          alt: 'A dirt trail with steps descends into the canyon past a short cliff',
          credit: 'NPS/Ty Karlovetz',
          caption: 'Bright Angel Trail',
        },
        description:
          'Deep below the rim, Plateau Point stands directly above the Colorado River, the river that carved the Grand Canyon. Reaching it is a full, demanding day down the Bright Angel Trail and out along a flat, exposed path from Havasupai Gardens. For the strongest hikers in the family, standing at this edge with your loved one\'s memory is a way of saying they went all the way, and that you went with them.',
        plan: {
          distance: '12 mi round trip',
          difficulty: 'Strenuous',
          time: '9 to 12 hours',
          elevation: '3,080 ft',
          accessibility: 'Long, steep canyon trail; very exposed final section',
          scattering: gcScatter,
        },
        scatterStatus: 'prohibited',
        drive: {
          route: 'South Entrance (Highway 64), then Village Loop Drive. If there is no space near the trailhead, use Lot D by Maswik Lodge, about 0.4 mi away.',
          points: [
            { label: 'Bright Angel Trailhead', lat: 36.05728, lon: -112.14363 },
            { label: 'Lot D', lat: 36.05162, lon: -112.14378 },
          ],
        },
        trail: {
          name: 'Bright Angel Trail and Plateau Point Trail',
          steps: ['Descend the Bright Angel Trail to Havasupai Gardens.', 'Take the Plateau Point Trail, about 3 mi round trip from there; relatively flat but very exposed.'],
          notes: ['The park recommends checking with a ranger before attempting it as a day hike. Water status changes; some resthouse water stations have been off.'],
        },
        final: [{ label: 'Plateau Point', lat: 36.09326, lon: -112.11609 }],
        links: [{ label: 'Bright Angel Trail', url: 'https://www.nps.gov/places/000/bright-angel-trail.htm' }],
      },
    ],
  },
];

// Version 3.0: the other 58 parks live one per JSON file in ./parks/ (same
// shape as Park; photos stored locally under public/images/last-adventure/).
const researched = Object.values(
  import.meta.glob<Park>('./parks/*.json', { eager: true, import: 'default' }),
);

export const parks: Park[] = [...pilotParks, ...researched];

export const parkStates = (p: Park) => p.states ?? [p.state];
export const stateId = (state: string) => state.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Parks grouped by state, states and parks alphabetized; a multi-state park is listed under each of its states. */
export const states = [...new Set(parks.flatMap(parkStates))]
  .sort((a, b) => a.localeCompare(b))
  .map((state) => ({
    state,
    id: stateId(state),
    parks: parks.filter((p) => parkStates(p).includes(state)).sort((a, b) => a.short.localeCompare(b.short)),
  }));

/** Each park once, ordered by its primary state, then name. */
export const parkOrder = [...parks].sort(
  (a, b) => parkStates(a)[0].localeCompare(parkStates(b)[0]) || a.short.localeCompare(b.short),
);
