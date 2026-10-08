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
  guildVouchers: number;
  carHealth: number;
  hasHeadshots: boolean;
  creativeBurnout: boolean;
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
  | 'submit';

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
  investorId?: string;
  candidateId?: string;
}

// ---------- Projects (PI-2 career engine) ----------

export type ProjectStage = 'develop' | 'finance' | 'crew' | 'shoot' | 'post' | 'festival';
export type ProjectAction = 'write' | 'pitch' | 'hire' | 'shoot' | 'edit';

export interface CrewCandidate {
  id: string;
  name: string;
  role: 'dp' | 'sound' | 'editor' | 'gaffer' | 'ad' | 'designer' | 'composer';
  skill: number;
  fee: number;
  quirk: string;
  hired: boolean;
}

export interface Project {
  id: string;
  medium: Medium;
  scale: 'short' | 'micro' | 'indie';
  title: string;
  location: LocationId;
  stage: ProjectStage;
  startedMinute: number;
  /** Session scores per work stage (0–100 each). */
  scores: { develop: number[]; shoot: number[]; post: number[] };
  budget: number;
  raised: number;
  selfFunded: number;
  spent: number;
  pitches: { investorId: string; day: number; yes: boolean; amount: number }[];
  crewPool: CrewCandidate[];
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
  | { type: 'START_PROJECT'; scale: Project['scale'] }
  | { type: 'ABANDON_PROJECT' }
  | { type: 'WRITE_SESSION' }
  | { type: 'PITCH'; investorId: string }
  | { type: 'SELF_FUND'; amount: number }
  | { type: 'HIRE_CREW'; candidateId: string };

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
  | { type: 'GUILD_VOUCHER'; total: number }
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
  | { type: 'CREW_HIRED'; candidate: CrewCandidate };
