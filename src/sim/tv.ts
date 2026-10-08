// TV, the actor's side: pilot season, callbacks, pickups and series-regular contracts.
import * as C from './constants';
import { PILOT_CASTING_LOCATIONS, PILOT_TIERS, type PilotTier } from './content/tv';
import { CALLBACK_BEATS, NETWORKS, PILOT_ROLES, PILOT_TITLE_FIRST, PILOT_TITLE_SECOND, TV_HEADLINES, type TvHeadlineKind } from './content/tvFlavor';
import { windowFor } from './board';
import { atHour, bookingPayout, callbackOdds, callbackSenseChance, clampStat, cloutTier, cycleDay, dayOf, pickupOdds } from './formulas';
import type { Rng } from './rng';
import type { Activity, Callback, GameEvent, GameState, Opportunity } from './types';
import { addHeadline, changeNetwork, changeRp, earn, fillTemplate, newId, ownHeadline, who } from './world';

export function tvHeadline(s: GameState, rng: Rng, events: GameEvent[], kind: TvHeadlineKind, vars: Record<string, string | number> = {}, own = true): void {
  addHeadline(s, events, fillTemplate(rng.pick(TV_HEADLINES[kind]), { who: who(s), ...vars }), own);
}

/** Pilot auditions for today's board (empty outside pilot season). */
export function generatePilots(s: GameState, rng: Rng, maxTier: number, day: number, isSeason: boolean): Opportunity[] {
  if (!isSeason) return [];
  const top = Math.max(1, Math.min(C.PILOT_MAX_TIER, maxTier));
  const w = windowFor('tv');
  return Array.from({ length: C.PILOTS_PER_DAY }, (_, i) => {
    // First slot sits at the top of what you can see; the second anywhere at or below it.
    const tier = (i === 0 ? top : 1 + Math.floor(rng.float() * top)) as PilotTier;
    const showTitle = `${rng.pick(PILOT_TITLE_FIRST)} ${rng.pick(PILOT_TITLE_SECOND)}`;
    const network = rng.pick(NETWORKS[tier]);
    const role = rng.pick(PILOT_ROLES);
    return {
      id: newId(s, 'o'),
      templateId: `pilot-t${tier}`,
      title: `${PILOT_TIERS[tier].label}: "${showTitle}" (${network}), ${role}`,
      medium: 'tv',
      skill: 'acting',
      tier,
      location: rng.pick(PILOT_CASTING_LOCATIONS),
      windowStart: w.start,
      windowEnd: w.end,
      day,
      prepHours: 0,
      status: 'open',
      pilot: { network, role, showTitle },
    } satisfies Opportunity;
  });
}

/** A pilot submission finished: open the callback instead of rolling straight away. */
export function startCallback(s: GameState, a: Activity, opp: Opportunity, rng: Rng, events: GameEvent[]): void {
  const pool = [...CALLBACK_BEATS];
  const sense = callbackSenseChance(s.player.skills.acting);
  const beats = Array.from({ length: C.CALLBACK_BEATS }, () => {
    const b = pool.splice(Math.floor(rng.float() * pool.length), 1)[0]!;
    return { note: b.note, reads: b.reads, best: b.best, sensed: rng.chance(sense) ? b.best : null };
  });
  s.callback = {
    opportunityId: opp.id,
    showTitle: opp.pilot!.showTitle,
    network: opp.pilot!.network,
    role: opp.pilot!.role,
    tier: opp.tier,
    baseOdds: a.odds ?? 0,
    beats,
    picks: [],
  };
  events.push({ type: 'CALLBACK_STARTED', showTitle: opp.pilot!.showTitle, network: opp.pilot!.network });
  tvHeadline(s, rng, events, 'callback', { title: opp.pilot!.showTitle });
}

export function pickRead(s: GameState, rng: Rng, read: number, events: GameEvent[]): void {
  const cb = s.callback!;
  const beat = cb.picks.length;
  cb.picks.push(read);
  events.push({ type: 'CALLBACK_READ', beat: beat + 1, read, right: read === cb.beats[beat]!.best });
  if (cb.picks.length >= cb.beats.length) resolveCallback(s, rng, events);
}

export const rightReads = (cb: Callback): number => cb.picks.filter((p, i) => p === cb.beats[i]!.best).length;

/** Roll the booking with the callback-adjusted odds. Unanswered beats count as wrong. */
export function resolveCallback(s: GameState, rng: Rng, events: GameEvent[]): void {
  const cb = s.callback!;
  s.callback = null;
  const right = rightReads(cb);
  const odds = callbackOdds(cb.baseOdds, right);
  const opp = s.board.find((o) => o.id === cb.opportunityId);
  const booked = rng.chance(odds);
  let pay = 0;
  if (booked) {
    const base = bookingPayout('tv', cb.tier);
    pay = base.pay * C.PILOT_FEE_MULTIPLIER;
    earn(s, pay);
    s.stats.bookings += 1;
    if (!s.stats.bestBooking || pay > s.stats.bestBooking.pay) s.stats.bestBooking = { title: `${cb.showTitle} (pilot)`, pay };
    s.player.skills.acting = clampStat(s.player.skills.acting + C.BOOKED_SKILL_GAIN);
    if (opp) opp.status = 'booked';
    s.pilots.push({
      id: newId(s, 'pp'),
      showTitle: cb.showTitle,
      network: cb.network,
      role: cb.role,
      tier: cb.tier,
      right,
      decisionMinute: atHour(dayOf(s.minute) + C.PILOT_DECISION_DAYS, C.BILLS_HOUR),
    });
    events.push({ type: 'CALLBACK_DONE', showTitle: cb.showTitle, right, odds, booked, pay });
    tvHeadline(s, rng, events, 'pilotBooked', { title: cb.showTitle, role: cb.role, network: cb.network });
    changeRp(s, rng, events, base.rp);
    changeNetwork(s, events, base.network);
  } else {
    if (opp) opp.status = 'rejected';
    events.push({ type: 'CALLBACK_DONE', showTitle: cb.showTitle, right, odds, booked, pay });
    ownHeadline(s, rng, events, 'rejected', { title: cb.showTitle, tier: cb.tier, medium: 'tv' });
  }
}

/** 06:00: networks decide on pilots that are due. */
export function resolvePilots(s: GameState, rng: Rng, events: GameEvent[]): void {
  const due = s.pilots.filter((p) => s.minute >= p.decisionMinute);
  if (due.length === 0) return;
  s.pilots = s.pilots.filter((p) => s.minute < p.decisionMinute);
  for (const p of due) {
    const odds = pickupOdds(p.right, cloutTier(s.player.rp), p.tier);
    const pickedUp = rng.chance(odds);
    if (!pickedUp) {
      events.push({ type: 'PILOT_DECIDED', showTitle: p.showTitle, network: p.network, pickedUp, odds, tookIt: false });
      tvHeadline(s, rng, events, 'passed', { title: p.showTitle, network: p.network });
      continue;
    }
    if (s.contract) {
      events.push({ type: 'PILOT_DECIDED', showTitle: p.showTitle, network: p.network, pickedUp, odds, tookIt: false });
      tvHeadline(s, rng, events, 'agentPassed', { title: p.showTitle });
      continue;
    }
    const info = PILOT_TIERS[p.tier as PilotTier];
    s.contract = {
      showTitle: p.showTitle,
      network: p.network,
      role: p.role,
      tier: p.tier,
      weeklyPay: info.weeklyPay,
      episodesTotal: info.episodes,
      episodesDone: 0,
      episodesMissed: 0,
      shotThisWeek: false,
      weekEndMinute: s.minute + 7 * C.MINUTES_PER_DAY,
    };
    events.push({ type: 'PILOT_DECIDED', showTitle: p.showTitle, network: p.network, pickedUp, odds, tookIt: true });
    tvHeadline(s, rng, events, 'pickedUp', { title: p.showTitle, network: p.network });
  }
}

export function completeEpisode(s: GameState, rng: Rng, events: GameEvent[]): void {
  const c = s.contract;
  if (!c) return;
  c.shotThisWeek = true;
  const rp = C.EPISODE_RP_PER_TIER * c.tier;
  events.push({ type: 'EPISODE_SHOT', showTitle: c.showTitle, episode: c.episodesDone + 1, rp });
  changeRp(s, rng, events, rp);
}

/** 06:00: pay the episode week that just ended (half if you missed set) and wrap the season after the last one. */
export function resolveContractWeek(s: GameState, rng: Rng, events: GameEvent[]): void {
  const c = s.contract;
  if (!c || s.minute < c.weekEndMinute) return;
  const missed = !c.shotThisWeek;
  const pay = Math.round(c.weeklyPay * (missed ? C.MISSED_EPISODE_PAY : 1));
  const rpLost = missed ? C.EPISODE_RP_PER_TIER * c.tier : 0;
  c.episodesDone += 1;
  if (missed) c.episodesMissed += 1;
  earn(s, pay);
  events.push({ type: 'EPISODE_WEEK', showTitle: c.showTitle, episode: c.episodesDone, pay, missed, rpLost });
  if (missed) {
    tvHeadline(s, rng, events, 'missedEpisode', { title: c.showTitle });
    changeRp(s, rng, events, -rpLost);
  }
  c.shotThisWeek = false;
  c.weekEndMinute += 7 * C.MINUTES_PER_DAY;
  if (c.episodesDone >= c.episodesTotal) {
    s.contract = null;
    s.credits.unshift({
      title: c.showTitle,
      medium: 'tv',
      scale: PILOT_TIERS[c.tier as PilotTier].label.replace(' pilot', ''),
      quality: Math.round((100 * (c.episodesTotal - c.episodesMissed)) / c.episodesTotal),
      outcome: `Series regular (${c.role}) on ${c.network}, ${c.episodesTotal} episodes`,
      minute: s.minute,
    });
    events.push({ type: 'SERIES_WRAPPED', showTitle: c.showTitle, episodes: c.episodesTotal, missed: c.episodesMissed });
    tvHeadline(s, rng, events, 'wrapped', { title: c.showTitle, episodes: c.episodesTotal });
  }
}

/** 06:00 on the first day of pilot season: the trades notice. */
export function announcePilotSeason(s: GameState, rng: Rng, events: GameEvent[], day: number): void {
  if (cycleDay(day) !== C.PILOT_SEASON_FIRST) return;
  events.push({ type: 'PILOT_SEASON_OPENED' });
  tvHeadline(s, rng, events, 'seasonOpen', { network: rng.pick(NETWORKS[4]) }, false);
}
