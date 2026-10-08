import type { JobId, LocationId } from '../types';

export interface Job {
  id: JobId;
  name: string;
  venue: string;
  /** null = available anywhere. */
  location: LocationId | null;
  /** Fixed shift length in hours, or null for player-chosen (rideshare). */
  hours: number | null;
  minHours: number;
  maxHours: number;
  /** Allowed start hours, inclusive [first, last]. null = any time. */
  startWindow: readonly [number, number] | null;
  /** Flat pay for a fixed shift. */
  pay: number;
  /** Per-hour pay and gas for hourly jobs. */
  payPerHour: number;
  gasPerHour: number;
  /** Total energy for a fixed shift, or per hour for hourly jobs. */
  energy: number;
  energyPerHour: number;
  networkChance: number;
  networkGain: number;
  rpGain: number;
  carPerHour: number;
  flavour: string;
}

export const JOBS: Record<JobId, Job> = {
  barista: {
    id: 'barista',
    name: 'Barista',
    venue: 'Elsewhere Market patio café',
    location: 'weho',
    hours: 6,
    minHours: 6,
    maxHours: 6,
    startWindow: [6, 12],
    pay: 130,
    payPerHour: 0,
    gasPerHour: 0,
    energy: 30,
    energyPerHour: 0,
    networkChance: 0.25,
    networkGain: 2,
    rpGain: 0,
    carPerHour: 0,
    flavour: 'Oat-milk lattes for people who are "between projects" in the same way you are.',
  },
  barback: {
    id: 'barback',
    name: 'Bar back',
    venue: 'The Whiskey Wobble on the Strip',
    location: 'weho',
    hours: 7,
    minHours: 7,
    maxHours: 7,
    startWindow: [18, 20],
    pay: 140,
    payPerHour: 0,
    gasPerHour: 0,
    energy: 35,
    energyPerHour: 0,
    networkChance: 0.25,
    networkGain: 2,
    rpGain: 0,
    carPerHour: 0,
    flavour: 'Haul ice for bands who will thank "everyone who made tonight possible" except you.',
  },
  rideshare: {
    id: 'rideshare',
    name: 'Rideshare',
    venue: 'the Hustlr driver app',
    location: null,
    hours: null,
    minHours: 1,
    maxHours: 8,
    startWindow: null,
    pay: 0,
    payPerHour: 22,
    gasPerHour: 4,
    energy: 0,
    energyPerHour: 6,
    networkChance: 0,
    networkGain: 0,
    rpGain: 0,
    carPerHour: 1.5,
    flavour: 'Every passenger has a screenplay. None of them are hiring.',
  },
  pa: {
    id: 'pa',
    name: 'Production Assistant',
    venue: 'a B25 backlot in Burbank',
    location: 'burbank',
    hours: 14,
    minHours: 14,
    maxHours: 14,
    startWindow: [5, 7],
    pay: 250,
    payPerHour: 0,
    gasPerHour: 0,
    energy: 70,
    energyPerHour: 0,
    networkChance: 1,
    networkGain: 3,
    rpGain: 5,
    carPerHour: 0,
    flavour: 'Lock up the street, fetch the oat milk, absorb the shouting. Repeat for 14 hours.',
  },
};

export const JOB_IDS: readonly JobId[] = ['barista', 'barback', 'rideshare', 'pa'];
