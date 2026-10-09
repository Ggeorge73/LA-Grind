// Sprint 10 TV (writer side) + guilds flavour: parody agencies, parody guilds,
// writers'-room politics events and writer trade headlines. Content Designer.
// All names are invented; no real people, agencies, unions, networks or shows.
import type { AgencyId } from './writers';
import type { Skill } from '../types';

/** Parody talent agencies (scrappy → giant). name ≤ 28 chars, blurb ≤ 90. */
export const AGENCY_FLAVOR: Record<AgencyId, { name: string; blurb: string }> = {
  boutique: {
    name: 'Lantern & Lark Talent',
    blurb: 'Four agents, one cat, no assistants. Silver Lake. They read your whole spec. Personally.',
  },
  mailroom: {
    name: 'Envelope & Sons Agency',
    blurb: 'NoHo. "We all started in the mailroom." Several of them still technically work there.',
  },
  midsize: {
    name: 'Middleground Talent Group',
    blurb: 'Burbank. Big enough to get you in rooms, small enough to only sometimes forget your name.',
  },
  prestige: {
    name: 'Velvet Rope Artists',
    blurb: 'WeHo. Only reps award winners, or people who once stood near an award winner.',
  },
  mega: {
    name: 'Omnivore Creative Agency',
    blurb: 'Hollywood. Reps 4,000 clients, three studios and possibly the weather. Lobby has koi.',
  },
};

/** Parody guilds, one per skill. name ≤ 34 chars, short ≤ 6 chars, blurb ≤ 90. */
export const GUILD_FLAVOR: Record<Skill, { name: string; short: string; blurb: string }> = {
  acting: {
    name: 'Thespians & Extras Alliance',
    short: 'TEA',
    blurb: 'Fighting for fair pay, real lunch breaks and the right to not eat cold pizza in take 40.',
  },
  writing: {
    name: 'Scribes & Rewriters Guild',
    short: 'SCRIBE',
    blurb: 'Protecting credits, residuals and the sacred right to say "it\'s basically done" for weeks.',
  },
  directing: {
    name: 'Order of the Folding Chair',
    short: 'OFC',
    blurb: 'Your name on the chair, your cut in the contract, and a megaphone you will never use.',
  },
  music: {
    name: 'Local 808 Session Musicians',
    short: 'L-808',
    blurb: 'Scale for every session, a pension for every bridge, and overtime after the ninth take.',
  },
};

export interface RoomChoice {
  /** ≤ 54 chars. */
  text: string;
  /** Favor change, −20..+20. */
  favor: number;
  /** Episode quality change, −10..+10. */
  quality: number;
}

export interface RoomEvent {
  /** ≤ 120 chars. */
  prompt: string;
  /** Choice 0 is the default if the event is left open at 06:00. */
  choices: readonly [RoomChoice, RoomChoice];
}

/**
 * Writers'-room politics events (one after each room day). Most are favor-vs-quality
 * trade-offs; a few (#2, #4, #10) have a plainly wise answer.
 * Totals across all choices: favor +10, quality +23.
 */
export const ROOM_EVENTS: readonly RoomEvent[] = [
  {
    prompt: 'The showrunner wants the dog to solve the murder. There is no dog in the show. Yet.',
    choices: [
      { text: 'Yes-and: the dog was a cop in a past life', favor: 12, quality: -6 },
      { text: 'Gently suggest the detective solves it', favor: -8, quality: 6 },
    ],
  },
  {
    prompt: 'The co-EP repeats your joke louder, and the room laughs at him. Everyone saw. Nobody saw.',
    choices: [
      { text: "Let it go. Laugh like it's the first time", favor: 6, quality: -3 },
      { text: 'Pitch a better tag on top of his joke', favor: 4, quality: 6 },
    ],
  },
  {
    prompt: 'Network note: "Can the serial killer be more likable? Like a fun uncle?"',
    choices: [
      { text: 'Execute the note exactly as written', favor: 10, quality: -8 },
      { text: "Fix the problem the note's really about", favor: -6, quality: 8 },
    ],
  },
  {
    prompt: 'The snack budget got cut. The room is staring at an empty bowl of almonds in silence.',
    choices: [
      { text: 'Quietly bring snacks from home', favor: 8, quality: 2 },
      { text: 'Organize a snack strike', favor: -12, quality: -4 },
    ],
  },
  {
    prompt: "It's 6 p.m. and the room is fried. You have a pitch you love. It's weird. It's good.",
    choices: [
      { text: 'Pitch it anyway, with feeling', favor: -8, quality: 8 },
      { text: 'Read the room and save it for never', favor: 6, quality: -4 },
    ],
  },
  {
    prompt: "You're asked to punch up a fellow staffer's draft. They're sitting right across from you.",
    choices: [
      { text: 'Rewrite it top to bottom. It needed it.', favor: -10, quality: 9 },
      { text: 'Polish lightly and keep their voice', favor: 8, quality: 3 },
    ],
  },
  {
    prompt: 'The showrunner asks, at 11 p.m., "Anyone want to stay and break act four?"',
    choices: [
      { text: 'Stay. Sleep is for people with credits.', favor: 12, quality: -5 },
      { text: "Go home. You're useless after midnight.", favor: -8, quality: 5 },
    ],
  },
  {
    prompt: 'Your episode is shooting. The co-EP "did a pass" on it and wants a shared credit.',
    choices: [
      { text: 'Share it. He did fix a comma.', favor: 10, quality: -2 },
      { text: 'Fight to shoot your draft as written', favor: -14, quality: 3 },
    ],
  },
  {
    prompt: "The showrunner's nephew joined the room. He has many thoughts about \"what the youth want.\"",
    choices: [
      { text: 'Make him your writing buddy', favor: 10, quality: -4 },
      { text: 'Steer him toward the coffee run', favor: -8, quality: 5 },
    ],
  },
  {
    prompt: 'The table read bombs. The showrunner asks who wrote the cold open. You did.',
    choices: [
      { text: 'Own it and pitch three fixes on the spot', favor: 6, quality: 6 },
      { text: 'Blame the actor\'s "energy"', favor: -10, quality: -4 },
    ],
  },
  {
    prompt: 'The room has spent four hours debating whether the lead is a cat person.',
    choices: [
      { text: 'Weigh in passionately: she has two cats', favor: 8, quality: -6 },
      { text: 'Steer back to the broken act two', favor: -6, quality: 7 },
    ],
  },
  {
    prompt: 'Streamer note: viewers need a twist every four minutes, "per the data."',
    choices: [
      { text: 'Twist! Another twist! The twist was a twist!', favor: 8, quality: -8 },
      { text: 'Push back with one big, earned twist', favor: -10, quality: 8 },
    ],
  },
  {
    prompt: "The co-EP's storyline about his own garage band is back. Third time this season.",
    choices: [
      { text: 'Champion the band arc. Rock on.', favor: 14, quality: -9 },
      { text: 'Suggest the band breaks up off-screen', favor: -12, quality: 6 },
    ],
  },
  {
    prompt: "You're in charge of the lunch order. Twelve writers, fourteen allergies, one budget.",
    choices: [
      { text: 'Order from the fancy salad place', favor: 6, quality: 0 },
      { text: 'Grab cheap tacos and write through lunch', favor: -6, quality: 4 },
    ],
  },
];

export type WritersHeadlineKind =
  | 'specFinished'
  | 'agentSigned'
  | 'agentPassed'
  | 'staffed'
  | 'notStaffed'
  | 'roomMissed'
  | 'promoted'
  | 'notAskedBack'
  | 'roomWrapped'
  | 'guildJoined'
  | 'ruleOne';

/**
 * Writer & guild trade headlines (Title Case, ≤ 100 chars with longest fills).
 * Placeholders: {who} (≤ 22 chars), {title}/{show} (≤ 26), {agency} (AGENCY_FLAVOR name,
 * ≤ 28), {network} (≤ 23), {weeks} (e.g. "10"), {guild} (GUILD_FLAVOR short name, ≤ 6).
 * - specFinished: {who},{title}
 * - agentSigned / agentPassed: {who},{agency}
 * - staffed: {who},{show},{network}
 * - notStaffed: {who}
 * - roomMissed: {who},{show}
 * - promoted: {who},{show}
 * - notAskedBack: {who},{show}
 * - roomWrapped: {who},{show},{weeks}
 * - guildJoined: {who},{guild}
 * - ruleOne (gossip: a member told they can't take non-union work): {who},{guild}
 */
export const WRITERS_HEADLINES: Record<WritersHeadlineKind, readonly string[]> = {
  specFinished: [
    '{who} Finishes Spec Pilot "{title}"; Rewrites Page One',
    '{who} Types "Fade Out" on "{title}," Tells the Coffee Shop',
    'SPEC WATCH: {who}\'s "{title}" Is "Like Prestige, but Fun"',
    '{who} Completes "{title}"; Friends Will Read It "Soon"',
    '"{title}" Done; {who} Already Has a Sizzle Reel in Their Head',
    '{who} Wraps "{title}" Spec, Celebrates With a Second Cold Brew',
  ],
  agentSigned: [
    '{agency} Signs {who}; Assistant Spells Name Right on Second Try',
    'REPPED: {who} Inks With {agency}',
    '{who} Lands at {agency}, Gets a Lanyard and a Lot of Hope',
    '{agency} Adds {who} to Roster; "Hungry," Say Sources',
    '{who} Signs With {agency}; Mom Asks What an Agent Does',
    '{agency} Bets on {who} After "Genuinely Read the Pages"',
  ],
  agentPassed: [
    '{agency} Passes on {who}, Calls Spec "So Close to Something"',
    '{who} Meets {agency}; Gets Parking Validated, Not Signed',
    '{agency} to {who}: "Love It. Let\'s Stay in Touch."',
    '{agency} Not "Taking On New Clients Right Now," Tells {who}',
    '{who} Exits {agency} Meeting With Free Water and No Deal',
    '{agency} Calls {who} "A Real Voice," Then Never Calls Again',
  ],
  staffed: [
    '{who} Staffed on "{show}" at {network}',
    'STAFFING: {network}\'s "{show}" Hires {who}',
    '{who} Joins "{show}" Room; Picks a Favorite Marker',
    '{network} Adds {who} to "{show}" Staff; Snacks Up',
    '{who} Lands First Room at "{show}," Finds the Good Mugs',
    '{network}\'s "{show}" Rounds Out Room With {who}',
  ],
  notStaffed: [
    'Staffing Season Ends Without {who}; Spec Goes Back in the Drawer',
    '{who} Not Staffed This Year; Agent Says "Next Season, Totally"',
    '{who} Shut Out of Staffing; Starts a Podcast About It',
    'No Room for {who} This Season; Coffee Shop Booth Re-Reserved',
    '{who} Goes 0-for-3 in Staffing, Calls It "Character Building"',
    'Staffing Wrap: {who} Gets Many Generals, Zero Jobs',
  ],
  roomMissed: [
    '{who} No-Shows "{show}" Room; Their Chair Is Given to a Ficus',
    'Empty Seat at "{show}": {who} Missed Room Day',
    '"{show}" Breaks Act Two Without {who}; It Goes Fine, Ominously',
    '{who} Skips "{show}" Room; Showrunner "Not Mad, Just Noting It"',
    '{who} Absent From "{show}" Room; Their Bagel Goes Uneaten',
  ],
  promoted: [
    '{who} Bumped to Story Editor on "{show}"',
    'PROMOTION: "{show}" Ups {who} to Story Editor',
    '{who} Promoted on "{show}," May Now Say "Let\'s Table That"',
    '"{show}" Names {who} Story Editor for Saving Act Twos',
    '{who} Climbs the Ladder at "{show}"; Parking Spot Moves Up',
  ],
  notAskedBack: [
    '{who} Not Asked Back to "{show}"; "Room Chemistry" Cited',
    '"{show}" Season Two Room Will Not Include {who}',
    '{who} Exits "{show}," Takes Favorite Mug and a Grudge',
    '{who} Off "{show}" After Season of "Strong Opinions"',
    '"{show}" Reshuffles Room; {who} Learns via Group Chat',
  ],
  roomWrapped: [
    '"{show}" Room Wraps After {weeks} Weeks; {who} Takes Home a Credit',
    '{who} Wraps {weeks}-Week Run on "{show}"; Whiteboard Finally Erased',
    'That\'s a Season: {who} Closes Out "{show}" Room',
    '{who} Survives {weeks} Weeks in the "{show}" Room, Mostly Intact',
    '"{show}" Writers Disband After {weeks} Weeks; {who} Keeps Lanyard',
    '{who} Finishes "{show}" Season; Already Misses the Snack Drawer',
  ],
  guildJoined: [
    '{who} Joins the {guild}; Frames the Membership Card',
    'Welcome to the Union: {who} Is Now a Card-Carrying {guild} Member',
    '{who} Pays Initiation, Officially Joins {guild}',
    '{guild} Swears In {who}; Health Plan Brochure Read Twice',
    'UNION CARD: {who} Gets {guild} Membership After Three Vouchers',
    '{who} Joins {guild}, Immediately Learns About Dues',
  ],
  ruleOne: [
    '{guild} Reminds {who}: No Non-Union Gigs, Not Even "Just for Exposure"',
    'Sources: {who} Got a Stern Email From {guild} Over a Student Short',
    '{who} Turns Down Non-Union Gig, Cites {guild} Rule One, Sighs',
    'Overheard in Burbank: {who} Tells Friend "Sorry, I\'m {guild} Now"',
    '{guild} Rule One Strikes Again; {who} Passes on Cash Job',
    '{who} Learns {guild} Rule One the Hard Way, at a Craft Services Table',
  ],
};
