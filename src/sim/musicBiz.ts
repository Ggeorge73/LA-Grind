// The music business around a record: label deals, live shows, the beat store, and catalogue placements.
import * as C from './constants';
import { LABELS, VENUES, type LabelDeal, type LabelId, type Venue, type VenueId } from './content/musicBiz';
import { MUSIC_SCALES } from './content/music';
import { BEAT_TITLE_FIRST, BEAT_TITLE_SECOND, BIZ_HEADLINES, LABEL_FLAVOR, SYNC_CLIENTS, VENUE_FLAVOR, type BizHeadlineKind } from './content/musicBizFlavor';
import { beatFee, beatLeaseChance, beatQuality, dayOf, placementChance, placementFee, showPay, showTickets } from './formulas';
import type { Rng } from './rng';
import type { Activity, GameEvent, GameState } from './types';
import { addHeadline, changeNetwork, changeRp, earn, fillTemplate, formatMoney, newId, who } from './world';

export const labelById = (id: string): LabelDeal | undefined => LABELS.find((l) => l.id === id);
export const labelName = (id: string): string => LABEL_FLAVOR[id as LabelId]?.name ?? id;
export const venueById = (id: string): Venue | undefined => VENUES.find((v) => v.id === id);
export const venueName = (id: string): string => VENUE_FLAVOR[id as VenueId]?.name ?? id;

export function bizHeadline(s: GameState, rng: Rng, events: GameEvent[], kind: BizHeadlineKind, vars: Record<string, string | number>): void {
  addHeadline(s, events, fillTemplate(rng.pick(BIZ_HEADLINES[kind]), { who: who(s), ...vars }), true);
}

export const playedShowToday = (s: GameState): boolean => s.player.lastShowDay === dayOf(s.minute);

/** A show finishes: tickets from Fans, 60% of the door, a few new fans and a little RP. */
export function completeShow(s: GameState, a: Activity, rng: Rng, events: GameEvent[]): void {
  const v = venueById(a.venueId!)!;
  const tickets = showTickets(s.player.fans, v.capacity, rng.float());
  const pay = showPay(tickets, v.ticketPrice);
  const fans = Math.round(tickets * C.SHOW_FAN_GAIN);
  const rp = Math.floor(tickets / C.SHOW_TICKETS_PER_RP);
  const soldOut = tickets >= v.capacity;
  earn(s, pay, `Show at ${venueName(v.id)}`, 'music');
  s.player.fans += fans;
  events.push({ type: 'SHOW_PLAYED', venueId: v.id, venue: venueName(v.id), tickets, soldOut, pay, fans, rp });
  bizHeadline(s, rng, events, soldOut ? 'showSoldOut' : 'showPlayed', { venue: venueName(v.id), tickets });
  if (rp > 0) changeRp(s, rng, events, rp);
  if (soldOut) changeNetwork(s, events, 1);
}

export function completeBeat(s: GameState, a: Activity, rng: Rng, events: GameEvent[]): void {
  const beat = {
    id: newId(s, 'b'),
    title: `${rng.pick(BEAT_TITLE_FIRST)} ${rng.pick(BEAT_TITLE_SECOND)}`,
    quality: beatQuality(s.player.skills.music, rng.float()),
    madeMinute: a.endMinute,
    leases: 0,
    earned: 0,
  };
  s.beats.push(beat);
  events.push({ type: 'BEAT_MADE', beat: { ...beat } });
}

/** 06:00: each beat in the store may be leased. */
export function resolveBeatLeases(s: GameState, rng: Rng, events: GameEvent[]): void {
  for (const b of s.beats) {
    if (!rng.chance(beatLeaseChance(b.quality, s.player.fans, b.leases))) continue;
    const fee = beatFee(b.quality);
    b.leases += 1;
    b.earned += fee;
    earn(s, fee, `Beat lease: ${b.title}`, 'music');
    events.push({ type: 'BEAT_LEASED', beatId: b.id, title: b.title, fee });
    if (b.leases === 1) bizHeadline(s, rng, events, 'beatLeased', { beat: b.title, amount: formatMoney(fee) });
  }
}

/** 06:00: each catalogue record may be licensed by a parody production. */
export function resolvePlacements(s: GameState, rng: Rng, events: GameEvent[]): void {
  for (const r of s.catalog) {
    if (!rng.chance(placementChance(r.quality, r.peak !== null))) continue;
    const scale = MUSIC_SCALES[r.scale as keyof typeof MUSIC_SCALES];
    const fee = placementFee(r.quality, scale ? scale.streamMultiplier : 1);
    const client = rng.pick(SYNC_CLIENTS);
    r.placements += 1;
    earn(s, fee, `Sync: ${r.title}`, 'music');
    events.push({ type: 'PLACEMENT', recordId: r.id, title: r.title, client, fee, rp: C.PLACEMENT_RP });
    bizHeadline(s, rng, events, 'placement', { title: r.title, client, amount: formatMoney(fee) });
    changeRp(s, rng, events, C.PLACEMENT_RP);
  }
}
