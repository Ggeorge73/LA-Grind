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

export type FilmHeadlineKind =
  | 'projectStarted'
  | 'pitchYes'
  | 'pitchNo'
  | 'greenlit'
  | 'crewComplete'
  | 'abandoned'
  | 'shootWrapped'
  | 'festivalAccepted'
  | 'festivalRejected'
  | 'award'
  | 'offer'
  | 'released'
  | 'selfReleased';

/**
 * Placeholders:
 * - {who} (e.g. "Indie Hustler"), {title} (film title)
 * - {investor} (investor name), {amount} (e.g. "$14,400")
 * - {scale} ("short film" | "micro-budget feature" | "indie feature")
 * - {festival} (festival name), {distributor} (distributor name), {award} (award name)
 *
 * Per kind: pitch* use {investor}/{amount}; shootWrapped uses {who},{title},{scale};
 * festivalAccepted/festivalRejected use {who},{title},{festival}; award adds {award};
 * offer/released use {who},{title},{distributor},{amount}; selfReleased uses {who},{title}.
 */
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
  shootWrapped: [
    'THAT\'S A WRAP: {who}\'s {scale} "{title}" Completes Shoot, Mostly on Schedule',
    '"{title}" Wraps Production; {who} Sleeps 19 Hours, Wakes Up an Auteur',
    '{who} Calls Final "Cut!" on "{title}," Crew Applauds, Returns Nothing Borrowed',
    '{scale} "{title}" Wraps; Footage Described as "Painterly," Also Dark',
    'Wrap Party for "{title}" Held in Parking Lot, Declared "Very Indie"',
    '"{title}" Done Shooting; {who} Now Says "We\'ll Find It in the Edit"',
    '{who} Wraps "{title}," Immediately Begins Grieving the Group Chat',
    'Principal Photography Complete on "{title}"; Hard Drive Count: Alarming',
  ],
  festivalAccepted: [
    'OFFICIAL SELECTION: {festival} Picks {who}\'s "{title}"',
    '"{title}" Lands at {festival}; {who} Orders Laurels Before Lunch',
    '{festival} Programs "{title}," {who} Updates Every Bio on the Internet',
    '{who}\'s "{title}" Heads to {festival}; Lanyard Already Purchased',
    '{festival} Says Yes to "{title}"; Programmer Calls It "a Mood"',
    'Fest Alert: "{title}" Joins {festival} Lineup, {who} Practices Q&A Face',
    '"{title}" Accepted to {festival}; {who} Researches Cheapest Motel in Town',
  ],
  festivalRejected: [
    '{festival} Passes on "{title}," Cites "Unprecedented Number of Submissions"',
    '"{title}" Not Selected for {festival}; {who} Rereads Form Email 40 Times',
    '{who} Learns of {festival} Rejection via Portal Status Change, Shrugs Loudly',
    '{festival} Declines "{title}," Keeps $85 Fee, Wishes {who} "Every Success"',
    '"{title}" Snubbed by {festival}; {who} Declares Fests "Kind of Over Anyway"',
    '{festival} Rejection Stings {who}, Who Reminds Everyone It\'s "Subjective"',
    'Sources: {festival} Screeners Watched "{title}" for Nearly Four Minutes',
  ],
  award: [
    '{who}\'s "{title}" Takes {award} at {festival}',
    'WINNER: "{title}" Claims {award}; {who} Thanks Mom, Dentists, Fog',
    '{festival} Hands {award} to "{title}," {who} Forgets Entire Speech',
    '"{title}" Wins {award} at {festival}; Trophy Is Mostly Acrylic',
    '{who} Accepts {award} for "{title}," Plugs Podcast Twice',
    'Upset at {festival}: "{title}" Nabs {award} Over Film With a Budget',
    '{award} Goes to "{title}"; {who} Adds Second Laurel, Poster Now Mostly Laurels',
  ],
  offer: [
    '{distributor} Circles "{title}," Floats {amount} for Worldwide Rights',
    'Deal Talk: {distributor} Offers {who} {amount} for "{title}"',
    '{distributor} Sends {who} {amount} Offer for "{title}," Signed With an Emoji',
    'Bidding War? Not Quite: {distributor} Alone Bids {amount} on "{title}"',
    '{distributor} Eyes "{title}" at {amount}; {who} Pretends to Need Time',
    '"{title}" Draws {amount} Offer From {distributor}, Plus "Great Exposure"',
    'Sources: {distributor} Wants "{title}" for {amount} and a Shorter Title',
  ],
  released: [
    '{distributor} Releases {who}\'s "{title}"; {amount} Deal Officially Real',
    '"{title}" Now Streaming on {distributor}, Buried Under 40 Docuseries',
    'OUT NOW: "{title}" Hits {distributor} After {amount} Pickup',
    '{who}\'s "{title}" Debuts on {distributor}; Thumbnail Chosen by Algorithm',
    '{distributor} Launches "{title}," {who} Spends {amount} Mentally Already',
    '"{title}" Bows on {distributor}; Mom Watches Twice, Algorithm Notices',
    '{distributor} Drops "{title}" ({amount} Deal); Marketing Is One Tweet',
  ],
  selfReleased: [
    '{who} Self-Releases "{title}," Calls It "Disrupting Distribution"',
    '"{title}" Goes Direct-to-Link-in-Bio; {who} Is Now a Distributor',
    '{who} Uploads "{title}" Online, Refreshes View Count Hourly',
    'Going It Alone: {who} Drops "{title}" Free, Asks for "Likes and Shares"',
    '"{title}" Self-Released by {who}; Premiere Held in Group Chat',
    '{who} Puts "{title}" Online After Distributors "Ghosted, Respectfully"',
    'DIY Release: "{title}" Now Available Wherever {who} Posts Things',
  ],
};

export interface Distributor {
  id: string;
  name: string;
  /** ≤ 90 chars. */
  blurb: string;
}

export const DISTRIBUTORS: readonly Distributor[] = [
  { id: 'murderflix', name: 'MurderFlix', blurb: 'Only greenlights true crime. Will retitle your rom-com "The Killer Next Door."' },
  { id: 'b26', name: 'B26', blurb: 'Boutique taste-maker. Sells tote bags of your film before buying the film.' },
  { id: 'skyward-inflight', name: 'Skyward In-Flight Selections', blurb: 'Seat-back catalogue. Your ending will be cut for turbulence and content.' },
  { id: 'freevue-247', name: 'FreeVue 24/7', blurb: 'Free ad-supported channel. Your film airs between two mattress commercials, forever.' },
  { id: 'prestige-plus', name: 'Prestige+ Plus', blurb: 'Streamer with a plus in the name twice. Cancels things before they premiere.' },
  { id: 'mumblecore-collection', name: 'The Mumblecore Collection', blurb: 'Curated arthouse service. Seven subscribers, all of them programmers.' },
  { id: 'bigbox-dvd', name: 'BigBox Bargain Bin Home Video', blurb: 'Still prints DVDs. Will put a helicopter on your cover regardless of plot.' },
  { id: 'scrollr', name: 'Scrollr Originals', blurb: 'Vertical-video app. Will release your feature in 94 one-minute parts.' },
];

export const FESTIVAL_AWARDS: readonly string[] = [
  'Golden Sandal for Most Ambient Dread',
  'Silver Lanyard for Bravest Use of Fog',
  'Jury Prize for Longest Uninterrupted Stare',
  'Audience Award (Audience of Eleven)',
  'Crystal Moleskine for Emerging Voice',
  'Special Mention for Least Explained Ending',
  'Bronze Tote Bag for Unflinching Vision',
  'Golden Boom Mic for Most Natural Sound (Wind)',
  'Grand Jury Prize for Most Feelings Per Minute',
  'Honorable Mention for Surviving Post-Production',
];

/** Keyed by festival id. ≤ 90 chars each. */
export const FESTIVAL_BLURBS: Record<string, string> = {
  'noho-shorts': 'Monthly screening in a bar back room. Projector is a laptop; jury is the bartender.',
  'silverlake-underground': 'Rooftop fest for films shot on expired stock. Admission paid in kombucha.',
  slamdunce: 'Park City\'s scrappier rival. Snow, swag bags, and lanyards in every color.',
  sunburnt: 'Mountain prestige fest. Deals close in condos; everyone wears the same puffer.',
  canned: 'Riviera glamour. Eight-minute ovations, strict shoe rules, yachts with opinions.',
};
