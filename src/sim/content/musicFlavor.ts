import type { LocationId } from '../types';

/** The parody chart the release week is ranked on. */
export const CHART_NAME = 'The Billbored Hot 100';

/** Record title = `${first} ${second}`. */
export const RECORD_TITLE_FIRST: readonly string[] = [
  'Velvet', 'Neon', 'Midnight', 'Sad', 'Golden', 'Liquid',
  'Haunted', 'Burbank', 'Cosmic', 'Broken', 'Sugar', 'Lowkey',
  'Infinite', 'Chrome', 'Lavender', 'Freeway', 'Glitter', 'Lonely',
  'Electric', 'Cherry', 'Heavy', 'Paper', 'Silver', 'Desert',
  'Ghost', 'Tender', 'Static', 'Pastel', 'Feral', 'Overdue',
];

export const RECORD_TITLE_SECOND: readonly string[] = [
  'Voicemails', 'Heartbreak', 'Parking Lot', 'Summer', 'Tears', 'Frequencies',
  'Daydreams', 'Situationship', 'Taillights', 'Ex-Files', 'Lullabies', 'Signals',
  'Motel Pool', 'Exit Signs', 'Feelings', 'Afterparty', 'Rent Check', 'Sunsets',
  'Group Chat', 'Echoes', 'Vibes', 'Read Receipts', 'Mixtape', 'Palm Trees',
  'Crush', 'Overthinking', 'Coastline', 'Sirens', 'Demos', 'Bridges',
];

export interface Studio {
  id: string;
  name: string;
  /** Where you record. One studio per neighbourhood. */
  location: LocationId;
  /** ≤ 90 chars. */
  blurb: string;
}

export const STUDIOS: readonly Studio[] = [
  { id: 'noho-converted-garage', name: 'The Two-Car Garage', location: 'noho', blurb: 'A converted two-car garage. Vocal booth is a closet; the closet still has coats.' },
  { id: 'burbank-strip-mall', name: 'Strip Mall Studio B', location: 'burbank', blurb: 'Between a nail salon and a tax preparer. Bass frequencies rattle the pedicures.' },
  { id: 'hollywood-legendary', name: 'The Legendary Room 4', location: 'hollywood', blurb: 'Everyone swears someone famous cut a hit here. Nobody can say who. Costs extra.' },
  { id: 'weho-penthouse', name: 'Penthouse Vibe Lab', location: 'weho', blurb: 'Rooftop studio with a ring light in every corner. Recording is optional; content is not.' },
  { id: 'silverlake-analog', name: 'Tape Hiss Collective', location: 'silverlake', blurb: 'Analog only. Owner calls digital "a phase." Session ends when the reel does.' },
  { id: 'santamonica-wellness', name: 'Sonic Sanctuary Spa', location: 'santamonica', blurb: 'Sound-healing spa that also records. Every take starts with a gong. Mandatory.' },
];

export const MUSIC_CREW_QUIRKS: readonly string[] = [
  'Only works by candlelight and two lava lamps',
  'Says "one more take" as a lifestyle',
  'Has a hat collection and a hat for each genre',
  'Calls every beat "crazy," regardless of quality',
  'Tunes guitars by vibes. The vibes are flat.',
  'Will add a cowbell if left unsupervised',
  'Brings a sound bath bowl to every session',
  'Has 400 unreleased beats and one finished one',
  'Insists the snare "needs to breathe"',
  'Produced a viral ringtone in 2011, still invoiced',
  'Keeps saying "trust the process" about lunch',
  'Records everything, including your complaints',
  'Will only mix on headphones from a gas station',
  'Charges extra for "the secret sauce" (reverb)',
  'Feature verse arrives as a 3 a.m. voice memo',
  'Plays every instrument, none of them on time',
  'Refers to the mixing desk as "my spaceship"',
  'Needs the room at exactly 64 degrees',
  'Ad-libs over your verse. And your chorus.',
  'Brought a manager, a cousin and a videographer',
  'Has never once turned the autotune off',
  'Signs emails "peace, love, and stems"',
];

export const PROMO_STUNTS: readonly string[] = [
  'Posted a 9-second clip of you crying in a Prius',
  'Started a dance challenge nobody could finish',
  'Busked your hook outside a juice bar at noon',
  'Livestreamed yourself refreshing the stream count',
  'Did a "storytime" about the song. It was long.',
  'Hid a USB of the record inside a taco truck',
  'Sent the record to 300 playlist curators on DM',
  'Wore a sandwich board on Sunset for four hours',
  'Lip-synced it in a car wash, fully committed',
  'Posted a cryptic sunset with no caption, twice',
  'Paid a cousin to stitch it with a cooking video',
  'Hosted a listening party in a laundromat',
  'Duetted your own song with your own past self',
  'Gave out stickers at a farmers market, mostly',
];

export type MusicHeadlineKind =
  | 'projectStarted'
  | 'studioBooked'
  | 'crewComplete'
  | 'recordWrapped'
  | 'released'
  | 'chartDebut'
  | 'chartTop10'
  | 'missedChart'
  | 'weekEnd'
  | 'abandoned';

/**
 * Placeholders:
 * - {who} (e.g. "Bedroom Producer"), {title} (record title)
 * - {scale} ("single" | "EP" | "album"), {studio} (studio name)
 * - {position} (chart number, e.g. "47"), {streams} (e.g. "12,400"), {chart} (CHART_NAME)
 *
 * Per kind: projectStarted/recordWrapped/released use {who},{title},{scale};
 * studioBooked/crewComplete use {who},{title},{studio};
 * chartDebut (positions 11–100) uses {who},{title},{position},{chart},{streams};
 * chartTop10 uses {who},{title},{position},{chart}; missedChart uses {who},{title},{streams};
 * weekEnd (7-day recap) uses {who},{title},{position}; abandoned uses {who},{title}.
 */
export const MUSIC_HEADLINES: Record<MusicHeadlineKind, readonly string[]> = {
  projectStarted: [
    '{who} Begins {scale} "{title}," Calls Sound "Genre-Fluid, Also Sad"',
    'EXCLUSIVE: {who} Teases {scale} "{title}" With Blurry Photo of a Keyboard',
    '{who} Starts {scale} "{title}," Changes Bio to "Artist / Visionary"',
    '"{title}" in the Works; {who} Hums Melody Into Phone 40 Times a Day',
    '{who} Announces {scale} "{title}"; Roommates Announce Earplugs',
    'First Listen: {who} Plays "{title}" Demo for Uber Driver, Gets Four Stars',
    '{who} Writing {scale} "{title}," Calls It "My Most Personal Era Yet"',
  ],
  studioBooked: [
    '{who} Books {studio} for "{title}," Pays in Exact Change',
    '"{title}" Sessions Set for {studio}; {who} Packs Humidifier',
    '{who} Locks {studio} for "{title}"; Owner Promises "Energy"',
    '{who} Takes "{title}" to {studio}, Parking Not Included',
    '{studio} Confirms {who} for "{title}"; Mic Is "Very Expensive"',
    '{who} Reserves {studio}, Already Posted the Mic Before Using It',
    '"{title}" Heads to {studio}; {who} Learns What "Lockout" Means',
  ],
  crewComplete: [
    '"{title}" Team Set at {studio}; Producer Already Wants Points',
    '{who} Rounds Out "{title}" Crew; Feature Verse Promised "By Friday-ish"',
    'Full Band Booked for "{title}"; Drummer Brings Own Drama',
    '{who} Finalizes "{title}" Credits; Liner Notes Now Longer Than Song',
    '{studio} Hosts "{title}" Crew; First Hour Spent Choosing Incense',
    '"{title}" Lineup Locked; Engineer Insists on Naming the Console',
    '{who} Hires Final Player for "{title}"; Group Chat Renamed "THE ERA"',
  ],
  recordWrapped: [
    '{who} Wraps {scale} "{title}"; Final Take Was the First Take',
    '"{title}" Mixed, Mastered, Bounced as "{title}_FINAL_v9_REAL"',
    '{who} Finishes {scale} "{title}," Listens to It 60 Times in the Car',
    'It\'s Done: {scale} "{title}" Complete, {who} Hears Flaws in Everything',
    '"{title}" Recording Wraps; Engineer Hands {who} Hard Drive and a Hug',
    '{who} Completes "{title}," Declares It "Not Done but Done-Done"',
    '{scale} "{title}" in the Can; {who} Begins Picking Cover Art Font',
  ],
  released: [
    'OUT NOW: {who} Drops {scale} "{title}" at Midnight, Refreshes at 12:01',
    '{who} Releases "{title}"; Mom Adds It to Four Playlists',
    'New Music Friday: {scale} "{title}" Arrives, {who} Pretends Not to Check',
    '"{title}" Hits Streaming; {who} Posts Link in Bio, Story, Grandma\'s Fridge',
    '{who} Unleashes {scale} "{title}," Calls It a "Soft Launch of a Hard Era"',
    '{scale} "{title}" Is Live; {who} Already Teasing the Deluxe Version',
    'It\'s Out: {who}\'s "{title}" Released Into the Algorithmic Wild',
  ],
  chartDebut: [
    '"{title}" Bows at No. {position} on {chart} With {streams} Streams',
    '{who} Charts! "{title}" Lands at No. {position} on {chart}',
    '"{title}" Debuts at No. {position} on {chart}; {who} Screenshots It',
    '"{title}" Enters {chart} at No. {position} on {streams} Plays',
    '{who}\'s "{title}" Sneaks Onto {chart} at No. {position}',
    '{streams} Streams Push "{title}" to No. {position}; {who} Buys Champagne-Adjacent',
    '{who} Debuts at No. {position} on {chart}, Calls Every Ex',
  ],
  chartTop10: [
    'TOP 10: {who}\'s "{title}" Rockets to No. {position} on {chart}',
    '"{title}" Cracks {chart} Top 10 at No. {position}; {who} Faints',
    '{who} Lands No. {position} on {chart}; Barista Now Claims to Have Known Them',
    'Hit Alert: "{title}" Hits No. {position}, {who} Hires Someone to Hold Phone',
    '{chart} Shock: Newcomer {who} at No. {position} With "{title}"',
    '"{title}" Climbs to No. {position} on {chart}; Labels Start "Just Checking In"',
    '{who}\'s "{title}" Goes Top 10 at No. {position}; Groupchat Crashes',
  ],
  missedChart: [
    '"{title}" Misses Chart With {streams} Streams; {who} Calls It "a Grower"',
    '{who}\'s "{title}" Logs {streams} Plays, Zero Chart Spots, One Great Cover',
    'Not This Week: "{title}" Stalls at {streams} Streams; {who} Blames Mercury',
    '"{title}" Finds {streams} Listeners and Not One Chart; {who} "Unbothered"',
    '{who} Shrugs Off Chart Miss: "{title}" Is "Big in the Group Chat"',
    '"{title}" Off-Chart at {streams} Streams; {who} Declares Charts "Mainstream"',
    'Sources: {streams} Streams of "{title}" Were "Mostly {who}, on Repeat"',
  ],
  weekEnd: [
    'Release Week Recap: {who}\'s "{title}" Peaks at No. {position}',
    '"{title}" Wraps First Week, Peak No. {position}; {who} Finally Sleeps',
    '{who} Closes Out "{title}" Week at No. {position}, Starts Next Era Immediately',
    'Week in Review: "{title}" Peaks at No. {position}, {who} Peaks on Coffee',
    'After 7 Days, "{title}" Peaks at No. {position}; {who} Frames Screenshot',
    '{who}\'s "{title}" Ends Run at No. {position}; Deluxe "Being Discussed"',
    '"{title}" Settles at No. {position} Peak; {who} Thanks "Every Single Stream"',
  ],
  abandoned: [
    '{who} Shelves "{title}," Will "Save It for the Vault"',
    '"{title}" Scrapped; {who} Cites "Artistic Growth" and Overdraft',
    '{who} Quietly Deletes "{title}" Teaser, Hopes Nobody Noticed',
    '"{title}" Is Now a Folder Called "Demos (Do Not Open)" on {who}\'s Laptop',
    '{who} Pulls "{title}"; Leaked Snippet Remains Beloved by Six People',
    'Sources: "{title}" Era Ended Before It Began; {who} "At Peace, Mostly"',
    '{who} Abandons "{title}," Promises Fans "Something Even More Sad"',
  ],
};
