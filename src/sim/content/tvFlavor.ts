// Sprint 9 TV (actor side) flavour: parody buyers, pilot titles, roles,
// callback director's notes and TV trade headlines. Content Designer.
// All names are invented; no real people, networks, streamers or shows.
import type { PilotTier } from './tv';

/** Parody buyers per pilot tier. 1 web channels/apps, 2 cable, 3 streamers, 4 broadcast. ≤ 24 chars. */
export const NETWORKS: Record<PilotTier, readonly string[]> = {
  1: ['ClipNest Originals', 'Scrollr Shorts', 'VidBuddy Premium'],
  2: ['The Hearthside Channel', 'KABLE 9', 'The Grit Network'],
  3: ['Bingeworthy+', 'Tundra Stream', 'Velvet Couch Plus'],
  4: ['UBC', 'The Eagle Network', 'Sunset Broadcasting Co.'],
};

/** First half of a pilot title. Title = `${first} ${second}`, ≤ 26 chars combined. */
export const PILOT_TITLE_FIRST: readonly string[] = [
  'Valley Girls', 'Cul-de-Sac', 'Malibu', 'Small Town', 'Desert',
  'Suburban', 'Brentwood', 'Midwest', 'Cozy', 'Gated',
  'Coastal', 'Silver Lake', 'Big Sky', 'Strip Mall', 'Bayou',
  'Downtown', 'Lake Effect', 'Frontier', 'Golden Years', 'Second Chance',
  'Lakeside', 'Off-Season', 'Rooftop', 'Hometown', 'Late Shift',
];

/** Second half of a pilot title. Reads with any first half. */
export const PILOT_TITLE_SECOND: readonly string[] = [
  'Justice', 'of Ohio', 'Medical', 'P.D.', 'Heights',
  'Confidential', 'After Dark', 'Nurses', 'Unit', 'Wives',
  'Rescue', 'Bakery', 'Undercover', 'High', 'Diaries',
  'Homicide', 'Lawyers', 'Dads', 'Sheriff', 'Mysteries',
  'Influencers', 'Psychics', 'Hotline', 'Inc.', 'Vets',
];

/** Roles you might be cast as. ≤ 30 chars. */
export const PILOT_ROLES: readonly string[] = [
  'the Sardonic Best Friend',
  'Hot Detective #2',
  'the Quirky Neighbor',
  'the Too-Young Surgeon',
  'the Mysterious New Kid',
  'Bartender With a Past',
  'Ghost (Recurring)',
  'the Disapproving Mom',
  'the Coroner Who Quips',
  'the Smoldering Rancher',
  'Hacker in a Hoodie',
  'Dead Body, Cold Open',
  'the Precocious Kid',
  "the Love Interest's Ex",
  'Cop Who Plays by the Rules',
  'Barista With Secrets',
];

export interface CallbackBeat {
  /** Director's note (≤ 110 chars). Clues the right read without naming it. */
  note: string;
  /** Three read choices (≤ 48 chars each). */
  reads: readonly [string, string, string];
  /** Index of the right read. */
  best: 0 | 1 | 2;
}

/** Callback mini-game beats. Right answers spread across indexes 0/1/2 (5/4/5). */
export const CALLBACK_BEATS: readonly CallbackBeat[] = [
  {
    note: "Less. Whatever you're doing, do less of it. Then a little less.",
    reads: ['Full tears, then a scream into a pillow', 'Barely a whisper, eyes doing the work', 'Mime it. No sound at all. Commit.'],
    best: 1,
  },
  {
    note: 'The network focus-grouped this scene. They want to like you. Desperately. Please let them.',
    reads: ['Warm, open, a little self-deprecating', 'Menacing, like a villain on a juice cleanse', 'Ask the camera directly for its approval'],
    best: 0,
  },
  {
    note: "It's a comedy. Your character does not know it's a comedy. Nobody has told her.",
    reads: ['Mug at the camera after every line', 'Laugh at your own jokes, generously', 'Dead serious, total sincerity'],
    best: 2,
  },
  {
    note: "Think detective, but tired. Really tired. It's 4 p.m. on a Tuesday and the case is still open.",
    reads: ['Exhausted but sharp, sipping cold coffee', 'Asleep. Literally asleep on the desk.', 'Hard-boiled noir voiceover, the whole time'],
    best: 0,
  },
  {
    note: 'Network wants "edgy, but four-quadrant." Edge they can air at 8 p.m. next to a cereal ad.',
    reads: ['Swear a lot, kick over a chair', 'Flat. Nothing. Pure beige neutrality.', 'A wry eyebrow, then a hug'],
    best: 2,
  },
  {
    note: 'We cut the monologue. You have one line now. Make it land like it is still the monologue.',
    reads: ['Do the cut monologue anyway, from memory', 'Mumble it. It is only one line.', 'One line, full weight, then hold the pause'],
    best: 2,
  },
  {
    note: 'She is hiding something. The audience finds out in episode six. Not now. Episode six.',
    reads: ['Wink at the camera on every lie', 'Confess everything in the first take', 'A tiny hesitation before one answer'],
    best: 2,
  },
  {
    note: "The kid is the star. You're the parent. Let the kid have the scene. Their mom is watching.",
    reads: ['Generous and reactive, all eyes on the kid', 'Steal it with a surprise tap routine', 'Turn upstage and narrate the kid'],
    best: 0,
  },
  {
    note: "The showrunner wrote this about her own divorce. She's in the room. She's fine. She's fine.",
    reads: ['Specific, quiet, a little bit wry', 'Play the ex as a cartoon monster', 'Break and apologize to the showrunner'],
    best: 0,
  },
  {
    note: 'The algorithm says viewers bail at minute two. Grab them before minute one. Ideally second one.',
    reads: ['Slow build, really earn it by act three', 'Open strong: a hook on the very first line', 'Recap the whole plot to the viewer'],
    best: 1,
  },
  {
    note: "It's broadcast. Picture someone folding laundry. They look up once. That's your shot.",
    reads: ['Clear and warm, one big moment to catch', 'Dense mumblecore that rewards rewatching', 'Deliver it to the laundry, unblinking'],
    best: 0,
  },
  {
    note: "Our lead is six-foot-four and very sensitive about it. Don't stand next to him. Or be tall.",
    reads: ['Stand on an apple box, defiantly', 'Play it seated, low-key and grounded', 'Crouch the whole scene and commit'],
    best: 1,
  },
  {
    note: 'Note from upstairs: "more relatable." Note from me: "not like that." Find the middle.',
    reads: ['A pratfall into a laundry basket', 'Overshare about your real student loans', 'Small, human, a little bit messy'],
    best: 2,
  },
  {
    note: "Period piece, 1890s. Nobody says 'okay.' Nobody in this town has ever said 'okay.'",
    reads: ['Valley-girl it up. A fresh take!', 'Formal, measured, zero modern slang', 'Full Shakespeare, iambic and very loud'],
    best: 1,
  },
];

export type TvHeadlineKind =
  | 'seasonOpen'
  | 'callback'
  | 'pilotBooked'
  | 'pickedUp'
  | 'passed'
  | 'missedEpisode'
  | 'wrapped'
  | 'agentPassed';

/**
 * TV trade headlines (Title Case, ≤ 100 chars with longest fills).
 * Placeholders: {who} (e.g. "Bedroom Producer", ≤ 22 chars), {title} (pilot title,
 * ≤ 26 chars), {role} (from PILOT_ROLES, ≤ 30), {network} (from NETWORKS, ≤ 24),
 * {episodes} (episode count, e.g. "8").
 * - seasonOpen: none required; may use {network}. NPC-style industry headline.
 * - callback: {who},{title}
 * - pilotBooked: {who},{role},{title},{network} (each line uses a subset)
 * - pickedUp: {who},{title},{network}
 * - passed: {who},{title},{network}
 * - missedEpisode: {who},{title}
 * - wrapped: {who},{title},{episodes}
 * - agentPassed (agent declines a second show while you're on one): {who},{title}
 */
export const TV_HEADLINES: Record<TvHeadlineKind, readonly string[]> = {
  seasonOpen: [
    'Pilot Season Opens; Burbank Runs Out of Folding Chairs by 9 A.M.',
    'Pilot Season Is Here: Every Actor in Town Suddenly "Super Available"',
    '{network} Orders 40 Pilots, Plans to Air "Maybe Two, Tops"',
    'Casting Offices Restock Bottled Water, Brace for Pilot Season',
    'PILOT SEASON: Headshot Printers Report Record Quarter',
    '{network} Seeks "Fresh Faces Who Have Done a Lot of Things"',
    'Pilot Season Begins; Hollywood Parking Somehow Gets Worse',
  ],
  callback: [
    '{who} Called Back for "{title}"; Wears the Same Shirt for Luck',
    'Callback: {who} Reads for "{title}," Hears "Great, One More"',
    '{who} Survives First Cut on "{title}"; Producers "Intrigued"',
    '"{title}" Brings Back {who}, Plus Eleven Who Look Just Like Them',
    '{who} Gets Notes on "{title}," Nods Like They Understand',
    '{who} Back in the Room for "{title}"; Room Slightly Colder',
  ],
  pilotBooked: [
    '{who} Books "{title}" Pilot at {network}',
    'CASTING: {who} Lands {role} in "{title}"',
    '{network} Taps {who} as {role}',
    '{who} Cast as {role}; Already Practicing Shocked Face',
    '"{title}" Rounds Out Cast With {who}; Trailer Has a Window',
    '{who} Joins {network} Pilot "{title}"',
    '{who} Nabs {role} Role, Asks if Character Has a Name',
  ],
  pickedUp: [
    '{network} Picks Up "{title}"; {who} Goes Regular',
    'SERIES ORDER: "{title}" Goes to {network}',
    '{network} Orders "{title}"; {who} Buys a Couch',
    '"{title}" Picked Up; {who} Finally Learns Crew Names',
    '{who} Goes to Series: "{title}" at {network}',
    'It\'s a Go: "{title}" Lands at {network}; Cast Hugs Awkwardly',
  ],
  passed: [
    '{network} Passes on "{title}"; {who} Keeps Shirt',
    '"{title}" Not Picked Up; {network} Cites "Vibes"',
    '{network} Calls "{title}" "Great, Not Great Great"',
    '{who}\'s Pilot "{title}" Dies Quietly at {network}',
    '{network} Shelves "{title}"; {who} Updates Reel',
    '"{title}" Joins {network}\'s Vault of Lovely Almosts',
  ],
  missedEpisode: [
    '{who} No-Show on "{title}" Set; Stand-In Gets Their Lines',
    '"{title}" Shoots Around {who}; Character "Out of Town"',
    '{who} Misses Call Time on "{title}"; Producers "Concerned"',
    'Where Was {who}? "{title}" Writes in a Mysterious Absence',
    '"{title}" Crew Holds Lunch for {who}, Who Never Shows',
    '{who} Skips "{title}" Shoot; Character Now Talks Only by Phone',
  ],
  wrapped: [
    '"{title}" Wraps {episodes}-Episode Season; {who} Keeps a Prop Mug',
    '{who} Wraps "{title}" After {episodes} Episodes, Cries at Craft Services',
    'That\'s a Wrap on "{title}": {episodes} Episodes, Zero Fires',
    '{who} Says Goodbye to "{title}"; {episodes} Episodes in the Can',
    'Season Wrap: "{title}" Banks {episodes} Episodes; Cast Swaps Numbers',
    '{who} Finishes {episodes} Episodes of "{title}," Sleeps Two Days',
  ],
  agentPassed: [
    '{who}\'s Agent Passes on "{title}": "My Client Is Booked"',
    '"{title}" Comes Calling; {who} Already on a Show, Agent Says No',
    'Agent Nixes "{title}" for {who}: "Great Problem to Have"',
    '{who} Too Busy for "{title}," Says Agent, Smugly',
    '{who}\'s Rep Declines "{title}"; Cites "Exclusivity, Babe"',
    'Booked and Busy: {who} Passes on "{title}" via Agent',
  ],
};
