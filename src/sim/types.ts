export type Medium = 'film' | 'tv' | 'music';
export type Skill = 'acting' | 'writing' | 'directing' | 'music';
export type LocationId = 'noho' | 'burbank' | 'hollywood' | 'weho' | 'silverlake' | 'santamonica';
export type ArchetypeId = 'nepo' | 'midwest' | 'indie' | 'producer';
export type JobId = 'barista' | 'barback' | 'rideshare' | 'pa';
export type LeisureId = 'beach' | 'screening' | 'museum' | 'records';

export type Skills = Record<Skill, number>;

export interface Player {
  archetype: ArchetypeId;
  home: LocationId;
  location: LocationId;
  cash: number;
  energy: number;
  burnout: number;
  spark: number;
  skills: Skills;
  network: number;
  rp: number;
  /** Per-guild vouchers and membership (Sprint 10; replaced the single Phase 1 voucher count). */
  guilds: Record<Skill, GuildState>;
  carHealth: number;
  hasHeadshots: boolean;
  creativeBurnout: boolean;
  /** Music fanbase. Persists across releases; drives release-week streams. */
  fans: number;
  /** Day index of the last live show (one a night). */
  lastShowDay: number | null;
}

/** What the player is busy doing. Rewards land when the clock reaches endMinute. */
export type ActivityKind =
  | 'project'
  | 'travel'
  | 'job'
  | 'sleep'
  | 'leisure'
  | 'class'
  | 'headshots'
  | 'repair'
  | 'prep'
  | 'submit'
  | 'show'
  | 'beat'
  | 'episode'
  | 'room'
  | 'guild';

export interface Activity {
  kind: ActivityKind;
  label: string;
  startMinute: number;
  endMinute: number;
  /** Energy spent per game minute by the action itself (on top of the awake drain). */
  energyPerMinute: number;
  /** Spark change per game minute (negative for prep). */
  sparkPerMinute: number;
  /** Car health change per game minute (rideshare). */
  carPerMinute: number;
  to?: LocationId;
  jobId?: JobId;
  hours?: number;
  skill?: Skill;
  leisureId?: LeisureId;
  opportunityId?: string;
  /** Booking chance locked in when a submission starts (what the player was shown). */
  odds?: number;
  projectAction?: ProjectAction;
  /** Film investor or music label being pitched. */
  investorId?: string;
  candidateId?: string;
  venueId?: string;
}

// ---------- Projects (PI-2 career engine) ----------

export type ProjectStage = 'develop' | 'finance' | 'crew' | 'shoot' | 'post' | 'festival' | 'record' | 'release' | 'deck' | 'agent' | 'staffing';
export type ProjectAction = 'write' | 'pitch' | 'labelPitch' | 'hire' | 'shoot' | 'edit' | 'record' | 'promo' | 'deck' | 'agentPitch';
export type ProjectScaleId = 'short' | 'micro' | 'indie' | 'single' | 'ep' | 'album' | 'spec';

export interface CrewCandidate {
  id: string;
  name: string;
  role: 'dp' | 'sound' | 'editor' | 'gaffer' | 'ad' | 'designer' | 'composer' | 'producer' | 'engineer' | 'session' | 'feature';
  skill: number;
  fee: number;
  quirk: string;
  hired: boolean;
}

export interface Project {
  id: string;
  medium: Medium;
  scale: ProjectScaleId;
  title: string;
  /** Film: where the set is. Music: the studio's neighbourhood. */
  location: LocationId;
  /** Music: the studio's name. */
  studio: string | null;
  stage: ProjectStage;
  startedMinute: number;
  /** Session scores per work stage (0–100 each). */
  scores: { develop: number[]; shoot: number[]; post: number[]; record: number[]; deck: number[] };
  budget: number;
  raised: number;
  selfFunded: number;
  spent: number;
  pitches: { investorId: string; day: number; yes: boolean; amount: number }[];
  crewPool: CrewCandidate[];
  /** Festival circuit (stage 'festival'). */
  submissions: FestivalSubmission[];
  offers: DistributionOffer[];
  /** Music release week (stage 'release'); null until released. */
  release: MusicRelease | null;
  /** Music: the label that signed this record, if any. */
  label: SignedLabel | null;
  /** Film: one of your records on the soundtrack. */
  soundtrack: { recordId: string; title: string; bonus: number } | null;
  /** TV spec: the agency that signed you, if any. */
  agent: { id: string; name: string; heat: number } | null;
  /** TV spec: staffing season progress (stage 'staffing'). */
  staffing: { tries: number; nextMinute: number } | null;
}

export interface SignedLabel {
  id: string;
  name: string;
  advance: number;
  royaltyCut: number;
  marketing: number;
}

export interface Beat {
  id: string;
  title: string;
  quality: number;
  madeMinute: number;
  leases: number;
  earned: number;
}

/** A finished record in your catalogue: earns sync placements and can soundtrack your films. */
export interface CatalogRecord {
  id: string;
  title: string;
  scale: ProjectScaleId;
  quality: number;
  peak: number | null;
  releasedMinute: number;
  placements: number;
  label: string | null;
}

export interface ReleaseDay {
  streams: number;
  fans: number;
  royalties: number;
  /** Chart position, or null if it didn't chart. */
  position: number | null;
  promoted: boolean;
}

export interface MusicRelease {
  releasedMinute: number;
  /** Fans when the record came out. The whole week's streams are based on this, so fans won during
   * the week grow your next record, not this one (no runaway snowball). Optional for older saves. */
  fansAtRelease?: number;
  /** Day index (dayOf) of the last promo, so promo is once a day. */
  lastPromoDay: number | null;
  /** A promo since the last 06:00 boosts the next day. */
  promoPending: boolean;
  days: ReleaseDay[];
}

export interface FestivalSubmission {
  festivalId: string;
  tier: number;
  submittedMinute: number;
  /** Result lands at 06:00 on this minute. */
  resultMinute: number;
  /** Acceptance chance locked in at submission (what the player was shown). */
  odds: number;
  status: 'pending' | 'accepted' | 'rejected';
  award: string | null;
}

export interface DistributionOffer {
  id: string;
  festivalId: string;
  distributorId: string;
  distributor: string;
  amount: number;
}

/** A finished (or abandoned) project on the player's record. */
export interface ProjectCredit {
  title: string;
  medium: Medium;
  scale: string;
  quality: number;
  outcome: string;
  minute: number;
}

export interface Opportunity {
  id: string;
  templateId: string;
  title: string;
  medium: Medium;
  skill: Skill;
  tier: number;
  location: LocationId;
  /** Hour of day the window opens and closes (submission must start and end inside it). */
  windowStart: number;
  windowEnd: number;
  day: number;
  prepHours: number;
  status: 'open' | 'booked' | 'rejected' | 'exposed';
  /** Pilot-season audition: submitting opens a callback instead of an instant roll. */
  pilot?: { network: string; role: string; showTitle: string };
}

export interface CallbackBeatState {
  note: string;
  reads: readonly [string, string, string];
  best: number;
  /** The read your Acting instinct points to (always the right one), or null if you didn't sense it. */
  sensed: number | null;
}

/** An open pilot callback: three director notes, pick a read for each. */
export interface Callback {
  opportunityId: string;
  showTitle: string;
  network: string;
  role: string;
  tier: number;
  /** Booking odds before the callback (locked at submission). */
  baseOdds: number;
  beats: CallbackBeatState[];
  picks: number[];
}

export interface PendingPilot {
  id: string;
  showTitle: string;
  network: string;
  role: string;
  tier: number;
  /** Right reads at the callback (0–3); feeds pickup odds. */
  right: number;
  decisionMinute: number;
}

export interface GuildState {
  vouchers: number;
  member: boolean;
  joinedMinute: number | null;
  /** Union earnings in the current 30-day dues cycle (health-plan threshold). */
  earnedThisCycle: number;
  healthPlan: boolean;
}

export interface RoomEventState {
  prompt: string;
  choices: readonly [{ text: string; favor: number; quality: number }, { text: string; favor: number; quality: number }];
}

export interface SeriesContract {
  /** actor = series regular (Sprint 9); writer = staff writer in a writers' room (Sprint 10). */
  kind: 'actor' | 'writer';
  /** Writers' room standing, 0–100 (writers only). */
  favor: number;
  /** Room-day scores after politics adjustments (writers only). */
  roomScores: number[];
  showTitle: string;
  network: string;
  role: string;
  tier: number;
  weeklyPay: number;
  episodesTotal: number;
  /** Episode weeks completed (paid). */
  episodesDone: number;
  episodesMissed: number;
  shotThisWeek: boolean;
  /** 06:00 when the current episode week is paid. */
  weekEndMinute: number;
}

export interface Headline {
  id: string;
  minute: number;
  text: string;
  /** true when the player's own action produced it. */
  own: boolean;
}

export interface LogEntry {
  id: string;
  minute: number;
  text: string;
}

export interface RunStats {
  startMinute: number;
  bestBooking: { title: string; pay: number } | null;
  peakTier: number;
  totalEarned: number;
  bookings: number;
  brokeMinute: number | null;
  endHeadline: string | null;
}

export interface Overdraft {
  startedMinute: number;
  deadlineMinute: number;
}

// ---------- Phone OS (PI-3 Sprint 11) ----------

export type LedgerKind = 'job' | 'gig' | 'film' | 'music' | 'tv' | 'bills' | 'travel' | 'lifestyle' | 'career' | 'union';

/** One money movement, as the Bank app shows it. Positive = money in. */
export interface LedgerEntry {
  id: string;
  minute: number;
  amount: number;
  label: string;
  kind: LedgerKind;
}

export type ContactId = 'agent' | 'casting' | 'booker' | 'network' | 'showrunner' | 'label' | 'festival' | 'landlord' | 'union' | 'mom';

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

export interface InboxMessage {
  id: string;
  minute: number;
  kind: InboxKind;
  text: string;
}

/** One chat thread per contact, newest message last. */
export interface InboxThread {
  contact: ContactId;
  messages: InboxMessage[];
  unread: number;
  lastMinute: number;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  /** Absolute game minutes since day 0 00:00. Day n starts at n * 1440. */
  minute: number;
  player: Player;
  activity: Activity | null;
  board: Opportunity[];
  overdraft: Overdraft | null;
  trades: Headline[];
  log: LogEntry[];
  stats: RunStats;
  status: 'playing' | 'movedHome';
  nextId: number;
  project: Project | null;
  credits: ProjectCredit[];
  beats: Beat[];
  catalog: CatalogRecord[];
  callback: Callback | null;
  pilots: PendingPilot[];
  contract: SeriesContract | null;
  /** A writers' room politics event waiting for your answer. */
  roomEvent: RoomEventState | null;
  /** Bank app: newest first, capped at LEDGER_MAX. */
  ledger: LedgerEntry[];
  /** Messages app: one thread per contact, most recent thread first. */
  inbox: InboxThread[];
}

export type Command =
  | { type: 'TRAVEL'; to: LocationId }
  | { type: 'START_JOB'; jobId: JobId; hours?: number }
  | { type: 'SLEEP'; hours: number }
  | { type: 'LEISURE'; leisureId: LeisureId }
  | { type: 'TAKE_CLASS'; skill: Skill }
  | { type: 'BUY_HEADSHOTS' }
  | { type: 'REPAIR_CAR' }
  | { type: 'PREP'; opportunityId: string; hours: number }
  | { type: 'SUBMIT'; opportunityId: string }
  | { type: 'SKIP_TO_DONE' }
  | { type: 'ADVANCE'; minutes: number }
  | { type: 'NEW_RUN'; archetype: ArchetypeId; seed: number }
  | { type: 'START_PROJECT'; scale: ProjectScaleId }
  | { type: 'ABANDON_PROJECT' }
  | { type: 'WRITE_SESSION' }
  | { type: 'PITCH'; investorId: string }
  | { type: 'SELF_FUND'; amount: number }
  | { type: 'HIRE_CREW'; candidateId: string }
  | { type: 'SHOOT_DAY' }
  | { type: 'EDIT_SESSION' }
  | { type: 'SUBMIT_FESTIVAL'; festivalId: string }
  | { type: 'ACCEPT_OFFER'; offerId: string }
  | { type: 'SELF_RELEASE' }
  | { type: 'RECORD_SESSION' }
  | { type: 'RELEASE_RECORD' }
  | { type: 'PROMO' }
  | { type: 'PITCH_LABEL'; labelId: string }
  | { type: 'PLAY_SHOW'; venueId: string }
  | { type: 'MAKE_BEAT' }
  | { type: 'PLACE_SONG'; recordId: string }
  | { type: 'CALLBACK_PICK'; read: number }
  | { type: 'SHOOT_EPISODE' }
  | { type: 'DECK_SESSION' }
  | { type: 'PITCH_AGENT'; agencyId: string }
  | { type: 'ROOM_DAY' }
  | { type: 'ROOM_CHOICE'; option: number }
  | { type: 'JOIN_GUILD'; guild: Skill }
  | { type: 'READ_THREAD'; contact: ContactId };

export type GameEvent =
  | { type: 'ACTION_STARTED'; activity: Activity }
  | { type: 'ACTION_REJECTED'; reason: string }
  | { type: 'ARRIVED'; location: LocationId }
  | { type: 'JOB_PAID'; jobId: JobId; amount: number }
  | { type: 'NETWORK_GAINED'; amount: number }
  | { type: 'WOKE_UP' }
  | { type: 'LEISURE_DONE'; leisureId: LeisureId }
  | { type: 'SKILL_GAINED'; skill: Skill; amount: number }
  | { type: 'HEADSHOTS_TAKEN' }
  | { type: 'CAR_REPAIRED' }
  | { type: 'PREP_DONE'; opportunityId: string; hours: number }
  | { type: 'BOOKED'; opportunity: Opportunity; pay: number; rp: number; odds: number }
  | { type: 'REJECTED'; opportunity: Opportunity; odds: number }
  | { type: 'EXPOSED'; opportunity: Opportunity; rpLost: number; odds: number }
  | { type: 'BILLS_CHARGED'; amount: number }
  | { type: 'BOARD_REFRESHED'; count: number }
  | { type: 'TIER_CHANGED'; from: number; to: number }
  | { type: 'GUILD_VOUCHER'; guild: Skill; total: number }
  | { type: 'CREATIVE_BURNOUT_STARTED' }
  | { type: 'CREATIVE_BURNOUT_CLEARED' }
  | { type: 'OVERDRAFT_STARTED'; deadlineMinute: number }
  | { type: 'OVERDRAFT_CLEARED' }
  | { type: 'MOVED_BACK_HOME' }
  | { type: 'HEADLINE'; headline: Headline }
  | { type: 'PROJECT_STARTED'; project: Project }
  | { type: 'PROJECT_STAGE'; stage: ProjectStage }
  | { type: 'PROJECT_ABANDONED'; title: string }
  | { type: 'SESSION_SCORED'; stage: ProjectStage; score: number }
  | { type: 'PITCHED'; investorId: string; yes: boolean; amount: number; odds: number }
  | { type: 'SELF_FUNDED'; amount: number }
  | { type: 'CREW_HIRED'; candidate: CrewCandidate }
  | { type: 'FESTIVAL_SUBMITTED'; festivalId: string; fee: number; odds: number; resultMinute: number }
  | { type: 'FESTIVAL_RESULT'; festivalId: string; accepted: boolean; odds: number; rp: number; award: string | null; offer: DistributionOffer | null }
  | { type: 'FILM_RELEASED'; title: string; quality: number; amount: number; distributor: string | null; rp: number }
  | { type: 'RECORD_RELEASED'; title: string; quality: number }
  | { type: 'PROMO_DONE'; stunt: string }
  | { type: 'RELEASE_DAY'; day: number; streams: number; fans: number; royalties: number; position: number | null }
  | { type: 'RELEASE_WEEK_ENDED'; title: string; peak: number | null; rp: number; totalStreams: number }
  | { type: 'LABEL_PITCHED'; labelId: string; label: string; yes: boolean; advance: number; odds: number }
  | { type: 'SHOW_PLAYED'; venueId: string; venue: string; tickets: number; soldOut: boolean; pay: number; fans: number; rp: number }
  | { type: 'BEAT_MADE'; beat: Beat }
  | { type: 'BEAT_LEASED'; beatId: string; title: string; fee: number }
  | { type: 'PLACEMENT'; recordId: string; title: string; client: string; fee: number; rp: number }
  | { type: 'SOUNDTRACK_SET'; title: string; bonus: number }
  | { type: 'PILOT_SEASON_OPENED' }
  | { type: 'CALLBACK_STARTED'; showTitle: string; network: string; role: string }
  | { type: 'CALLBACK_READ'; beat: number; read: number; right: boolean }
  | { type: 'CALLBACK_DONE'; showTitle: string; right: number; odds: number; booked: boolean; pay: number }
  | { type: 'PILOT_DECIDED'; showTitle: string; network: string; pickedUp: boolean; odds: number; tookIt: boolean }
  | { type: 'EPISODE_SHOT'; showTitle: string; episode: number; rp: number }
  | { type: 'EPISODE_WEEK'; showTitle: string; episode: number; pay: number; missed: boolean; rpLost: number }
  | { type: 'SERIES_WRAPPED'; showTitle: string; episodes: number; missed: number }
  | { type: 'AGENT_PITCHED'; agencyId: string; agency: string; yes: boolean; odds: number }
  | { type: 'STAFFING_ROLLED'; attempt: number; odds: number; staffed: boolean; show: string | null; network: string | null; final: boolean }
  | { type: 'ROOM_DAY_DONE'; showTitle: string; score: number; rp: number }
  | { type: 'ROOM_EVENT'; prompt: string }
  | { type: 'ROOM_CHOICE_MADE'; text: string; favor: number; quality: number; favorNow: number }
  | { type: 'ROOM_WRAPPED'; showTitle: string; weeks: number; favor: number; outcome: 'promoted' | 'notAskedBack' | 'normal'; rp: number }
  | { type: 'GUILD_JOINED'; guild: Skill; fee: number }
  | { type: 'GUILD_DUES'; guilds: Skill[]; total: number }
  | { type: 'HEALTH_PLAN'; guild: Skill; active: boolean }
  | { type: 'MOM_CHECK_IN' };
