// One Last Amazing Adventure: five-park pilot data (Version 1.1 research,
// Randy, November 2026). Private preview content only. Coordinates are
// map-verified (OpenStreetMap features matching the NPS descriptions) unless
// marked `source: 'nps'` (published in the official NPS map data). None are
// field-verified. Photographs are official NPS images, hotlinked from nps.gov
// with the credit printed on the NPS page; a destination without a credited
// NPS photograph has `photo: null` and shows a placeholder.

export interface Point {
  label: string;
  lat: number;
  lon: number;
  source?: 'osm' | 'nps';
  note?: string;
}

export interface Photo {
  src: string;
  alt: string;
  credit: string;
  caption?: string;
}

export interface Link {
  label: string;
  url: string;
}

export type ScatterStatus = 'permitted' | 'not-here' | 'park-decision' | 'prohibited';

export interface Destination {
  id: string;
  name: string;
  kinds: Array<'accessible' | 'extraordinary'>;
  photo: Photo | null;
  why: string;
  glance: {
    distance: string;
    difficulty: string;
    time: string;
    elevation: string;
    accessibility: string;
    scattering: string;
  };
  scatterStatus: ScatterStatus;
  gettingThere: { route: string; parking: string; points: Point[] };
  journey: { trail: string; steps: string[]; notes?: string[] };
  final: { description: string; points: Point[] };
  scattering: { text: string; points?: Point[] };
  links: Link[];
}

export interface Park {
  id: string;
  name: string;
  state: string;
  photo: Photo;
  intro: string;
  homepage: string;
  map: Link[];
  scatterAllowed: 'Permitted with a permit' | 'Permitted with a permission letter' | 'Prohibited';
  scatterSummary: string;
  scatterFacts: string[];
  scatterLink: Link[];
  seasons?: string;
  destinations: Destination[];
}

export const mapsUrl = (lat: number, lon: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lon.toFixed(5)}`;

const nps = (p: string) => `https://www.nps.gov/common/uploads/cropped_image/primary/${p}.jpg`;

export const parks: Park[] = [
  {
    id: 'canyonlands',
    name: 'Canyonlands National Park',
    state: 'Utah',
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
      { label: 'Island in the Sky roads and trails map (PDF)', url: 'https://www.nps.gov/cany/planyourvisit/upload/IslandRoadsandTrailsUpdated24-508forweb.pdf' },
      { label: 'Needles roads and trails map (PDF)', url: 'https://www.nps.gov/cany/planyourvisit/upload/NeedlesTrailsandRoads2026_with-Davis-Road-Setback-update.pdf' },
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
    seasons:
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
        why: 'The Green River winds through its channel 1,300 feet below, with The Maze and the White Rim spread out beyond. The park calls it one of the best places at Island in the Sky to watch the sun set, and it is one of the six places where scattering is authorized.',
        glance: {
          distance: 'About 0.1 mi from parking (map estimate)',
          difficulty: 'Easy',
          time: 'A few minutes',
          elevation: 'Minimal',
          accessibility: 'Wheelchair accessible (NPS)',
          scattering: 'Permitted here with a permit',
        },
        scatterStatus: 'permitted',
        gettingThere: {
          route: 'From US 191 north of Moab, take UT 313 into Island in the Sky. Drive south on the scenic drive (Grand View Point Road), then turn west on Green River Overlook Road and follow it to the end.',
          parking: 'Green River Overlook parking lot',
          points: [{ label: 'Parking', lat: 38.37958, lon: -109.88785 }],
        },
        journey: {
          trail: 'Overlook path',
          steps: ['A short path leads from the parking lot to the overlook. There are no junctions.'],
        },
        final: {
          description: 'A wide rim overlook facing southwest. As the sun goes down, the canyon turns copper and the river slips into shadow. The goodbye and the scattering can happen in the same place.',
          points: [{ label: 'Overlook', lat: 38.37818, lon: -109.88819 }],
        },
        scattering: { text: 'Scattering is authorized here with a permit and under the park conditions above.' },
        links: [{ label: 'Green River Overlook (NPS)', url: 'https://www.nps.gov/places/green-river-overlook.htm' }],
      },
      {
        id: 'mesa-arch',
        name: 'Mesa Arch',
        kinds: ['accessible'],
        photo: null,
        why: 'A 27-foot arch perched on the cliff edge, framing the canyon far below and the La Sal Mountains in the distance. It is the classic sunrise spot in the park.',
        glance: {
          distance: '0.6 mi round-trip loop',
          difficulty: 'Easy',
          time: '30 minutes',
          elevation: '56 ft',
          accessibility: 'Not wheelchair accessible: rocky hill and stone steps',
          scattering: 'Not at this spot',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'From US 191 north of Moab, take UT 313 into Island in the Sky and continue on the scenic drive (Grand View Point Road) to the Mesa Arch lot.',
          parking: 'Mesa Arch Loop parking',
          points: [{ label: 'Parking', lat: 38.38947, lon: -109.86784 }],
        },
        journey: {
          trail: 'Mesa Arch Trail (loop)',
          steps: ['To avoid most of the stairs, walk clockwise to the arch, then retrace your steps.'],
        },
        final: {
          description: 'Arrive before dawn and watch the first light pour through the arch together.',
          points: [{ label: 'Mesa Arch', lat: 38.38805, lon: -109.86345 }],
        },
        scattering: {
          text: 'The nearest authorized location is Green River Overlook, on the spur road off the same scenic drive (permit required).',
          points: [{ label: 'Green River Overlook', lat: 38.37818, lon: -109.88819 }],
        },
        links: [{ label: 'Mesa Arch Trail (NPS)', url: 'https://www.nps.gov/places/mesa-arch.htm' }],
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
        why: 'The southern tip of Island in the Sky. From here the White Rim, The Maze, The Needles and distant mountains all open up at once.',
        glance: {
          distance: 'Paved sidewalk to the overlook; full rim trail 1.8 mi round trip',
          difficulty: 'Easy',
          time: '1.5 hours for the full trail',
          elevation: '73 ft',
          accessibility: 'Overlook wheelchair accessible (NPS); the trail beyond is rough with stone steps',
          scattering: 'Not at this spot',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'From US 191 north of Moab, take UT 313 into Island in the Sky and drive to the end of Grand View Point Road.',
          parking: 'Grand View Point parking',
          points: [{ label: 'Parking', lat: 38.31147, lon: -109.85619 }],
        },
        journey: {
          trail: 'Grand View Point Trail',
          steps: [
            'Follow the short paved sidewalk to the overlook.',
            'For more, the rim trail continues about 1 mile to a second viewpoint, then returns the same way.',
          ],
        },
        final: {
          description: 'The paved overlook suits every member of the family; the second viewpoint at the end of the rim trail feels like standing at the end of the world.',
          points: [
            { label: 'Paved overlook', lat: 38.31015, lon: -109.85677 },
            { label: 'Second viewpoint (end of trail)', lat: 38.30335, lon: -109.86782 },
          ],
        },
        scattering: {
          text: 'The most practical authorized location is the White Rim Overlook Trail, a short drive north on the same road (easy, 1.8 mi round trip, 159 ft; very limited parking, do not park off the pavement). Orange Cliffs Overlook is also authorized. Permit required.',
          points: [
            { label: 'White Rim Overlook Trail parking', lat: 38.32233, lon: -109.85024 },
            { label: 'White Rim Overlook', lat: 38.31999, lon: -109.83524 },
            { label: 'Orange Cliffs Overlook parking', lat: 38.31338, lon: -109.85712 },
          ],
        },
        links: [
          { label: 'Grand View Point (NPS)', url: 'https://www.nps.gov/places/grand-view-point.htm' },
          { label: 'White Rim Overlook Trail (NPS)', url: 'https://www.nps.gov/places/white-rim-overlook-trail.htm' },
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
        why: 'The trail ends at a cliff 1,000 feet above the meeting of the Green and Colorado rivers. Two rivers become one: a powerful place to remember a life and a family.',
        glance: {
          distance: '11 mi round trip',
          difficulty: 'Strenuous',
          time: '5 to 6 hours',
          elevation: '309 ft overall; cumulative gain is much greater',
          accessibility: 'Rough and rocky; not wheelchair accessible',
          scattering: 'Permitted here with a permit',
        },
        scatterStatus: 'permitted',
        gettingThere: {
          route: 'From US 191 south of Moab, take UT 211 to the Needles entrance and follow the main park road to its end.',
          parking: 'Big Spring Canyon Overlook (trailhead)',
          points: [{ label: 'Trailhead', lat: 38.17823, lon: -109.81716 }],
        },
        journey: {
          trail: 'Confluence Overlook Trail',
          steps: [
            'Head west across open country along the northern edge of the Needles faults.',
            'At about 4.0 mi, the Lower Red Lake Canyon route branches south. Continue straight (west).',
            'Walk the final 1.5 mi to the overlook.',
          ],
          notes: ['Mileages are read from the official Needles map. Trails are marked with cairns, with signs at intersections. Carry all the water you need.'],
        },
        final: {
          description: 'A cliff-edge overlook above the junction of the two great rivers of the Colorado Plateau.',
          points: [{ label: 'Confluence Overlook', lat: 38.18189, lon: -109.88099 }],
        },
        scattering: { text: 'Scattering is authorized here with a permit.' },
        links: [{ label: 'Confluence Overlook Trail (NPS)', url: 'https://www.nps.gov/places/confluence-overlook-trail.htm' }],
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
        why: 'The park calls the view here one of the most spectacular in The Needles: a towering stone arch like a cathedral at the head of Elephant Canyon. A full day of walking for the family members who love a challenge.',
        glance: {
          distance: '10.8 mi round trip',
          difficulty: 'Strenuous',
          time: '5 to 7 hours',
          elevation: '503 ft overall; cumulative gain is much greater',
          accessibility: 'Deep sand, one ladder and scrambling',
          scattering: 'Not at this spot',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'From US 191 south of Moab, take UT 211 to the Needles entrance, follow the main park road, then the Elephant Hill Access Road to the trailhead. Check road conditions with the park.',
          parking: 'Elephant Hill Trailhead',
          points: [{ label: 'Trailhead', lat: 38.14168, lon: -109.8276 }],
        },
        journey: {
          trail: 'Chesler Park trail, then the Druid Arch trail in Elephant Canyon',
          steps: [
            'Follow the first part of the Chesler Park trail.',
            'Branch off into the bottom of Elephant Canyon, through deep sand and loose rock.',
            'The final steep pitch includes one ladder and some scrambling.',
          ],
          notes: ['NPS sources differ on the length of the final steep section: 0.25 mi on the park map, 1.25 mi on the trail page.'],
        },
        final: {
          description: 'The base of the arch, high at the head of the canyon.',
          points: [{ label: 'Druid Arch', lat: 38.08846, lon: -109.83184 }],
        },
        scattering: {
          text: 'The most practical authorized location is Confluence Overlook. Colorado River Overlook is also authorized; NPS describes its road as moderate and unpaved, and visitors can avoid the large rocks in the last 1.5 miles by parking and walking. Permit required.',
          points: [
            { label: 'Confluence Overlook', lat: 38.18189, lon: -109.88099 },
            { label: 'Colorado River Overlook', lat: 38.21579, lon: -109.82987 },
          ],
        },
        links: [{ label: 'Druid Arch Trail (NPS)', url: 'https://www.nps.gov/places/druid-arch-trail.htm' }],
      },
    ],
  },
  {
    id: 'grand-teton',
    name: 'Grand Teton National Park',
    state: 'Wyoming',
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
    seasons:
      'The park is open all year, but several road entrances are closed or have limited vehicle access from November to May. Construction is underway across the park in 2026. Every featured destination sits at a lake or river, so plan the farewell there and propose a separate scattering site at least 100 yards from water.',
    destinations: [
      {
        id: 'oxbow-bend',
        name: 'Oxbow Bend',
        kinds: ['accessible'],
        photo: null,
        why: 'Mount Moran mirrored in a slow bend of the Snake River, with wildlife often along the banks. One of the most photographed views in the park, and you can enjoy it without leaving the turnout.',
        glance: {
          distance: 'Roadside overlook',
          difficulty: 'Easy',
          time: 'As long as you like',
          elevation: 'None',
          accessibility: 'View from the turnout; surface details not published',
          scattering: 'Not here (within 100 yards of the river)',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'Follow the park highway east from Jackson Lake Junction toward the Moran Entrance to the Oxbow Bend Turnout.',
          parking: 'Oxbow Bend Turnout',
          points: [{ label: 'Turnout', lat: 43.86617, lon: -110.54754 }],
        },
        journey: { trail: 'None', steps: ['The view is right at the turnout.'] },
        final: {
          description: 'Gather early, as the mountain appears in the still water.',
          points: [{ label: 'Oxbow Bend Overlook', lat: 43.86608, lon: -110.54758 }],
        },
        scattering: { text: 'Only at a site the family proposes in the permit application and the park approves, at least 100 yards from water.' },
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
        why: 'The park says this short walk offers some of the best views of the Teton Range: an alpine lake directly beneath the peaks, reached on a gentle trail most of the family can share.',
        glance: {
          distance: '3 mi round trip',
          difficulty: 'Easy',
          time: '1 to 2 hours',
          elevation: '360 ft',
          accessibility: 'Average slope 6%, with rocks and steps',
          scattering: 'Not at the shore',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'Enter at the Moose Entrance and drive north on Teton Park Road to the Taggart Lake Trailhead. The lot fills in summer; arrive early.',
          parking: 'Taggart Lake Trailhead',
          points: [{ label: 'Trailhead', lat: 43.69314, lon: -110.73294 }],
        },
        journey: {
          trail: 'Taggart Lake Trail',
          steps: [
            'Climb the aspen-covered moraine as the Tetons come into view.',
            'At the Bradley Lake trail split, stay left for Taggart Lake.',
            'The trail flattens out and reaches the lakeshore.',
          ],
          notes: ['In winter the lake can be reached on snowshoes or cross-country skis.'],
        },
        final: {
          description: 'The east shore, where the trail meets the water beneath the peaks.',
          points: [{ label: 'East shore', lat: 43.70513, lon: -110.75014 }],
        },
        scattering: { text: 'Only at a site the family proposes in the permit application and the park approves, at least 100 yards from the lake and its streams.' },
        links: [{ label: 'Taggart Lake (NPS)', url: 'https://www.nps.gov/thingstodo/taggartlake.htm' }],
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
        why: 'A boat ride across Jenny Lake, a climb past 100-foot Hidden Falls, then a perch high above the lake and the valley of Jackson Hole. It feels like the kind of day a family might once have spent exploring together.',
        glance: {
          distance: '1.8 mi round trip by shuttle boat; 5.7 mi round trip on foot',
          difficulty: 'Easy by boat; Moderate on foot',
          time: '2 to 4 hours',
          elevation: '550 ft by boat; 870 ft on foot',
          accessibility: 'Rock stairs, roots and steep switchbacks',
          scattering: 'Park decision',
        },
        scatterStatus: 'park-decision',
        gettingThere: {
          route: 'Drive Teton Park Road and turn at South Jenny Lake. Parking fills in mid-summer; the park advises arriving before 9 am.',
          parking: 'South Jenny Lake parking',
          points: [{ label: 'Parking', lat: 43.75072, lon: -110.72309 }],
        },
        journey: {
          trail: 'Shuttle boat or South Jenny Lake Loop, then the Inspiration Point trail',
          steps: [
            'Take the privately run shuttle boat across the lake (check hours and prices; tickets at the dock), or walk around the southern shore.',
            'From the west shore boat dock, climb past Hidden Falls.',
            'Continue up the switchbacks to the point.',
          ],
        },
        final: {
          description: 'A rocky viewpoint high above Jenny Lake, looking out over Jackson Hole.',
          points: [
            { label: 'Inspiration Point', lat: 43.76701, lon: -110.74826 },
            { label: 'West shore boat dock', lat: 43.7672, lon: -110.74421 },
            { label: 'Hidden Falls', lat: 43.76632, lon: -110.7512 },
          ],
        },
        scattering: { text: 'Only at a site the family proposes in the permit application and the park approves, at least 100 yards from Jenny Lake and its streams and outside developed areas.' },
        links: [{ label: 'Inspiration Point (NPS)', url: 'https://www.nps.gov/thingstodo/inspirationpoint.htm' }],
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
        why: 'A high alpine lake at the head of Cascade Canyon, ringed by peaks and rich in wildlife. A long, unforgettable day for strong hikers.',
        glance: {
          distance: '14.4 mi round trip by shuttle boat; 18.3 mi on foot',
          difficulty: 'Strenuous by boat; very strenuous on foot',
          time: '9 to 13 hours',
          elevation: '2,670 ft by boat; 2,910 ft on foot',
          accessibility: 'Bridges, steps, roots, narrow sections and steep switchbacks',
          scattering: 'Not at the shore',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'Drive Teton Park Road and turn at South Jenny Lake. Arrive early.',
          parking: 'South Jenny Lake parking',
          points: [{ label: 'Parking', lat: 43.75072, lon: -110.72309 }],
        },
        journey: {
          trail: 'Cascade Canyon Trail and North Fork Cascade Canyon Trail',
          steps: [
            'Cross Jenny Lake by shuttle boat or walk the southern shore.',
            'Hike up Cascade Canyon to the Forks of Cascade Canyon.',
            'At the junction, go right on the North Fork Cascade Canyon Trail to the lake.',
          ],
          notes: ['Best in summer after the snow melts and in fall before the first snow. Do not attempt it on snow without experience and the right equipment.'],
        },
        final: {
          description: 'The shore where the trail meets the lake, surrounded by peaks.',
          points: [{ label: 'Lakeshore at the end of the trail', lat: 43.79444, lon: -110.84253 }],
        },
        scattering: { text: 'Only at a site the family proposes in the permit application and the park approves, at least 100 yards from the lake.' },
        links: [{ label: 'Lake Solitude (NPS)', url: 'https://www.nps.gov/thingstodo/lakesolitude.htm' }],
      },
    ],
  },
  {
    id: 'yosemite',
    name: 'Yosemite National Park',
    state: 'California',
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
    seasons:
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
        why: 'The defining Yosemite panorama: El Capitan, Half Dome and Bridalveil Fall framed together above the valley.',
        glance: {
          distance: 'Roadside',
          difficulty: 'Easy',
          time: 'As long as you like',
          elevation: 'None',
          accessibility: 'Designated accessible parking; the view is visible from the parking area or a short paved walk (NPS)',
          scattering: 'Not here',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'Follow Highway 41 (Wawona Road) to the east end of the Wawona Tunnel, just before Yosemite Valley.',
          parking: 'Tunnel View parking (Wawona Road)',
          points: [{ label: 'Parking', lat: 37.71513, lon: -119.67674 }],
        },
        journey: { trail: 'None', steps: ['A short paved walk leads to the pedestrian viewing area, which has a bronze tactile model of the valley.'] },
        final: {
          description: 'The viewing area above the valley. Come in the late afternoon, when the light warms the granite.',
          points: [{ label: 'Tunnel View', lat: 37.71557, lon: -119.67689 }],
        },
        scattering: { text: 'At a location meeting the permission letter conditions: out of sight of roads, trails and parking, and at least 100 yards from water.' },
        links: [{ label: 'Tunnel View (NPS)', url: 'https://www.nps.gov/places/000/tunnel-view.htm' }],
      },
      {
        id: 'glacier-point',
        name: 'Glacier Point',
        kinds: ['accessible'],
        photo: null,
        why: 'Standing 3,200 feet above Yosemite Valley, face to face with Half Dome and the High Sierra. Few places feel so close to the sky.',
        glance: {
          distance: '300 yards one way',
          difficulty: 'Easy',
          time: '10 to 15 minutes',
          elevation: 'Paved, gentle incline',
          accessibility: 'Wheelchair accessible via a 300-yard paved switchback path (NPS)',
          scattering: 'Not here',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'From Highway 41 (Wawona Road), turn at Chinquapin onto Glacier Point Road and follow it to its end, a little under an hour from Yosemite Valley. There is no shuttle from the valley.',
          parking: 'Glacier Point parking area',
          points: [{ label: 'Parking', lat: 37.72733, lon: -119.5759 }],
        },
        journey: { trail: 'Glacier Point Overlook path', steps: ['Follow the paved path from the parking area to the overlook.'] },
        final: {
          description: 'The railed overlook at the rim. Sunset turns Half Dome gold.',
          points: [{ label: 'Glacier Point', lat: 37.73067, lon: -119.57367 }],
        },
        scattering: { text: 'At a location meeting the permission letter conditions: out of sight of roads, trails and parking, and at least 100 yards from water.' },
        links: [
          { label: 'Glacier Point (NPS)', url: 'https://www.nps.gov/places/000/glacier-point.htm' },
          { label: 'Day hikes along Glacier Point Road (NPS)', url: 'https://www.nps.gov/yose/planyourvisit/glacierhikes.htm' },
        ],
      },
      {
        id: 'taft-point',
        name: 'Taft Point',
        kinds: ['accessible', 'extraordinary'],
        photo: null,
        why: 'A walk through forest and meadow ends abruptly at the sheer rim of Yosemite Valley, looking across at El Capitan and Yosemite Falls, beside the deep cracks called The Fissures.',
        glance: {
          distance: '2.2 mi round trip',
          difficulty: 'Easy',
          time: '1 to 2 hours',
          elevation: '200 ft, on the return',
          accessibility: 'Forest and meadow trail; exposed cliff edges',
          scattering: 'Not here',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'From Highway 41 (Wawona Road), turn at Chinquapin onto Glacier Point Road and drive to the Sentinel Dome/Taft Point Trailhead.',
          parking: 'Sentinel Dome/Taft Point Trailhead',
          points: [{ label: 'Trailhead', lat: 37.71246, lon: -119.58658 }],
        },
        journey: {
          trail: 'Taft Point trail',
          steps: [
            'Shortly after the trailhead the trail splits. Bear left (west) for Taft Point; the right fork leads north to Sentinel Dome.',
            'Continue through forest and meadow to the rim beside The Fissures.',
          ],
          notes: ['The junction is read from the official NPS Glacier Point Road trail map. Keep well back from the cliff edges.'],
        },
        final: {
          description: 'A rocky point on the rim with a sheer drop to the valley floor.',
          points: [{ label: 'Taft Point', lat: 37.71311, lon: -119.60461 }],
        },
        scattering: { text: 'At a location meeting the permission letter conditions: out of sight of roads, trails and parking, and at least 100 yards from water.' },
        links: [{ label: 'Day hikes along Glacier Point Road (NPS)', url: 'https://www.nps.gov/yose/planyourvisit/glacierhikes.htm' }],
      },
      {
        id: 'sentinel-dome',
        name: 'Sentinel Dome',
        kinds: ['extraordinary'],
        photo: null,
        why: 'A short climb up a granite dome rewards you with a full 360-degree view of Yosemite.',
        glance: {
          distance: '2 mi round trip',
          difficulty: 'Moderate',
          time: '1 to 2 hours',
          elevation: '400 ft',
          accessibility: 'The final climb is a scramble up granite',
          scattering: 'Not here',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'From Highway 41 (Wawona Road), turn at Chinquapin onto Glacier Point Road and drive to the Sentinel Dome/Taft Point Trailhead.',
          parking: 'Sentinel Dome/Taft Point Trailhead',
          points: [{ label: 'Trailhead', lat: 37.71246, lon: -119.58658 }],
        },
        journey: {
          trail: 'Sentinel Dome trail',
          steps: ['Shortly after the trailhead, bear right (north) at the split.', 'Scramble up the side of the dome to the summit.'],
          notes: ['Stay off the domes during thunderstorms.'],
        },
        final: {
          description: 'The open granite summit, with the whole park around you.',
          points: [{ label: 'Sentinel Dome summit', lat: 37.72298, lon: -119.58433 }],
        },
        scattering: { text: 'At a location meeting the permission letter conditions: out of sight of roads, trails and parking, and at least 100 yards from water.' },
        links: [{ label: 'Day hikes along Glacier Point Road (NPS)', url: 'https://www.nps.gov/yose/planyourvisit/glacierhikes.htm' }],
      },
      {
        id: 'half-dome',
        name: 'Half Dome',
        kinds: ['extraordinary'],
        photo: null,
        why: 'Yosemite’s icon, rising nearly 5,000 feet above the valley. The last 400 feet are climbed on steel cables, a once-in-a-lifetime summit.',
        glance: {
          distance: '14 to 16 mi round trip',
          difficulty: 'Strenuous',
          time: '10 to 12 hours',
          elevation: '4,800 ft',
          accessibility: 'Long, steep climb with cables at the top',
          scattering: 'Not here',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'Enter Yosemite Valley by Highway 41, 120 or 140 and drive to Curry Village. Trailhead parking is just beyond Curry Village; Happy Isles is shuttle stop #16.',
          parking: 'Trailhead parking beyond Curry Village',
          points: [
            { label: 'Trailhead parking', lat: 37.73501, lon: -119.56646 },
            { label: 'Happy Isles Trailhead', lat: 37.73282, lon: -119.55778 },
          ],
        },
        journey: {
          trail: 'Mist Trail or John Muir Trail, then the Half Dome Trail',
          steps: [
            'Climb past Vernal and Nevada Falls and Liberty Cap.',
            'Continue to the subdome and the base of the cables.',
            'Climb the final 400 feet on the cables.',
          ],
          notes: [
            'A permit is required whenever the cables are up, normally from the Friday before Memorial Day until the day after the second Monday in October. Preseason lottery March 1 to 31, plus daily lotteries. $10 per application, plus $10 per person when awarded.',
            'Set a turnaround time (for example, turn back if you have not reached the top by 3:30 pm). Never climb the cables when the rock is wet.',
          ],
        },
        final: {
          description: 'The broad granite summit, high above the valley floor.',
          points: [{ label: 'Half Dome summit', lat: 37.746, lon: -119.53325 }],
        },
        scattering: { text: 'At a location meeting the permission letter conditions: out of sight of roads, trails and parking, and at least 100 yards from water.' },
        links: [
          { label: 'Half Dome day hike (NPS)', url: 'https://www.nps.gov/yose/planyourvisit/halfdome.htm' },
          { label: 'Half Dome permits (NPS)', url: 'https://www.nps.gov/yose/planyourvisit/hdpermits.htm' },
        ],
      },
    ],
  },
  {
    id: 'mount-rainier',
    name: 'Mount Rainier National Park',
    state: 'Washington',
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
    seasons:
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
        why: 'A braided waterfall in the Paradise wildflower meadows, with the glaciers of Mount Rainier rising behind it.',
        glance: {
          distance: '1 mi round trip',
          difficulty: 'Easy',
          time: '35 minutes',
          elevation: '100 ft',
          accessibility: 'Suitable for wheelchairs with help, and strollers (NPS); a steep stairway descends to the best viewpoint',
          scattering: 'Not here',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'Take SR 706 to the Nisqually Entrance, continue through Longmire and drive 12 miles to Paradise.',
          parking: 'Skyline Trailhead, north side of the upper parking lot next to the Jackson Visitor Center',
          points: [{ label: 'Trailhead', lat: 46.78642, lon: -121.73645 }],
        },
        journey: {
          trail: 'Skyline Trail',
          steps: ['Walk northeast on the paved Skyline Trail to Edith Creek.', 'A steep stairway descends to the falls viewpoint.'],
        },
        final: {
          description: 'The falls viewpoint below the Skyline Trail, with the mountain behind the cascade.',
          points: [{ label: 'Myrtle Falls', lat: 46.79137, lon: -121.73249 }],
        },
        scattering: {
          text: 'At the designated roadside locations below Paradise. Ricksecker Point: any day, 3 pm to 10 am, up to 30 people, multiple permits a day. Inspiration Point: any time, up to 30 people, one permit at a time. Permit required.',
          points: [
            { label: 'Ricksecker Point', lat: 46.76995, lon: -121.78089, source: 'nps' },
            { label: 'Inspiration Point (roadside)', lat: 46.77338, lon: -121.74431, source: 'nps' },
          ],
        },
        links: [
          { label: 'Myrtle Falls (NPS)', url: 'https://www.nps.gov/places/myrtle-falls.htm' },
          { label: 'Paradise area trails (PDF)', url: 'https://www.nps.gov/mora/planyourvisit/upload/2019-Paradise-Area-Trails_508.pdf' },
        ],
      },
      {
        id: 'sunrise-point',
        name: 'Sunrise Point',
        kinds: ['accessible'],
        photo: null,
        why: 'The park describes nearly 360-degree views of the surrounding valleys, Mount Rainier and other Cascade volcanoes such as Mount Adams. It is also a designated scattering location, so the farewell and the scattering can happen together.',
        glance: {
          distance: 'Roadside',
          difficulty: 'Easy',
          time: 'As long as you like',
          elevation: 'None',
          accessibility: 'View from the parking area; surface details not published',
          scattering: 'Permitted here with a permit (weekdays, 3 pm to 10 am)',
        },
        scatterStatus: 'permitted',
        gettingThere: {
          route: 'Take SR 410 to the White River Entrance and follow the Sunrise road to the Sunrise Point parking area.',
          parking: 'Sunrise Point parking',
          points: [{ label: 'Parking', lat: 46.91742, lon: -121.58841 }],
        },
        journey: { trail: 'None', steps: ['The viewpoint is at the parking area.'] },
        final: {
          description: 'A roadside overlook facing the mountain. An evening farewell here, as the last light catches the volcanoes, can end with the scattering itself.',
          points: [{ label: 'Sunrise Point (designated location)', lat: 46.91743, lon: -121.58812, source: 'nps' }],
        },
        scattering: { text: 'Designated scattering location: weekdays only (no federal holidays), 3 pm to 10 am, up to 30 people, one permit at a time. Permit required.' },
        links: [{ label: 'Sunrise (NPS)', url: 'https://www.nps.gov/mora/planyourvisit/sunrise.htm' }],
      },
      {
        id: 'panorama-point',
        name: 'Panorama Point',
        kinds: ['extraordinary'],
        photo: null,
        why: 'A climb above the Paradise meadows to a close view of the mountain’s glaciers, with the Tatoosh Range and distant volcanoes on the horizon.',
        glance: {
          distance: '4 mi round trip',
          difficulty: 'Difficult',
          time: '3 hours',
          elevation: '1,700 ft',
          accessibility: 'Steep mountain trail',
          scattering: 'Not here',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'Take SR 706 to the Nisqually Entrance, continue through Longmire and drive 12 miles to Paradise.',
          parking: 'Skyline Trailhead, north side of the upper parking lot next to the Jackson Visitor Center',
          points: [{ label: 'Trailhead', lat: 46.78642, lon: -121.73645 }],
        },
        journey: {
          trail: 'Skyline Trail and Golden Gate Trail',
          steps: [
            'Climb the Skyline Trail, then the Golden Gate Trail, to Panorama Point.',
            'Alternative: the Deadhorse Creek Trail from the lower lot meets the Skyline Trail near Glacier Vista.',
            'To make a loop, continue on the High Skyline Trail (5.5 mi round trip, about 4.5 hours).',
          ],
          notes: ['A pit toilet at Panorama Point is open in summer only.'],
        },
        final: {
          description: 'A high viewpoint on the mountain’s flank, facing the glaciers.',
          points: [{ label: 'Panorama Point', lat: 46.80356, lon: -121.72971 }],
        },
        scattering: {
          text: 'At the designated roadside locations below Paradise: Ricksecker Point (any day, 3 pm to 10 am, up to 30 people) or Inspiration Point (any time, up to 30 people). Permit required.',
          points: [
            { label: 'Ricksecker Point', lat: 46.76995, lon: -121.78089, source: 'nps' },
            { label: 'Inspiration Point (roadside)', lat: 46.77338, lon: -121.74431, source: 'nps' },
          ],
        },
        links: [{ label: 'Paradise area trails (PDF)', url: 'https://www.nps.gov/mora/planyourvisit/upload/2019-Paradise-Area-Trails_508.pdf' }],
      },
      {
        id: 'mount-fremont-lookout',
        name: 'Mount Fremont Lookout',
        kinds: ['extraordinary'],
        photo: null,
        why: 'A historic fire lookout on a high ridge, facing Mount Rainier across Grand Park. Watching the mountain from a place built to watch over the land feels fitting.',
        glance: {
          distance: '5.6 mi round trip',
          difficulty: 'Moderate',
          time: '3.5 hours',
          elevation: '900 ft',
          accessibility: 'Mountain trail',
          scattering: 'Not at the lookout',
        },
        scatterStatus: 'not-here',
        gettingThere: {
          route: 'Take SR 410 to the White River Entrance and follow the Sunrise road 13 miles to Sunrise.',
          parking: 'Sourdough Ridge Trailhead, by the Sunrise picnic area and day lodge',
          points: [
            { label: 'Trailhead', lat: 46.9148, lon: -121.64243 },
            { label: 'Sunrise picnic area', lat: 46.91522, lon: -121.64454 },
          ],
        },
        journey: {
          trail: 'Sourdough Ridge Trail and Mount Fremont Trail',
          steps: [
            'Climb the Sourdough Ridge Trail to the junction at Frozen Lake.',
            'Take the Mount Fremont Trail to the old fire lookout.',
          ],
        },
        final: {
          description: 'The lookout and its ridge-top viewpoint.',
          points: [
            { label: 'Mount Fremont Lookout', lat: 46.93404, lon: -121.67574 },
            { label: 'Frozen Lake junction', lat: 46.9191, lon: -121.66669 },
          ],
        },
        scattering: {
          text: 'On the drive out, at the designated Sunrise Point location (weekdays, 3 pm to 10 am, up to 30 people). The lookout lies in an authorized area, but the 100-yard rule would mean leaving the trail, so a spot there is possible only if the permit office specifies one.',
          points: [{ label: 'Sunrise Point (designated location)', lat: 46.91743, lon: -121.58812, source: 'nps' }],
        },
        links: [{ label: 'Sunrise area trails (PDF)', url: 'https://www.nps.gov/mora/planyourvisit/upload/2020-Sunrise-Area-Trails_access.pdf' }],
      },
    ],
  },
  {
    id: 'grand-canyon',
    name: 'Grand Canyon National Park',
    state: 'Arizona',
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
    seasons:
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
        why: 'Mary Colter’s 1932 stone tower, a National Historic Landmark, rises from the canyon’s eastern rim. From here the Colorado River emerges from narrow Marble Canyon into the vast Grand Canyon.',
        glance: {
          distance: '0.25 mi from the main parking area',
          difficulty: 'Easy',
          time: 'As long as you like',
          elevation: 'Minimal',
          accessibility: 'Short walk through the developed area; the tower’s upper floors are reached by stairs',
          scattering: 'Prohibited',
        },
        scatterStatus: 'prohibited',
        gettingThere: {
          route: 'Take Highway 64 to the East Entrance, or drive Desert View Drive 23 miles east from Grand Canyon Village.',
          parking: 'Desert View main parking area',
          points: [{ label: 'Parking', lat: 36.04174, lon: -111.82797 }],
        },
        journey: { trail: 'Desert View walkway', steps: ['Walk past the restrooms, market and trading post. The Watchtower is then in plain view.'] },
        final: {
          description: 'Share memories in the kiva-style View Room, then step out to the rim for sunset. The upper floors open 9 am to 4 pm when staffing allows, with free timed tickets and room for 25 people at a time.',
          points: [{ label: 'Desert View Watchtower', lat: 36.04401, lon: -111.82621 }],
        },
        scattering: { text: 'Scattering is prohibited throughout the park. No specific outside location has been verified for this guide.' },
        links: [{ label: 'Desert View Watchtower (NPS)', url: 'https://www.nps.gov/places/000/desert-view-watchtower.htm' }],
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
        why: 'Your first steps below the rim, on a ridgeline trail where the canyon opens beneath you. Ooh Aah Point earns its name; Cedar Ridge goes deeper still.',
        glance: {
          distance: 'Ooh Aah Point 1.8 mi round trip; Cedar Ridge 3 mi round trip',
          difficulty: 'Moderate to Ooh Aah Point; Difficult to Cedar Ridge',
          time: '1 to 2 hours; 2 to 4 hours',
          elevation: '790 ft; 1,120 ft',
          accessibility: 'Steep canyon trail; not wheelchair accessible',
          scattering: 'Prohibited',
        },
        scatterStatus: 'prohibited',
        gettingThere: {
          route: 'Enter by the South Entrance (Highway 64) and park at the Grand Canyon Visitor Center. There is no public parking at the trailhead: take the free Kaibab/Rim (Orange) shuttle, a 9-minute ride.',
          parking: 'Grand Canyon Visitor Center, Lot P1',
          points: [
            { label: 'Visitor Center Lot P1', lat: 36.05879, lon: -112.10649 },
            { label: 'South Kaibab Trailhead', lat: 36.05294, lon: -112.08374 },
          ],
        },
        journey: {
          trail: 'South Kaibab Trail',
          steps: ['Descend the switchbacks to Ooh Aah Point.', 'For Cedar Ridge, continue down the ridgeline.'],
          notes: ['All trails into the canyon are steep and difficult, and the climb back up is the hard part. There is no water on the trail, and the trailhead water station is currently off.'],
        },
        final: {
          description: 'Two natural stopping points on the ridge, each with the canyon falling away below.',
          points: [
            { label: 'Ooh Aah Point', lat: 36.06151, lon: -112.08702 },
            { label: 'Cedar Ridge', lat: 36.06416, lon: -112.08961 },
          ],
        },
        scattering: { text: 'Scattering is prohibited throughout the park. No specific outside location has been verified for this guide.' },
        links: [{ label: 'South Kaibab Trail (NPS)', url: 'https://www.nps.gov/places/000/south-kaibab-trail.htm' }],
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
        why: 'A point standing directly above the Colorado River in the inner gorge, deep inside the canyon. A demanding day that few people ever take.',
        glance: {
          distance: '12 mi round trip',
          difficulty: 'Strenuous',
          time: '9 to 12 hours',
          elevation: '3,080 ft',
          accessibility: 'Long, steep canyon trail; very exposed final section',
          scattering: 'Prohibited',
        },
        scatterStatus: 'prohibited',
        gettingThere: {
          route: 'Enter by the South Entrance (Highway 64) and follow Village Loop Drive. If there is no space near the trailhead, use Lot D by Maswik Lodge, about 0.4 mi away.',
          parking: 'Bright Angel Trailhead (overflow: Lot D)',
          points: [
            { label: 'Bright Angel Trailhead', lat: 36.05728, lon: -112.14363 },
            { label: 'Lot D', lat: 36.05162, lon: -112.14378 },
          ],
        },
        journey: {
          trail: 'Bright Angel Trail and Plateau Point Trail',
          steps: [
            'Descend the Bright Angel Trail to Havasupai Gardens.',
            'Take the Plateau Point Trail, about 3 mi round trip from there; relatively flat but very exposed.',
          ],
          notes: ['The park recommends checking with a ranger before attempting it as a day hike. Water status changes; some resthouse water stations have been off.'],
        },
        final: {
          description: 'The tip of the Tonto Platform, high above the river.',
          points: [{ label: 'Plateau Point', lat: 36.09326, lon: -112.11609 }],
        },
        scattering: { text: 'Scattering is prohibited throughout the park. No specific outside location has been verified for this guide.' },
        links: [{ label: 'Bright Angel Trail (NPS)', url: 'https://www.nps.gov/places/000/bright-angel-trail.htm' }],
      },
    ],
  },
];
