// Sprint 12 (LAG-95) 3D home flavour: hotspot cards, apartment names and idle
// lines per archetype, top-bar moods, "coming soon" spots, the street
// placeholder per district, and busy captions per activity. Content Designer.
// All names are invented; no real people, brands, apps or shows.
import type { ArchetypeId, LocationId } from '../types';

export type HotspotId = 'bed' | 'desk' | 'ringlight' | 'tv' | 'fridge' | 'shower' | 'table' | 'door';

/** name ≤ 18 chars (shown as the action card title), blurb ≤ 90 (one dry, specific line), icon = one emoji for the floating marker. */
export const HOTSPOTS: Record<HotspotId, { name: string; blurb: string; icon: string }> = {
  bed: {
    name: 'Bed',
    blurb: 'Eight hours, ideally. The mattress came free with a futon nobody wanted.',
    icon: '🛏️',
  },
  desk: {
    name: 'Desk',
    blurb: 'Where the script, the song and the pitch deck all live in one tab called "FINAL".',
    icon: '💻',
  },
  ringlight: {
    name: 'Ring Light',
    blurb: 'Self-tape corner. Blue sheet, one lamp, a neighbour who mows on cue.',
    icon: '💡',
  },
  tv: {
    name: 'TV',
    blurb: 'Prestige TV binge. Free, two hours, and you can call it research with a straight face.',
    icon: '📺',
  },
  fridge: {
    name: 'Fridge',
    blurb: 'Half a lime, oat milk of uncertain age and a craft-services muffin you were not given.',
    icon: '🧊',
  },
  shower: {
    name: 'Shower',
    blurb: 'Lukewarm at best. Where every good line arrives and none of them get written down.',
    icon: '🚿',
  },
  table: {
    name: 'Table',
    blurb: 'Seats two, hosts zero. Currently a filing system for parking tickets.',
    icon: '🍽️',
  },
  door: {
    name: 'Front Door',
    blurb: 'The rest of LA is out there, plus the 405, which has thoughts about your schedule.',
    icon: '🚪',
  },
};

/** Per archetype: the apartment's name (≤ 32) and 4 idle lines (≤ 110 each) for the bottom card when nothing is selected. */
export const HOME_FLAVOR: Record<ArchetypeId, { place: string; idle: readonly string[] }> = {
  nepo: {
    place: 'a WeHo one-bed, paid by Dad',
    idle: [
      'The apartment is lovely. Your parent picked it. Tap a spot and do something that is technically yours.',
      'Your manager texted twice. Pull out the phone, or tap the ring light and earn the meeting.',
      'Nobody here knows you yet, except the doorman, who knew your parent. Tap the desk.',
      'Brunch can wait. Probably. Tap a spot, or check the phone before the group chat does.',
    ],
  },
  midwest: {
    place: 'a NoHo couch-surf',
    idle: [
      'The couch is yours until the roommate\'s cousin visits. Tap a spot while it lasts.',
      'Back home it\'s already supper. Here it\'s audition season. Tap the ring light, or check the phone.',
      'The sedan made it another day. So did you. Tap the desk, or pull out the phone and see who called.',
      'Mom says she\'s proud and asks if you\'ve "been in anything." Tap a spot and get in something.',
    ],
  },
  indie: {
    place: 'a Silver Lake walk-up',
    idle: [
      'The light in here is honestly cinematic. Tap the desk and use it before the landlord does.',
      'Camera\'s charged, rent isn\'t. Tap the ring light, or pull out the phone and find a paid gig.',
      'You own three lenses and one plate. Priorities. Tap a spot, or check the phone for the festival.',
      'A real auteur would be working right now. Tap the desk. Or the TV, for "reference."',
    ],
  },
  producer: {
    place: 'a NoHo share house, back room',
    idle: [
      'Forty beats in the folder, zero finished. Tap the desk and make it forty-one, or finish one.',
      'Housemates are asleep. The egg-crate foam is ready. Tap the desk, or check the phone for DMs.',
      'Someone upstairs is playing your loop off your laptop again. Tap a spot, or pull out the phone.',
      'The monitors are on, the coffee is cold, the deadline is fake. Tap the desk, it\'s still a deadline.',
    ],
  },
};

/** Mood shown in the top bar. Ordered best → worst; the UI picks the first whose `min` the average meets. */
export const MOODS: readonly { min: number; label: string }[] = [
  { min: 80, label: '🤩 Main character' },
  { min: 60, label: '😎 Booked and busy' },
  { min: 40, label: '🙂 Grinding' },
  { min: 20, label: '😮‍💨 Running on fumes' },
  { min: 0, label: '🫠 Considering Ohio' },
];

/** Shown on a spot whose system isn't built yet. ≤ 90 each, ending with "(coming soon)". */
export const SOON: Record<'fridge' | 'shower' | 'table', string> = {
  fridge: 'Hunger isn\'t a thing yet. The lime is just for show, like most of LA. (coming soon)',
  shower: 'Hygiene arrives later. Until then, your craft is the only thing that stinks. (coming soon)',
  table: 'Dinner parties need friends. Friends need a Social stat. Both are on order. (coming soon)',
};

/** Street placeholder per district: heading (≤ 28) and a line (≤ 100) nudging to open the phone. */
export const STREET: Record<LocationId, { heading: string; line: string }> = {
  noho: {
    heading: 'Out in NoHo',
    line: 'Black-box theatres, cheap tacos and couches for rent. Pull out the phone to see what\'s on.',
  },
  burbank: {
    heading: 'Out in Burbank',
    line: 'Backlots, soundstages and parking garages with opinions. Open the phone for shifts and sets.',
  },
  hollywood: {
    heading: 'Out in Hollywood',
    line: 'Casting offices, classes and a sidewalk star for someone else. Check the phone for sides.',
  },
  weho: {
    heading: 'Out in WeHo',
    line: 'The Strip, the brunch line and people who "know a guy." Pull out the phone and find the guy.',
  },
  silverlake: {
    heading: 'Out in Silver Lake',
    line: 'Open mics, indie screenings and a $9 pour-over. Open the phone to see who\'s playing tonight.',
  },
  santamonica: {
    heading: 'Out in Santa Monica',
    line: 'Beach, pier and a sunset you can\'t afford to live near. The phone knows the way home.',
  },
};

/** Activity captions on the action card while busy, keyed by ActivityKind. ≤ 60, present tense. */
export const BUSY: Record<string, string> = {
  project: 'Making the thing. The thing is going great. Probably.',
  travel: 'On the road. The 405 is taking it personally.',
  job: 'Working the shift. The dream pays in exposure.',
  sleep: 'Out cold. The 06:00 bills can wait.',
  leisure: 'Recharging. Guilt-free for the next twenty minutes.',
  class: 'In class, nodding at notes on "stakes."',
  headshots: 'Smizing for headshots. Chin down. No, other down.',
  repair: 'At the mechanic. He is sighing in a costly way.',
  prep: 'Running sides in the ring light. Again. From the top.',
  submit: 'Submitting. Refreshing. Not refreshing. Refreshing.',
  show: 'On stage. Twelve people, three of them listening.',
  beat: 'Cooking a beat. Headphones on, world off.',
  episode: 'On set, shooting the episode. Hit your mark, again.',
  room: 'In the writers\' room, pitching over the snack bowl.',
  guild: 'At the guild office, filling out form 7B in triplicate.',
};
