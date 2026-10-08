import type { LeisureId, LocationId, Skill } from '../types';

export interface Location {
  id: LocationId;
  name: string;
  short: string;
  /** Position on the SVG map (0–100 grid). */
  x: number;
  y: number;
  blurb: string;
}

export const LOCATIONS: Record<LocationId, Location> = {
  noho: { id: 'noho', name: 'North Hollywood', short: 'NoHo', x: 30, y: 14, blurb: 'Arts district, cheap couches, big dreams.' },
  burbank: { id: 'burbank', name: 'Burbank', short: 'Burbank', x: 64, y: 12, blurb: 'Backlots, soundstages, and very early call times.' },
  hollywood: { id: 'hollywood', name: 'Hollywood', short: 'Hollywood', x: 56, y: 46, blurb: 'Classes, casting offices, and a star on the sidewalk for someone else.' },
  weho: { id: 'weho', name: 'West Hollywood', short: 'WeHo', x: 36, y: 56, blurb: 'The Strip by night, Elsewhere Market by day.' },
  silverlake: { id: 'silverlake', name: 'Silver Lake', short: 'Silver Lake', x: 82, y: 50, blurb: 'Open mics, indie screenings, and artisanal everything.' },
  santamonica: { id: 'santamonica', name: 'Santa Monica', short: 'Santa Monica', x: 12, y: 86, blurb: 'Beach, pier, and the 405 standing between you and it.' },
};

export const LOCATION_IDS: readonly LocationId[] = ['noho', 'burbank', 'hollywood', 'weho', 'silverlake', 'santamonica'];

export interface LeisureSpot {
  id: LeisureId;
  name: string;
  location: LocationId;
  cost: number;
  flavour: string;
}

export const LEISURE: Record<LeisureId, LeisureSpot> = {
  beach: { id: 'beach', name: 'Beach walk', location: 'santamonica', cost: 0, flavour: 'The Pacific does not care about your callback. Healing.' },
  screening: { id: 'screening', name: 'Indie screening', location: 'silverlake', cost: 15, flavour: 'A 3-hour black-and-white film about a lamp. You were moved.' },
  museum: { id: 'museum', name: 'Museum afternoon', location: 'hollywood', cost: 20, flavour: 'You stared at a red square until it stared back.' },
  records: { id: 'records', name: 'Record digging', location: 'hollywood', cost: 10, flavour: 'Found a sample nobody has cleared yet. Probably fine.' },
};

export const LEISURE_IDS: readonly LeisureId[] = ['beach', 'screening', 'museum', 'records'];

export interface ClassInfo {
  skill: Skill;
  name: string;
  location: LocationId;
}

export const CLASSES: Record<Skill, ClassInfo> = {
  acting: { skill: 'acting', name: 'Acting class', location: 'hollywood' },
  writing: { skill: 'writing', name: "Writers' workshop", location: 'hollywood' },
  directing: { skill: 'directing', name: 'Directing lab', location: 'hollywood' },
  music: { skill: 'music', name: 'Vocal and production lesson', location: 'hollywood' },
};

export const HEADSHOTS_LOCATION: LocationId = 'hollywood';
export const REPAIR_LOCATION: LocationId = 'noho';
