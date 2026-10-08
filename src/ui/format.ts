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
