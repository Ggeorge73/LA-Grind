import type { LocationId } from '../types';

/** Base travel minutes (symmetric). `crosses405` routes get the harsher rush multiplier. */
interface Route {
  minutes: number;
  crosses405: boolean;
}

const ROUTES: ReadonlyArray<readonly [LocationId, LocationId, number, boolean]> = [
  ['noho', 'burbank', 15, false],
  ['noho', 'hollywood', 25, false],
  ['noho', 'weho', 30, false],
  ['noho', 'silverlake', 30, false],
  ['noho', 'santamonica', 40, true],
  ['burbank', 'hollywood', 20, false],
  ['burbank', 'weho', 30, false],
  ['burbank', 'silverlake', 20, false],
  ['burbank', 'santamonica', 45, true],
  ['hollywood', 'weho', 10, false],
  ['hollywood', 'silverlake', 15, false],
  ['hollywood', 'santamonica', 35, false],
  ['weho', 'silverlake', 25, false],
  ['weho', 'santamonica', 25, false],
  ['silverlake', 'santamonica', 45, false],
];

export function route(from: LocationId, to: LocationId): Route {
  if (from === to) return { minutes: 0, crosses405: false };
  for (const [a, b, minutes, crosses405] of ROUTES) {
    if ((a === from && b === to) || (a === to && b === from)) return { minutes, crosses405 };
  }
  throw new Error(`no route ${from} -> ${to}`);
}

export const ROUTE_TABLE = ROUTES;
