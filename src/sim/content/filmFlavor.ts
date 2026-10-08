import type { LocationId } from '../types';

export interface Investor {
  id: string;
  name: string;
  /** Where you pitch them. */
  location: LocationId;
  /** ≤ 90 chars. */
  blurb: string;
  /** Added to scale difficulty: −10 (easy marks) … +15 (picky). */
  difficultyMod: number;
  /** Fraction of budget they put in on a yes. */
  shareMin: number;
  shareMax: number;
}

// Sorted easy mark → picky. Easier money is smaller money.
export const INVESTORS: readonly Investor[] = [
  { id: 'brentwood-dentists', name: 'Brentwood Dentists Film Fund', location: 'santamonica', blurb: 'Six orthodontists who want a cameo and a write-off, in that order.', difficultyMod: -10, shareMin: 0.2, shareMax: 0.3 },
  { id: 'uncle-gary-tokens', name: "Uncle Gary's Token Treasury", location: 'weho', blurb: 'Pays in a coin he invented last Tuesday. Insists it counts as financing.', difficultyMod: -8, shareMin: 0.2, shareMax: 0.32 },
  { id: 'canyon-wellness', name: 'Canyon Wellness Ventures', location: 'silverlake', blurb: 'Funds anything with a sound bath scene. Script notes arrive as horoscopes.', difficultyMod: -4, shareMin: 0.25, shareMax: 0.35 },
  { id: 'noho-bold-voices', name: 'The NoHo Bold Voices Grant', location: 'noho', blurb: 'Champions "bold voices." Defines bold as "shot in black and white."', difficultyMod: 0, shareMin: 0.25, shareMax: 0.4 },
  { id: 'former-vp-ret', name: 'Former VP of Something, Ret.', location: 'burbank', blurb: 'Greenlit a hit in 1997. Will tell you about it for 45 minutes, then pass.', difficultyMod: 5, shareMin: 0.3, shareMax: 0.45 },
  { id: 'vandersloot-family-office', name: 'Vandersloot Family Office', location: 'hollywood', blurb: 'Old money seeking new prestige. Wants laurels on the poster before page one.', difficultyMod: 8, shareMin: 0.35, shareMax: 0.5 },
  { id: 'pemberton-vale-prestige', name: 'Pemberton-Vale Prestige Capital', location: 'weho', blurb: 'Only backs films "in conversation with cinema." Has never finished one.', difficultyMod: 12, shareMin: 0.4, shareMax: 0.55 },
  { id: 'seed-round-cinema', name: 'Seed Round Cinema Partners', location: 'santamonica', blurb: 'Wants disruption in act two, a ten-year roadmap, and to call it "content."', difficultyMod: 15, shareMin: 0.45, shareMax: 0.6 },
];

export const CREW_FIRST_NAMES: readonly string[] = [
  'Marisol', 'Dev', 'Tamsin', 'Kofi', 'Yuki', 'Bodhi', 'Ines', 'Rafferty',
  'Amara', 'Jun', 'Delphine', 'Mateo', 'Priya', 'Oskar', 'Zainab', 'Cash',
  'Leilani', 'Tobias', 'Nadia', 'Emeka', 'Sunny', 'Florence', 'Arjun', 'Wren',
  'Esperanza', 'Hiro', 'Margo', 'Tariq', 'Ingrid', 'Dashiell', 'Thandiwe', 'Lior',
  'Paloma', 'Gus', 'Soo-ah', 'Birdie', 'Anouk', 'Kai', 'Rosalind', 'Benny',
];

export const CREW_LAST_NAMES: readonly string[] = [
  'Okafor-Lindqvist', 'Brightwater', 'Castellane', 'Mbeki-Rowe', 'Tanabe', 'Featherstone', 'Valdivieso', 'Quill',
  'Haverford', 'Nakashima', 'Delacroix-Pugh', 'Ashgrove', 'Ramaswamy', 'Kettering', 'Abernethy', 'Solano',
  'Wexley', 'Achterberg', 'Moonsamy', 'Fairbairn', 'Oyelaran', 'Pettigrew', 'Lindgren', 'Castaneda-Holt',
  'Brannigan', 'Iwu', 'Szabo-Reyes', 'Thistlewood', 'Marchbanks', 'Delgado', 'Huxtenby', 'Arkwright',
  'Novak', 'Sandoval', 'Whitlock', 'Adeyemi', 'Pemberley', 'Kowalczyk', 'Rainsford', 'Oduya',
];

export const CREW_QUIRKS: readonly string[] = [
  'Owns one lens and talks about it constantly',
  'Calls every shot "painterly," even the bathroom',
  'Brings a dog to set. The dog has opinions.',
  'Will only eat craft services that are beige',
  'Has a podcast. Will mention the podcast.',
  'Wraps every sentence in "no notes, but..."',
  'Refuses to work before 10 AM or after sunset',
  'Keeps a gaffer tape collection, color-sorted',
  'Shot a music video once and never got over it',
  'Measures everything in "vibes per minute"',
  'Says "we\'ll fix it in post" about the weather',
  'Already pitched you their own feature twice',
  'Has three agents and zero returned emails',
  'Wears a headlamp indoors, just in case',
  'Insists the slate be clapped "with intention"',
  'Quotes film theory during lunch. Loudly.',
  'Drives a van full of equipment nobody asked for',
  'Will cry at the dailies. Every single day.',
  'Brings their own chair, labeled, with a cupholder',
  'Only communicates through walkie, even in person',
  'Lists "festival darling" as a personal skill',
  'Has a tattoo of an aspect ratio',
  'Treats every location like a sacred site',
  'Was "almost" on a big show, several times',
  'Fluent in three languages and all of them are jargon',
  'Swears the boom mic picks up "bad energy"',
  'Smells faintly of sage and expired permits',
  'Asks for a "story credit" on every coffee run',
  'Bills in quarter-hours and half-feelings',
  'Has never once returned a borrowed C-stand',
];

export const FILM_TITLE_FIRST: readonly string[] = [
  'Quiet', 'The Last', 'Small', 'Borrowed', 'Distant', 'Paper',
  'Tender', 'Hollow', 'Late', 'Every', 'Our', 'Softer',
  'Winter', 'August', 'The Long', 'Ordinary', 'Lonely', 'Pale',
  'The Other', 'Unfinished', 'Gentle', 'Faded', 'Heavy', 'Salt',
  'The Sudden', 'Tuesday', 'Minor', 'Brief', 'Some', 'Unspoken',
];

export const FILM_TITLE_SECOND: readonly string[] = [
  'Lamps', 'Casserole', 'Swimming Pools', 'Mothers', 'Weather', 'Tangerines',
  'Hallways', 'Furniture', 'Dogs', 'Rituals', 'Driveways', 'Static',
  'Margins', 'Laundry', 'Ceilings', 'Sundays', 'Orchards', 'Radiators',
  'Gestures', 'Motels', 'Silences', 'Ferns', 'Leftovers', 'Apartments',
  'Moths', 'Satellites', 'Antennas', 'Porches', 'Envelopes', 'Cousins',
];

export type FilmHeadlineKind = 'projectStarted' | 'pitchYes' | 'pitchNo' | 'greenlit' | 'crewComplete' | 'abandoned';

/** Placeholders: {who} (e.g. "Indie Hustler"), {title} (film title), {investor} (investor name), {amount} (e.g. "$8,000"), {scale} ("short film" | "micro-budget feature" | "indie feature"). */
export const FILM_HEADLINES: Record<FilmHeadlineKind, readonly string[]> = {
  projectStarted: [
    '{who} Developing {scale} "{title}"; Calls It "Deeply Personal, Also Commercial"',
    'EXCLUSIVE: {who} Sets "{title}" as Next {scale}, Buys Moleskine',
    '{who} Announces {scale} "{title}," Updates Bio to "Filmmaker"',
    '"{title}" in Development at {who}\'s Kitchen Table',
    '{who} Attaches Self to "{title}"; Sources Confirm Self Is Interested',
    'First Look: {who} Shares "{title}" Mood Board, It Is Mostly Fog',
    '{who} Begins {scale} "{title}," Tells Barista Before Telling Mom',
  ],
  pitchYes: [
    '{investor} Boards "{title}" With {amount}; {who} Pretends to Be Calm',
    'Money Talks: {investor} Commits {amount} to {who}\'s "{title}"',
    '{who} Lands {amount} From {investor}, Immediately Opens Second Spreadsheet',
    '{investor} Says Yes to "{title}" ({amount}), Requests Small Speaking Role',
    'Deal Alert: "{title}" Secures {amount} From {investor}',
    '{investor} Bets {amount} on {who}; Lawyers Bet on Nothing',
    '"{title}" Gets {amount} Boost as {investor} "Loves the Vibe"',
  ],
  pitchNo: [
    '{investor} Passes on "{title}," Cites "Market Conditions," Lunch Plans',
    '{who} Pitches {investor}; {investor} Pitches {who} a Timeshare',
    '"{title}" Not "Right for Our Slate," Says {investor}, Who Has No Slate',
    '{investor} Loved "{title}," Will Not Be Funding It',
    '{who} Exits {investor} Meeting With Notes, Parking Ticket, No Money',
    '{investor} Asks {who} to "Circle Back" on "{title}" in Several Years',
    '{investor} Declines "{title}"; Suggests Making It "More Like a Podcast"',
  ],
  greenlit: [
    'GREENLIT: {who}\'s {scale} "{title}" Is Fully Financed, Somehow',
    '"{title}" Closes Financing; {who} Starts Saying "Our Investors"',
    '{who} Fully Funds "{title}," Celebrates With Name-Brand Cereal',
    'It\'s Happening: {scale} "{title}" Locks Budget, {who} Locks Nerves',
    '"{title}" Financing Complete; Cap Table Includes Several Dentists',
    'Trades Exclusive: {who}\'s "{title}" Clears Last Money Hurdle',
    '{who} Raises Full Budget for "{title}," Rival Filmmakers "Thrilled"',
  ],
  crewComplete: [
    '"{title}" Crew Locked; {who} Learns Everyone\'s Name, Mostly',
    '{who} Assembles "{title}" Team, Group Chat Already Has Sub-Group Chats',
    'Crew Set on {scale} "{title}"; Half of Them Also Direct',
    '"{title}" Staffs Up: DP Owns One Lens, Will Mention It',
    '{who} Finalizes "{title}" Crew; Craft Services Budget Draws Concern',
    'Full Crew Aboard "{title}," Nobody Agrees on Lunch',
    '"{title}" Hires Final Crew Member, {who} Buys Walkies in Bulk',
  ],
  abandoned: [
    '{who} Shelves "{title}," Cites "Creative Differences" With Bank Account',
    '"{title}" Enters Development Hell, Unpacks, Gets Comfortable',
    '{who} Quietly Drops {scale} "{title}"; Mood Board Survives',
    '"{title}" Is Dead, Long Live "{title} 2"',
    '{who} Pulls Plug on "{title}," Will "Revisit It in Another Medium"',
    'Sources: "{title}" Now a Folder Called "Someday" on {who}\'s Desktop',
    '{who} Abandons "{title}"; Investors Reportedly "Relieved, Honestly"',
  ],
};
