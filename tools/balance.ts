// Headless balance run: every archetype × scripted strategies × 30 in-game days,
// plus a film table (one short film end-to-end next to a survival job) and a music table (a single / an EP).
// Usage: npm run balance
import * as C from '../src/sim/constants';
import { ARCHETYPES, ARCHETYPE_IDS } from '../src/sim/content/archetypes';
import { FILM_SCALES, type FilmScaleId } from '../src/sim/content/film';
import { INVESTORS } from '../src/sim/content/filmFlavor';
import { MUSIC_SCALES, type MusicScaleId } from '../src/sim/content/music';
import { HEADSHOTS_LOCATION } from '../src/sim/content/locations';
import { LABELS, VENUES, type LabelDeal, type Venue } from '../src/sim/content/musicBiz';
import { playedShowToday } from '../src/sim/musicBiz';
import { oddsFor } from '../src/sim/board';
import { bookingPayout, cloutTier, dailyBills, dayOf, hourOf, isExposure, showPay } from '../src/sim/formulas';
import {
  eligibleFestivals,
  festivalOddsFor,
  fundingRoom,
  hiredCrew,
  labelOddsFor,
  musicScaleOf,
  pendingSubmissions,
  pitchOddsFor,
  promotedToday,
  remainingBudget,
  submittedTo,
} from '../src/sim/project';
import { newGame, step, whyNot } from '../src/sim/reducer';
import type { ArchetypeId, Command, GameEvent, GameState, Medium, Opportunity } from '../src/sim/types';

const DAYS = 30;
const SEED = Number(process.env.BALANCE_SEED ?? 2026);
const IDLE_MINUTES = 30;

type Policy = (s: GameState) => Command | null;

const hour = (s: GameState) => hourOf(s.minute);
const day = (s: GameState) => dayOf(s.minute);
const go = (s: GameState, to: GameState['player']['location']): Command | null =>
  s.player.location === to ? null : { type: 'TRAVEL', to };

/** Go home and sleep until `wakeHour` (bounded to 1–10 hours). */
function sleepUntil(s: GameState, wakeHour: number): Command {
  const travel = go(s, s.player.home);
  if (travel) return travel;
  const hours = Math.max(1, Math.min(10, (wakeHour - hour(s) + 24) % 24 || 8));
  return { type: 'SLEEP', hours };
}

/** Best open opportunity in these media by expected pay, skipping tier 2+ without headshots
 *  (and, when `safe`, rows where a miss would be an exposure). */
function bestOpp(s: GameState, media: Medium[], safe = false): Opportunity | null {
  const options = s.board.filter(
    (o) =>
      o.status === 'open' &&
      media.includes(o.medium) &&
      (o.tier < 2 || s.player.hasHeadshots) &&
      (!safe || !isExposure(s.player.skills[o.skill], o.tier)),
  );
  let best: Opportunity | null = null;
  let bestValue = -1;
  for (const o of options) {
    const value = oddsFor(s.player, o, 2) * bookingPayout(o.medium, o.tier).pay;
    if (value > bestValue) [best, bestValue] = [o, value];
  }
  return best;
}

/** Prep (2h if Spark allows) → travel → submit inside the window. Returns null when nothing to do yet. */
function chaseOpp(s: GameState, opp: Opportunity, prepByHour: number): Command | null {
  const h = hour(s);
  if (opp.prepHours < 2 && h < prepByHour && s.player.spark >= 20 && s.player.energy > 30)
    return { type: 'PREP', opportunityId: opp.id, hours: 2 };
  if (h >= opp.windowStart - 2 && h < opp.windowEnd - 1) {
    const travel = go(s, opp.location);
    if (travel) return travel;
    if (h >= opp.windowStart) return { type: 'SUBMIT', opportunityId: opp.id };
  }
  return null;
}

function noJob(): Policy {
  return (s) => (hour(s) >= 22 || hour(s) < 6 ? sleepUntil(s, 6) : null);
}

function baristaWeekdays(): Policy {
  let workedDay = -1;
  return (s) => {
    const h = hour(s);
    if (h >= 22 || h < 6) return sleepUntil(s, 6);
    const workday = day(s) % 7 >= 1 && day(s) % 7 <= 5;
    if (workday && workedDay !== day(s) && h >= 6 && h <= 11) {
      const travel = go(s, 'weho');
      if (travel) return travel;
      workedDay = day(s);
      return { type: 'START_JOB', jobId: 'barista' };
    }
    return go(s, s.player.home);
  };
}

function barbackPlusMusic(): Policy {
  let oppDay = -1;
  let workedDay = -1;
  return (s) => {
    const h = hour(s);
    // Night shift ends 01:00–03:00: sleep through the morning.
    if (h >= 1 && h < 11) return sleepUntil(s, 11);
    const d = h < 6 ? day(s) - 1 : day(s);
    // Commit to tonight's gig first; the bar shift only happens if there is still time after.
    if (oppDay !== d && h >= 11 && h < 22) {
      const opp = bestOpp(s, ['music']);
      if (!opp || h >= opp.windowEnd - 1) oppDay = d;
      else {
        const cmd = chaseOpp(s, opp, 17);
        if (cmd?.type === 'SUBMIT') oppDay = d;
        return cmd;
      }
    }
    if (workedDay !== d && h >= 18 && h <= 20) {
      const travel = go(s, 'weho');
      if (travel) return travel;
      workedDay = d;
      return { type: 'START_JOB', jobId: 'barback' };
    }
    if (h >= 21 || h < 1) return sleepUntil(s, 11);
    return null;
  };
}

function paPlusScreen(): Policy {
  let paDay = -1;
  let oppDay = -1;
  return (s) => {
    const h = hour(s);
    const d = day(s);
    // A PA day needs a rested body and no PA yesterday (14-hour days back to back burn people out).
    if (h >= 4 && h <= 6 && paDay !== d && paDay !== d - 1 && s.player.energy >= 80) {
      const travel = go(s, 'burbank');
      if (travel) return travel;
      if (h >= 5) {
        paDay = d;
        return { type: 'START_JOB', jobId: 'pa' };
      }
      return null;
    }
    if (h >= 21 || h < 4) return sleepUntil(s, 4);
    if (paDay !== d && oppDay !== d && h >= 6 && h < 17) {
      const opp = bestOpp(s, ['film', 'tv']);
      if (opp) {
        const cmd = chaseOpp(s, opp, 7);
        if (cmd?.type === 'SUBMIT') oppDay = d;
        if (cmd) return cmd;
        return null;
      }
    }
    return go(s, s.player.home);
  };
}

/** Bar back at night, one screen gig a day (skipping rows that would expose you), and headshots
 *  as soon as Clout 2 (or a manager) makes Tier 2 rows visible. */
function headshotsPlusGigs(): Policy {
  let oppDay = -1;
  let workedDay = -1;
  return (s) => {
    const h = hour(s);
    const d = h < 6 ? day(s) - 1 : day(s);
    if (h >= 2 && h < 9) return sleepUntil(s, 9);
    const reserve = 10 * dailyBills(ARCHETYPES[s.player.archetype].rentPerDay);
    const wantsHeadshots = !s.player.hasHeadshots && s.player.cash >= C.HEADSHOTS_COST + reserve && cloutTier(s.player.rp) + (ARCHETYPES[s.player.archetype].hasManager ? 1 : 0) >= 2;
    if (wantsHeadshots && h >= 9 && h < 15 && s.player.energy > 20) return go(s, HEADSHOTS_LOCATION) ?? { type: 'BUY_HEADSHOTS' };
    if (oppDay !== d && h >= 9 && h < 17) {
      const opp = bestOpp(s, ['film', 'tv'], true);
      if (!opp) oppDay = d;
      else {
        const cmd = chaseOpp(s, opp, 13);
        if (cmd?.type === 'SUBMIT') oppDay = d;
        if (cmd) return cmd;
        if (h >= opp.windowEnd - 1) oppDay = d;
        return null;
      }
    }
    if (workedDay !== d && h >= 17 && h <= 20) {
      const travel = go(s, 'weho');
      if (travel) return travel;
      if (h >= 18) {
        workedDay = d;
        return { type: 'START_JOB', jobId: 'barback' };
      }
      return null;
    }
    if (h >= 21 || h < 2) return sleepUntil(s, 9);
    return go(s, s.player.home);
  };
}

/**
 * Make one film of `scale` end-to-end next to a weekday barista job:
 * write → self-fund what a 10-day bills reserve allows, pitch the rest (one a day) →
 * hire (Editor first if affordable, else cheapest) → shoot from a 05:00 call → edit →
 * submit to every eligible festival with ≥ 10% odds → accept the best offer or self-release.
 */
function makeFilm(scale: FilmScaleId): () => Policy {
  return () => {
    const job = baristaWeekdays();
    let started = false;
    return (s) => {
      const p = s.project;
      const h = hour(s);
      const pl = s.player;
      if (!p) {
        if (started) return job(s);
        started = true;
        return { type: 'START_PROJECT', scale };
      }
      const sc = FILM_SCALES[scale];
      const reserve = 10 * dailyBills(ARCHETYPES[pl.archetype].rentPerDay);

      // Instant moves first (no time passes).
      if (p.stage === 'finance' || p.stage === 'crew') {
        const need = p.stage === 'finance' ? fundingRoom(p) : 0;
        const amount = Math.min(need, Math.floor(pl.cash - reserve));
        if (amount > 0) return { type: 'SELF_FUND', amount };
      }
      if (p.stage === 'festival') {
        for (const f of eligibleFestivals(p)) {
          if (!submittedTo(p, f.id) && festivalOddsFor(s, p, f) >= 0.1 && pl.cash >= f.fee + reserve / 2)
            return { type: 'SUBMIT_FESTIVAL', festivalId: f.id };
        }
        if (pendingSubmissions(p).length === 0) {
          const best = [...p.offers].sort((a, b) => b.amount - a.amount)[0];
          return best ? { type: 'ACCEPT_OFFER', offerId: best.id } : { type: 'SELF_RELEASE' };
        }
        return job(s);
      }

      // Shoot days: 05:00 wake-up, drive to set before the rush, skip the café.
      if (p.stage === 'shoot') {
        if (h >= 20 || h < 4) return sleepUntil(s, 4);
        if (h >= 4 && h <= 9 && pl.energy >= 55) return go(s, p.location) ?? (h >= 5 ? { type: 'SHOOT_DAY' } : null);
        if (h >= 4 && h <= 9) return sleepUntil(s, 4);
        return go(s, pl.home);
      }

      if (h >= 22 || h < 6) return sleepUntil(s, 6);
      // Mornings belong to the survival job on weekdays.
      const workday = day(s) % 7 >= 1 && day(s) % 7 <= 5;
      if (workday && h <= 11) {
        const cmd = job(s);
        if (cmd?.type === 'START_JOB' || cmd?.type === 'TRAVEL') return cmd;
      }
      if (pl.energy < 30) return sleepUntil(s, 6);

      switch (p.stage) {
        case 'develop':
          if (pl.spark >= C.WRITE_SESSION_SPARK) return { type: 'WRITE_SESSION' };
          return go(s, 'hollywood') ?? { type: 'LEISURE', leisureId: 'records' };
        case 'finance': {
          if (p.pitches.some((x) => x.day === day(s)) || h > 18) return go(s, pl.home);
          const inv = [...INVESTORS].sort(
            (a, b) => pitchOddsFor(s, p, b) * (b.shareMin + b.shareMax) - pitchOddsFor(s, p, a) * (a.shareMin + a.shareMax),
          )[0]!;
          return go(s, inv.location) ?? { type: 'PITCH', investorId: inv.id };
        }
        case 'crew': {
          const left = sc.crewSlots - hiredCrew(p).length;
          const open = p.crewPool.filter((c) => !c.hired).sort((a, b) => a.fee - b.fee);
          const cheapRest = (skip: string) => open.filter((c) => c.id !== skip).slice(0, left - 1).reduce((t, c) => t + c.fee, 0);
          const editor = hiredCrew(p).some((c) => c.role === 'editor')
            ? undefined
            : open.filter((c) => c.role === 'editor').sort((a, b) => b.skill - a.skill).find((c) => c.fee + cheapRest(c.id) <= remainingBudget(p));
          const pick = editor ?? open[0];
          if (!pick) return null;
          if (pick.fee > remainingBudget(p)) {
            const top = Math.min(pick.fee - remainingBudget(p), Math.floor(pl.cash));
            return top > 0 ? { type: 'SELF_FUND', amount: top } : job(s);
          }
          return { type: 'HIRE_CREW', candidateId: pick.id };
        }
        case 'post':
          return { type: 'EDIT_SESSION' };
        default:
          return job(s);
      }
    };
  };
}

const STRATEGIES: Array<[string, () => Policy]> = [
  ['No job', noJob],
  ['Barista 5 days/week', baristaWeekdays],
  ['Bar back + 1 music gig/day', barbackPlusMusic],
  ['PA when rested + 1 screen gig/day', paPlusScreen],
  ['Headshots + bar back + 1 screen gig/day', headshotsPlusGigs],
  ['Make a short film + barista', makeFilm('short')],
];

interface Result {
  endCash: number;
  lowestCash: number;
  tier: number;
  rp: number;
  bookings: number;
  topBookedTier: number;
  exposures: number;
  brokeDay: number | null;
  movedHomeDay: number | null;
  events: GameEvent[];
  state: GameState;
}

function simulate(archetype: ArchetypeId, makePolicy: () => Policy, days: number, stopWhen?: (s: GameState) => boolean): Result {
  let s = newGame(archetype, SEED);
  const policy = makePolicy();
  const endMinute = s.minute + days * 1440;
  let lowest = s.player.cash;
  const events: GameEvent[] = [];
  while (s.status === 'playing' && s.minute < endMinute && !stopWhen?.(s)) {
    let cmd: Command | null = s.activity ? { type: 'SKIP_TO_DONE' } : policy(s);
    if (!cmd || whyNot(s, cmd)) cmd = { type: 'ADVANCE', minutes: Math.min(IDLE_MINUTES, endMinute - s.minute) };
    const r = step(s, cmd);
    s = r.state;
    events.push(...r.events);
    lowest = Math.min(lowest, s.player.cash);
  }
  return {
    endCash: Math.round(s.player.cash),
    lowestCash: Math.round(lowest),
    tier: cloutTier(s.player.rp),
    rp: s.player.rp,
    bookings: s.stats.bookings,
    topBookedTier: Math.max(0, ...events.flatMap((e) => (e.type === 'BOOKED' ? [e.opportunity.tier] : []))),
    exposures: events.filter((e) => e.type === 'EXPOSED').length,
    brokeDay: s.stats.brokeMinute === null ? null : dayOf(s.stats.brokeMinute),
    movedHomeDay: s.status === 'movedHome' ? dayOf(s.minute) : null,
    events,
    state: s,
  };
}

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US')}`;

console.log(`\nLA Grind balance run — ${DAYS} in-game days, seed ${SEED}\n`);
console.log('| Archetype | Strategy | End cash | Lowest cash | Tier | Bookings | Top tier booked | Exposed | Went broke | Moved home |');
console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const id of ARCHETYPE_IDS) {
  for (const [name, policy] of STRATEGIES) {
    const r = simulate(id, policy, DAYS);
    console.log(
      `| ${ARCHETYPES[id].name} | ${name} | ${money(r.endCash)} | ${money(r.lowestCash)} | ${r.tier} | ${r.bookings} | ${r.topBookedTier || '—'} | ${r.exposures} | ${r.brokeDay === null ? '—' : `day ${r.brokeDay}`} | ${r.movedHomeDay === null ? '—' : `day ${r.movedHomeDay}`} |`,
    );
  }
}

// ---------- Film table ----------
// One film end-to-end next to a weekday barista job, compared with barista alone over the same days.
const FILM_DAYS = 60;
console.log(`\nFilm runs: one film + weekday barista vs barista alone (stops at release, max ${FILM_DAYS} days)\n`);
console.log('| Archetype | Film | Days to release | Quality | Festivals (in/sent, awards) | Outcome | Film RP | Tier after | Out of pocket | Offer | Cash vs barista-only |');
console.log('|---|---|---:|---:|---|---|---:|---:|---:|---:|---:|');
const released = (s: GameState) => s.credits.length > 0;
for (const id of ARCHETYPE_IDS) {
  for (const scale of ['short', 'micro', 'indie'] as const) {
    const sc = FILM_SCALES[scale];
    if (cloutTier(ARCHETYPES[id].rp) < sc.minTier) {
      if (scale === 'short') console.log(`| ${ARCHETYPES[id].name} | ${sc.name} | Clout too low | | | | | | | | |`);
      continue;
    }
    const r = simulate(id, makeFilm(scale), FILM_DAYS, released);
    const credit = r.state.credits[0];
    const daysTaken = (r.state.minute - newGame(id, SEED).minute) / 1440;
    const results = r.events.filter((e) => e.type === 'FESTIVAL_RESULT');
    const accepted = results.filter((e) => e.type === 'FESTIVAL_RESULT' && e.accepted).length;
    const awards = results.filter((e) => e.type === 'FESTIVAL_RESULT' && e.award).length;
    const filmRp = r.events.reduce((t, e) => t + (e.type === 'FESTIVAL_RESULT' || e.type === 'FILM_RELEASED' ? e.rp : 0), 0);
    const selfFunded = r.events.reduce((t, e) => t + (e.type === 'SELF_FUNDED' ? e.amount : 0), 0);
    const fees = r.events.reduce((t, e) => t + (e.type === 'FESTIVAL_SUBMITTED' ? e.fee : 0), 0);
    const offer = r.events.reduce((t, e) => t + (e.type === 'FILM_RELEASED' ? e.amount : 0), 0);
    const base = simulate(id, baristaWeekdays, daysTaken);
    const outcome = !credit ? 'not released' : credit.outcome.startsWith('Released') ? 'distribution deal' : 'self-released';
    console.log(
      `| ${ARCHETYPES[id].name} | ${sc.name} | ${credit ? daysTaken.toFixed(1) : `> ${FILM_DAYS}`} | ${credit?.quality ?? '—'} | ${accepted}/${results.length}${awards ? `, ${awards} award${awards > 1 ? 's' : ''}` : ''} | ${outcome} | ${filmRp} | ${r.tier} | ${money(selfFunded + fees)} | ${money(offer)} | ${money(r.endCash - base.endCash)} |`,
    );
  }
}

// ---------- Music table ----------
// One record end-to-end next to a weekday barista job: write → self-fund the studio → hire the best crew the
// budget allows → record at the studio → release at once → (optionally) one promo a day through release week.
// An EP needs Clout 2: until then the policy keeps putting out singles (same loop) and starts the EP once it can.

/** Label with the best expected advance (odds × mid advance share) for this record. */
function bestLabel(s: GameState): LabelDeal {
  const p = s.project!;
  const value = (l: LabelDeal) => labelOddsFor(s, p, l) * (l.advanceMin + l.advanceMax);
  return [...LABELS].sort((a, b) => value(b) - value(a))[0]!;
}

/** `label`: shop every record to labels (one meeting a day) and self-fund only what the advance leaves. */
function makeRecord(scale: MusicScaleId, promo: boolean, label = false): () => Policy {
  return () => {
    const job = baristaWeekdays();
    return (s) => {
      const p = s.project;
      const h = hour(s);
      const pl = s.player;
      const reserve = 10 * dailyBills(ARCHETYPES[pl.archetype].rentPerDay);
      if (!p) {
        // One record of the target scale, then back to the day job.
        if (s.credits.some((c) => c.scale === MUSIC_SCALES[scale].name)) return h >= 22 || h < 6 ? sleepUntil(s, 6) : job(s);
        const want = cloutTier(pl.rp) >= MUSIC_SCALES[scale].minTier ? scale : 'single';
        // With a label in view, start writing at once: the advance pays for most of the studio.
        if (pl.cash >= MUSIC_SCALES[want].budget + reserve / 2 || want === 'single' || label) return { type: 'START_PROJECT', scale: want };
        return h >= 22 || h < 6 ? sleepUntil(s, 6) : job(s);
      }
      const shop = label && p.stage === 'finance' && !p.label;
      // Instant moves first.
      if (p.stage === 'finance' && !shop) {
        const amount = Math.min(fundingRoom(p), Math.floor(pl.cash - reserve / 2));
        if (amount > 0) return { type: 'SELF_FUND', amount };
      }
      if (p.stage === 'release' && !p.release) return { type: 'RELEASE_RECORD' };

      if (h >= 22 || h < 6) return sleepUntil(s, 6);
      const workday = day(s) % 7 >= 1 && day(s) % 7 <= 5;
      if (workday && h <= 11) {
        const cmd = job(s);
        if (cmd?.type === 'START_JOB' || cmd?.type === 'TRAVEL') return cmd;
      }
      if (pl.energy < 30) return sleepUntil(s, 6);

      switch (p.stage) {
        case 'develop':
          if (pl.spark >= C.WRITE_SESSION_SPARK) return { type: 'WRITE_SESSION' };
          return go(s, 'hollywood') ?? { type: 'LEISURE', leisureId: 'records' };
        case 'finance': {
          if (!shop || p.pitches.some((x) => x.day === day(s)) || h > 18) return job(s);
          const l = bestLabel(s);
          return go(s, l.location) ?? { type: 'PITCH_LABEL', labelId: l.id };
        }
        case 'crew': {
          const left = musicScaleOf(p).crewSlots - hiredCrew(p).length;
          const open = p.crewPool.filter((c) => !c.hired);
          const cheapest = [...open].sort((a, b) => a.fee - b.fee);
          const restCost = (skip: string) => cheapest.filter((c) => c.id !== skip).slice(0, left - 1).reduce((t, c) => t + c.fee, 0);
          const pick = [...open].sort((a, b) => b.skill - a.skill || a.fee - b.fee).find((c) => c.fee + restCost(c.id) <= remainingBudget(p)) ?? cheapest[0];
          if (!pick) return null;
          if (pick.fee > remainingBudget(p)) {
            const top = Math.min(pick.fee - remainingBudget(p), Math.floor(pl.cash));
            return top > 0 ? { type: 'SELF_FUND', amount: top } : job(s);
          }
          return { type: 'HIRE_CREW', candidateId: pick.id };
        }
        case 'record':
          return go(s, p.location) ?? { type: 'RECORD_SESSION' };
        case 'release':
          if (promo && !promotedToday(s, p) && pl.spark >= C.PROMO_SPARK) return { type: 'PROMO' };
          if (promo && !promotedToday(s, p)) return go(s, 'hollywood') ?? { type: 'LEISURE', leisureId: 'records' };
          return go(s, pl.home);
        default:
          return job(s);
      }
    };
  };
}

const MUSIC_DAYS = 60;
const MUSIC_RUNS: Array<[string, MusicScaleId, boolean]> = [
  ['Single + promo', 'single', true],
  ['Single, no promo', 'single', false],
  ['EP + promo', 'ep', true],
];
console.log(`\nMusic runs: one record + weekday barista vs barista alone (stops at the end of release week, max ${MUSIC_DAYS} days)\n`);
console.log('| Archetype | Strategy | Days to week end | Quality | Peak | Streams | Fans gained | Royalties | Studio cost | Music RP | Tier after | Cash vs barista-only |');
console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const id of ARCHETYPE_IDS) {
  for (const [name, scale, promo] of MUSIC_RUNS) {
    // Singles released on the way to Clout 2 count toward the EP run's totals; the EP's own credit is the one shown.
    const done = (s: GameState) => s.credits.some((c) => c.scale === MUSIC_SCALES[scale].name);
    const r = simulate(id, makeRecord(scale, promo), MUSIC_DAYS, done);
    const credit = r.state.credits.find((c) => c.scale === MUSIC_SCALES[scale].name);
    const daysTaken = (r.state.minute - newGame(id, SEED).minute) / 1440;
    const ended = r.events.filter((e) => e.type === 'RELEASE_WEEK_ENDED');
    const last = ended[ended.length - 1];
    const sum = (t: GameEvent['type'], f: (e: GameEvent) => number) => r.events.filter((e) => e.type === t).reduce((a, e) => a + f(e), 0);
    const streams = sum('RELEASE_DAY', (e) => (e.type === 'RELEASE_DAY' ? e.streams : 0));
    const fans = sum('RELEASE_DAY', (e) => (e.type === 'RELEASE_DAY' ? e.fans : 0));
    const pay = sum('RELEASE_DAY', (e) => (e.type === 'RELEASE_DAY' ? e.royalties : 0));
    const cost = sum('SELF_FUNDED', (e) => (e.type === 'SELF_FUNDED' ? e.amount : 0));
    const rp = ended.reduce((a, e) => a + (e.type === 'RELEASE_WEEK_ENDED' ? e.rp : 0), 0);
    const base = simulate(id, baristaWeekdays, daysTaken);
    const singles = ended.length - (credit ? 1 : 0);
    const label = scale === 'ep' && singles > 0 ? `${name} (after ${singles} single${singles > 1 ? 's' : ''})` : name;
    const peak = last?.type === 'RELEASE_WEEK_ENDED' && credit ? (last.peak === null ? 'no chart' : `#${last.peak}`) : '—';
    console.log(
      `| ${ARCHETYPES[id].name} | ${label} | ${credit ? daysTaken.toFixed(1) : `> ${MUSIC_DAYS}`} | ${credit?.quality ?? '—'} | ${peak} | ${streams.toLocaleString('en-US')} | ${fans.toLocaleString('en-US')} | ${money(pay)} | ${money(cost)} | ${rp} | ${r.tier} | ${money(r.endCash - base.endCash)} |`,
    );
  }
}

// ---------- Music business table (LAG-69) ----------
// Three side hustles around a record, each next to the weekday barista job, compared with barista alone.

/** Barista on weekdays, plus one beat a day at home until the store is full (record digging when Spark runs out). */
function beatGrinder(): Policy {
  const job = baristaWeekdays();
  return (s) => {
    const h = hour(s);
    const pl = s.player;
    if (h >= 22 || h < 6) return sleepUntil(s, 6);
    const workday = day(s) % 7 >= 1 && day(s) % 7 <= 5;
    if (workday && h <= 11) {
      const cmd = job(s);
      if (cmd?.type === 'START_JOB' || cmd?.type === 'TRAVEL') return cmd;
    }
    if (s.beats.length >= C.BEAT_MAX || pl.energy < 30) return go(s, pl.home);
    if (pl.spark < C.BEAT_SPARK) return go(s, 'hollywood') ?? { type: 'LEISURE', leisureId: 'records' };
    return go(s, pl.home) ?? { type: 'MAKE_BEAT' };
  };
}

/** Venue with the best expected take at today's Fans (among those that will book you). */
function bestVenue(s: GameState): Venue {
  const fans = s.player.fans;
  const take = (v: Venue) => showPay(Math.min(v.capacity, Math.round(fans * C.SHOW_DRAW)), v.ticketPrice);
  return [...VENUES].filter((v) => fans >= v.minFans).sort((a, b) => take(b) - take(a))[0]!;
}

/** A single + promo (with the barista job), then the barista job by day and the best venue every night. */
function gigCatalogue(): Policy {
  const single = makeRecord('single', true)();
  const job = baristaWeekdays();
  return (s) => {
    if (s.catalog.length === 0) return single(s);
    const h = hour(s);
    const pl = s.player;
    if (h < 7 || (h >= 1 && h < 7)) return sleepUntil(s, 7);
    const workday = day(s) % 7 >= 1 && day(s) % 7 <= 5;
    if (workday && h >= 7 && h <= 11) {
      const cmd = job(s);
      if (cmd?.type === 'START_JOB' || cmd?.type === 'TRAVEL') return cmd;
    }
    if (!playedShowToday(s) && h >= 17 && h <= 21) {
      const v = bestVenue(s);
      const travel = go(s, v.location);
      if (travel) return travel;
      return h >= 19 ? { type: 'PLAY_SHOW', venueId: v.id } : null;
    }
    if (h >= 22 || playedShowToday(s)) return sleepUntil(s, 7);
    return go(s, pl.home);
  };
}

const BIZ_DAYS = 45;
const BIZ_RUNS: Array<[string, () => Policy]> = [
  ['Signed EP', makeRecord('ep', true, true)],
  ['Beat grinder', beatGrinder],
  ['Gig the catalogue', gigCatalogue],
];
console.log(`\nMusic business: ${BIZ_DAYS} days next to a weekday barista job, vs barista alone\n`);
console.log('| Archetype | Strategy | Cash vs barista-only | Side income | Fans | RP | Clout | EP released | Notes |');
console.log('|---|---|---:|---:|---:|---:|---:|---|---|');
const bizRows: string[] = [];
for (const id of ARCHETYPE_IDS) {
  const base = simulate(id, baristaWeekdays, BIZ_DAYS);
  for (const [name, policy] of BIZ_RUNS) {
    const r = simulate(id, policy, BIZ_DAYS);
    if (process.env.TRACE === id + name) { let st = newGame(id, SEED); for (const e of r.events) { if (['PROJECT_STARTED','PROJECT_STAGE','LABEL_PITCHED','SELF_FUNDED','RELEASE_WEEK_ENDED','RANK_CHANGED','TIER_CHANGED'].includes(e.type)) console.log(JSON.stringify(e).slice(0,160)); } }
    const start = newGame(id, SEED).minute;
    const sumOf = <T extends GameEvent['type']>(t: T, f: (e: Extract<GameEvent, { type: T }>) => number) =>
      r.events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === t).reduce((a, e) => a + f(e), 0);
    const advance = sumOf('LABEL_PITCHED', (e) => e.advance);
    const pitches = r.events.filter((e) => e.type === 'LABEL_PITCHED');
    const shows = r.events.filter((e) => e.type === 'SHOW_PLAYED');
    const showPayTotal = sumOf('SHOW_PLAYED', (e) => e.pay);
    const leases = sumOf('BEAT_LEASED', (e) => e.fee);
    const placements = sumOf('PLACEMENT', (e) => e.fee);
    const ep = r.state.credits.find((c) => c.scale === MUSIC_SCALES.ep.name);
    const epDay = ep ? ((ep.minute - start) / 1440).toFixed(0) : null;
    let side = 0;
    let notes = '';
    if (name === 'Signed EP') {
      side = advance;
      const signed = r.events.find((e) => e.type === 'LABEL_PITCHED' && e.yes);
      notes = signed?.type === 'LABEL_PITCHED' ? `${signed.label} after ${pitches.length} meeting${pitches.length > 1 ? 's' : ''}` : pitches.length ? `${pitches.length} pitches, no deal` : 'no EP yet';
    } else if (name === 'Beat grinder') {
      side = leases;
      const days = BIZ_DAYS;
      notes = `${r.state.beats.length} beats, avg Q${Math.round(r.state.beats.reduce((a, b) => a + b.quality, 0) / Math.max(1, r.state.beats.length))}, ${money(Math.round(leases / days))}/day avg, last 10 days ${money(Math.round(sumLast(r.events, 'BEAT_LEASED', 10)))} /day`;
    } else {
      side = showPayTotal;
      const best = shows.reduce((a, e) => Math.max(a, e.type === 'SHOW_PLAYED' ? e.pay : 0), 0);
      notes = `${shows.length} shows, ${money(Math.round(showPayTotal / Math.max(1, shows.length)))}/show avg, best ${money(best)}`;
    }
    if (placements) notes += `; placements ${money(placements)}`;
    bizRows.push(
      `| ${ARCHETYPES[id].name} | ${name} | ${money(r.endCash - base.endCash)} | ${money(side)} | ${r.state.player.fans.toLocaleString('en-US')} | ${r.rp} | ${r.tier} | ${epDay ? `day ${epDay}` : '—'} | ${notes} |`,
    );
  }
}
console.log(bizRows.join('\n'));

/** Average per-day total of a fee event over the last `days` days of a run. */
function sumLast(events: GameEvent[], type: 'BEAT_LEASED', days: number): number {
  // BEAT_LEASED events land at 06:00; count those after the last `days` bill events.
  const bills = events.map((e, i) => (e.type === 'BILLS_CHARGED' ? i : -1)).filter((i) => i >= 0);
  const from = bills[Math.max(0, bills.length - days)] ?? 0;
  return events.slice(from).reduce((a, e) => a + (e.type === type ? e.fee : 0), 0) / days;
}

console.log('\nNo-income runway (days before cash first drops below $0):\n');
console.log('| Archetype | Runway | Target |');
console.log('|---|---:|---:|');
const TARGET: Record<ArchetypeId, number> = { midwest: 22, producer: 36, indie: 40, nepo: 179 };
for (const id of ARCHETYPE_IDS) {
  const r = simulate(id, noJob, 400);
  const runway = r.brokeDay === null ? 'never' : `${r.brokeDay - 1} days`;
  console.log(`| ${ARCHETYPES[id].name} | ${runway} | ~${TARGET[id]} days |`);
}
console.log('');
