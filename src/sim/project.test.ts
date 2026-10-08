import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { FILM_SCALES } from './content/film';
import { INVESTORS } from './content/filmFlavor';
import { crewFee, crewPoolSize, pitchOdds, writeScore } from './formulas';
import { crewQuality, hiredCrew, pitchOddsFor, productionValue, projectQuality, remainingBudget } from './project';
import { newGame, step, whyNot } from './reducer';
import { Rng } from './rng';
import { deserialize, serialize } from './save';
import type { Command, GameEvent, GameState } from './types';

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
const types = (e: GameEvent[]) => e.map((x) => x.type);
const write = (s: GameState) => run(s, { type: 'WRITE_SESSION' }, { type: 'SKIP_TO_DONE' }).state;
const rested = (s: GameState) => {
  const t = structuredClone(s);
  t.player.energy = 100;
  t.player.spark = 100;
  return t;
};

describe('project formulas', () => {
  it('write score = 20 + 0.6·Writing + 0.2·Spark + 0–10 luck, clamped', () => {
    expect(writeScore(40, 60, 0.5)).toBeCloseTo(61, 5);
    expect(writeScore(10, 60, 0)).toBeCloseTo(38, 5);
    expect(writeScore(100, 100, 1)).toBe(100);
  });
  it('pitch odds are logistic and clamped to 5–85%', () => {
    expect(pitchOdds({ script: 50, clout: 1, network: 0, difficulty: 45 })).toBeCloseTo(0.3029, 3);
    expect(pitchOdds({ script: 100, clout: 10, network: 100, difficulty: 45 })).toBe(C.PITCH_CEILING);
    expect(pitchOdds({ script: 0, clout: 1, network: 0, difficulty: 95 })).toBe(C.PITCH_FLOOR);
  });
  it('crew fees and pool sizes', () => {
    expect(crewFee(2000, 3)).toBe(260);
    expect(crewFee(80000, 5)).toBe(15200);
    expect(crewPoolSize(0, 2)).toBe(3);
    expect(crewPoolSize(0, 4)).toBe(5);
    expect(crewPoolSize(60, 2)).toBe(6);
    expect(crewPoolSize(100, 6)).toBe(C.CREW_POOL_MAX - 2);
    expect(crewPoolSize(100, 9)).toBe(C.CREW_POOL_MAX);
  });
});

describe('starting and abandoning', () => {
  it('Clout gates the scale: Midwest can make a short, not a feature; Nepo can make a micro, not an indie', () => {
    const mw = newGame('midwest', 1);
    expect(whyNot(mw, { type: 'START_PROJECT', scale: 'short' })).toBeNull();
    expect(whyNot(mw, { type: 'START_PROJECT', scale: 'micro' })).toMatch(/Tier 2/);
    const nepo = newGame('nepo', 1);
    expect(whyNot(nepo, { type: 'START_PROJECT', scale: 'micro' })).toBeNull();
    expect(whyNot(nepo, { type: 'START_PROJECT', scale: 'indie' })).toMatch(/Tier 4/);
  });

  it('starts instantly with a title, location, budget and a Trades headline; one at a time', () => {
    const r = run(newGame('indie', 1), { type: 'START_PROJECT', scale: 'short' });
    const p = r.state.project!;
    expect(p.title.length).toBeGreaterThan(3);
    expect(p.stage).toBe('develop');
    expect(p.budget).toBe(FILM_SCALES.short.budget);
    expect(r.state.minute).toBe(newGame('indie', 1).minute);
    expect(types(r.events)).toContain('PROJECT_STARTED');
    expect(r.state.trades[0]!.own).toBe(true);
    expect(whyNot(r.state, { type: 'START_PROJECT', scale: 'short' })).toMatch(/current project/);
  });

  it('abandoning records a credit and clears the slot', () => {
    const s = run(newGame('indie', 1), { type: 'START_PROJECT', scale: 'short' }, { type: 'ABANDON_PROJECT' }).state;
    expect(s.project).toBeNull();
    expect(s.credits[0]!.outcome).toBe('Abandoned');
  });
});

describe('develop → finance → crew → shoot', () => {
  it('writing takes 3h, costs Spark and Energy, raises Writing, and two sessions finish a short script', () => {
    let s = run(newGame('indie', 1), { type: 'START_PROJECT', scale: 'short' }).state;
    const before = s;
    s = write(s);
    expect(s.minute - before.minute).toBe(3 * 60);
    expect(s.player.spark).toBeCloseTo(before.player.spark - 15, 5);
    expect(s.player.skills.writing).toBe(41);
    expect(s.project!.scores.develop).toHaveLength(1);
    s = write(s);
    expect(s.project!.stage).toBe('finance');
  });

  it('writing needs Spark', () => {
    const s = structuredClone(run(newGame('indie', 1), { type: 'START_PROJECT', scale: 'short' }).state);
    s.player.spark = 10;
    expect(whyNot(s, { type: 'WRITE_SESSION' })).toMatch(/Spark/);
  });

  function financeStage(arch: 'indie' | 'nepo' = 'indie') {
    let s = run(newGame(arch, 3), { type: 'START_PROJECT', scale: 'short' }).state;
    s = write(rested(s));
    s = write(rested(s));
    expect(s.project!.stage).toBe('finance');
    return rested(s);
  }

  it('pitching needs the investor neighbourhood and is limited to one a day', () => {
    let s = financeStage();
    const far = INVESTORS.find((i) => i.location !== s.player.location)!;
    expect(whyNot(s, { type: 'PITCH', investorId: far.id })).toMatch(/takes meetings in/);
    const near = INVESTORS.find((i) => i.location === s.player.location);
    const inv = near ?? far;
    if (!near) s = run(s, { type: 'TRAVEL', to: inv.location }, { type: 'SKIP_TO_DONE' }).state;
    const r = run(rested(s), { type: 'PITCH', investorId: inv.id }, { type: 'SKIP_TO_DONE' });
    const pitched = r.events.find((e) => e.type === 'PITCHED');
    expect(pitched).toBeDefined();
    if (pitched?.type === 'PITCHED') {
      expect(pitched.odds).toBeCloseTo(pitchOddsFor(s, s.project!, inv), 6);
      if (pitched.yes) expect(r.state.project!.raised).toBe(pitched.amount);
      else expect(r.state.project!.raised).toBe(0);
    }
    expect(whyNot(rested(r.state), { type: 'PITCH', investorId: inv.id })).toMatch(/One pitch a day/);
  });

  it('a yes raises 20–60% of the budget, never more than what is still needed', () => {
    let yes = 0;
    for (let seed = 1; seed <= 60; seed++) {
      let s = financeStage();
      s.rngState = seed;
      const inv = INVESTORS.find((i) => i.location === s.player.location) ?? INVESTORS[0]!;
      if (s.player.location !== inv.location) s = run(s, { type: 'TRAVEL', to: inv.location }, { type: 'SKIP_TO_DONE' }).state;
      s = rested(s);
      s.project!.raised = 1500;
      const r = run(s, { type: 'PITCH', investorId: inv.id }, { type: 'SKIP_TO_DONE' });
      const e = r.events.find((x) => x.type === 'PITCHED');
      if (e?.type === 'PITCHED' && e.yes) {
        yes++;
        expect(e.amount).toBeLessThanOrEqual(500);
        expect(r.state.project!.raised).toBe(2000);
        expect(r.state.project!.stage).toBe('crew');
      }
    }
    expect(yes).toBeGreaterThan(0);
  });

  it('self-funding moves cash instantly; it cannot exceed cash or what the budget still needs', () => {
    const s = financeStage();
    expect(whyNot(s, { type: 'SELF_FUND', amount: 2500 })).toMatch(/only needs/);
    const poor = structuredClone(s);
    poor.player.cash = 100;
    expect(whyNot(poor, { type: 'SELF_FUND', amount: 500 })).toMatch(/don't have/);
    const r = run(s, { type: 'SELF_FUND', amount: 2000 });
    expect(r.state.player.cash).toBe(s.player.cash - 2000);
    expect(r.state.minute).toBe(s.minute);
    expect(r.state.project!.stage).toBe('crew');
    expect(r.state.project!.selfFunded).toBe(2000);
    expect(types(r.events)).toEqual(expect.arrayContaining(['SELF_FUNDED', 'PROJECT_STAGE']));
  });

  it('crew: a Network-sized pool; hires come out of the budget; full slots unlock the shoot', () => {
    let s = run(financeStage(), { type: 'SELF_FUND', amount: 2000 }).state;
    const p = s.project!;
    expect(p.crewPool.length).toBe(crewPoolSize(s.player.network, FILM_SCALES.short.crewSlots));
    for (const c of p.crewPool) {
      expect(c.skill).toBeGreaterThanOrEqual(1);
      expect(c.skill).toBeLessThanOrEqual(5);
      expect(c.fee).toBe(crewFee(2000, c.skill));
    }
    const cheapest = [...p.crewPool].sort((a, b) => a.fee - b.fee);
    s = run(rested(s), { type: 'HIRE_CREW', candidateId: cheapest[0]!.id }, { type: 'SKIP_TO_DONE' }).state;
    expect(s.project!.spent).toBe(cheapest[0]!.fee);
    expect(whyNot(s, { type: 'HIRE_CREW', candidateId: cheapest[0]!.id })).toMatch(/Already hired/);
    s = run(rested(s), { type: 'HIRE_CREW', candidateId: cheapest[1]!.id }, { type: 'SKIP_TO_DONE' }).state;
    expect(hiredCrew(s.project!)).toHaveLength(2);
    expect(s.project!.stage).toBe('shoot');
    expect(crewQuality(s.project!)).toBe(((cheapest[0]!.skill + cheapest[1]!.skill) / 2) * 20);
    expect(productionValue(s.project!)).toBeCloseTo((10 * remainingBudget(s.project!)) / 2000, 6);
    expect(whyNot(s, { type: 'HIRE_CREW', candidateId: cheapest[2]!.id })).toMatch(/Not hiring/);
  });

  it('hiring is blocked when the budget runs out (top up with self-funding)', () => {
    const s = run(financeStage(), { type: 'SELF_FUND', amount: 2000 }).state;
    const broke = structuredClone(s);
    broke.project!.spent = 1990;
    const c = broke.project!.crewPool[0]!;
    expect(whyNot(broke, { type: 'HIRE_CREW', candidateId: c.id })).toMatch(/Not enough budget/);
    const topped = run(broke, { type: 'SELF_FUND', amount: 500 }).state;
    expect(whyNot(rested(topped), { type: 'HIRE_CREW', candidateId: c.id })).toBeNull();
  });

  it('quality so far combines script, crew and production value', () => {
    const s = run(financeStage(), { type: 'SELF_FUND', amount: 2000 }).state;
    const p = s.project!;
    const expected = 0.35 * (p.scores.develop.reduce((a, b) => a + b) / p.scores.develop.length) + 10;
    expect(projectQuality(p)).toBeCloseTo(expected, 5);
  });
});

describe('project invariants and saves', () => {
  function randomProjectCommands(seed: number, n: number): Command[] {
    const r = new Rng(seed);
    const cmds: Command[] = [];
    for (let i = 0; i < n; i++) {
      const roll = r.int(0, 9);
      if (roll === 0) cmds.push({ type: 'START_PROJECT', scale: r.pick(['short', 'micro', 'indie'] as const) });
      else if (roll === 1) cmds.push({ type: 'WRITE_SESSION' });
      else if (roll === 2) cmds.push({ type: 'PITCH', investorId: r.pick(INVESTORS).id });
      else if (roll === 3) cmds.push({ type: 'SELF_FUND', amount: r.int(1, 30) * 100 });
      else if (roll === 4) cmds.push({ type: 'HIRE_CREW', candidateId: `c${r.int(1, 200)}` });
      else if (roll === 5) cmds.push({ type: 'TRAVEL', to: r.pick(INVESTORS).location });
      else if (roll === 6) cmds.push({ type: 'SLEEP', hours: 8 });
      else if (roll === 7 && r.chance(0.1)) cmds.push({ type: 'ABANDON_PROJECT' });
      else cmds.push({ type: 'SKIP_TO_DONE' });
    }
    return cmds;
  }

  it('budget is never overspent, raised never exceeds what was put in, at most one project', () => {
    let s = newGame('nepo', 11);
    for (const cmd of randomProjectCommands(4, 1500)) {
      s = step(s, cmd).state;
      const p = s.project;
      if (p) {
        expect(p.spent).toBeLessThanOrEqual(p.raised);
        expect(p.raised).toBeGreaterThanOrEqual(p.selfFunded);
        expect(hiredCrew(p).length).toBeLessThanOrEqual(FILM_SCALES[p.scale].crewSlots);
        for (const x of p.scores.develop) expect(x).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('same seed + same project commands = same outcome', () => {
    const cmds = randomProjectCommands(9, 600);
    const a = cmds.reduce((s, c) => step(s, c).state, newGame('indie', 5));
    const b = cmds.reduce((s, c) => step(s, c).state, newGame('indie', 5));
    expect(a).toEqual(b);
  });

  it('a v1 save (before careers) migrates to v2 with no project and no credits', () => {
    const v2 = newGame('midwest', 1);
    const { project: _p, credits: _c, ...rest } = v2;
    const v1 = JSON.stringify({ version: 1, savedAt: 0, state: { ...rest, version: 1 } });
    const migrated = deserialize(v1)!;
    expect(migrated.version).toBe(C.SAVE_VERSION);
    expect(migrated.project).toBeNull();
    expect(migrated.credits).toEqual([]);
    expect(step(migrated, { type: 'START_PROJECT', scale: 'short' }).state.project).not.toBeNull();
  });

  it('a save with an active project round-trips unchanged', () => {
    const s = randomProjectCommands(2, 300).reduce((st, c) => step(st, c).state, newGame('nepo', 8));
    expect(deserialize(serialize(s))).toEqual(s);
  });
});
