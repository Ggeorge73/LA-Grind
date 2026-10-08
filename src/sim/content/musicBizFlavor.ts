// Sprint 8 (LAG-67) music business flavor. Numbers live in musicBiz.ts.
import type { LabelId, VenueId } from './musicBiz';

/** Label names ≤ 26 chars, blurbs ≤ 90 chars. */
export const LABEL_FLAVOR: Record<LabelId, { name: string; blurb: string }> = {
  'garage-press': {
    name: 'Garage Press Records',
    blurb: 'Two guys, one garage, one hand-stamped logo. Advance arrives in an envelope.',
  },
  'tape-hiss': {
    name: 'Tape Hiss Tapes',
    blurb: 'Cassette-only label in Silver Lake. Pressing run: 200. Sell-through: emotional.',
  },
  beachhouse: {
    name: 'Beachhouse Collective',
    blurb: 'Santa Monica chill collective. Contracts signed barefoot, at golden hour, on sand.',
  },
  algorithm: {
    name: 'Algorithm Music Group',
    blurb: 'WeHo label run by a playlist dashboard. A&R is a spreadsheet with a ring light.',
  },
  'burbank-sound': {
    name: 'Burbank Sound Co.',
    blurb: 'Mid-size label in a beige office park. Real budgets, real lawyers, real fluorescents.',
  },
  'sunset-major': {
    name: 'Sunset Major Records',
    blurb: 'Hollywood major with a gold-record lobby. Big advance; you will never own a master.',
  },
};

/** Venue names ≤ 26 chars, blurbs ≤ 90 chars. */
export const VENUE_FLAVOR: Record<VenueId, { name: string; blurb: string }> = {
  'open-mic': {
    name: 'The Thirsty Mic',
    blurb: 'NoHo bar open mic. Sign-up sheet at 7, your slot at 11:40, audience of the bartender.',
  },
  basement: {
    name: 'The Basement on Lanyard',
    blurb: 'Silver Lake DIY basement. Low ceiling, lower PA, a landlord who must never know.',
  },
  club: {
    name: 'Club Velvet Rope',
    blurb: 'WeHo club with a guest list longer than the setlist. Bottle service hits the bridge.',
  },
  theater: {
    name: 'The Grand Marquee Theater',
    blurb: 'Hollywood theater with gilded balconies and a marquee that misspells you lovingly.',
  },
  amphitheater: {
    name: 'Media City Amphitheater',
    blurb: 'Hillside amphitheater in Burbank. Lawn seats, picnic blankets, distant helicopters.',
  },
  arena: {
    name: 'The Pacific Overlook Arena',
    blurb: 'Seaside arena with a Ferris wheel view. Six thousand phones held up at once.',
  },
};

/** Beat title = `${first} ${second}`, each part ≤ 18 chars. */
export const BEAT_TITLE_FIRST: readonly string[] = [
  'Midnight', 'Freeway', 'Lowrider', 'Smog', 'Valley', 'Palm Tree',
  'Rooftop', 'Taco Truck', 'Canyon', 'Neon', 'Marine Layer', 'Sunset',
  'Coldbrew', 'Hillside', 'Rideshare', 'Overcast', 'Velvet', 'Juice Cleanse',
  'Laundromat', 'Golden Hour', 'Mulholland', 'Infinity Pool', 'Valet', 'Drought',
  'Studio City',
];

export const BEAT_TITLE_SECOND: readonly string[] = [
  '(Type Beat)', 'Bounce', 'Drill', 'Lo-Fi', 'Trap', 'Interlude',
  'Freestyle', 'Loop', 'Riddim', 'Dreams', 'Anthem', '(Prod. by Me)',
  'Vibes', 'Slowed', 'Remix', 'Heat', '(No Hook)', 'Waves',
  'Mood', 'Groove', '(Free for Profit)', 'Banger', 'Sketch', 'Pt. 2',
  'Demo v14',
];

/** Parody productions/ads that license songs; read after "in". ≤ 50 chars. */
export const SYNC_CLIENTS: readonly string[] = [
  'a Season 4 Finale of "Lawyers in Love"',
  'a Car Commercial Where Nobody Drives',
  'a Yogurt Ad Featuring a Very Calm Horse',
  'the Trailer for "Explosion Island 3"',
  'a Teen Drama Where Everyone Is 31',
  'a Cooking Show Montage of Someone Crying',
  'a Phone Ad Shot Entirely in Slow Motion',
  'a True-Crime Docuseries About a Missing Llama',
  'the Prom Scene of "Hall Pass Academy"',
  'a Bank Commercial About Following Your Dreams',
  'a Dating Show Filmed at a Wellness Retreat',
  'a Perfume Ad That Is Mostly Fog',
  'an Energy Drink Spot With a Parkour Grandpa',
  'a Prestige Drama\'s Slow-Walk Montage',
  'a Mattress Ad Starring a Sleeping Golden Retriever',
  'the Credits of a Heist Movie With Seven Sequels',
];

export type BizHeadlineKind =
  | 'labelSigned'
  | 'labelPassed'
  | 'showSoldOut'
  | 'showPlayed'
  | 'beatLeased'
  | 'placement'
  | 'soundtrack';

/**
 * Trade-paper headlines for the music business. Placeholders:
 * - every kind: {who} (e.g. "Bedroom Producer", ≤ 22 chars)
 * - labelSigned: {title} (record), {label} (label name), {amount} (advance, e.g. "$2,400")
 * - labelPassed: {title} (record), {label}
 * - showSoldOut / showPlayed: {venue} (venue name), {tickets} (tickets sold, e.g. "1,200")
 * - beatLeased: {beat} (beat title), {amount} (lease fee)
 * - placement: {title} (record), {client} (a SYNC_CLIENTS entry, reads after "in"), {amount} (fee)
 * - soundtrack: {title} (record), {film} (film title)
 */
export const BIZ_HEADLINES: Record<BizHeadlineKind, readonly string[]> = {
  labelSigned: [
    '{who} Signs "{title}" to {label}, {amount}',
    '{label} Signs {who} for {amount}; Lawyer Still on Page Two',
    'DEAL MEMO: {label} Lands "{title}" for {amount}',
    '{label} Bets {amount} on {who}, Who Buys a Hat',
    '"{title}" Lands at {label}; {who} Calls Mom',
    '{who} Inks {amount} Deal, Swears "Nothing Will Change"',
    '{who} Joins {label}; Advance Spent on a Cape',
  ],
  labelPassed: [
    '{label} Passes on "{title}"; {who} Unbothered',
    '{who} Pitches {label}, Gets Polite Email, Tote Bag',
    '"Not for Us Right Now": {label} Declines "{title}"',
    '{label} Tells {who} to "Circle Back After It Blows Up"',
    '{who} Leaves {label} With No Deal, Validated Parking',
    '{label} Calls "{title}" "Great, Not Great Great"',
  ],
  showSoldOut: [
    'SOLD OUT: {who} Packs {venue}; Fire Marshal Nods',
    '{who} Sells All {tickets} Tickets at {venue}',
    '{who} Sells Out {venue}; Merch Out of Mediums',
    '{tickets} Phones, One Chorus: {who} Sells Out {venue}',
    'Standing Room Only as {who} Fills {venue}',
    '{venue} at Capacity for {who}; Encore "Spontaneous"',
    '{who} Sells Out {venue}, Thanks "Especially Dave"',
  ],
  showPlayed: [
    '{who} Plays {venue} to {tickets}, Some on Purpose',
    '{tickets} Turn Out for {who}; {venue} Sells Seltzer',
    'LIVE: {who} at {venue}, Tight Set, Loose Mic Stand',
    '{who} Draws {tickets} at {venue}; Promoter Says "Real"',
    '{who} Plays {venue}, Tunes for Only Six Minutes',
    'Intimate Night at {venue}: {who} Knows Fans by Name',
  ],
  beatLeased: [
    '{who} Leases "{beat}" for {amount}, Buys More Plugins',
    'Beat Store: "{beat}" Moves for {amount}, Tag Left In',
    'Somebody Bought "{beat}": {who} Pockets {amount}',
    '"{beat}" Goes for {amount}; {who} Now "Beat Mogul"',
    '{who} Clears {amount}; Buyer Asks if Hook Included',
    '{who}\'s "{beat}" Leased; Rapper Vows "Crazy Visuals"',
  ],
  placement: [
    '{who} Gets {amount} for a Song in {client}',
    'SYNC: "{title}" Lands in {client}; {amount}',
    '"{title}" Plays in {client}; {amount} Fee',
    'Heard in {client}: "{title}"',
    '{amount} Sync: "{title}" Used in {client}',
    'Music Sup Picks {who}\'s Track for {client}',
  ],
  soundtrack: [
    '{who} Puts "{title}" on "{film}" Soundtrack',
    '"{film}" Ends on {who}\'s "{title}"; Credits Roll',
    'Synergy! {who} Scores "{film}" With "{title}"',
    '{who} Slips "{title}" Into "{film}," Legally',
    '"{title}" Lands on "{film}" Soundtrack, Free Sync',
    'Hear It in "{film}": "{title}" Over Freeway Montage',
  ],
};
