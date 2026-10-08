import type { ArchetypeId, LocationId, Skills } from '../types';

export interface Archetype {
  id: ArchetypeId;
  name: string;
  tagline: string;
  cash: number;
  home: LocationId;
  homeName: string;
  rentPerDay: number;
  skills: Skills;
  network: number;
  rp: number;
  carHealth: number;
  special: string;
  /** Sees opportunities one tier above Clout. */
  hasManager: boolean;
  /** Multiplier on RP lost when exposed. */
  exposedRpMultiplier: number;
  /** Multiplier on Energy restored by sleep. */
  sleepMultiplier: number;
  /** Submission fee waived for these skills. */
  freeSubmissions: readonly ('acting' | 'writing' | 'directing' | 'music')[];
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  nepo: {
    id: 'nepo',
    name: 'The Nepo Baby',
    tagline: "Your parent's name opens doors. Your own talent is still in escrow.",
    cash: 25000,
    home: 'weho',
    homeName: 'West Hollywood apartment',
    rentPerDay: 110,
    skills: { acting: 10, writing: 10, directing: 10, music: 10 },
    network: 40,
    rp: 400,
    carHealth: 100,
    special: 'Has a manager: sees opportunities one tier above your Clout. Loses double RP when exposed.',
    hasManager: true,
    exposedRpMultiplier: 2,
    sleepMultiplier: 1,
    freeSubmissions: [],
  },
  midwest: {
    id: 'midwest',
    name: 'The Midwest Transplant',
    tagline: 'Drove out in a 2009 sedan with a dream and a cooler of sandwiches.',
    cash: 1200,
    home: 'noho',
    homeName: 'Couch in North Hollywood',
    rentPerDay: 25,
    skills: { acting: 20, writing: 10, directing: 10, music: 15 },
    network: 0,
    rp: 0,
    carHealth: 55,
    special: 'Sleeps like a farmhand: sleep restores 20% more Energy. The car is held together by hope.',
    hasManager: false,
    exposedRpMultiplier: 1,
    sleepMultiplier: 1.2,
    freeSubmissions: [],
  },
  indie: {
    id: 'indie',
    name: 'The Indie Hustler',
    tagline: 'Has opinions about aspect ratios. Has a camera. Has rent due.',
    cash: 4000,
    home: 'silverlake',
    homeName: 'Silver Lake apartment',
    rentPerDay: 70,
    skills: { acting: 15, writing: 40, directing: 40, music: 10 },
    network: 15,
    rp: 0,
    carHealth: 100,
    special: 'Owns camera gear: self-tapes and directing reels cost nothing to submit.',
    hasManager: false,
    exposedRpMultiplier: 1,
    sleepMultiplier: 1,
    freeSubmissions: ['acting', 'directing'],
  },
  producer: {
    id: 'producer',
    name: 'The Bedroom Producer',
    tagline: 'Forty unfinished beats and a closet lined with egg-crate foam.',
    cash: 2500,
    home: 'noho',
    homeName: 'Shared house in North Hollywood',
    rentPerDay: 40,
    skills: { acting: 5, writing: 20, directing: 5, music: 40 },
    network: 5,
    rp: 0,
    carHealth: 100,
    special: 'Owns a home studio: demos cost nothing to submit.',
    hasManager: false,
    exposedRpMultiplier: 1,
    sleepMultiplier: 1,
    freeSubmissions: ['music'],
  },
};

export const ARCHETYPE_IDS: readonly ArchetypeId[] = ['nepo', 'midwest', 'indie', 'producer'];
