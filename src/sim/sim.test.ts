import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { ARCHETYPE_IDS } from './content/archetypes';
import { LEISURE_IDS, LOCATION_IDS } from './content/locations';
import { OPPORTUNITY_TEMPLATES } from './content/opportunities';
import { atHour, dayOf, hourOf, minuteOfDay } from './formulas';
import { newGame, step, whyNot } from './reducer';
import { Rng } from './rng';
import { deserialize, migrate, serialize } from './save';
import type { Command, GameEvent, GameState, Opportunity } from './types';

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

const advanceTo = (s: GameState, minute: number) => run(s, { type: 'ADVANCE', minutes: minute - s.minute });
const types = (events: GameEvent[]) => events.map((e) => e.type);

function withOpp(s: GameState, opp: Partial<Opportunity>): GameState {
  const t = structuredClone(s);
  const base: Opportunity = {
    id: 'test-opp',
    templateId: 't',
    title: 'Test Gig',
    medium: 'music',
    skill: 'music',
    tier: 1,
    location: t.player.location,
    windowStart: 19,
    windowEnd: 23,
    day: dayOf(t.minute),
    prepHours: 0,
    status: 'open',
    ...opp,
  };
  t.board = [base];
  return t;
}

describe('new game', () => {
  it.each(ARCHETYPE_IDS)('%s starts on day 1 at 08:00 at home with a mixed board', (id) => {
    const s = newGame(id, 1);
    expect(dayOf(s.minute)).toBe(1);
    expect(hourOf(s.minute)).toBe(8);
    expect(s.player.location).toBe(s.player.home);
    expect(s.board.length).toBeGreaterThanOrEqual(C.OPP_BOARD_MIN);
    expect(new Set(s.board.map((o) => o.medium))).toEqual(new Set(['film', 'tv', 'music']));
    expect(s.trades.length).toBe(C.NPC_HEADLINES_PER_DAY);
  });

  it('the Nepo Baby sees one tier above Clout (Tier 4 at Clout 3); others only their tier', () => {
    for (let seed = 1; seed < 20; seed++) {
      expect(Math.max(...newGame('nepo', seed).board.map((o) => o.tier))).toBeLessThanOrEqual(4);
      expect(Math.max(...newGame('midwest', seed).board.map((o) => o.tier))).toBe(1);
    }
  });

  it('every tier has film, TV and music rows testing all four skills somewhere', () => {
    for (let tier = 1; tier <= 10; tier++) {
      const rows = OPPORTUNITY_TEMPLATES.filter((t) => t.tier === tier);
      expect(new Set(rows.map((r) => r.medium)).size).toBe(3);
      expect(new Set(rows.map((r) => r.skill)).size).toBe(4);
    }
  });
});

describe('clock and bills', () => {
  it('charges rent + food + car at exactly 06:00', () => {
    const s = newGame('midwest', 1);
    const before = advanceTo(s, atHour(2, 6) - 1).state;
    expect(before.player.cash).toBe(1200);
    const after = run(before, { type: 'ADVANCE', minutes: 1 });
    expect(after.state.player.cash).toBe(1200 - 55);
    expect(types(after.events)).toContain('BILLS_CHARGED');
    expect(types(after.events)).toContain('BOARD_REFRESHED');
  });

  it('awake drains 1.5 Energy per hour', () => {
    const s = advanceTo(newGame('indie', 1), atHour(1, 10)).state;
    expect(s.player.energy).toBeCloseTo(97, 5);
  });
});

describe('actions occupy time', () => {
  it('North Hollywood → Santa Monica at 08:00 takes 120 minutes, $6 gas, 12 energy', () => {
    const s = newGame('producer', 1);
    const started = run(s, { type: 'TRAVEL', to: 'santamonica' }).state;
    expect(started.activity?.endMinute).toBe(s.minute + 120);
    expect(started.player.cash).toBe(2500 - 6);
    expect(whyNot(started, { type: 'SLEEP', hours: 8 })).toMatch(/Busy/);
    const done = run(started, { type: 'SKIP_TO_DONE' });
    expect(done.state.player.location).toBe('santamonica');
    expect(done.state.minute).toBe(s.minute + 120);
    expect(done.state.player.energy).toBeCloseTo(100 - 12 - 3, 5);
    expect(types(done.events)).toContain('ARRIVED');
  });

  it('barista needs West Hollywood and a 06:00–12:00 start; pays $130 after 6 hours', () => {
    const s = newGame('nepo', 1);
    expect(whyNot(s, { type: 'START_JOB', jobId: 'pa' })).toMatch(/Burbank/);
    const done = run(s, { type: 'START_JOB', jobId: 'barista' }, { type: 'SKIP_TO_DONE' }).state;
    expect(done.player.cash).toBe(25000 + 130);
    expect(done.minute).toBe(s.minute + 6 * 60);
    const late = advanceTo(s, atHour(1, 13)).state;
    expect(whyNot(late, { type: 'START_JOB', jobId: 'barista' })).toMatch(/06:00/);
  });

  it('rideshare nets $18/hour and is blocked with a dead car', () => {
    const s = newGame('indie', 1);
    const done = run(s, { type: 'START_JOB', jobId: 'rideshare', hours: 3 }, { type: 'SKIP_TO_DONE' }).state;
    expect(done.player.cash).toBe(4000 + 54);
    expect(done.player.carHealth).toBeCloseTo(100 - 4.5, 5);
    const dead = structuredClone(s);
    dead.player.carHealth = 0;
    expect(whyNot(dead, { type: 'START_JOB', jobId: 'rideshare', hours: 2 })).toMatch(/dead/);
  });

  it('sleep only at home; restores 12 Energy/hour (Midwest +20%)', () => {
    const tired = structuredClone(newGame('midwest', 1));
    tired.player.energy = 10;
    const slept = run(tired, { type: 'SLEEP', hours: 2 }, { type: 'SKIP_TO_DONE' }).state;
    expect(slept.player.energy).toBeCloseTo(10 + 2 * 12 * 1.2, 5);
    const away = run(tired, { type: 'TRAVEL', to: 'burbank' }, { type: 'SKIP_TO_DONE' }).state;
    expect(whyNot(away, { type: 'SLEEP', hours: 2 })).toMatch(/home/);
  });

  it('working while exhausted builds Burnout and triggers Creative Burnout at 60', () => {
    let s = structuredClone(newGame('indie', 1));
    s.player.energy = 6;
    s.player.burnout = 55;
    const r = run(s, { type: 'START_JOB', jobId: 'rideshare', hours: 2 }, { type: 'SKIP_TO_DONE' });
    s = r.state;
    expect(s.player.burnout).toBeGreaterThan(60);
    expect(s.player.creativeBurnout).toBe(true);
    expect(types(r.events)).toContain('CREATIVE_BURNOUT_STARTED');
  });

  it('a class in Hollywood costs $60 and adds +3 skill', () => {
    let s = run(newGame('indie', 1), { type: 'TRAVEL', to: 'hollywood' }, { type: 'SKIP_TO_DONE' }).state;
    const cash = s.player.cash;
    s = run(s, { type: 'TAKE_CLASS', skill: 'acting' }, { type: 'SKIP_TO_DONE' }).state;
    expect(s.player.skills.acting).toBe(15 + 3);
    expect(s.player.cash).toBe(cash - 60);
  });
});

describe('opportunities', () => {
  it('submission only inside the window and at the location', () => {
    const s = withOpp(newGame('producer', 1), {});
    expect(whyNot(s, { type: 'SUBMIT', opportunityId: 'test-opp' })).toMatch(/Window/);
    const evening = advanceTo(s, atHour(1, 19)).state;
    expect(whyNot(evening, { type: 'SUBMIT', opportunityId: 'test-opp' })).toBeNull();
    const lastSlot = advanceTo(s, atHour(1, 22) + 1).state;
    expect(whyNot(lastSlot, { type: 'SUBMIT', opportunityId: 'test-opp' })).toMatch(/Window/);
    const elsewhere = withOpp(evening, { location: 'santamonica' });
    expect(whyNot(elsewhere, { type: 'SUBMIT', opportunityId: 'test-opp' })).toMatch(/Santa Monica/);
  });

  it('prep raises the locked-in odds to the reference value (Producer music 4h → 89.7%)', () => {
    let s = withOpp(newGame('producer', 1), {});
    s = run(s, { type: 'PREP', opportunityId: 'test-opp', hours: 4 }, { type: 'SKIP_TO_DONE' }).state;
    expect(s.board[0]!.prepHours).toBe(4);
    s = advanceTo(s, atHour(1, 19)).state;
    s.player.spark = 60;
    const started = run(s, { type: 'SUBMIT', opportunityId: 'test-opp' }).state;
    expect(started.activity!.odds! * 100).toBeCloseTo(89.7, 0);
    expect(started.player.cash).toBe(s.player.cash); // home studio: demos are free
  });

  it('every submission ends booked, rejected or exposed, and shows in The Trades', () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      let s = withOpp(newGame('producer', seed), {});
      s = advanceTo(s, atHour(1, 19)).state;
      const r = run(s, { type: 'SUBMIT', opportunityId: 'test-opp' }, { type: 'SKIP_TO_DONE' });
      const result = r.events.find((e) => e.type === 'BOOKED' || e.type === 'REJECTED' || e.type === 'EXPOSED');
      expect(result).toBeDefined();
      outcomes.add(result!.type);
      expect(r.state.trades[0]!.own).toBe(true);
      expect(r.state.board[0]!.status).not.toBe('open');
      if (result!.type === 'BOOKED') {
        expect(r.state.player.cash).toBe(s.player.cash + 75);
        expect(r.state.player.network).toBe(5 + 3);
        expect(r.state.player.skills.music).toBe(42);
      }
    }
    expect(outcomes.has('BOOKED')).toBe(true);
    expect(outcomes.has('REJECTED')).toBe(true);
  });

  it('a weak skill gets exposed on failure and loses RP (Nepo double)', () => {
    let s = withOpp(newGame('nepo', 3), { skill: 'acting', medium: 'film', tier: 3, windowStart: 9, windowEnd: 17 });
    s.player.hasHeadshots = true;
    s = advanceTo(s, atHour(1, 9)).state;
    let exposed = false;
    for (let seed = 0; seed < 30 && !exposed; seed++) {
      const t = structuredClone(s);
      t.rngState = seed;
      const r = run(t, { type: 'SUBMIT', opportunityId: 'test-opp' }, { type: 'SKIP_TO_DONE' });
      const e = r.events.find((x) => x.type === 'EXPOSED');
      if (e && e.type === 'EXPOSED') {
        exposed = true;
        expect(e.rpLost).toBe(180);
        expect(r.state.player.rp).toBe(400 - 180);
        expect(r.events.map((x) => x.type)).toContain('TIER_CHANGED');
      }
    }
    expect(exposed).toBe(true);
  });

  it('tier 2+ requires headshots', () => {
    let s = withOpp(newGame('nepo', 1), { tier: 2, location: 'weho' });
    s = advanceTo(s, atHour(1, 19)).state;
    expect(whyNot(s, { type: 'SUBMIT', opportunityId: 'test-opp' })).toMatch(/headshots/);
  });
});

describe('overdraft and moving home', () => {
  it('with no income the Midwest Transplant goes broke on day 23 and moves home 3 days later', () => {
    let s = newGame('midwest', 1);
    const all: GameEvent[] = [];
    while (s.status === 'playing' && dayOf(s.minute) < 40) {
      const r = run(s, { type: 'ADVANCE', minutes: 600 });
      s = r.state;
      all.push(...r.events);
    }
    expect(dayOf(s.stats.brokeMinute!)).toBe(23);
    expect(s.status).toBe('movedHome');
    expect(s.minute - s.stats.brokeMinute!).toBe(3 * C.MINUTES_PER_DAY);
    expect(types(all)).toContain('OVERDRAFT_STARTED');
    expect(types(all)).toContain('MOVED_BACK_HOME');
    expect(s.stats.endHeadline).toBeTruthy();
    expect(whyNot(s, { type: 'SLEEP', hours: 1 })).toMatch(/moved back home/);
  });

  it('getting back to $0 clears the overdraft', () => {
    const s = structuredClone(newGame('indie', 1));
    s.player.cash = -10;
    let r = run(s, { type: 'ADVANCE', minutes: 1 });
    expect(r.state.overdraft).not.toBeNull();
    r = run(r.state, { type: 'START_JOB', jobId: 'rideshare', hours: 1 }, { type: 'SKIP_TO_DONE' });
    expect(r.state.overdraft).toBeNull();
    expect(types(r.events)).toContain('OVERDRAFT_CLEARED');
  });

  it('a new run after moving home keeps 25% of Network', () => {
    const s = structuredClone(newGame('nepo', 1));
    s.status = 'movedHome';
    s.player.network = 60;
    const next = step(s, { type: 'NEW_RUN', archetype: 'midwest', seed: 9 }).state;
    expect(next.player.network).toBe(15);
    expect(next.status).toBe('playing');
  });
});

describe('invariants', () => {
  function randomCommands(seed: number, n: number): Command[] {
    const r = new Rng(seed);
    const cmds: Command[] = [];
    for (let i = 0; i < n; i++) {
      const roll = r.int(0, 15);
      // Sprint 10 (LAG-82): the writer's side and guilds are in the mix too.
      if (roll === 10) cmds.push({ type: 'START_PROJECT', scale: 'spec' });
      else if (roll === 11) cmds.push({ type: r.pick(['WRITE_SESSION', 'DECK_SESSION'] as const) });
      else if (roll === 12) cmds.push({ type: 'PITCH_AGENT', agencyId: r.pick(['boutique', 'mailroom', 'midsize', 'prestige', 'mega', 'nope'] as const) });
      else if (roll === 13) cmds.push({ type: 'ROOM_DAY' });
      else if (roll === 14) cmds.push({ type: 'ROOM_CHOICE', option: r.int(0, 2) });
      else if (roll === 15) cmds.push({ type: 'JOIN_GUILD', guild: r.pick(['acting', 'writing', 'directing', 'music'] as const) });
      else if (roll === 0) cmds.push({ type: 'TRAVEL', to: r.pick(LOCATION_IDS) });
      else if (roll === 1) cmds.push({ type: 'START_JOB', jobId: r.pick(['barista', 'barback', 'rideshare', 'pa'] as const), hours: r.int(1, 8) });
      else if (roll === 2) cmds.push({ type: 'SLEEP', hours: r.int(1, 10) });
      else if (roll === 3) cmds.push({ type: 'TAKE_CLASS', skill: r.pick(['acting', 'writing', 'directing', 'music'] as const) });
      else if (roll === 4) cmds.push({ type: 'LEISURE', leisureId: r.pick(LEISURE_IDS) });
      else if (roll === 5) cmds.push({ type: 'SKIP_TO_DONE' });
      else if (roll === 6) cmds.push({ type: 'PREP', opportunityId: `o${r.int(1, 60)}`, hours: r.int(1, 4) });
      else if (roll === 7) cmds.push({ type: 'SUBMIT', opportunityId: `o${r.int(1, 60)}` });
      else cmds.push({ type: 'ADVANCE', minutes: r.int(1, 300) });
    }
    return cmds;
  }

  it.each(ARCHETYPE_IDS)('%s: stats never leave their ranges over 2,000 random commands', (id) => {
    let s = newGame(id, 7);
    for (const cmd of randomCommands(11, 2000)) {
      s = step(s, cmd).state;
      const p = s.player;
      for (const v of [p.energy, p.burnout, p.spark, p.network, p.carHealth, ...Object.values(p.skills)]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      expect(p.rp).toBeGreaterThanOrEqual(0);
      for (const g of Object.values(p.guilds)) expect(g.vouchers).toBeLessThanOrEqual(C.GUILD_VOUCHERS_NEEDED);
      expect(Number.isFinite(p.cash)).toBe(true);
    }
  });

  it('same seed + same commands = same outcome', () => {
    const cmds = randomCommands(5, 500);
    const a = cmds.reduce((s, c) => step(s, c).state, newGame('producer', 42));
    const b = cmds.reduce((s, c) => step(s, c).state, newGame('producer', 42));
    expect(a).toEqual(b);
    const c = cmds.reduce((s, cmd) => step(s, cmd).state, newGame('producer', 43));
    expect(c).not.toEqual(a);
  });

  it('a save round-trips through JSON unchanged', () => {
    const s = randomCommands(3, 300).reduce((st, c) => step(st, c).state, newGame('indie', 5));
    const restored = deserialize(serialize(s, 123));
    expect(restored).toEqual(s);
    expect(JSON.stringify(restored)).toBe(JSON.stringify(s));
  });

  it('rejects corrupt or future saves', () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize('not json')).toBeNull();
    expect(migrate({ version: 999, savedAt: 0, state: newGame('indie', 1) })).toBeNull();
  });

  it('a rejected command never changes state', () => {
    const s = newGame('midwest', 1);
    const r = step(s, { type: 'START_JOB', jobId: 'pa' });
    expect(r.state).toBe(s);
    expect(r.events[0]!.type).toBe('ACTION_REJECTED');
  });

  it('time only moves forward and day boundaries land on 06:00 bills', () => {
    let s = newGame('nepo', 1);
    let last = s.minute;
    for (const cmd of randomCommands(8, 400)) {
      const r = step(s, cmd);
      s = r.state;
      expect(s.minute).toBeGreaterThanOrEqual(last);
      last = s.minute;
      if (r.events.some((e) => e.type === 'BILLS_CHARGED')) {
        expect(minuteOfDay(s.minute) >= C.BILLS_HOUR * 60 || s.activity === null).toBe(true);
      }
    }
  });
});
