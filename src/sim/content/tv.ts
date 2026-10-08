// Sprint 9 TV (actor side): pilot season, callbacks and series-regular contracts.
// Names and flavour live in tvFlavor.ts (Content Designer).
import type { LocationId } from '../types';

export type PilotTier = 1 | 2 | 3 | 4;

export interface PilotTierInfo {
  tier: PilotTier;
  label: string;
  /** Episodes in a picked-up season (one per game week). */
  episodes: number;
  /** Series-regular pay per episode week. */
  weeklyPay: number;
}

export const PILOT_TIERS: Record<PilotTier, PilotTierInfo> = {
  1: { tier: 1, label: 'Web series pilot', episodes: 4, weeklyPay: 300 },
  2: { tier: 2, label: 'Cable pilot', episodes: 6, weeklyPay: 800 },
  3: { tier: 3, label: 'Streaming pilot', episodes: 8, weeklyPay: 1600 },
  4: { tier: 4, label: 'Network pilot', episodes: 10, weeklyPay: 3000 },
};

/** Where pilot casting sessions happen. */
export const PILOT_CASTING_LOCATIONS: readonly LocationId[] = ['burbank', 'hollywood'];
/** Where series regulars report to set. */
export const STUDIO_LOT: LocationId = 'burbank';
