import { dayOf, formatClock } from '../sim/formulas';
import { formatMoney } from '../sim/world';

export const money = formatMoney;
export const clock = formatClock;
export const day = dayOf;
export const pct = (p: number): string => `${(Math.round(p * 1000) / 10).toFixed(1)}%`;

export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

/** Short count for tight spaces: 950, 1.2k, 34k, 1.5M. */
export function compact(n: number): string {
  const a = Math.abs(n);
  const fmt = (v: number, unit: string) => `${v < 10 ? (Math.round(v * 10) / 10).toString() : Math.round(v).toString()}${unit}`;
  if (a >= 1_000_000) return `${n < 0 ? '-' : ''}${fmt(a / 1_000_000, 'M')}`;
  if (a >= 1_000) return `${n < 0 ? '-' : ''}${fmt(a / 1_000, 'k')}`;
  return String(Math.round(n));
}

/** Whole number with thousands separators. */
export const count = (n: number): string => Math.round(n).toLocaleString('en-US');
