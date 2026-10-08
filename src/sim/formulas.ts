import * as C from './constants';
import { route } from './content/travel';
import type { LocationId, Medium } from './types';

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export const clampStat = (value: number): number => clamp(value, C.STAT_MIN, C.STAT_MAX);

// ---------- Clock helpers ----------

export const dayOf = (minute: number): number => Math.floor(minute / C.MINUTES_PER_DAY);
export const minuteOfDay = (minute: number): number => ((minute % C.MINUTES_PER_DAY) + C.MINUTES_PER_DAY) % C.MINUTES_PER_DAY;
export const hourOf = (minute: number): number => Math.floor(minuteOfDay(minute) / C.MINUTES_PER_HOUR);
export const atHour = (day: number, hour: number): number => day * C.MINUTES_PER_DAY + hour * C.MINUTES_PER_HOUR;

export function formatClock(minute: number): string {
  const m = minuteOfDay(minute);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ---------- Clout ----------

/** RP needed to reach tier n: 100 × (n − 1)². */
export const tierThreshold = (tier: number): number => C.TIER_RP_FACTOR * (tier - 1) ** 2;

export function cloutTier(rp: number): number {
  let tier = 1;
  while (tier < C.MAX_TIER && rp >= tierThreshold(tier + 1)) tier++;
  return tier;
}

/** Progress (0–1) from the current tier threshold to the next. 1 at max tier. */
export function tierProgress(rp: number): number {
  const tier = cloutTier(rp);
  if (tier >= C.MAX_TIER) return 1;
  const lo = tierThreshold(tier);
  const hi = tierThreshold(tier + 1);
  return clamp((rp - lo) / (hi - lo), 0, 1);
}

// ---------- Opportunity odds and payouts ----------

export interface OddsInput {
  skill: number;
  spark: number;
  clout: number;
  tier: number;
  prepHours: number;
  creativeBurnout: boolean;
}

export const oddsScore = (i: OddsInput): number =>
  i.skill + C.ODDS_SPARK_WEIGHT * i.spark + C.ODDS_TIER_GAP_WEIGHT * (i.clout - i.tier) + C.ODDS_PREP_WEIGHT * i.prepHours;

export const oddsDifficulty = (tier: number): number => C.ODDS_DIFFICULTY_BASE + C.ODDS_DIFFICULTY_PER_TIER * tier;

/** Chance of booking, 0–1. Logistic curve clamped to [2%, 90%], halved under Creative Burnout. */
export function successOdds(i: OddsInput): number {
  const x = (oddsScore(i) - oddsDifficulty(i.tier)) / C.ODDS_SPREAD;
  const p = clamp(1 / (1 + Math.exp(-x)), C.ODDS_FLOOR, C.ODDS_CEILING);
  return i.creativeBurnout ? p * C.CREATIVE_BURNOUT_ODDS_MULTIPLIER : p;
}

export const MEDIUM_MODIFIERS: Record<Medium, { pay: number; rp: number; network: number }> = {
  tv: { pay: 1.2, rp: 0.8, network: 0 },
  film: { pay: 0.7, rp: 1.3, network: 0 },
  music: { pay: 0.5, rp: 1.0, network: 3 },
};

export function bookingPayout(medium: Medium, tier: number, unionRate = false): { pay: number; rp: number; network: number } {
  const mod = MEDIUM_MODIFIERS[medium];
  const basePay = C.OPP_BASE_PAY * tier * tier;
  const pay = Math.round(basePay * mod.pay * (unionRate ? C.UNION_RATE_MULTIPLIER : 1));
  const rp = Math.round(C.OPP_BASE_RP * tier * mod.rp);
  return { pay, rp, network: mod.network };
}

/** A failure is an exposure when the tested skill is below 8 × tier. */
export const isExposure = (skill: number, tier: number): boolean => skill < C.EXPOSED_SKILL_PER_TIER * tier;

export const exposureRpLoss = (tier: number, multiplier: number): number => C.EXPOSED_RP_PER_TIER * tier * multiplier;

/** How many opportunities the daily board shows. */
export function boardSize(network: number, roll: number): number {
  const base = C.OPP_BOARD_MIN + Math.floor(roll * (C.OPP_BOARD_MAX - C.OPP_BOARD_MIN + 1));
  return Math.min(base, C.OPP_BOARD_MAX) + Math.floor(network / C.OPP_EXTRA_PER_NETWORK);
}

// ---------- Travel ----------

export function trafficMultiplier(departureHour: number, crosses405: boolean): number {
  const inRush = C.RUSH_HOURS.some(([a, b]) => departureHour >= a && departureHour < b);
  if (inRush) return crosses405 ? C.RUSH_405_MULTIPLIER : C.RUSH_MULTIPLIER;
  if (departureHour >= C.MIDDAY_HOURS[0] && departureHour < C.MIDDAY_HOURS[1]) return C.MIDDAY_MULTIPLIER;
  return C.OFFPEAK_MULTIPLIER;
}

export interface CommuteQuote {
  minutes: number;
  energy: number;
  gas: number;
  carWear: number;
  multiplier: number;
  byBus: boolean;
  crosses405: boolean;
}

export function commute(from: LocationId, to: LocationId, departureHour: number, carHealth: number): CommuteQuote {
  const r = route(from, to);
  if (r.minutes === 0) return { minutes: 0, energy: 0, gas: 0, carWear: 0, multiplier: 1, byBus: false, crosses405: false };
  const byBus = carHealth <= 0;
  const carFactor = byBus ? C.BUS_MULTIPLIER : carHealth < C.CAR_POOR_THRESHOLD ? C.CAR_POOR_MULTIPLIER : 1;
  const traffic = trafficMultiplier(departureHour, r.crosses405);
  const minutes = Math.round(r.minutes * traffic * carFactor);
  return {
    minutes,
    energy: Math.ceil(minutes / C.TRAVEL_MINUTES_PER_ENERGY),
    gas: byBus ? 0 : Math.ceil(r.minutes / C.GAS_BLOCK_BASE_MINUTES) * C.GAS_PER_BLOCK,
    carWear: byBus ? 0 : C.CAR_HEALTH_PER_TRIP,
    multiplier: traffic * carFactor,
    byBus,
    crosses405: r.crosses405,
  };
}

// ---------- Energy and burnout ----------

/** Burnout added for one game minute of activity at the given Energy. */
export function burnoutGainPerMinute(energy: number): number {
  if (energy >= C.BURNOUT_ENERGY_THRESHOLD) return 0;
  return ((C.BURNOUT_ENERGY_THRESHOLD - energy) * C.BURNOUT_GAIN_FACTOR) / C.MINUTES_PER_HOUR;
}

/** Hysteresis: on at ≥ 60, off only below 30. */
export function nextCreativeBurnout(current: boolean, burnout: number): boolean {
  if (!current && burnout >= C.CREATIVE_BURNOUT_ON) return true;
  if (current && burnout < C.CREATIVE_BURNOUT_OFF) return false;
  return current;
}

export const dailyBills = (rentPerDay: number): number => rentPerDay + C.FOOD_PER_DAY + C.CAR_COSTS_PER_DAY;

// ---------- Projects ----------

export const average = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Score for one script-writing session (0–100). `roll` is 0–1 luck. */
export const writeScore = (writing: number, spark: number, roll: number): number =>
  clamp(C.WRITE_SCORE_BASE + C.WRITE_SCORE_SKILL * writing + C.WRITE_SCORE_SPARK * spark + roll * C.WORK_SCORE_LUCK, 0, 100);

export interface PitchInput {
  script: number;
  clout: number;
  network: number;
  difficulty: number;
}

/** Chance an investor says yes, clamped to 5–85%. */
export function pitchOdds(i: PitchInput): number {
  const score = C.PITCH_SCRIPT_WEIGHT * i.script + C.PITCH_CLOUT_WEIGHT * i.clout + C.PITCH_NETWORK_WEIGHT * i.network;
  const p = 1 / (1 + Math.exp(-(score - i.difficulty) / C.PITCH_SPREAD));
  return clamp(p, C.PITCH_FLOOR, C.PITCH_CEILING);
}

export const crewFee = (budget: number, skill: number): number => Math.round(budget * (C.CREW_FEE_BASE + C.CREW_FEE_PER_SKILL * skill));

export const crewPoolSize = (network: number, slots: number): number =>
  Math.min(C.CREW_POOL_MAX, Math.max(slots + 1, C.CREW_POOL_BASE + Math.floor(network / C.CREW_POOL_PER_NETWORK)));

export interface ShootInput {
  directing: number;
  acting: number;
  /** Crew quality 0–100. */
  crew: number;
}

export const shootScore = (i: ShootInput, roll: number): number =>
  clamp(
    C.SHOOT_SCORE_BASE +
      C.SHOOT_SCORE_DIRECTING * i.directing +
      C.SHOOT_SCORE_CREW * i.crew +
      C.SHOOT_SCORE_ACTING * i.acting +
      roll * C.SHOOT_SCORE_LUCK,
    0,
    100,
  );

/** `editorSkill` is the hired Editor's skill (1–5), or 0 without one. */
export const editScore = (directing: number, editorSkill: number, roll: number): number =>
  clamp(C.EDIT_SCORE_BASE + C.EDIT_SCORE_DIRECTING * directing + C.EDIT_SCORE_EDITOR * editorSkill + roll * C.EDIT_SCORE_LUCK, 0, 100);

/** Festival acceptance: logistic((Q + 5·Clout − 20 − 15·tier) / 12), clamped. */
export function festivalOdds(quality: number, clout: number, tier: number): number {
  const score = quality + C.FESTIVAL_CLOUT_WEIGHT * clout - C.FESTIVAL_QUALITY_OFFSET - C.FESTIVAL_TIER_WEIGHT * tier;
  return clamp(1 / (1 + Math.exp(-score / C.FESTIVAL_SPREAD)), C.FESTIVAL_FLOOR, C.FESTIVAL_CEILING);
}

export const awardChance = (quality: number, tier: number): number =>
  clamp((quality - C.AWARD_BASE - C.AWARD_PER_TIER * tier) / C.AWARD_RANGE, 0, C.AWARD_MAX);

export const offerChance = (quality: number): number => clamp(C.OFFER_CHANCE_BASE + quality / C.OFFER_CHANCE_DIVISOR, 0, 1);

export const offerAmount = (budget: number, quality: number, multiplier: number): number =>
  Math.round(budget * (C.OFFER_QUALITY_BASE + quality / 100) * multiplier);

export const recordScore = (music: number, crew: number, spark: number, roll: number): number =>
  clamp(
    C.RECORD_SCORE_BASE + C.RECORD_SCORE_MUSIC * music + C.RECORD_SCORE_CREW * crew + C.RECORD_SCORE_SPARK * spark + roll * C.RECORD_SCORE_LUCK,
    0,
    100,
  );

/** Streams on release-week day `day` (0-based). */
export function releaseStreams(i: { fans: number; quality: number; multiplier: number; day: number; promoted: boolean }): number {
  const base = C.STREAM_BASE + C.STREAMS_PER_FAN * i.fans;
  const q = (i.quality / C.STREAM_QUALITY_PIVOT) ** 2;
  return Math.round(base * q * i.multiplier * C.STREAM_DECAY ** i.day * (i.promoted ? 1 + C.PROMO_BOOST : 1));
}

/** Chart position for a day's streams, or null if it didn't make the chart. */
export function chartPosition(streams: number): number | null {
  if (streams <= 0) return null;
  const pos = Math.round(101 - C.CHART_SLOPE * Math.log10(streams / C.CHART_BASE_STREAMS));
  return pos > C.CHART_SIZE ? null : Math.max(1, pos);
}

export const fansGained = (streams: number, quality: number): number => Math.round(streams * C.FAN_CONVERSION * (quality / 100));

export const royalties = (streams: number): number => Math.round(streams * C.ROYALTY_PER_STREAM);

export const chartRp = (peak: number | null): number => (peak === null ? 0 : C.CHART_RP_PER_PLACE * (101 - peak));

export function labelOdds(i: { songs: number; clout: number; fans: number; difficulty: number }): number {
  const fanPoints = Math.min(C.LABEL_FANS_MAX_POINTS, i.fans / C.LABEL_FANS_PER_POINT);
  const score = C.LABEL_SONGS_WEIGHT * i.songs + C.LABEL_CLOUT_WEIGHT * i.clout + fanPoints;
  return clamp(1 / (1 + Math.exp(-(score - i.difficulty) / C.PITCH_SPREAD)), C.PITCH_FLOOR, C.PITCH_CEILING);
}

/** Tickets sold: a share of Fans (with ±20% luck), capped by the room. */
export const showTickets = (fans: number, capacity: number, roll: number): number =>
  Math.min(capacity, Math.round(fans * C.SHOW_DRAW * (0.8 + 0.4 * roll)));

export const showPay = (tickets: number, price: number): number => Math.round(tickets * price * C.SHOW_DOOR_SPLIT);

export const beatQuality = (music: number, roll: number): number =>
  Math.round(clamp(C.BEAT_QUALITY_BASE + C.BEAT_QUALITY_MUSIC * music + roll * C.BEAT_QUALITY_LUCK, 0, 100));

export const beatLeaseChance = (quality: number, fans: number, leases: number): number =>
  Math.min(C.BEAT_LEASE_CHANCE_MAX, quality / C.BEAT_LEASE_QUALITY_DIVISOR + fans / C.BEAT_LEASE_FANS_DIVISOR) * C.BEAT_LEASE_DECAY ** leases;

export const beatFee = (quality: number): number => Math.round(C.BEAT_FEE_BASE + C.BEAT_FEE_PER_QUALITY * quality);

export const placementChance = (quality: number, charted: boolean): number =>
  C.PLACEMENT_CHANCE * (quality / 50) * (charted ? C.PLACEMENT_CHARTED_BONUS : 1);

export const placementFee = (quality: number, streamMultiplier: number): number =>
  Math.round(C.PLACEMENT_FEE_BASE * streamMultiplier * (quality / 50));

export const soundtrackBonus = (recordQuality: number): number =>
  Math.min(C.SOUNDTRACK_BONUS_MAX, Math.round(recordQuality / C.SOUNDTRACK_QUALITY_DIVISOR));

/** 1-based day within the pilot-season cycle. */
export const cycleDay = (day: number): number => ((day - 1) % C.PILOT_SEASON_CYCLE_DAYS) + 1;
export const isPilotSeason = (day: number): boolean => cycleDay(day) >= C.PILOT_SEASON_FIRST && cycleDay(day) <= C.PILOT_SEASON_LAST;

export const callbackSenseChance = (acting: number): number => clamp(acting / 100, C.CALLBACK_SENSE_MIN, C.CALLBACK_SENSE_MAX);

/** Booking odds after a callback: base ± per read, clamped like normal odds. */
export const callbackOdds = (base: number, right: number, beats = C.CALLBACK_BEATS): number =>
  clamp(base + C.CALLBACK_RIGHT_BONUS * right - C.CALLBACK_WRONG_PENALTY * (beats - right), C.ODDS_FLOOR, C.ODDS_CEILING);

export const pickupOdds = (right: number, clout: number, tier: number): number =>
  clamp(C.PICKUP_BASE + C.PICKUP_PER_RIGHT * right + C.PICKUP_PER_CLOUT * clout - C.PICKUP_PER_TIER * (tier - 1), C.PICKUP_MIN, C.PICKUP_MAX);
