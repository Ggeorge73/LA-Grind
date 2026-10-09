// Sprint 11 (LAG-91) phone flavour: parody phone apps, message contacts, inbox
// text-message templates, bank ledger categories, bank and phone branding.
// Content Designer. All names are invented; no real people, apps, banks,
// unions, networks or trademarks.

export type AppId =
  | 'casting'
  | 'studio'
  | 'bank'
  | 'feed'
  | 'messages'
  | 'rides'
  | 'gigs'
  | 'union'
  | 'settings';

/**
 * Parody phone apps. name ≤ 12 chars (fits under an icon), tagline ≤ 60,
 * empty = empty-state line ≤ 80. icon = emoji fallback glyph. glyph = SVG path
 * data for a 24×24 viewBox (single `<path d>`, filled; a few glyphs have cut-outs,
 * so render with fill-rule="evenodd"). bg = icon tile colour; all pass white-glyph contrast.
 */
export const APPS: Record<AppId, { name: string; tagline: string; empty: string; icon: string; glyph: string; bg: string }> = {
  casting: {
    name: 'CastBoard',
    tagline: "Today's breakdowns, your odds, and sides to cram in the car.",
    empty: 'No breakdowns today. Casting is "at lunch." All of casting. Till Thursday.',
    icon: '🎭',
    glyph: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
    bg: '#C2185B',
  },
  studio: {
    name: 'StudioDesk',
    tagline: 'Films, tracks, your pilot. Your lovingly unpaid work.',
    empty: 'No projects yet. Every masterpiece starts as a folder called "untitled_FINAL2".',
    icon: '🎬',
    glyph: 'M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM2.6 6.2 18.9 2.5l.9 3.9L3.5 10.1z',
    bg: '#6A1B9A',
  },
  bank: {
    name: 'Balance',
    tagline: 'Where the money went, mostly to parking.',
    empty: 'No transactions yet. Enjoy this moment. It is the richest you will ever feel.',
    icon: '🏦',
    glyph: 'M12 2 2 7v2h20V7zM4 11h3v7H4zm6.5 0h3v7h-3zM17 11h3v7h-3zM2 20h20v2H2z',
    bg: '#1B5E20',
  },
  feed: {
    name: 'Scrollr',
    tagline: 'The trades, but with likes. Everyone is "thrilled to share."',
    empty: 'Nothing on your feed. Either the town is quiet or the algorithm forgot you.',
    icon: '📰',
    glyph:
      'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z',
    bg: '#BF360C',
  },
  messages: {
    name: 'Textr',
    tagline: 'Your agent, your landlord, your mom. In that order, sadly.',
    empty: 'No messages. Nobody needs you yet. Enjoy it, it will not last.',
    icon: '💬',
    glyph: 'M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    bg: '#00838F',
  },
  rides: {
    name: 'Merge',
    tagline: "Rides, routes and the 405's ongoing opinion of you.",
    empty: 'No trips yet. The freeway is waiting. It is always waiting.',
    icon: '🚗',
    glyph:
      'M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1v2h-3v-2H8v2H5v-2H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zm2.2 0h9.6l-1-3H8.2z',
    bg: '#37474F',
  },
  gigs: {
    name: 'Hustlr',
    tagline: 'Shifts that pay rent while the dream pays in exposure.',
    empty: 'No shifts posted. Even the coffee shops are fully staffed with screenwriters.',
    icon: '💼',
    glyph:
      'M9 3h6a2 2 0 0 1 2 2v2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2zm0 2v2h6V5z',
    bg: '#1565C0',
  },
  union: {
    name: 'UnionCard',
    tagline: 'Vouchers, dues and the health plan you will brag about.',
    empty: 'No guild business yet. Collect vouchers like they are holy relics. They are.',
    icon: '🪪',
    glyph: 'M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z',
    bg: '#B71C1C',
  },
  settings: {
    name: 'Settings',
    tagline: 'Speed, new run, about. The only things you control here.',
    empty: 'Nothing to tweak. You are, as they say in notes, "perfect as is."',
    icon: '⚙️',
    glyph: 'M3 5h10v2H3zm14 0h4v2h-4zM13 3h4v6h-4zM3 11h4v2H3zm8 0h10v2H11zM7 9h4v6H7zM3 17h12v2H3zm16 0h2v2h-2zM15 15h4v6h-4z',
    bg: '#546E7A',
  },
};

export type ContactId =
  | 'agent'
  | 'casting'
  | 'booker'
  | 'network'
  | 'showrunner'
  | 'label'
  | 'festival'
  | 'landlord'
  | 'union'
  | 'mom';

/** Message senders. name ≤ 22 chars, role ≤ 30 (shown under the name), avatar = one emoji. */
export const CONTACTS: Record<ContactId, { name: string; role: string; avatar: string }> = {
  agent: { name: 'Dana Pruitt', role: 'Your Agent · Always Driving', avatar: '🕶️' },
  casting: { name: 'Bev Kessler Casting', role: 'Casting Director · Burbank', avatar: '📋' },
  booker: { name: 'Jojo Ruiz', role: 'Talent Buyer · Every Venue', avatar: '🎟️' },
  network: { name: 'Network Biz Affairs', role: 'Current Programming · No-Reply', avatar: '📺' },
  showrunner: { name: 'Gwen Hollister', role: 'Showrunner · Running Late', avatar: '☕' },
  label: { name: 'Kai from A&R', role: 'A&R · Texting From Studio B', avatar: '🎧' },
  festival: { name: 'Fest Programming Desk', role: 'Selections · Laminates Pending', avatar: '🎞️' },
  landlord: { name: 'Mr. Ostrowski', role: 'Landlord · Owns a Leaf Blower', avatar: '🔑' },
  union: { name: 'Guild Member Services', role: 'Hold Music Since 1937', avatar: '🤝' },
  mom: { name: 'Mom', role: 'Mom · Font Size: Huge', avatar: '💐' },
};

export type InboxKind =
  | 'pilotSeasonOpen'
  | 'callbackStarted'
  | 'callbackBooked'
  | 'callbackPassed'
  | 'gigBooked'
  | 'gigBookedMusic'
  | 'pilotPickedUp'
  | 'pilotPassed'
  | 'episodeMissed'
  | 'seriesWrapped'
  | 'agentSigned'
  | 'staffed'
  | 'staffingNoOffer'
  | 'staffingOver'
  | 'roomEvent'
  | 'roomPromoted'
  | 'roomNotAskedBack'
  | 'roomWrapped'
  | 'labelSigned'
  | 'labelPassed'
  | 'festivalAccepted'
  | 'festivalRejected'
  | 'distributionOffer'
  | 'overdraftStarted'
  | 'overdraftCleared'
  | 'movedHome'
  | 'guildVoucherReady'
  | 'guildJoined'
  | 'guildDues'
  | 'healthPlanOn'
  | 'healthPlanOff'
  | 'momCheckIn';

/**
 * Inbox text messages, 3–5 variants per kind, each ≤ 140 chars, first person, ≤ 1 emoji.
 * Placeholders per kind (curly braces): see INBOX_SENDER comments. {pay},{advance},
 * {amount},{total} arrive pre-formatted ("$1,200"); {guild} is a short name ("TEA");
 * {days},{episodes},{attempt} are numbers. roomEvent wraps the politics {prompt}.
 */
export const INBOX_TEMPLATES: Record<InboxKind, readonly string[]> = {
  // {} — agent
  pilotSeasonOpen: [
    "It's pilot season, baby. Every network wants a cop, a doctor or a lawyer. You're all three now.",
    'Pilot season is OPEN. Get headshots, get sleep, get a second mirror for self-tapes. Go go go.',
    "Pilot season starts today. Breakdowns are flooding in. I'm submitting you for everything with a pulse.",
    'Heads up: pilot season. For the next few weeks your phone is a pager and I am the doctor. 📞',
  ],
  // {show},{network},{role} — casting
  callbackStarted: [
    'Hi! Producers loved you. Callback for {role} on {show} ({network}). Same energy, but more. And less.',
    "Callback! {show} for {network}. They want to see you as {role} again. Don't change a thing. Change some things.",
    "You're on the callback list for {role} in {show}. {network} execs will be there. Wear the same shirt.",
    'Good news: callback for {show} ({network}). Role: {role}. Parking validated for the first 20 minutes.',
  ],
  // {show},{pay} — casting
  callbackBooked: [
    "You booked it!! {show} is yours. {pay}. Business affairs will call. Don't post anything yet. 🎉",
    "Congrats, you got {show}! {pay}. Please do not tell your group chat until the deal closes. They'll know.",
    "It's you. They picked you for {show}. {pay}. The director said, and I quote, \"that one.\"",
    "Offer's in for {show}: {pay}. Wardrobe needs your sizes. Your real sizes, not your headshot sizes.",
  ],
  // {show} — casting
  callbackPassed: [
    'They went another way on {show}. Taller, apparently. Or shorter. Notes were unclear. You were great.',
    "Pass on {show}. They loved you, they just loved someone's cousin more. Keep going.",
    "Sorry, {show} went a different direction. The direction was a name. You'll get the next one.",
    "No on {show}. Producers said \"not quite.\" Which is industry for \"almost.\" Which is something!",
  ],
  // {title},{pay} — casting
  gigBooked: [
    "You're booked on {title}! {pay}. Call time is early. Crafty is late. Bring a sweater.",
    'Confirmed: {title}, {pay}. Check in with the 2nd AD. Do not look at the lead. Kidding. Mostly.',
    "{title} wants you. {pay}. Please arrive camera-ready, which is different from you-ready.",
  ],
  // {title},{pay} — booker
  gigBookedMusic: [
    "Got you on {title}. {pay}, two drink tickets, and a green room that's a hallway. You're welcome.",
    'Locked {title} for you. {pay} at the end of the night, cash, if the door does okay. 🎸',
    "You're on {title}! {pay}. Load in at 6, soundcheck at 'whenever the sound guy shows'.",
    'Booked: {title}. {pay}. Bring your own cables. And your own crowd, honestly.',
  ],
  // {show},{network} — network
  pilotPickedUp: [
    'Pleased to inform you {network} has ordered {show} to series. Please hold for a Zoom about the logo.',
    '{show} has been picked up by {network}. Congratulations. Legal will send 40 pages to sign by noon.',
    'Great news from {network}: {show} is going to series. Your parking spot has been assigned. Spot 312.',
  ],
  // {show},{network} — network
  pilotPassed: [
    '{network} will not be moving forward with {show}. We thank you for your passion and your catering.',
    'After careful consideration, {network} is passing on {show}. The testing audience liked the dog.',
    'Unfortunately {show} was not picked up by {network}. It may live forever in a deck someone forgets.',
  ],
  // {show} — network
  episodeMissed: [
    'Production on {show} noted your absence today. Your stand-in did his best. His best was concerning.',
    'You missed call on {show}. The schedule has been reshuffled and so has our opinion of you.',
    "Friendly reminder that {show} is a job. Today's episode shot around you. Literally, with a plant.",
  ],
  // {show},{episodes} — network
  seriesWrapped: [
    "That's a wrap on {show}! {episodes} episodes in the can. Wrap gift is a branded fleece. Thank you.",
    '{show} has wrapped after {episodes} episodes. Please return your walkie and your sense of normalcy.',
    'All {episodes} episodes of {show} are done. Thank you for your service. Hiatus starts now. Hydrate.',
  ],
  // {agency} — agent
  agentSigned: [
    "Welcome to {agency}! I'm your agent now. Text me anytime. Expect replies some time.",
    "It's official, you're with {agency}. I already pitched you to three people at a juice bar.",
    "Signed! {agency} is lucky to have you. I'll be submitting you within the hour. Ish. 🤝",
  ],
  // {show},{network} — agent
  staffed: [
    "YOU'RE STAFFED. {show} on {network}. Staff writer. Bring snacks and a thick skin.",
    "We closed it! You're in the room on {show} ({network}). Do not pitch the dog idea on day one.",
    "Staffed on {show}! {network} says welcome. Showrunner says nothing yet. That's normal.",
  ],
  // {attempt} — agent
  staffingNoOffer: [
    'No offers on round {attempt}. Lots of "love their voice." Zero "hire their voice." Next round.',
    "Round {attempt}: nothing yet. Two shows wanted 'someone like you but already staffed.' We go again.",
    'Staffing try {attempt} came up empty. Your sample got passed around though. Very around.',
  ],
  // {} — agent
  staffingOver: [
    "Staffing season's over and we didn't land one. It happens to everyone. Write the next thing.",
    'Bad news: rooms are full for the year. Good news: you have nine months to write something great.',
    'Season closed, no job. I know. Have a sad burrito, then open a blank doc. I believe in you.',
  ],
  // {prompt} — showrunner
  roomEvent: [
    'Quick thing before tomorrow. {prompt}',
    'Need your read on this. {prompt}',
    "Don't overthink it. {prompt}",
    'Situation in the room. {prompt}',
  ],
  // {show} — showrunner
  roomPromoted: [
    "You've been bumped to story editor on {show}. Small raise, big chair. Don't let it go to your head.",
    "Promoting you on {show}. You earned it. Also, you now have to run the room when I'm at the dentist.",
    "Congrats, you're moving up on {show}. Your name gets a bigger card. Well, the same card. Higher up.",
  ],
  // {show} — showrunner
  roomNotAskedBack: [
    "Hey. We won't be bringing you back for next season of {show}. Not personal. Very much the budget.",
    "Rough news. {show} is retooling the room and you're not in the new version. You'll land fine.",
    "We're not asking you back on {show}. The network wanted 'fresh voices'. You were one. Last year.",
  ],
  // {show} — showrunner
  roomWrapped: [
    'Room on {show} is officially wrapped. Thank you. Take the leftover almonds, you earned them.',
    "That's a wrap on the {show} room. Great season. Please never say 'what if it's a dream' again.",
    '{show} room is done. Scripts locked. Whiteboard erased. Thank you for the good jokes.',
  ],
  // {label},{advance} — label
  labelSigned: [
    "It's done. You're on {label}. {advance} advance. Recoupable, but let's not ruin the moment. 🎧",
    'Welcome to {label}! {advance} up front. Read the contract. Or skim it. Or let the lawyer skim it.',
    'Contracts countersigned. {label} family now. {advance} advance hits soon. Studio B is yours Tuesdays.',
  ],
  // {label} — label
  labelPassed: [
    "Gonna be honest, {label} is passing for now. The dashboard didn't spike. I liked it though.",
    '{label} said not right now. Which means never. Which sometimes means in two years. Keep dropping.',
    "We're gonna pass at {label}. Love the vibe, need the numbers. Hit me when the numbers show up.",
  ],
  // {festival} — festival
  festivalAccepted: [
    "Congratulations! You're an Official Selection at {festival}. Laminate and tote bag to follow.",
    'We are delighted to accept your film into {festival}. Please send a DCP and your patience.',
    '{festival} would love to screen your film! Screening slot: Tuesday, 10 a.m. Bring your friends. All of them.',
  ],
  // {festival} — festival
  festivalRejected: [
    'Thank you for submitting to {festival}. We received a record number of films. Yours was one.',
    "Unfortunately your film was not selected for {festival}. This is not a reflection of its quality. It's math.",
    '{festival} regrets to inform you that we are not able to program your film this year. Please re-apply! $85.',
  ],
  // {distributor},{amount} — festival
  distributionOffer: [
    'A buyer from {distributor} saw your screening and wants the film. Offer is {amount}. Call us!',
    "{distributor} is offering {amount} for your film. That's real money. Possibly real money. We'll confirm.",
    'Distribution interest! {distributor}, {amount}, all rights, all territories, all of time. Negotiable.',
  ],
  // {days} — landlord
  overdraftStarted: [
    "Rent didn't go through. You have {days} days. I'm not a monster. I'm a landlord.",
    'Your account bounced on rent. {days} days to fix it, then we talk. In person. With my nephew.',
    "Hi it's Mr. O. Rent check said no. {days} days please. Also the leaf blower is staying.",
  ],
  // {} — landlord
  overdraftCleared: [
    'Rent received. Thank you. We are friends again. Leaf blower is at 7 a.m. tomorrow.',
    "Payment cleared. Good. I'll stop knocking. Mostly.",
    "Got it, we're square. Don't make me text you again. I don't like texting. 🔑",
  ],
  // {} — mom
  movedHome: [
    "Your room is just how you left it. I made your favorite. We don't have to talk about it.",
    'Welcome home, sweetie. Dad moved the treadmill out of your room. Mostly.',
    "I'm so proud you tried. I'm also proud you came home. Both can be true. ❤️",
    'Your old headshots are still on the fridge. I left them up. Dinner at six.',
  ],
  // {guild} — union
  guildVoucherReady: [
    "That's your third voucher. You're eligible to join the {guild}. Initiation fees await.",
    'Congratulations, you are now {guild}-eligible. Please hold for the fee schedule. And hold. And hold.',
    'Voucher three received! The {guild} welcomes your application and your initiation payment.',
  ],
  // {guild} — union
  guildJoined: [
    "Welcome to the {guild}! Your card's in the mail. Frame it. Everyone does.",
    "You're officially a {guild} member. You can never do non-union work again. No pressure.",
    'Membership confirmed. The {guild} has your back, your pension and your residuals. Small ones.',
  ],
  // {total} — union
  guildDues: [
    'Quarterly dues of {total} have been deducted. Solidarity is not free, but it is tax-deductible.',
    'Reminder: your dues ({total}) were collected. Thank you for keeping the hold music funded.',
    '{total} in guild dues processed. Your membership remains in good standing. Unlike your car.',
  ],
  // {guild} — union
  healthPlanOn: [
    "Good news: you qualify for the {guild} health plan this year. Go get that mole looked at.",
    'Your {guild} health coverage is active! Dental included. Book everything. Book it all now.',
    'You earned enough to qualify for {guild} health insurance. Real insurance. Like a grown-up.',
  ],
  // {guild} — union
  healthPlanOff: [
    "Your {guild} health coverage has lapsed. You didn't hit the earnings minimum. Please don't fall down.",
    'Notice: {guild} health plan ended for this period. Earn your way back in. Avoid skateboards.',
    'Coverage under the {guild} plan has ended. We recommend walking carefully until further notice.',
  ],
  // {} — mom
  momCheckIn: [
    'Hi honey, just checking in. Are you eating? Real food? Not just coffee? Love, Mom',
    "Saw a show filmed in LA and looked for you in the background. Didn't see you. Next time! ❤️",
    "Your aunt asked if you're famous yet. I said 'basically.' Please call so I can update her.",
    'Are you sleeping? You sounded tired. Also, the dentist near us is hiring. Just saying.',
    'Proud of you. Also, there is a nursing program at the community college. No reason. Love you.',
  ],
};

/** Which contact sends each inbox kind. */
export const INBOX_SENDER: Record<InboxKind, ContactId> = {
  pilotSeasonOpen: 'agent',
  callbackStarted: 'casting',
  callbackBooked: 'casting',
  callbackPassed: 'casting',
  gigBooked: 'casting',
  gigBookedMusic: 'booker',
  pilotPickedUp: 'network',
  pilotPassed: 'network',
  episodeMissed: 'network',
  seriesWrapped: 'network',
  agentSigned: 'agent',
  staffed: 'agent',
  staffingNoOffer: 'agent',
  staffingOver: 'agent',
  roomEvent: 'showrunner',
  roomPromoted: 'showrunner',
  roomNotAskedBack: 'showrunner',
  roomWrapped: 'showrunner',
  labelSigned: 'label',
  labelPassed: 'label',
  festivalAccepted: 'festival',
  festivalRejected: 'festival',
  distributionOffer: 'festival',
  overdraftStarted: 'landlord',
  overdraftCleared: 'landlord',
  movedHome: 'mom',
  guildVoucherReady: 'union',
  guildJoined: 'union',
  guildDues: 'union',
  healthPlanOn: 'union',
  healthPlanOff: 'union',
  momCheckIn: 'mom',
};

export type LedgerKind = 'job' | 'gig' | 'film' | 'music' | 'tv' | 'bills' | 'travel' | 'lifestyle' | 'career' | 'union';

/** Bank app category labels (≤ 14 chars) and an emoji each. */
export const LEDGER_KINDS: Record<LedgerKind, { label: string; icon: string }> = {
  job: { label: 'Day Job', icon: '☕' },
  gig: { label: 'Gigs', icon: '🎭' },
  film: { label: 'Film', icon: '🎬' },
  music: { label: 'Music', icon: '🎵' },
  tv: { label: 'TV', icon: '📺' },
  bills: { label: 'Rent & Bills', icon: '🧾' },
  travel: { label: 'Getting Around', icon: '🚗' },
  lifestyle: { label: 'Lifestyle', icon: '🥑' },
  career: { label: 'Career Moves', icon: '📈' },
  union: { label: 'Guild', icon: '🪪' },
};

/** Parody bank shown in the Bank app header (≤ 24 chars) and the overdraft line (≤ 60, {days}). */
export const BANK: { name: string; overdraftWarning: string } = {
  name: 'Silver Screen Savings',
  overdraftWarning: 'Overdrawn. {days} days before your landlord gets creative.',
};

/** Parody phone brand for the lock/home screen (≤ 20 chars) and 6 wallpaper greetings (≤ 40, rotated by day). */
export const PHONE: { brand: string; greetings: readonly string[] } = {
  brand: 'Pearphone 9 Mini',
  greetings: [
    'Good morning, future star.',
    'Today could be the day. Again.',
    'Hydrate. Network. Repeat.',
    'Someone is reading your script. Maybe.',
    'You are one callback away.',
    'Traffic is bad. Dreams are good.',
  ],
};
