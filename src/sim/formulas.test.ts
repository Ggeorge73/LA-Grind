import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from './content/archetypes';
import {
  bookingPayout,
  cloutTier,
  commute,
  dailyBills,
  isExposure,
  nextCreativeBurnout,
  successOdds,
  tierThreshold,
  trafficMultiplier,
  type OddsInput,
} from './formulas';

const odds = (i: Partial<OddsInput> & Pick<OddsInput, 'skill' | 'clout' | 'tier'>): number =>
  100 * successOdds({ spark: 60, prepHours: 0, creativeBurnout: false, ...i });

describe('success odds — the eleven reference cases (±0.5 pt)', () => {
  const cases: Array<[string, number, Parameters<typeof odds>[0]]> = [
    ['Midwest Transplant, Tier-1 acting, no prep', 23.7, { skill: 20, clout: 1, tier: 1 }],
    ['Midwest Transplant, Tier-1 acting, 4h prep', 62.2, { skill: 20, clout: 1, tier: 1, prepHours: 4 }],
    ['Midwest Transplant, 4h prep, Creative Burnout', 31.1, { skill: 20, clout: 1, tier: 1, prepHours: 4, creativeBurnout: true }],
    ['Midwest Transplant, Tier-1 music, 4h prep', 52.1, { skill: 15, clout: 1, tier: 1, prepHours: 4 }],
    ['Bedroom Producer, Tier-1 music, no prep', 62.2, { skill: 40, clout: 1, tier: 1 }],
    ['Bedroom Producer, Tier-1 music, 4h prep', 89.7, { skill: 40, clout: 1, tier: 1, prepHours: 4 }],
    ['Bedroom Producer, Tier-2 music at Clout 1, 4h prep', 58.3, { skill: 40, clout: 1, tier: 2, prepHours: 4 }],
    ['Bedroom Producer, Tier-1 acting, 4h prep', 32.1, { skill: 5, clout: 1, tier: 1, prepHours: 4 }],
    ['Skill 60, Spark 80, Clout 4, Tier 5, 4h prep', 37.8, { skill: 60, spark: 80, clout: 4, tier: 5, prepHours: 4 }],
    ['Nepo Baby, Clout 3, Tier 3, 4h prep', 8.8, { skill: 10, clout: 3, tier: 3, prepHours: 4 }],
    ['Maxed: skill 100, Spark 100, Clout 10, Tier 10, 4h prep', 30.3, { skill: 100, spark: 100, clout: 10, tier: 10, prepHours: 4 }],
  ];
  it.each(cases)('%s → %s%%', (_name, expected, input) => {
    expect(Math.abs(odds(input) - expected)).toBeLessThanOrEqual(0.5);
  });

  it('never exceeds 90% or drops below 2% (before burnout)', () => {
    expect(odds({ skill: 100, spark: 100, clout: 10, tier: 1, prepHours: 4 })).toBeCloseTo(90, 5);
    expect(odds({ skill: 0, spark: 0, clout: 1, tier: 10 })).toBeCloseTo(2, 5);
  });
});

describe('booking payouts', () => {
  it.each([
    ['tv', 1, 180, 32],
    ['film', 1, 105, 52],
    ['music', 1, 75, 40],
    ['tv', 5, 4500, 160],
    ['film', 5, 2625, 260],
    ['music', 5, 1875, 200],
  ] as const)('%s tier %i pays $%i / %i RP', (medium, tier, pay, rp) => {
    expect(bookingPayout(medium, tier)).toMatchObject({ pay, rp });
  });

  it('music bookings add +3 Network; union rate doubles pay only', () => {
    expect(bookingPayout('music', 1).network).toBe(3);
    expect(bookingPayout('tv', 2, true)).toMatchObject({ pay: 1440, rp: 64 });
  });
});

describe('clout tiers', () => {
  it('thresholds are 100 × (n − 1)²', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(tierThreshold)).toEqual([0, 100, 400, 900, 1600, 2500, 3600, 4900, 6400, 8100]);
  });
  it('maps RP to tier at the boundaries', () => {
    expect(cloutTier(0)).toBe(1);
    expect(cloutTier(99)).toBe(1);
    expect(cloutTier(100)).toBe(2);
    expect(cloutTier(400)).toBe(3);
    expect(cloutTier(8099)).toBe(9);
    expect(cloutTier(8100)).toBe(10);
    expect(cloutTier(1_000_000)).toBe(10);
  });
  it('Nepo Baby starts at Tier 3', () => {
    expect(cloutTier(ARCHETYPES.nepo.rp)).toBe(3);
  });
});

describe('commute', () => {
  it('North Hollywood → Santa Monica at 08:00 takes 120 game minutes (405 at rush = 3x)', () => {
    expect(commute('noho', 'santamonica', 8, 100).minutes).toBe(120);
  });
  it('same trip off-peak is 40, midday 52', () => {
    expect(commute('noho', 'santamonica', 22, 100).minutes).toBe(40);
    expect(commute('noho', 'santamonica', 12, 100).minutes).toBe(52);
  });
  it('non-405 rush route is 2x', () => {
    expect(commute('hollywood', 'weho', 17, 100).minutes).toBe(20);
  });
  it('is symmetric', () => {
    expect(commute('santamonica', 'noho', 8, 100).minutes).toBe(120);
  });
  it('a weak car is 1.5x and a dead car means the bus at 2.5x with no gas', () => {
    expect(commute('hollywood', 'weho', 22, 19).minutes).toBe(15);
    const bus = commute('hollywood', 'weho', 22, 0);
    expect(bus).toMatchObject({ minutes: 25, gas: 0, byBus: true, carWear: 0 });
  });
  it('costs 1 energy per 10 minutes, $2 per 15 base minutes, 1 car health', () => {
    expect(commute('noho', 'santamonica', 8, 100)).toMatchObject({ energy: 12, gas: 6, carWear: 1 });
  });
  it('traffic windows', () => {
    expect(trafficMultiplier(6, true)).toBe(1);
    expect(trafficMultiplier(7, true)).toBe(3);
    expect(trafficMultiplier(9, false)).toBe(2);
    expect(trafficMultiplier(10, false)).toBe(1.3);
    expect(trafficMultiplier(16, false)).toBe(2);
    expect(trafficMultiplier(19, false)).toBe(1);
  });
});

describe('misc rules', () => {
  it('daily bills include rent, $20 food and $10 car', () => {
    expect(dailyBills(ARCHETYPES.midwest.rentPerDay)).toBe(55);
    expect(dailyBills(ARCHETYPES.nepo.rentPerDay)).toBe(140);
  });
  it('exposure when skill < 8 × tier', () => {
    expect(isExposure(7, 1)).toBe(true);
    expect(isExposure(8, 1)).toBe(false);
    expect(isExposure(20, 3)).toBe(true);
  });
  it('creative burnout uses hysteresis (on ≥ 60, off < 30)', () => {
    expect(nextCreativeBurnout(false, 59)).toBe(false);
    expect(nextCreativeBurnout(false, 60)).toBe(true);
    expect(nextCreativeBurnout(true, 45)).toBe(true);
    expect(nextCreativeBurnout(true, 29.9)).toBe(false);
  });
});
