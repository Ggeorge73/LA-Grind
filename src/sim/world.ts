// Small state helpers shared by the clock and the reducer. They mutate a draft
// that step() cloned, and push the matching events so nothing changes silently.
import * as C from './constants';
import { ARCHETYPES } from './content/archetypes';
import { HEADLINES, type HeadlineKind } from './content/headlines';
import { clampStat, cloutTier } from './formulas';
import type { Rng } from './rng';
import type { GameEvent, GameState, LedgerKind, Medium } from './types';

export function newId(s: GameState, prefix: string): string {
  s.nextId += 1;
  return `${prefix}${s.nextId}`;
}

export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const digits = String(Math.round(Math.abs(amount)));
  return `${sign}$${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const MEDIUM_LABEL: Record<Medium, string> = { film: 'film', tv: 'TV', music: 'music' };

export function who(s: GameState): string {
  return ARCHETYPES[s.player.archetype].name.replace(/^The /, '');
}

export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export function addHeadline(s: GameState, events: GameEvent[], text: string, own: boolean): string {
  text = text.charAt(0).toUpperCase() + text.slice(1);
  const headline = { id: newId(s, 'h'), minute: s.minute, text, own };
  s.trades.unshift(headline);
  if (s.trades.length > C.TRADES_MAX) s.trades.length = C.TRADES_MAX;
  events.push({ type: 'HEADLINE', headline });
  return text;
}

export function ownHeadline(
  s: GameState,
  rng: Rng,
  events: GameEvent[],
  kind: HeadlineKind,
  vars: { title?: string; tier?: number; pay?: number; medium?: Medium } = {},
): string {
  const text = fillTemplate(rng.pick(HEADLINES[kind]), {
    who: who(s),
    title: vars.title ?? '',
    tier: vars.tier ?? cloutTier(s.player.rp),
    pay: formatMoney(vars.pay ?? 0),
    medium: vars.medium ? MEDIUM_LABEL[vars.medium] : '',
  });
  return addHeadline(s, events, text, true);
}

export function addLog(s: GameState, text: string): void {
  s.log.unshift({ id: newId(s, 'l'), minute: s.minute, text });
  if (s.log.length > C.LOG_MAX) s.log.length = C.LOG_MAX;
}

/** Change RP (never below 0) and announce any tier change. */
export function changeRp(s: GameState, rng: Rng, events: GameEvent[], delta: number): void {
  const before = cloutTier(s.player.rp);
  s.player.rp = Math.max(0, s.player.rp + delta);
  const after = cloutTier(s.player.rp);
  if (after !== before) {
    events.push({ type: 'TIER_CHANGED', from: before, to: after });
    if (after > before) ownHeadline(s, rng, events, 'tierUp', { tier: after });
  }
  s.stats.peakTier = Math.max(s.stats.peakTier, after);
}

export function changeNetwork(s: GameState, events: GameEvent[], delta: number): void {
  if (delta === 0) return;
  s.player.network = clampStat(s.player.network + delta);
  events.push({ type: 'NETWORK_GAINED', amount: delta });
}

function record(s: GameState, amount: number, label: string, kind: LedgerKind): void {
  if (amount === 0) return;
  s.ledger.unshift({ id: newId(s, 'm'), minute: s.minute, amount, label, kind });
  if (s.ledger.length > C.LEDGER_MAX) s.ledger.length = C.LEDGER_MAX;
}

/** Money in. Every cash increase goes through here so the Bank app's ledger always adds up. */
export function earn(s: GameState, amount: number, label: string, kind: LedgerKind): void {
  s.player.cash += amount;
  s.stats.totalEarned += amount;
  record(s, amount, label, kind);
}

/** Money out. Every cash decrease goes through here. */
export function spend(s: GameState, amount: number, label: string, kind: LedgerKind): void {
  s.player.cash -= amount;
  record(s, -amount, label, kind);
}
