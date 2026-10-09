// Sprint 10 TV (writer side): spec pilot → pitch deck → agent → staffing → writers' room.
// Names, events and flavour live in writersFlavor.ts (Content Designer).
import type { LocationId } from '../types';

export interface SpecScale {
  id: 'spec';
  name: string;
  minTier: number;
  /** Spec-pilot drafts (develop stage). */
  writeSessions: number;
  /** Pitch-deck sessions (deck stage). */
  deckSessions: number;
}

export const SPEC_SCALE: SpecScale = { id: 'spec', name: 'Spec pilot', minTier: 1, writeSessions: 3, deckSessions: 2 };

export type AgencyId = 'boutique' | 'mailroom' | 'midsize' | 'prestige' | 'mega';

export interface Agency {
  id: AgencyId;
  /** Where you take the meeting. */
  location: LocationId;
  /** Added to the base agent-meeting difficulty. */
  difficultyMod: number;
  /** Added to staffing odds once they sign you. */
  heat: number;
}

// Scrappy and easy → huge and picky. Bigger agencies get you staffed more often.
export const AGENCIES: readonly Agency[] = [
  { id: 'boutique', location: 'silverlake', difficultyMod: -8, heat: 0.05 },
  { id: 'mailroom', location: 'noho', difficultyMod: -4, heat: 0.07 },
  { id: 'midsize', location: 'burbank', difficultyMod: 0, heat: 0.1 },
  { id: 'prestige', location: 'weho', difficultyMod: 6, heat: 0.15 },
  { id: 'mega', location: 'hollywood', difficultyMod: 12, heat: 0.2 },
];

/** Staff-writer jobs by show tier (= your Clout, 1–4). */
export const ROOM_TIERS: Record<1 | 2 | 3 | 4, { label: string; weeklyPay: number; weeks: number }> = {
  1: { label: 'Web series room', weeklyPay: 500, weeks: 6 },
  2: { label: 'Cable room', weeklyPay: 1000, weeks: 8 },
  3: { label: 'Streaming room', weeklyPay: 2000, weeks: 10 },
  4: { label: 'Network room', weeklyPay: 3500, weeks: 10 },
};
