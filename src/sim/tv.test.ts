// LAG-76: pilot season QA — calendar, boards, callbacks, pickups, series-regular contracts, saves and views.
import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { PILOT_CASTING_LOCATIONS, PILOT_TIERS, STUDIO_LOT, type PilotTier } from './content/tv';
import { CALLBACK_BEATS, NETWORKS, PILOT_ROLES } from './content/tvFlavor';
import { JOBS } from './content/jobs';
import { LOCATIONS } from './content/locations';
import { opportunityView, tvView } from './actions';
import { oddsFor, submissionFee, visibleTier } from './board';
import {
  atHour,
  bookingPayout,
  callbackOdds,
  callbackSenseChance,
  cloutTier,
  cycleDay,
  dayOf,
  isExposure,
  isPilotSeason,
  minuteOfDay,
  pickupOdds,
} from './formulas';
import { newGame, step, whyNot } from './reducer';
import { Rng, nextFloat } from './rng';
import { deserialize, serialize } from './save';
import { resolvePilots, startCallback } from './tv';
import type { Activity, ArchetypeId, Command, GameEvent, GameState, LocationId, Opportunity, PendingPilot } from './types';

// ---------- helpers ----------

function run(s: GameState, ...cmds: Command[]): { state: GameState; events: GameEvent[] } {
  let state = s;
  const events: GameEvent[] = [];
  for (const cmd of cmds) {
    const r = step(state, cmd);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}
const tweak = (s: GameState, f: (t: GameState) => void): GameState => {
  const t = structuredClone(s);
  f(t);
  return t;
};
const rested = (s: GameState) =>
  tweak(s, (t) => {
    t.player.energy = 100;
    t.player.spark = 100;
  });
const of = <T extends GameEvent['type']>(e: GameEvent[], t: T) => e.filter((x): x is Extract<GameEvent, { type: T }> => x.type === t);
const types = (e: GameEvent[]) => e.map((x) => x.type);
const toMinute = (s: GameState, minute: number) => (minute > s.minute ? run(s, { type: 'ADVANCE', minutes: minute - s.minute }) : { state: s, events: [] });
/** ADVANCE to the next 06:00 (always strictly later). */
const toNextSix = (s: GameState) => run(s, { type: 'ADVANCE', minutes: ((6 * 60 - minuteOfDay(s.minute) + 1440) % 1440) || 1440 });
const travelTo = (s: GameState, to: LocationId) => (s.player.location === to ? s : run(s, { type: 'TRAVEL', to }, { type: 'SKIP_TO_DONE' }).state);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pilotsOn = (s: GameState) => s.board.filter((o) => o.pilot);

/** An RNG state whose next float satisfies `pred` (to force the next chance() roll). */
function rngStateWhere(pred: (v: number) => boolean): number {
  for (let k = 1; ; k++) if (pred(nextFloat(k)[0])) return k;
}
/** The next roll books (anything above the 2% floor) / never books (above the 90% ceiling). */
const forceYes = (s: GameState) => tweak(s, (t) => (t.rngState = rngStateWhere((v) => v < 0.001)));
const forceNo = (s: GameState) => tweak(s, (t) => (t.rngState = rngStateWhere((v) => v > 0.999)));
/** An Rng that always rolls `v` (0 → every chance() passes, 0.9999 → every chance() fails). */
function fixedRng(v: number): Rng {
  const r = new Rng(0);
  r.float = () => v;
  return r;
}

/** A run on `day` at `hour` (rich enough never to hit the overdraft rule). */
function at(arch: ArchetypeId, seed: number, day: number, hour = 9): GameState {
  const s = tweak(newGame(arch, seed), (t) => (t.player.cash += 100_000));
  return rested(toMinute(s, atHour(day, hour)).state);
}

interface Opened {
  /** At the casting office, ready to submit. */
  ready: GameState;
  opp: Opportunity;
  started: GameState;
  /** Submission finished: callback open. */
  state: GameState;
  events: GameEvent[];
}
/** Submit to a pilot on today's board (optionally reshaped) and finish the submission. */
function openCallback(s0: GameState, opts: { tier?: number; acting?: number; pick?: (o: Opportunity) => boolean } = {}): Opened {
  const target = pilotsOn(s0).find(opts.pick ?? (() => true));
  if (!target) throw new Error('no pilot on the board');
  const ready = rested(
    tweak(travelTo(s0, target.location), (t) => {
      t.player.hasHeadshots = true;
      if (opts.acting !== undefined) t.player.skills.acting = opts.acting;
      if (opts.tier !== undefined) t.board.find((o) => o.id === target.id)!.tier = opts.tier;
    }),
  );
  const opp = ready.board.find((o) => o.id === target.id)!;
  const started = run(ready, { type: 'SUBMIT', opportunityId: opp.id }).state;
  const done = run(started, { type: 'SKIP_TO_DONE' });
  return { ready, opp, started, ...done };
}
/** Answer every remaining beat with `choose` (default: the right read). */
function answer(s: GameState, choose: (best: number, i: number) => number = (b) => b) {
  const cmds: Command[] = s.callback!.beats.slice(s.callback!.picks.length).map((b, i) => ({ type: 'CALLBACK_PICK', read: choose(b.best, i) }));
  return run(s, ...cmds);
}
const wrong = (best: number) => (best + 1) % 3;

function pending(over: Partial<PendingPilot> = {}): PendingPilot {
  return { id: 'pp-test', showTitle: 'Cozy Heights', network: 'KABLE 9', role: 'Hot Detective #2', tier: 2, right: 2, decisionMinute: 0, ...over };
}
/** A series regular on a `tier` show, picked up at 06:00 on day 2 (via the real pickup code, forced yes). */
function onShow(tier: PilotTier, arch: ArchetypeId = 'midwest', seed = 3): GameState {
  const s = toMinute(tweak(newGame(arch, seed), (t) => (t.player.cash += 100_000)), atHour(2, 6)).state;
  return tweak(s, (t) => {
    t.pilots = [pending({ tier, network: NETWORKS[tier][0]!, decisionMinute: t.minute })];
    resolvePilots(t, fixedRng(0), []);
  });
}
/** Shoot this week's episode at the studio lot. */
const shoot = (s: GameState) => run(rested(travelTo(s, STUDIO_LOT)), { type: 'SHOOT_EPISODE' }, { type: 'SKIP_TO_DONE' }).state;

// ---------- calendar and boards ----------

describe('pilot season calendar', () => {
  it('cycle days and season days', () => {
    const table: [number, number, boolean][] = [
      [1, 1, false],
      [7, 7, false],
      [8, 8, true],
      [17, 17, true],
      [18, 18, false],
      [37, 7, false],
      [38, 8, true],
      [47, 17, true],
      [48, 18, false],
    ];
    for (const [day, cd, season] of table) {
      expect(cycleDay(day)).toBe(cd);
      expect(isPilotSeason(day)).toBe(season);
    }
    expect(C.PILOT_SEASON_CYCLE_DAYS).toBe(30);
  });

  it('season boards carry exactly PILOTS_PER_DAY pilots (TV, Acting, tier ≤ min(4, Clout), Burbank/Hollywood), none off-season; the season opens once a cycle', () => {
    for (const arch of ['nepo', 'midwest'] as const) {
      let s = tweak(newGame(arch, 7), (t) => (t.player.cash += 100_000));
      expect(pilotsOn(s)).toEqual([]); // day 1
      const opened: number[] = [];
      for (let d = 2; d <= 48; d++) {
        const r = run(s, { type: 'ADVANCE', minutes: 1440 });
        s = r.state;
        expect(dayOf(s.minute)).toBe(d);
        const pilots = pilotsOn(s);
        const regular = s.board.filter((o) => !o.pilot);
        expect(regular.length).toBeGreaterThan(0);
        if (of(r.events, 'PILOT_SEASON_OPENED').length) opened.push(d);
        // NPC headlines + the season-open trade notice on cycle day 8, nothing else from the industry.
        const industry = of(r.events, 'HEADLINE').filter((e) => !e.headline.own);
        expect(industry).toHaveLength(C.NPC_HEADLINES_PER_DAY + (cycleDay(d) === C.PILOT_SEASON_FIRST ? 1 : 0));
        if (!isPilotSeason(d)) {
          expect(pilots).toEqual([]);
          continue;
        }
        expect(pilots).toHaveLength(C.PILOTS_PER_DAY);
        // Pilots are cast on Clout, not on the manager's extra visible tier.
        const top = Math.min(C.PILOT_MAX_TIER, cloutTier(s.player.rp));
        expect(pilots[0]!.tier).toBe(top);
        for (const o of pilots) {
          expect(o).toMatchObject({ medium: 'tv', skill: 'acting', status: 'open', day: d, prepHours: 0, windowStart: C.SCREEN_WINDOW.start, windowEnd: C.SCREEN_WINDOW.end });
          expect(o.tier).toBeGreaterThanOrEqual(1);
          expect(o.tier).toBeLessThanOrEqual(top);
          expect(PILOT_CASTING_LOCATIONS).toContain(o.location);
          expect(o.templateId).toBe(`pilot-t${o.tier}`);
          expect(NETWORKS[o.tier as PilotTier]).toContain(o.pilot!.network);
          expect(PILOT_ROLES).toContain(o.pilot!.role);
          expect(o.title).toContain(o.pilot!.showTitle);
          expect(o.title.startsWith(PILOT_TIERS[o.tier as PilotTier].label)).toBe(true);
        }
        if (arch === 'midwest') expect(pilots.every((o) => o.tier === 1)).toBe(true);
      }
      expect(opened).toEqual([8, 38]);
    }
  });
});

// ---------- callbacks ----------

describe('callbacks', () => {
  it('submitting to a pilot opens a callback instead of rolling: base odds are the locked submission odds, 3 distinct beats', () => {
    for (const [arch, seed] of [['midwest', 1], ['nepo', 2], ['indie', 3]] as const) {
      const o = openCallback(at(arch, seed, 8));
      expect(o.started.activity!.odds).toBe(oddsFor(o.ready.player, o.opp));
      expect(o.state.activity).toBeNull();
      const cb = o.state.callback!;
      expect(cb).toMatchObject({ opportunityId: o.opp.id, showTitle: o.opp.pilot!.showTitle, network: o.opp.pilot!.network, role: o.opp.pilot!.role, tier: o.opp.tier, picks: [] });
      expect(cb.baseOdds).toBe(o.started.activity!.odds);
      expect(cb.beats).toHaveLength(C.CALLBACK_BEATS);
      expect(new Set(cb.beats.map((b) => b.note)).size).toBe(C.CALLBACK_BEATS);
      for (const b of cb.beats) {
        const src = CALLBACK_BEATS.find((x) => x.note === b.note)!;
        expect(b.reads).toEqual(src.reads);
        expect(b.best).toBe(src.best);
        if (b.sensed !== null) expect(b.sensed).toBe(b.best);
      }
      expect(types(o.events)).toContain('CALLBACK_STARTED');
      for (const t of ['BOOKED', 'REJECTED', 'EXPOSED', 'CALLBACK_DONE'] as const) expect(types(o.events)).not.toContain(t);
      expect(o.state.board.find((x) => x.id === o.opp.id)!.status).toBe('open');
      expect(o.state.player.cash).toBe(o.ready.player.cash - submissionFee(o.ready.player, o.opp));
    }
  });

  it('while a callback is open everything else is blocked; ADVANCE (and SKIP_TO_DONE’s own rule) still apply', () => {
    const s = openCallback(at('midwest', 1, 8)).state;
    const blocked: Command[] = [
      { type: 'TRAVEL', to: 'weho' },
      { type: 'SLEEP', hours: 8 },
      { type: 'START_JOB', jobId: 'barista' },
      { type: 'TAKE_CLASS', skill: 'acting' },
      { type: 'SUBMIT', opportunityId: s.board[0]!.id },
      { type: 'PREP', opportunityId: s.board[0]!.id, hours: 1 },
      { type: 'SHOOT_EPISODE' },
      { type: 'START_PROJECT', scale: 'short' },
      { type: 'MAKE_BEAT' },
      { type: 'LEISURE', leisureId: 'beach' },
    ];
    for (const cmd of blocked) {
      expect(whyNot(s, cmd)).toMatch(/Finish your callback first/);
      expect(step(s, cmd).events).toEqual([{ type: 'ACTION_REJECTED', reason: whyNot(s, cmd) }]);
    }
    expect(whyNot(s, { type: 'ADVANCE', minutes: 10 })).toBeNull();
    expect(whyNot(s, { type: 'SKIP_TO_DONE' })).toBe('Nothing to skip.');
    expect(whyNot(s, { type: 'NEW_RUN', archetype: 'nepo', seed: 1 })).toBeNull();
    expect(whyNot(s, { type: 'CALLBACK_PICK', read: 0 })).toBeNull();
  });

  it('CALLBACK_PICK validation', () => {
    expect(whyNot(newGame('midwest', 1), { type: 'CALLBACK_PICK', read: 0 })).toBe('No callback right now.');
    const s = openCallback(at('midwest', 1, 8)).state;
    for (const read of [-1, 3, 1.5, Number.NaN]) expect(whyNot(s, { type: 'CALLBACK_PICK', read })).toBe('Pick one of the three reads.');
    for (const read of [0, 1, 2]) expect(whyNot(s, { type: 'CALLBACK_PICK', read })).toBeNull();
    const r = run(s, { type: 'CALLBACK_PICK', read: 1 });
    expect(r.state.callback!.picks).toEqual([1]);
    expect(of(r.events, 'CALLBACK_READ')).toEqual([{ type: 'CALLBACK_READ', beat: 1, read: 1, right: s.callback!.beats[0]!.best === 1 }]);
  });

  it('final odds = callbackOdds(base, right reads), for every number of right reads', () => {
    const o = openCallback(at('midwest', 2, 9));
    for (let right = 0; right <= 3; right++) {
      const r = answer(o.state, (best, i) => (i < right ? best : wrong(best)));
      const done = of(r.events, 'CALLBACK_DONE')[0]!;
      expect(done.right).toBe(right);
      expect(done.odds).toBe(callbackOdds(o.state.callback!.baseOdds, right));
      expect(r.state.callback).toBeNull();
    }
  });

  it('booked: PILOT_FEE_MULTIPLIER × the TV fee (union rate included), RP, skill, bookings, and a pilot decided at 06:00 seven days later', () => {
    for (const [tier, union] of [[1, false], [3, false], [2, true]] as const) {
      const o = openCallback(at('indie', 4, 10), { tier });
      const before = forceYes(tweak(o.state, (t) => (t.player.guilds.acting.member = union)));
      const r = answer(before, (best, i) => (i === 0 ? wrong(best) : best));
      const base = bookingPayout('tv', tier, union);
      const pay = base.pay * C.PILOT_FEE_MULTIPLIER;
      const done = of(r.events, 'CALLBACK_DONE')[0]!;
      expect(done).toMatchObject({ booked: true, right: 2, pay, odds: callbackOdds(before.callback!.baseOdds, 2) });
      // The board showed the same fee the booking pays.
      expect(opportunityView(before, before.board.find((x) => x.id === o.opp.id)!).pay).toBe(pay);
      const s = r.state;
      expect(s.player.cash).toBe(before.player.cash + pay);
      expect(s.player.rp).toBe(before.player.rp + base.rp);
      expect(s.player.network).toBe(before.player.network + base.network);
      expect(s.player.skills.acting).toBe(before.player.skills.acting + C.BOOKED_SKILL_GAIN);
      expect(s.stats.bookings).toBe(before.stats.bookings + 1);
      expect(s.stats.totalEarned).toBe(before.stats.totalEarned + pay);
      expect(s.board.find((x) => x.id === o.opp.id)!.status).toBe('booked');
      expect(s.pilots).toHaveLength(1);
      expect(s.pilots[0]).toMatchObject({ showTitle: o.opp.pilot!.showTitle, network: o.opp.pilot!.network, role: o.opp.pilot!.role, tier, right: 2 });
      expect(s.pilots[0]!.decisionMinute).toBe(atHour(dayOf(before.minute) + C.PILOT_DECISION_DAYS, C.BILLS_HOUR));
      expect(types(r.events)).not.toContain('BOOKED');
    }
  });

  it('rejected: the audition is rejected, no pending pilot, and pilots never expose you (even at Acting 0, tier 4)', () => {
    const o = openCallback(at('nepo', 5, 11), { tier: 4, acting: 0 });
    expect(isExposure(0, 4)).toBe(true);
    expect(opportunityView(o.ready, o.opp).exposureRisk).toBe(false);
    const before = forceNo(o.state);
    const r = answer(before, wrong);
    expect(of(r.events, 'CALLBACK_DONE')[0]).toMatchObject({ booked: false, right: 0, pay: 0 });
    expect(types(r.events)).not.toContain('EXPOSED');
    expect(r.state.board.find((x) => x.id === o.opp.id)!.status).toBe('rejected');
    expect(r.state.pilots).toEqual([]);
    expect(r.state.player.rp).toBe(before.player.rp);
    expect(r.state.player.cash).toBe(before.player.cash);
    // Unforced, over many seeds: no pilot callback ever exposes.
    for (let seed = 1; seed <= 12; seed++) {
      const x = openCallback(at('producer', seed, 12), { acting: 0, tier: 1 });
      const y = answer(x.state, wrong);
      expect(types([...x.events, ...y.events])).not.toContain('EXPOSED');
      expect(y.state.player.rp).toBeGreaterThanOrEqual(x.state.player.rp);
    }
  });

  it('an unfinished callback resolves at the next 06:00, unanswered beats counted wrong', () => {
    const o = openCallback(at('midwest', 6, 8));
    const one = run(o.state, { type: 'CALLBACK_PICK', read: o.state.callback!.beats[0]!.best }).state;
    const later = run(one, { type: 'ADVANCE', minutes: 60 });
    expect(later.state.callback).not.toBeNull();
    expect(types(later.events)).not.toContain('CALLBACK_DONE');
    const r = toNextSix(later.state);
    const done = of(r.events, 'CALLBACK_DONE');
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({ right: 1, odds: callbackOdds(o.state.callback!.baseOdds, 1) });
    expect(r.state.callback).toBeNull();
    expect(minuteOfDay(r.state.minute)).toBe(6 * 60);
    // It resolves after the bills and the new board, before the networks decide.
    const order = types(r.events);
    expect(order.indexOf('BOARD_REFRESHED')).toBeLessThan(order.indexOf('CALLBACK_DONE'));
    if (done[0]!.booked) expect(r.state.pilots[0]!.decisionMinute).toBe(atHour(dayOf(r.state.minute) + C.PILOT_DECISION_DAYS, 6));
    // Afterwards normal commands work again.
    expect(whyNot(rested(r.state), { type: 'TRAVEL', to: 'weho' })).toBeNull();
  });

  it('the sensed read is always the right one, and the sense rate ≈ callbackSenseChance(Acting)', () => {
    const s0 = at('midwest', 1, 8);
    const opp = pilotsOn(s0)[0]!;
    const a: Activity = { kind: 'submit', label: '', startMinute: 0, endMinute: 0, energyPerMinute: 0, sparkPerMinute: 0, carPerMinute: 0, odds: 0.3 };
    for (const acting of [5, 40, 90]) {
      const s = tweak(s0, (t) => (t.player.skills.acting = acting));
      let sensed = 0;
      let total = 0;
      for (let seed = 1; seed <= 1500; seed++) {
        s.callback = null;
        startCallback(s, a, opp, new Rng(seed), []);
        for (const b of s.callback!.beats) {
          total += 1;
          if (b.sensed !== null) {
            sensed += 1;
            expect(b.sensed).toBe(b.best);
          }
        }
        expect(s.callback!.baseOdds).toBe(0.3);
      }
      expect(Math.abs(sensed / total - callbackSenseChance(acting))).toBeLessThan(0.03);
    }
  });
});

// ---------- pickups ----------

describe('network decisions', () => {
  function bookedPilot(seed = 2): { state: GameState; right: number } {
    const o = openCallback(at('midwest', seed, 9));
    const r = answer(forceYes(o.state), (best, i) => (i === 2 ? wrong(best) : best));
    expect(r.state.pilots).toHaveLength(1);
    return { state: r.state, right: 2 };
  }

  it('the decision comes exactly at the due 06:00, with pickupOdds(right, Clout, tier)', () => {
    const { state, right } = bookedPilot();
    const p = state.pilots[0]!;
    const before = toMinute(state, p.decisionMinute - 1);
    expect(types(before.events)).not.toContain('PILOT_DECIDED');
    expect(before.state.pilots).toHaveLength(1);
    expect(tvView(before.state).pilots[0]!.pickupOdds).toBe(pickupOdds(right, cloutTier(before.state.player.rp), p.tier));
    const r = run(before.state, { type: 'ADVANCE', minutes: 1 });
    const d = of(r.events, 'PILOT_DECIDED');
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ showTitle: p.showTitle, network: p.network, odds: pickupOdds(right, cloutTier(r.state.player.rp), p.tier) });
    expect(d[0]!.tookIt).toBe(d[0]!.pickedUp);
    expect(r.state.pilots).toEqual([]);
    expect(r.state.contract !== null).toBe(d[0]!.pickedUp);
  });

  it('a pickup makes you a series regular on that tier’s terms', () => {
    for (const tier of [1, 2, 3, 4] as const) {
      const s = onShow(tier);
      const info = PILOT_TIERS[tier];
      expect(s.contract).toEqual({
        kind: 'actor',
        favor: C.FAVOR_START,
        roomScores: [],
        showTitle: 'Cozy Heights',
        network: NETWORKS[tier][0],
        role: 'Hot Detective #2',
        tier,
        weeklyPay: info.weeklyPay,
        episodesTotal: info.episodes,
        episodesDone: 0,
        episodesMissed: 0,
        shotThisWeek: false,
        weekEndMinute: s.minute + 7 * C.MINUTES_PER_DAY,
      });
      expect(s.pilots).toEqual([]);
    }
  });

  it('a pass is a headline and nothing else; a second pickup while on a show is passed on by your agent', () => {
    const s = toMinute(newGame('midwest', 3), atHour(2, 6)).state;
    const passEvents: GameEvent[] = [];
    const passed = tweak(s, (t) => {
      t.pilots = [pending({ decisionMinute: t.minute })];
      resolvePilots(t, fixedRng(0.9999), passEvents);
    });
    expect(types(passEvents)).toEqual(['PILOT_DECIDED', 'HEADLINE']);
    expect(passEvents[0]).toMatchObject({ pickedUp: false, tookIt: false });
    expect(passed.contract).toBeNull();
    expect(passed.pilots).toEqual([]);
    expect(passed.player).toEqual(s.player);

    // Not due yet: nothing happens.
    const early = tweak(s, (t) => {
      t.pilots = [pending({ decisionMinute: t.minute + 1 })];
      resolvePilots(t, fixedRng(0), []);
    });
    expect(early.pilots).toHaveLength(1);
    expect(early.contract).toBeNull();

    const show = onShow(2);
    const agentEvents: GameEvent[] = [];
    const second = tweak(show, (t) => {
      t.pilots = [pending({ id: 'pp-2', showTitle: 'Malibu Medical', tier: 4, decisionMinute: t.minute })];
      resolvePilots(t, fixedRng(0), agentEvents);
    });
    expect(agentEvents[0]).toMatchObject({ type: 'PILOT_DECIDED', showTitle: 'Malibu Medical', pickedUp: true, tookIt: false });
    expect(agentEvents[1]!.type).toBe('HEADLINE');
    expect(second.contract).toEqual(show.contract);
    expect(second.pilots).toEqual([]);
  });
});

// ---------- series-regular contracts ----------

describe('series-regular contracts', () => {
  it('SHOOT_EPISODE rules: no show, already shot, not at the lot, too tired', () => {
    expect(whyNot(newGame('midwest', 1), { type: 'SHOOT_EPISODE' })).toMatch(/not on a show/);
    const s = rested(onShow(2));
    expect(s.player.location).not.toBe(STUDIO_LOT);
    expect(whyNot(s, { type: 'SHOOT_EPISODE' })).toBe(`Report to set in ${LOCATIONS[STUDIO_LOT].name}.`);
    const lot = rested(travelTo(s, STUDIO_LOT));
    expect(whyNot(lot, { type: 'SHOOT_EPISODE' })).toBeNull();
    expect(whyNot(tweak(lot, (t) => (t.player.energy = C.MIN_ENERGY_TO_START - 1)), { type: 'SHOOT_EPISODE' })).toMatch(/exhausted/);
    const shot = shoot(lot);
    expect(whyNot(rested(shot), { type: 'SHOOT_EPISODE' })).toMatch(/in the can/);
  });

  it('an episode is 8h and −35 Energy on set, and pays +10·tier RP when it wraps', () => {
    for (const tier of [1, 3] as const) {
      const lot = rested(travelTo(onShow(tier), STUDIO_LOT));
      const started = run(lot, { type: 'SHOOT_EPISODE' }).state;
      const a = started.activity!;
      expect(a.kind).toBe('episode');
      expect(a.endMinute - a.startMinute).toBe(C.EPISODE_HOURS * 60);
      expect(a.energyPerMinute * C.EPISODE_HOURS * 60).toBeCloseTo(C.EPISODE_ENERGY, 9);
      const r = run(started, { type: 'SKIP_TO_DONE' });
      expect(of(r.events, 'EPISODE_SHOT')).toEqual([{ type: 'EPISODE_SHOT', showTitle: 'Cozy Heights', episode: 1, rp: C.EPISODE_RP_PER_TIER * tier }]);
      expect(r.state.player.rp).toBe(lot.player.rp + C.EPISODE_RP_PER_TIER * tier);
      expect(r.state.contract!.shotThisWeek).toBe(true);
      expect(r.state.player.cash).toBe(lot.player.cash);
    }
  });

  it('weekly pay: full when shot, MISSED_EPISODE_PAY and −10·tier RP when missed; cash and RP change only by the reported amounts', () => {
    const tier = 2;
    let s = tweak(onShow(tier), (t) => (t.player.rp = 500));
    const weekly = PILOT_TIERS[tier].weeklyPay;

    // Week 1: shot.
    s = shoot(s);
    let before = s;
    let r = toMinute(s, s.contract!.weekEndMinute);
    let week = of(r.events, 'EPISODE_WEEK');
    expect(week).toEqual([{ type: 'EPISODE_WEEK', showTitle: 'Cozy Heights', episode: 1, pay: weekly, missed: false, rpLost: 0 }]);
    const bills1 = sum(of(r.events, 'BILLS_CHARGED').map((e) => e.amount));
    expect(r.state.player.cash).toBe(before.player.cash + weekly - bills1);
    expect(r.state.player.rp).toBe(before.player.rp);
    expect(r.state.contract).toMatchObject({ episodesDone: 1, episodesMissed: 0, shotThisWeek: false, weekEndMinute: before.contract!.weekEndMinute + 7 * 1440 });

    // Week 2: missed.
    before = r.state;
    r = toMinute(before, before.contract!.weekEndMinute);
    week = of(r.events, 'EPISODE_WEEK');
    const rpLost = C.EPISODE_RP_PER_TIER * tier;
    expect(week).toEqual([{ type: 'EPISODE_WEEK', showTitle: 'Cozy Heights', episode: 2, pay: Math.round(weekly * C.MISSED_EPISODE_PAY), missed: true, rpLost }]);
    const bills2 = sum(of(r.events, 'BILLS_CHARGED').map((e) => e.amount));
    expect(r.state.player.cash).toBe(before.player.cash + Math.round(weekly * C.MISSED_EPISODE_PAY) - bills2);
    expect(r.state.player.rp).toBe(before.player.rp - rpLost);
    expect(r.state.contract).toMatchObject({ episodesDone: 2, episodesMissed: 1 });
    expect(r.state.trades.some((h) => h.own && h.minute === r.state.minute)).toBe(true);
    // Tuning intent (LAG-76): a missed week costs more than a barista shift pays, even at tier 1.
    expect(PILOT_TIERS[1].weeklyPay * (1 - C.MISSED_EPISODE_PAY)).toBeGreaterThan(JOBS.barista.pay);

    // RP never goes below 0, and the event reports what was actually lost.
    const broke = tweak(r.state, (t) => (t.player.rp = 5));
    const r3 = toMinute(broke, broke.contract!.weekEndMinute);
    expect(of(r3.events, 'EPISODE_WEEK')[0]).toMatchObject({ missed: true, rpLost: 5 });
    expect(r3.state.player.rp).toBe(0);
  });

  it('the season wraps after episodesTotal weeks into a credit; quality = % of episodes shot', () => {
    let s = onShow(1);
    const { episodesTotal, role, network, showTitle } = s.contract!;
    expect(episodesTotal).toBe(PILOT_TIERS[1].episodes);
    const events: GameEvent[] = [];
    for (let w = 1; w <= episodesTotal; w++) {
      if (w !== 2) s = shoot(s);
      const r = toMinute(s, s.contract!.weekEndMinute);
      events.push(...r.events);
      s = r.state;
      if (w < episodesTotal) expect(s.contract!.episodesDone).toBe(w);
    }
    expect(s.contract).toBeNull();
    expect(of(events, 'SERIES_WRAPPED')).toEqual([{ type: 'SERIES_WRAPPED', showTitle, episodes: episodesTotal, missed: 1 }]);
    expect(of(events, 'EPISODE_WEEK')).toHaveLength(episodesTotal);
    expect(s.credits[0]).toEqual({
      title: showTitle,
      medium: 'tv',
      scale: 'Web series',
      quality: Math.round((100 * (episodesTotal - 1)) / episodesTotal),
      outcome: `Series regular (${role}) on ${network}, ${episodesTotal} episodes`,
      minute: s.minute,
    });
    expect(whyNot(rested(travelTo(s, STUDIO_LOT)), { type: 'SHOOT_EPISODE' })).toMatch(/not on a show/);
    // Nothing more is paid after the wrap.
    const after = run(s, { type: 'ADVANCE', minutes: 8 * 1440 });
    expect(types(after.events)).not.toContain('EPISODE_WEEK');
  });
});

// ---------- saves, determinism, views ----------

describe('pilot season saves, determinism and views', () => {
  it('a v5 save (no callback, pilots or contract) migrates to the current version and pilot season still works', () => {
    const s = newGame('midwest', 1);
    const { callback: _c, pilots: _p, contract: _k, ...rest } = s;
    const v5 = JSON.stringify({ version: 5, savedAt: 0, state: { ...rest, version: 5 } });
    const m = deserialize(v5)!;
    expect(m.version).toBe(C.SAVE_VERSION);
    expect(m.callback).toBeNull();
    expect(m.pilots).toEqual([]);
    expect(m.contract).toBeNull();
    expect(m).toEqual(s);
    const season = rested(toMinute(tweak(m, (t) => (t.player.cash += 100_000)), atHour(8, 9)).state);
    expect(pilotsOn(season)).toHaveLength(C.PILOTS_PER_DAY);
    expect(openCallback(season).state.callback).not.toBeNull();
  });

  it('saves with an open callback, a pending pilot or a contract round-trip unchanged', () => {
    const o = openCallback(at('nepo', 3, 9));
    const partial = run(o.state, { type: 'CALLBACK_PICK', read: 2 }).state;
    const booked = answer(forceYes(o.state)).state;
    const show = shoot(onShow(3));
    for (const s of [o.state, partial, booked, show]) {
      const back = deserialize(serialize(s, 123))!;
      expect(back).toEqual(s);
      expect(run(back, { type: 'ADVANCE', minutes: 2 * 1440 }).state).toEqual(run(s, { type: 'ADVANCE', minutes: 2 * 1440 }).state);
    }
    expect(booked.pilots).toHaveLength(1);
    expect(show.contract!.shotThisWeek).toBe(true);
  });

  /** Chase pilots through the first season (sensed read, else 0), wait for the network, shoot every episode. */
  function pilotCareer(seed: number): GameState {
    let s = tweak(newGame('midwest', seed), (t) => (t.player.cash += 100_000));
    for (let d = 8; d <= 17; d++) {
      s = rested(toMinute(s, atHour(d, 9)).state);
      if (s.pilots.length || s.contract || !pilotsOn(s).length) continue;
      const open = openCallback(s).state;
      s = answer(open, (_best, i) => open.callback!.beats[i]!.sensed ?? 0).state;
    }
    while (s.pilots.length) s = toMinute(s, s.pilots[0]!.decisionMinute).state;
    while (s.contract) s = toMinute(shoot(s), s.contract!.weekEndMinute).state;
    return s;
  }

  it('same seed + same commands = identical state through pilot → pickup → a full season', () => {
    let seed = 1;
    let a = pilotCareer(seed);
    while (!a.credits.some((c) => c.medium === 'tv') && seed < 40) a = pilotCareer(++seed);
    expect(a.credits.find((c) => c.medium === 'tv')).toMatchObject({ scale: 'Web series', quality: 100 });
    expect(a).toEqual(pilotCareer(seed));
  });

  it('tvView and opportunityView never throw, in and out of season, with a callback, pilots and a contract', () => {
    const o = openCallback(at('nepo', 2, 8));
    const states: GameState[] = [
      newGame('midwest', 1),
      at('midwest', 1, 7),
      at('nepo', 2, 8),
      at('indie', 3, 17),
      at('producer', 4, 18),
      o.state,
      run(o.state, { type: 'CALLBACK_PICK', read: 0 }).state,
      run(o.state, { type: 'CALLBACK_PICK', read: 0 }, { type: 'CALLBACK_PICK', read: 1 }).state,
      answer(forceYes(o.state)).state,
      answer(forceNo(o.state)).state,
      onShow(4),
      shoot(onShow(1)),
      tweak(onShow(2), (t) => (t.pilots = [pending({ decisionMinute: t.minute + 1440 })])),
    ];
    for (const s of states) {
      expect(() => tvView(s)).not.toThrow();
      for (const opp of s.board) expect(() => opportunityView(s, opp)).not.toThrow();
      const v = tvView(s);
      expect(v.season.active).toBe(isPilotSeason(dayOf(s.minute)));
      expect(v.season.dayOfCycle).toBe(cycleDay(dayOf(s.minute)));
      expect(v.callback !== null).toBe(s.callback !== null);
      expect(v.pilots).toHaveLength(s.pilots.length);
      expect(v.contract !== null).toBe(s.contract !== null);
      if (v.contract) expect(v.contract.disabledReason).toBe(whyNot(s, { type: 'SHOOT_EPISODE' }));
      if (v.callback) {
        const cb = s.callback!;
        const right = cb.picks.filter((p, i) => p === cb.beats[i]!.best).length;
        const left = cb.beats.length - cb.picks.length;
        expect(v.callback.beatIndex).toBe(cb.picks.length);
        expect(v.callback.oddsIfRight).toBe(callbackOdds(cb.baseOdds, right + left));
        expect(v.callback.oddsIfWrong).toBe(callbackOdds(cb.baseOdds, right));
        expect(v.callback.pick(1)).toEqual({ type: 'CALLBACK_PICK', read: 1 });
      }
      for (const opp of s.board.filter((x) => x.pilot)) {
        const ov = opportunityView(s, opp);
        expect(ov.pilot!.label).toBe(PILOT_TIERS[opp.tier as PilotTier].label);
        expect(ov.exposureRisk).toBe(false);
      }
    }
    // Countdown: day 7 → 1 day to go; day 8 → 10 days left; day 17 → last day; day 18 → 20 days to the next season.
    expect(tvView(at('midwest', 1, 7)).season).toEqual({ active: false, dayOfCycle: 7, daysLeft: 0, startsInDays: 1 });
    expect(tvView(at('midwest', 1, 8)).season).toEqual({ active: true, dayOfCycle: 8, daysLeft: 10, startsInDays: 0 });
    expect(tvView(at('midwest', 1, 17)).season).toEqual({ active: true, dayOfCycle: 17, daysLeft: 1, startsInDays: 0 });
    expect(tvView(at('midwest', 1, 18)).season).toEqual({ active: false, dayOfCycle: 18, daysLeft: 0, startsInDays: 20 });
  });
});
