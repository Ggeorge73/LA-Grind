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
