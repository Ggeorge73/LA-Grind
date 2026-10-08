import type { LocationId } from '../types';

export type FilmScaleId = 'short' | 'micro' | 'indie';

export interface FilmScale {
  id: FilmScaleId;
  name: string;
  minTier: number;
  budget: number;
  scriptSessions: number;
  crewSlots: number;
  shootDays: number;
  editSessions: number;
  bestFestivalTier: number;
  /** Base difficulty for financing pitches. */
  pitchDifficulty: number;
}

export const FILM_SCALES: Record<FilmScaleId, FilmScale> = {
  short: { id: 'short', name: 'Short film', minTier: 1, budget: 2000, scriptSessions: 2, crewSlots: 2, shootDays: 2, editSessions: 1, bestFestivalTier: 2, pitchDifficulty: 45 },
  micro: { id: 'micro', name: 'Micro-budget feature', minTier: 2, budget: 20000, scriptSessions: 4, crewSlots: 4, shootDays: 5, editSessions: 3, bestFestivalTier: 3, pitchDifficulty: 60 },
  indie: { id: 'indie', name: 'Indie feature', minTier: 4, budget: 80000, scriptSessions: 6, crewSlots: 6, shootDays: 10, editSessions: 5, bestFestivalTier: 5, pitchDifficulty: 80 },
};

export const FILM_SCALE_IDS: readonly FilmScaleId[] = ['short', 'micro', 'indie'];

export type CrewRole = 'dp' | 'sound' | 'editor' | 'gaffer' | 'ad' | 'designer' | 'composer';

export const CREW_ROLES: Record<CrewRole, string> = {
  dp: 'Director of Photography',
  sound: 'Sound Mixer',
  editor: 'Editor',
  gaffer: 'Gaffer',
  ad: 'First AD',
  designer: 'Production Designer',
  composer: 'Composer',
};

export const CREW_ROLE_IDS: readonly CrewRole[] = ['dp', 'sound', 'editor', 'gaffer', 'ad', 'designer', 'composer'];

/** Where films get shot (picked when the project starts). */
export const FILM_LOCATIONS: readonly LocationId[] = ['noho', 'burbank', 'hollywood', 'silverlake', 'santamonica', 'weho'];

/** The film pipeline: stage order and which reusable stage kind each one is. */
export const FILM_PIPELINE = [
  { id: 'develop', kind: 'work', label: 'Develop the script' },
  { id: 'finance', kind: 'raise', label: 'Financing runs' },
  { id: 'crew', kind: 'hire', label: 'Crew assembly' },
  { id: 'shoot', kind: 'work', label: 'Shoot' },
  { id: 'post', kind: 'work', label: 'Post-production' },
  { id: 'festival', kind: 'circuit', label: 'Festival circuit' },
] as const;

export type FestivalId = 'noho-shorts' | 'silverlake-underground' | 'slamdunce' | 'sunburnt' | 'canned';

export interface Festival {
  id: FestivalId;
  name: string;
  tier: number;
  fee: number;
  /** Days until the result lands (at 06:00). */
  waitDays: number;
  /** Distribution offer multiplier on budget × (0.3 + Quality/100). */
  offerMultiplier: number;
  /** RP for an acceptance. */
  rp: number;
}

export const FESTIVALS: readonly Festival[] = [
  { id: 'noho-shorts', name: 'NoHo Shorts Night', tier: 1, fee: 25, waitDays: 3, offerMultiplier: 0.2, rp: 40 },
  { id: 'silverlake-underground', name: 'Silver Lake Underground', tier: 2, fee: 50, waitDays: 5, offerMultiplier: 0.4, rp: 80 },
  { id: 'slamdunce', name: 'SlamDunce', tier: 3, fee: 100, waitDays: 7, offerMultiplier: 0.8, rp: 150 },
  { id: 'sunburnt', name: 'Sunburnt', tier: 4, fee: 150, waitDays: 10, offerMultiplier: 1.2, rp: 250 },
  { id: 'canned', name: 'Canned', tier: 5, fee: 200, waitDays: 14, offerMultiplier: 1.8, rp: 400 },
];
