// Seeded PRNG (mulberry32). The state lives in GameState so every run is replayable.

export function seedToState(seed: number): number {
  return seed >>> 0;
}

/** Returns [value in [0, 1), nextState]. */
export function nextFloat(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Small mutable wrapper for use inside one reducer call; read `.state` back when done. */
export class Rng {
  constructor(public state: number) {}

  float(): number {
    const [value, next] = nextFloat(this.state);
    this.state = next;
    return value;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.float() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.float() < p;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.float() * items.length)];
    if (item === undefined) throw new Error('pick from empty list');
    return item;
  }
}
