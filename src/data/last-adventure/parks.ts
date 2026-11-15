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

export type ScatterStatus = 'permitted' | 'not-here' | 'park-decision' | 'letter' | 'prohibited';

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
  state: string;
  tagline: string;
  photo: Photo;
  intro: string;
  homepage: string;
  map: Link[];
  scatterAllowed: 'Permitted with a permit' | 'Permitted with a permission letter' | 'Prohibited';
  scatterSummary: string;
  scatterFacts: string[];
  scatterLink: Link[];
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
const gcScatter = 'Prohibited throughout the park';

const paradiseRoadside: Point[] = [
  { label: 'Ricksecker Point', lat: 46.76995, lon: -121.78089, source: 'nps' },
  { label: 'Inspiration Point (roadside)', lat: 46.77338, lon: -121.74431, source: 'nps' },
];

export const parks: Park[] = [
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
          'Step to the rim and the Green River appears 1,300 feet below, winding through its channel with The Maze and the White Rim Road spread out beyond. The park counts this among the best places at Island in the Sky to watch the sun set, and the walk from the car is short enough for everyone. It is also one of the six authorized scattering locations, so the farewell and the scattering can share one view.',
        plan: {
          distance: 'About 0.1 mi from parking (map estimate)',
          difficulty: 'Easy',
          accessibility: 'Wheelchair accessible (NPS)',
          bestTime: 'Sunset',
          scattering: 'Permitted here with a permit',
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
          'Arrive before dawn, find a place along the rim and wait. As the sun clears the horizon, light pours through this 27-foot arch on the edge of the mesa, framing the canyon far below and the La Sal Mountains beyond. The loop walk is short, and the park calls this its classic sunrise spot: a quiet, beautiful way to begin a day of remembering together.',
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
          'At the southern tip of Island in the Sky, the land simply falls away. From the paved overlook you can trace the White Rim, look across to The Maze and The Needles, and find distant mountains on the horizon. Those who want more can follow the rim another mile to a second viewpoint while others rest at the overlook. Rangers often give geology talks here from spring through fall.',
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
          'This is a full day across dry, open desert country along the edge of the Needles faults. At the end, the trail stops at a cliff, and 1,000 feet below, the Green and Colorado rivers meet and become one. It is hard to imagine a more fitting place to remember a life that brought a family together. It is also an authorized scattering location, so the long walk can end with the farewell itself.',
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
          'The walk up Elephant Canyon is a real adventure: deep sand, loose rock, a ladder and a final scramble. The reward is a towering arch standing at the head of the canyon, a view the park calls one of the most spectacular in The Needles. This is a day for the strong hikers in the family, who can carry the memories and the photographs home to everyone else.',
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
          'Mount Moran rises above a slow curve of the Snake River, and on a still day the mountain is mirrored in the water. Oxbow Bend sits right beside the park road, so grandparents, young children and anyone who cannot hike can share the view from the turnout. Bring something warm to drink, arrive early and watch the light change on the mountain together.',
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
          'An easy trail climbs an aspen-covered moraine, then the trees open and the Teton Range fills the sky ahead. The path ends at an alpine lake right at the foot of the peaks, a view the park calls one of the best of the range. At three miles round trip, it is a walk most of the family can share, and in winter it can be reached on snowshoes.',
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
          'Start with a boat ride across Jenny Lake, then climb past Hidden Falls, a 100-foot cascade in the forest. A last set of switchbacks brings you out on a rocky perch high above the lake, looking across Jackson Hole. The boat keeps the hike short enough for many families; walking the shoreline instead turns it into a half-day adventure.',
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
          'High at the head of the North Fork of Cascade Canyon, Lake Solitude lies in a basin ringed by peaks. Getting there is a long day: a boat across Jenny Lake, the climb into Cascade Canyon, and mile after mile of mountain views with chances to spot wildlife along the way. For the hikers in the family, standing on its shore together is an achievement worth remembering.',
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
          'Come out of the Wawona Tunnel and Yosemite Valley opens in front of you: El Capitan on one side, Bridalveil Fall on the other, Half Dome rising in the distance. It is the defining view of the valley, and it is right beside the parking area, with accessible parking and a short paved walk. Gather at the viewing area and take the family photograph you will keep.',
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
          'A short paved path leads to a railed overlook 3,200 feet above Yosemite Valley. Half Dome stands directly across from you, the High Sierra stretches beyond, and the valley floor lies far below. Because the path is wheelchair accessible, nearly everyone in the family can stand together at the edge of one of the great views in Yosemite.',
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
          'An easy walk through forest and meadow ends suddenly at the rim of Yosemite Valley. Beside you, deep cracks called The Fissures cut into the granite; across the valley stand El Capitan and Yosemite Falls. It is a short hike with a dramatic edge, best for families comfortable around heights, and a view none of you will forget.',
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
          'A mile of trail and a short scramble up bare granite bring you to the top of Sentinel Dome, where Yosemite spreads out in every direction. From the summit you can see Half Dome and the High Sierra in one sweeping, 360-degree view. It is a short climb with a summit that feels like a celebration, a fine place to raise a toast together.',
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
          'For many hikers, Half Dome is the climb of a lifetime. The trail passes Vernal and Nevada Falls and Liberty Cap before the final 400 feet up steel cables to a summit nearly 5,000 feet above Yosemite Valley. It takes a permit, an early start and a long, hard day. For someone who always talked about making this climb, carrying them to the top could be the ultimate tribute.',
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
          'At Paradise, a short paved walk through the meadows leads to Edith Creek, where Myrtle Falls tumbles down with the glaciers of Mount Rainier rising directly behind it. It is one of the easiest ways to stand in front of the mountain, suitable for strollers and wheelchairs with help, and a gentle outing every generation of the family can share.',
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
          'From this overlook on the road to Sunrise, the view opens in nearly every direction: deep valleys, Mount Rainier and other Cascade volcanoes such as Mount Adams. It is one of the park’s designated scattering locations, so a family can gather, share stories as the evening light changes and scatter in the same place, all from beside the car.',
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
          'The Skyline Trail climbs steadily above the Paradise meadows until Panorama Point puts you face to face with Mount Rainier and its glaciers. It is a real climb of 1,700 feet, best for confident hikers. Keep going on the High Skyline loop to turn it into a full, unforgettable day on the mountain.',
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
          'Walk the high ridge above Sunrise to an old fire lookout perched on a rocky point, with Mount Rainier filling the view across Grand Park. The trail crosses open country past Frozen Lake, and the lookout itself, built to keep watch over the land, makes a moving place to pause, share memories and look back at the mountain together.',
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
    scatterSummary: 'Scattering of ashes is prohibited throughout the park, and no permits are issued.',
    scatterFacts: [
      'Superintendent’s Compendium item (62), citing 36 CFR 1.5(a)(2) and 36 CFR 2.62.',
      'Plan the farewell here, and scatter separately at a legally permitted location outside the park.',
    ],
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
          'At the eastern end of the South Rim, Mary Colter’s 1932 stone tower seems to grow out of the canyon edge. Its round View Room was designed as a place to sit and take in the canyon, and from the rim you can see the Colorado River leave narrow Marble Canyon for the vast Grand Canyon. It is a short walk from the parking area, close enough for the whole family.',
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
          'The South Kaibab Trail drops off the rim along a ridgeline, so the canyon opens beneath your feet almost from the first step. Ooh Aah Point, under a mile down, earns its name with a sweeping view into the depths; Cedar Ridge, farther on, takes you deeper still. Every step down is a step to climb back up, so pace the day for everyone in your group.',
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
          'This is a full day into the heart of the canyon. The Bright Angel Trail switchbacks down to Havasupai Gardens, then a flat, exposed path leads out to Plateau Point, standing directly above the Colorado River in the inner gorge. For the strongest hikers in the family, it is a chance to look down on the river that carved it all and to carry a loved one’s memory there with you.',
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

/** Parks grouped by state, states and parks alphabetized. */
export const states = [...new Set(parks.map((p) => p.state))]
  .sort((a, b) => a.localeCompare(b))
  .map((state) => ({
    state,
    id: state.toLowerCase().replace(/\s+/g, '-'),
    parks: parks.filter((p) => p.state === state).sort((a, b) => a.short.localeCompare(b.short)),
  }));
