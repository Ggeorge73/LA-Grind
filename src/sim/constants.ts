// Every balance number in the game lives here or in content/. Nothing inline in rules or UI.

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** Real milliseconds per game minute at 1x (1 game hour = 60 real seconds). */
export const REAL_MS_PER_GAME_MINUTE = 1000;
export const SPEEDS = [0, 1, 4] as const;
/** Clamp catch-up so one frame never simulates more than this much real time. */
export const MAX_CATCHUP_REAL_MS = 5000;

export const START_DAY = 1;
export const START_HOUR = 8;
export const BILLS_HOUR = 6;
export const BOARD_REFRESH_HOUR = 6;

export const FOOD_PER_DAY = 20;
export const CAR_COSTS_PER_DAY = 10;

export const STAT_MIN = 0;
export const STAT_MAX = 100;

// Energy and burnout
export const ENERGY_AWAKE_DRAIN_PER_HOUR = 1.5;
export const ENERGY_SLEEP_GAIN_PER_HOUR = 12;
export const BURNOUT_ENERGY_THRESHOLD = 20;
export const BURNOUT_GAIN_FACTOR = 0.5;
export const BURNOUT_RECOVERY_PER_HOUR = 2;
export const CREATIVE_BURNOUT_ON = 60;
export const CREATIVE_BURNOUT_OFF = 30;
export const CREATIVE_BURNOUT_ODDS_MULTIPLIER = 0.5;
/** Minimum Energy needed to start a tiring action (sleep and leisure are always allowed). */
export const MIN_ENERGY_TO_START = 5;

// Clout tiers
export const MAX_TIER = 10;
export const TIER_RP_FACTOR = 100;

// Opportunities
export const OPP_BASE_PAY = 150;
export const OPP_BASE_RP = 40;
export const OPP_BOARD_MIN = 4;
export const OPP_BOARD_MAX = 6;
export const OPP_EXTRA_PER_NETWORK = 25;
export const SCREEN_WINDOW = { start: 9, end: 17 } as const;
export const MUSIC_WINDOW = { start: 19, end: 23 } as const;

export const ODDS_SPARK_WEIGHT = 0.3;
export const ODDS_TIER_GAP_WEIGHT = 10;
export const ODDS_PREP_WEIGHT = 5;
export const ODDS_DIFFICULTY_BASE = 40;
export const ODDS_DIFFICULTY_PER_TIER = 12;
export const ODDS_SPREAD = 12;
export const ODDS_FLOOR = 0.02;
export const ODDS_CEILING = 0.9;

export const PREP_MAX_HOURS = 4;
export const PREP_SPARK_PER_HOUR = 10;
export const PREP_ENERGY_PER_HOUR = 8;

export const SUBMIT_HOURS = 1;
export const SUBMIT_ENERGY = 10;
export const SUBMIT_FEE = 40;

export const BOOKED_SKILL_GAIN = 2;
export const GUILD_VOUCHER_MIN_TIER = 2;
export const GUILD_VOUCHERS_NEEDED = 3;
export const UNION_RATE_MULTIPLIER = 2;

export const EXPOSED_SKILL_PER_TIER = 8;
export const EXPOSED_RP_PER_TIER = 30;

// Travel
export const RUSH_MULTIPLIER = 2.0;
export const RUSH_405_MULTIPLIER = 3.0;
export const MIDDAY_MULTIPLIER = 1.3;
export const OFFPEAK_MULTIPLIER = 1.0;
export const RUSH_HOURS: ReadonlyArray<readonly [number, number]> = [
  [7, 10],
  [16, 19],
];
export const MIDDAY_HOURS = [10, 16] as const;
export const TRAVEL_MINUTES_PER_ENERGY = 10;
export const GAS_PER_BLOCK = 2;
export const GAS_BLOCK_BASE_MINUTES = 15;
export const CAR_HEALTH_PER_TRIP = 1;
export const CAR_POOR_THRESHOLD = 20;
export const CAR_POOR_MULTIPLIER = 1.5;
export const BUS_MULTIPLIER = 2.5;

// Other actions
export const LEISURE_HOURS = 2;
export const LEISURE_SPARK = 25;
export const LEISURE_BURNOUT_RELIEF = 4;
export const CLASS_HOURS = 3;
export const CLASS_COST = 60;
export const CLASS_ENERGY = 15;
export const CLASS_SKILL_GAIN = 3;
export const HEADSHOTS_COST = 400;
export const HEADSHOTS_HOURS = 2;
export const HEADSHOTS_MIN_TIER = 2;
export const CAR_REPAIR_COST = 300;
export const CAR_REPAIR_HOURS = 2;
export const CAR_REPAIR_GAIN = 40;
export const SLEEP_MIN_HOURS = 1;
export const SLEEP_MAX_HOURS = 10;

// Overdraft and new runs
export const OVERDRAFT_DAYS = 3;
export const NEW_RUN_NETWORK_KEEP = 0.25;

// Feeds
export const TRADES_MAX = 60;
export const LOG_MAX = 120;
export const NPC_HEADLINES_PER_DAY = 3;

export const SAVE_VERSION = 5;

// Projects (PI-2 career engine) — film numbers; scales live in content/film.ts
export const WRITE_SESSION_HOURS = 3;
export const WRITE_SESSION_ENERGY = 15;
export const WRITE_SESSION_SPARK = 15;
export const WRITE_SCORE_BASE = 20;
export const WRITE_SCORE_SKILL = 0.6;
export const WRITE_SCORE_SPARK = 0.2;
export const WORK_SCORE_LUCK = 10;
export const PROJECT_SKILL_GAIN = 1;

export const PITCH_HOURS = 2;
export const PITCH_ENERGY = 10;
export const PITCH_SCRIPT_WEIGHT = 0.5;
export const PITCH_CLOUT_WEIGHT = 10;
export const PITCH_NETWORK_WEIGHT = 0.3;
export const PITCH_SPREAD = 12;
export const PITCH_FLOOR = 0.05;
export const PITCH_CEILING = 0.85;

export const HIRE_HOURS = 1;
export const HIRE_ENERGY = 5;
export const CREW_POOL_BASE = 3;
export const CREW_POOL_PER_NETWORK = 20;
export const CREW_POOL_MAX = 10;
export const CREW_FEE_BASE = 0.04;
export const CREW_FEE_PER_SKILL = 0.03;
export const CREW_QUALITY_PER_SKILL = 20;
export const PRODUCTION_VALUE_MAX = 10;

// Film quality weights
export const FILM_WEIGHT_SCRIPT = 0.35;
export const FILM_WEIGHT_SHOOT = 0.4;
export const FILM_WEIGHT_POST = 0.15;
export const FILM_WEIGHT_CREW = 0.1;

// Shoot (Sprint 6)
export const SHOOT_HOURS = 10;
export const SHOOT_ENERGY = 45;
/** Call time: a shoot day must start between these hours. */
export const SHOOT_CALL_WINDOW = [5, 10] as const;
export const SHOOT_SCORE_BASE = 15;
export const SHOOT_SCORE_DIRECTING = 0.5;
export const SHOOT_SCORE_CREW = 0.25;
export const SHOOT_SCORE_ACTING = 0.1;
export const SHOOT_SCORE_LUCK = 15;

// Post
export const EDIT_HOURS = 4;
export const EDIT_ENERGY = 20;
export const EDIT_SCORE_BASE = 20;
export const EDIT_SCORE_DIRECTING = 0.5;
/** Per skill point of the hired Editor (0 if none). */
export const EDIT_SCORE_EDITOR = 4;
export const EDIT_SCORE_LUCK = 10;

// Festival circuit
export const FESTIVAL_QUALITY_OFFSET = 20;
export const FESTIVAL_CLOUT_WEIGHT = 5;
export const FESTIVAL_TIER_WEIGHT = 15;
export const FESTIVAL_SPREAD = 12;
export const FESTIVAL_FLOOR = 0.03;
export const FESTIVAL_CEILING = 0.95;
/** Award chance = (Quality − base − perTier·tier) / range, clamped 0..max. */
export const AWARD_BASE = 50;
export const AWARD_PER_TIER = 5;
export const AWARD_RANGE = 50;
export const AWARD_MAX = 0.6;
/** Award RP is this multiple of the festival's RP. */
export const AWARD_RP_MULTIPLIER = 1;
/** Offer chance on acceptance = base + Quality/divisor. */
export const OFFER_CHANCE_BASE = 0.5;
export const OFFER_CHANCE_DIVISOR = 200;
export const OFFER_QUALITY_BASE = 0.3;
/** Network gained when an offer is accepted (the film is out there). */
export const RELEASE_NETWORK = 5;
/** Self-release: RP = quality × this. */
export const SELF_RELEASE_RP_PER_QUALITY = 0.5;

// Music (Sprint 7) — scales live in content/music.ts
export const RECORD_HOURS = 4;
export const RECORD_ENERGY = 20;
export const RECORD_SCORE_BASE = 15;
export const RECORD_SCORE_MUSIC = 0.5;
export const RECORD_SCORE_CREW = 0.25;
export const RECORD_SCORE_SPARK = 0.1;
export const RECORD_SCORE_LUCK = 15;

export const MUSIC_WEIGHT_SONGS = 0.4;
export const MUSIC_WEIGHT_RECORD = 0.45;
export const MUSIC_WEIGHT_CREW = 0.15;

export const PROMO_HOURS = 2;
export const PROMO_ENERGY = 10;
export const PROMO_SPARK = 10;
/** A promo multiplies the next day's streams by (1 + this). */
export const PROMO_BOOST = 0.5;

export const RELEASE_DAYS = 7;
export const STREAM_BASE = 1000;
export const STREAMS_PER_FAN = 4;
/** Streams scale with (Quality / this)². */
export const STREAM_QUALITY_PIVOT = 50;
export const STREAM_DECAY = 0.75;
export const ROYALTY_PER_STREAM = 0.004;
export const FAN_CONVERSION = 0.02;
/** Chart position = 101 − slope·log10(streams / base); above CHART_SIZE means it didn't chart. */
export const CHART_BASE_STREAMS = 500;
export const CHART_SLOPE = 25;
export const CHART_SIZE = 100;
/** RP at the end of release week = this × (101 − peak). 2 → 3 (LAG-62): at 2 a newcomer's single (#85–90) paid less RP than one Tier-1 gig. */
export const CHART_RP_PER_PLACE = 3;

// Music business (Sprint 8) — labels and venues live in content/musicBiz.ts
export const LABEL_PITCH_HOURS = 2;
export const LABEL_PITCH_ENERGY = 10;
export const LABEL_SONGS_WEIGHT = 0.5;
export const LABEL_CLOUT_WEIGHT = 10;
export const LABEL_FANS_PER_POINT = 100;
export const LABEL_FANS_MAX_POINTS = 40;

export const SHOW_HOURS = 3;
export const SHOW_ENERGY = 30;
/** A show must start in this window (hours). */
export const SHOW_START_WINDOW = [19, 22] as const;
/** Share of Fans who buy a ticket (× 0.8–1.2 luck). */
export const SHOW_DRAW = 0.03;
/** Share of the door you keep. */
export const SHOW_DOOR_SPLIT = 0.6;
export const SHOW_FAN_GAIN = 0.15;
export const SHOW_TICKETS_PER_RP = 50;

export const BEAT_HOURS = 2;
export const BEAT_ENERGY = 10;
export const BEAT_SPARK = 10;
export const BEAT_MAX = 8;
export const BEAT_QUALITY_BASE = 10;
export const BEAT_QUALITY_MUSIC = 0.7;
export const BEAT_QUALITY_LUCK = 20;
export const BEAT_LEASE_QUALITY_DIVISOR = 400;
export const BEAT_LEASE_FANS_DIVISOR = 20000;
export const BEAT_LEASE_CHANCE_MAX = 0.4;
/** Each lease makes the next one less likely (the beat gets around). */
export const BEAT_LEASE_DECAY = 0.9;
export const BEAT_FEE_BASE = 20;
export const BEAT_FEE_PER_QUALITY = 1.5;

export const PLACEMENT_CHANCE = 0.02;
export const PLACEMENT_CHARTED_BONUS = 1.5;
export const PLACEMENT_FEE_BASE = 300;
export const PLACEMENT_RP = 10;
export const SOUNDTRACK_BONUS_MAX = 8;
export const SOUNDTRACK_QUALITY_DIVISOR = 10;
