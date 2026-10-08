// Sprint 8 music business numbers. Names and blurbs live in musicBizFlavor.ts (Content Designer).
import type { LocationId } from '../types';

export type LabelId = 'garage-press' | 'tape-hiss' | 'beachhouse' | 'algorithm' | 'burbank-sound' | 'sunset-major';

export interface LabelDeal {
  id: LabelId;
  /** Where you pitch them. */
  location: LocationId;
  /** Added to the scale's label difficulty. */
  difficultyMod: number;
  /** Advance as a share of the studio budget on a yes. */
  advanceMin: number;
  advanceMax: number;
  /** Share of royalties the label keeps. */
  royaltyCut: number;
  /** Release-week streams × (1 + marketing). */
  marketing: number;
}

// Easy indie → picky major. Bigger advances and marketing cost a bigger cut.
export const LABELS: readonly LabelDeal[] = [
  { id: 'garage-press', location: 'noho', difficultyMod: -10, advanceMin: 0.4, advanceMax: 0.6, royaltyCut: 0.3, marketing: 0.1 },
  { id: 'tape-hiss', location: 'silverlake', difficultyMod: -5, advanceMin: 0.5, advanceMax: 0.7, royaltyCut: 0.35, marketing: 0.2 },
  { id: 'beachhouse', location: 'santamonica', difficultyMod: -2, advanceMin: 0.5, advanceMax: 0.7, royaltyCut: 0.4, marketing: 0.25 },
  { id: 'algorithm', location: 'weho', difficultyMod: 3, advanceMin: 0.6, advanceMax: 0.85, royaltyCut: 0.5, marketing: 0.4 },
  { id: 'burbank-sound', location: 'burbank', difficultyMod: 6, advanceMin: 0.7, advanceMax: 0.9, royaltyCut: 0.55, marketing: 0.5 },
  { id: 'sunset-major', location: 'hollywood', difficultyMod: 12, advanceMin: 0.9, advanceMax: 1, royaltyCut: 0.7, marketing: 1 },
];

/** Label pitch difficulty per music scale. */
export const LABEL_DIFFICULTY: Record<'single' | 'ep' | 'album', number> = { single: 40, ep: 55, album: 75 };

export type VenueId = 'open-mic' | 'basement' | 'club' | 'theater' | 'amphitheater' | 'arena';

export interface Venue {
  id: VenueId;
  location: LocationId;
  capacity: number;
  /** Fans needed to get booked. */
  minFans: number;
  ticketPrice: number;
}

export const VENUES: readonly Venue[] = [
  { id: 'open-mic', location: 'noho', capacity: 40, minFans: 0, ticketPrice: 5 },
  { id: 'basement', location: 'silverlake', capacity: 120, minFans: 300, ticketPrice: 10 },
  { id: 'club', location: 'weho', capacity: 300, minFans: 1000, ticketPrice: 15 },
  { id: 'theater', location: 'hollywood', capacity: 800, minFans: 3000, ticketPrice: 20 },
  { id: 'amphitheater', location: 'burbank', capacity: 2000, minFans: 8000, ticketPrice: 30 },
  { id: 'arena', location: 'santamonica', capacity: 6000, minFans: 20000, ticketPrice: 40 },
];
