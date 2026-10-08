import { describe, expect, it } from 'vitest';
import { Rng, nextFloat, seedToState } from './rng';

describe('seeded rng', () => {
  it('same seed gives the same sequence', () => {
    const a = new Rng(seedToState(42));
    const b = new Rng(seedToState(42));
    const seqA = Array.from({ length: 50 }, () => a.float());
    const seqB = Array.from({ length: 50 }, () => b.float());
    expect(seqA).toEqual(seqB);
  });
  it('different seeds differ', () => {
    expect(nextFloat(1)[0]).not.toBe(nextFloat(2)[0]);
  });
  it('values stay in [0, 1) and ints in range', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const f = r.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(4, 6);
      expect([4, 5, 6]).toContain(n);
    }
  });
  it('state is a plain number that survives JSON', () => {
    const r = new Rng(99);
    r.float();
    const resumed = new Rng(JSON.parse(JSON.stringify(r.state)) as number);
    expect(resumed.float()).toBe(r.float());
  });
});
