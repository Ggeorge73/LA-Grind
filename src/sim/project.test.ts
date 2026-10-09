import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { FESTIVALS, FILM_SCALES } from './content/film';
import { ARCHETYPES } from './content/archetypes';
import { PROJECT_SCALES } from './content/projects';
import { INVESTORS } from './content/filmFlavor';
import { atHour, cloutTier, crewFee, crewPoolSize, dailyBills, dayOf, festivalOdds, hourOf, minuteOfDay, pitchOdds, writeScore } from './formulas';
import {
  crewQuality,
  editorSkill,
  festivalOddsFor,
  hiredCrew,
  pitchOddsFor,
  productionValue,
  projectQuality,
  remainingBudget,
} from './project';
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
      if (roll === 0) cmds.push({ type: 'START_PROJECT', scale: r.pick(['short', 'micro', 'indie', 'spec'] as const) });
      else if (roll === 1) cmds.push({ type: r.pick(['WRITE_SESSION', 'DECK_SESSION'] as const) });
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
        expect(hiredCrew(p).length).toBeLessThanOrEqual(PROJECT_SCALES[p.scale].crewSlots);
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

// ---------- Sprint 6: shoot → post → festival → release (LAG-47, LAG-48, LAG-50) ----------

const at = (s: GameState, cmd: Command) => step(s, cmd);
/** ADVANCE to the next time the clock reads `hour`:00 (0 minutes if it already does). */
function advanceToHour(s: GameState, hour: number): GameState {
  const minutes = (hour * 60 - minuteOfDay(s.minute) + 1440) % 1440;
  return minutes ? run(s, { type: 'ADVANCE', minutes }).state : s;
}
const festival = (id: string) => FESTIVALS.find((f) => f.id === id)!;

/** A short film with the script written, self-funded and crewed (an Editor + the cheapest other). */
function shootStage(arch: 'indie' | 'nepo' | 'midwest' = 'indie', seed = 3): GameState {
  let s = run(newGame(arch, seed), { type: 'START_PROJECT', scale: 'short' }).state;
  s = write(rested(s));
  s = write(rested(s));
  s = run(s, { type: 'SELF_FUND', amount: 2000 }).state;
  const pool = s.project!.crewPool;
  const editor = pool.find((c) => c.role === 'editor')!;
  const other = [...pool].filter((c) => c !== editor).sort((a, b) => a.fee - b.fee)[0]!;
  s = run(rested(s), { type: 'HIRE_CREW', candidateId: editor.id }, { type: 'SKIP_TO_DONE' }).state;
  s = run(rested(s), { type: 'HIRE_CREW', candidateId: other.id }, { type: 'SKIP_TO_DONE' }).state;
  expect(s.project!.stage).toBe('shoot');
  return s;
}

/** On set at 06:00, rested, ready to call action. */
function onSet(s: GameState): GameState {
  if (s.player.location !== s.project!.location) s = run(s, { type: 'TRAVEL', to: s.project!.location }, { type: 'SKIP_TO_DONE' }).state;
  return rested(advanceToHour(s, 6));
}
const shoot = (s: GameState) => run(onSet(s), { type: 'SHOOT_DAY' }, { type: 'SKIP_TO_DONE' }).state;
const edit = (s: GameState) => run(rested(s), { type: 'EDIT_SESSION' }, { type: 'SKIP_TO_DONE' }).state;

function festivalStage(arch: 'indie' | 'nepo' | 'midwest' = 'indie', seed = 3): GameState {
  const s = edit(shoot(shoot(shootStage(arch, seed))));
  expect(s.project!.stage).toBe('festival');
  return s;
}

/** Make the finished film great (state tweak), so acceptance/award/offer odds are high. */
function polish(s: GameState): GameState {
  const t = structuredClone(s);
  t.project!.scores = { develop: [95, 95], shoot: [95, 95], post: [95], record: [], deck: [] };
  return t;
}

describe('shoot', () => {
  it('needs the set location', () => {
    const s = shootStage();
    const away = structuredClone(s);
    away.player.location = s.project!.location === 'noho' ? 'santamonica' : 'noho';
    expect(whyNot(rested(advanceToHour(away, 6)), { type: 'SHOOT_DAY' })).toMatch(/The set is in/);
  });

  it('call window is 05:00–10:00', () => {
    let s = shootStage();
    if (s.player.location !== s.project!.location) s = run(s, { type: 'TRAVEL', to: s.project!.location }, { type: 'SKIP_TO_DONE' }).state;
    for (const [h, ok] of [[4, false], [5, true], [10, true], [11, false], [22, false]] as const) {
      const t = rested(advanceToHour(s, h));
      expect(hourOf(t.minute)).toBe(h);
      if (ok) expect(whyNot(t, { type: 'SHOOT_DAY' })).toBeNull();
      else expect(whyNot(t, { type: 'SHOOT_DAY' })).toMatch(/Call time is 05:00–10:00/);
    }
  });

  it('is blocked before the shoot stage and when exhausted', () => {
    const early = run(newGame('indie', 1), { type: 'START_PROJECT', scale: 'short' }).state;
    expect(whyNot(early, { type: 'SHOOT_DAY' })).toMatch(/Nothing to shoot/);
    const t = structuredClone(onSet(shootStage()));
    t.player.energy = 2;
    expect(whyNot(t, { type: 'SHOOT_DAY' })).toMatch(/exhausted/);
  });

  it('a shoot day takes 10h, scores within the formula range, raises Directing; two days move to post', () => {
    const s0 = onSet(shootStage());
    const r = run(s0, { type: 'SHOOT_DAY' }, { type: 'SKIP_TO_DONE' });
    expect(r.state.minute - s0.minute).toBe(10 * 60);
    const scored = r.events.find((e) => e.type === 'SESSION_SCORED');
    expect(scored).toMatchObject({ type: 'SESSION_SCORED', stage: 'shoot' });
    const pl = s0.player;
    const lo = 15 + 0.5 * pl.skills.directing + 0.25 * crewQuality(s0.project!) + 0.1 * pl.skills.acting;
    if (scored?.type === 'SESSION_SCORED') {
      expect(scored.score).toBeGreaterThanOrEqual(Math.floor(lo));
      expect(scored.score).toBeLessThanOrEqual(Math.ceil(lo + 15));
    }
    expect(r.state.player.skills.directing).toBe(pl.skills.directing + 1);
    expect(r.state.project!.stage).toBe('shoot');
    const s2 = shoot(r.state);
    expect(s2.project!.stage).toBe('post');
    expect(s2.project!.scores.shoot).toHaveLength(2);
    expect(whyNot(s2, { type: 'SHOOT_DAY' })).toMatch(/Nothing to shoot/);
  });
});

describe('post', () => {
  it('edit is 4h anywhere; the short needs one session to reach the festival stage', () => {
    const s = shoot(shoot(shootStage()));
    expect(s.project!.stage).toBe('post');
    expect(whyNot(s, { type: 'EDIT_SESSION' })).toBeNull();
    const r = run(rested(s), { type: 'EDIT_SESSION' }, { type: 'SKIP_TO_DONE' });
    expect(r.state.minute - s.minute).toBe(4 * 60);
    expect(r.state.project!.stage).toBe('festival');
    expect(types(r.events)).toContain('PROJECT_STAGE');
    expect(whyNot(r.state, { type: 'EDIT_SESSION' })).toMatch(/Nothing to edit/);
  });

  it('a hired Editor adds 4 points per skill level (same luck, same everything else)', () => {
    const s = rested(shoot(shoot(shootStage())));
    const ed = editorSkill(s.project!);
    expect(ed).toBeGreaterThanOrEqual(1);
    const without = structuredClone(s);
    for (const c of without.project!.crewPool) if (c.role === 'editor') c.role = 'gaffer';
    expect(editorSkill(without.project!)).toBe(0);
    const score = (st: GameState) => run(st, { type: 'EDIT_SESSION' }, { type: 'SKIP_TO_DONE' }).state.project!.scores.post[0]!;
    expect(score(s) - score(without)).toBe(4 * ed);
  });
});

describe('festival circuit', () => {
  it('cannot submit before the film is finished', () => {
    expect(whyNot(shootStage(), { type: 'SUBMIT_FESTIVAL', festivalId: 'noho-shorts' })).toMatch(/Finish the film/);
  });

  it('submitting charges the fee, takes no time, locks the shown odds, and rejects duplicates', () => {
    const s = festivalStage();
    const f = festival('noho-shorts');
    const shown = festivalOddsFor(s, s.project!, f);
    expect(shown).toBeCloseTo(festivalOdds(projectQuality(s.project!), cloutTier(s.player.rp), 1), 10);
    const r = at(s, { type: 'SUBMIT_FESTIVAL', festivalId: f.id });
    expect(r.state.player.cash).toBe(s.player.cash - f.fee);
    expect(r.state.minute).toBe(s.minute);
    const sub = r.state.project!.submissions[0]!;
    expect(sub).toMatchObject({ festivalId: f.id, tier: 1, status: 'pending', odds: shown, award: null });
    expect(sub.resultMinute).toBe(atHour(dayOf(s.minute) + f.waitDays, 6));
    expect(types(r.events)).toContain('FESTIVAL_SUBMITTED');
    expect(whyNot(r.state, { type: 'SUBMIT_FESTIVAL', festivalId: f.id })).toMatch(/Already submitted/);
    // Locked: a later Clout jump does not change the stored odds.
    const famous = structuredClone(r.state);
    famous.player.rp = 5000;
    expect(famous.project!.submissions[0]!.odds).toBe(shown);
  });

  it('a short film is capped at tier 2; unknown festivals and empty wallets are refused', () => {
    const s = festivalStage();
    expect(whyNot(s, { type: 'SUBMIT_FESTIVAL', festivalId: 'silverlake-underground' })).toBeNull();
    for (const id of ['slamdunce', 'sunburnt', 'canned']) expect(whyNot(s, { type: 'SUBMIT_FESTIVAL', festivalId: id })).toMatch(/short film can't get into/);
    expect(whyNot(s, { type: 'SUBMIT_FESTIVAL', festivalId: 'nope' })).toMatch(/Unknown festival/);
    const broke = structuredClone(s);
    broke.player.cash = 30;
    expect(whyNot(broke, { type: 'SUBMIT_FESTIVAL', festivalId: 'silverlake-underground' })).toMatch(/Needs \$50/);
  });

  it('results land at 06:00 on the right day with the locked odds; an acceptance pays RP', () => {
    const s0 = festivalStage();
    const s = at(s0, { type: 'SUBMIT_FESTIVAL', festivalId: 'noho-shorts' }).state;
    const due = s.project!.submissions[0]!.resultMinute;
    const before = run(s, { type: 'ADVANCE', minutes: due - s.minute - 1 }).state;
    expect(before.project!.submissions[0]!.status).toBe('pending');
    const r = run(before, { type: 'ADVANCE', minutes: 1 });
    expect(hourOf(r.state.minute)).toBe(6);
    const res = r.events.find((e) => e.type === 'FESTIVAL_RESULT');
    expect(res).toBeDefined();
    if (res?.type !== 'FESTIVAL_RESULT') return;
    expect(res.odds).toBe(s.project!.submissions[0]!.odds);
    expect(r.state.project!.submissions[0]!.status).toBe(res.accepted ? 'accepted' : 'rejected');
    // Only the bills touch cash at 06:00; RP moves by exactly the reported amount.
    expect(r.state.player.cash).toBe(before.player.cash - dailyBills(ARCHETYPES.indie.rentPerDay));
    expect(r.state.player.rp - before.player.rp).toBe(res.rp);
    if (res.accepted) expect(res.rp).toBeGreaterThanOrEqual(festival('noho-shorts').rp);
    else expect(res.rp).toBe(0);
  });

  it('acceptances can bring awards (extra RP) and distribution offers worth the formula amount', () => {
    let awards = 0;
    let offers = 0;
    let accepted = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let s = polish(festivalStage());
      s.rngState = seed;
      s = at(s, { type: 'SUBMIT_FESTIVAL', festivalId: 'silverlake-underground' }).state;
      const q = projectQuality(s.project!);
      const r = run(s, { type: 'ADVANCE', minutes: s.project!.submissions[0]!.resultMinute - s.minute });
      const res = r.events.find((e) => e.type === 'FESTIVAL_RESULT');
      if (res?.type !== 'FESTIVAL_RESULT' || !res.accepted) continue;
      accepted++;
      const f = festival('silverlake-underground');
      if (res.award) {
        awards++;
        expect(res.rp).toBe(f.rp * 2);
        expect(r.state.project!.submissions[0]!.award).toBe(res.award);
      } else expect(res.rp).toBe(f.rp);
      if (res.offer) {
        offers++;
        expect(res.offer.amount).toBe(Math.round(2000 * (0.3 + q / 100) * 0.4));
        expect(r.state.project!.offers.map((o) => o.id)).toContain(res.offer.id);
      }
    }
    expect(accepted).toBeGreaterThan(30);
    expect(awards).toBeGreaterThan(0);
    expect(awards).toBeLessThan(accepted);
    expect(offers).toBeGreaterThan(0);
  });
});

describe('release', () => {
  /** A finished, polished short with at least one distribution offer on the table. */
  function withOffer(): GameState {
    for (let seed = 1; seed < 100; seed++) {
      let s = polish(festivalStage());
      s.rngState = seed;
      s = at(s, { type: 'SUBMIT_FESTIVAL', festivalId: 'silverlake-underground' }).state;
      s = run(s, { type: 'ADVANCE', minutes: s.project!.submissions[0]!.resultMinute - s.minute }).state;
      if (s.project!.offers.length) return s;
    }
    throw new Error('no offer in 100 seeds');
  }

  it('ACCEPT_OFFER pays the offer, adds Network, records "Released by …" and clears the project', () => {
    const s = withOffer();
    const offer = s.project!.offers[0]!;
    const quality = Math.round(projectQuality(s.project!));
    expect(whyNot(s, { type: 'ACCEPT_OFFER', offerId: 'o-nope' })).toMatch(/offer is gone/);
    const r = at(s, { type: 'ACCEPT_OFFER', offerId: offer.id });
    expect(r.state.player.cash).toBe(s.player.cash + offer.amount);
    expect(r.state.stats.totalEarned).toBe(s.stats.totalEarned + offer.amount);
    expect(r.state.player.network).toBe(Math.min(100, s.player.network + C.RELEASE_NETWORK));
    expect(r.state.minute).toBe(s.minute);
    expect(r.state.project).toBeNull();
    expect(r.state.credits[0]).toMatchObject({ title: s.project!.title, quality, scale: 'Short film' });
    expect(r.state.credits[0]!.outcome).toMatch(new RegExp(`^Released by ${offer.distributor}`));
    expect(types(r.events)).toContain('FILM_RELEASED');
    expect(whyNot(r.state, { type: 'ACCEPT_OFFER', offerId: offer.id })).toMatch(/No offers/);
    expect(whyNot(r.state, { type: 'SELF_RELEASE' })).toMatch(/Finish the film/);
    expect(whyNot(r.state, { type: 'START_PROJECT', scale: 'short' })).toBeNull();
  });

  it('accepting an offer that brings cash back to ≥ $0 clears an active overdraft immediately', () => {
    const s = structuredClone(withOffer());
    const offer = s.project!.offers[0]!;
    s.player.cash = -Math.floor(offer.amount / 2);
    s.overdraft = { startedMinute: s.minute, deadlineMinute: s.minute + C.OVERDRAFT_DAYS * C.MINUTES_PER_DAY };
    const r = at(s, { type: 'ACCEPT_OFFER', offerId: offer.id });
    expect(r.state.player.cash).toBeGreaterThanOrEqual(0);
    expect(r.state.minute).toBe(s.minute);
    expect(r.state.overdraft).toBeNull();
    expect(types(r.events)).toContain('OVERDRAFT_CLEARED');
  });

  it('SELF_RELEASE is blocked while festival results are pending', () => {
    const s = at(festivalStage(), { type: 'SUBMIT_FESTIVAL', festivalId: 'noho-shorts' }).state;
    expect(whyNot(s, { type: 'SELF_RELEASE' })).toMatch(/Wait for your festival results/);
    const done = run(s, { type: 'ADVANCE', minutes: s.project!.submissions[0]!.resultMinute - s.minute }).state;
    expect(whyNot(done, { type: 'SELF_RELEASE' })).toBeNull();
  });

  it('SELF_RELEASE gives RP = round(quality × 0.5), no cash, and a "Self-released online" credit', () => {
    const s = festivalStage();
    const quality = Math.round(projectQuality(s.project!));
    const r = at(s, { type: 'SELF_RELEASE' });
    expect(r.state.player.rp - s.player.rp).toBe(Math.round(quality * C.SELF_RELEASE_RP_PER_QUALITY));
    expect(r.state.player.cash).toBe(s.player.cash);
    expect(r.state.project).toBeNull();
    expect(r.state.credits[0]).toMatchObject({ outcome: 'Self-released online', quality });
  });

  it('self-release is refused before the festival stage', () => {
    expect(whyNot(shootStage(), { type: 'SELF_RELEASE' })).toMatch(/Finish the film/);
  });
});

describe('film saves, determinism and invariants', () => {
  it('a v2 save with an in-flight project migrates (via v3) with empty submissions and offers, and can carry on', () => {
    const s = shoot(shoot(shootStage()));
    const { submissions: _s, offers: _o, ...oldProject } = s.project!;
    const v2 = JSON.stringify({ version: 2, savedAt: 0, state: { ...s, version: 2, project: oldProject } });
    const m = deserialize(v2)!;
    expect(m.version).toBe(C.SAVE_VERSION);
    expect(m.project!.submissions).toEqual([]);
    expect(m.project!.offers).toEqual([]);
    expect(m.project!.scores).toEqual(s.project!.scores);
    const finished = edit(m);
    expect(finished.project!.stage).toBe('festival');
    expect(at(finished, { type: 'SUBMIT_FESTIVAL', festivalId: 'noho-shorts' }).state.project!.submissions).toHaveLength(1);
  });

  it('a v2 save with no project migrates with project null', () => {
    const s = newGame('midwest', 2);
    const m = deserialize(JSON.stringify({ version: 2, savedAt: 0, state: { ...s, version: 2 } }))!;
    expect(m.version).toBe(C.SAVE_VERSION);
    expect(m.project).toBeNull();
  });

  /** Whole short film: shoot, edit, both festivals, then accept the best offer or self-release. */
  function wholeFilm(seed: number): { state: GameState; events: GameEvent[] } {
    let s = festivalStage('indie', seed);
    const events: GameEvent[] = [];
    for (const id of ['noho-shorts', 'silverlake-underground']) {
      const r = at(s, { type: 'SUBMIT_FESTIVAL', festivalId: id });
      s = r.state;
      events.push(...r.events);
    }
    const last = Math.max(...s.project!.submissions.map((x) => x.resultMinute));
    const r = run(s, { type: 'ADVANCE', minutes: last - s.minute });
    s = r.state;
    events.push(...r.events);
    const best = [...s.project!.offers].sort((a, b) => b.amount - a.amount)[0];
    const fin = at(s, best ? { type: 'ACCEPT_OFFER', offerId: best.id } : { type: 'SELF_RELEASE' });
    events.push(...fin.events);
    return { state: fin.state, events };
  }

  it('same seed + same commands = identical state through the whole film', () => {
    for (const seed of [3, 7]) expect(wholeFilm(seed).state).toEqual(wholeFilm(seed).state);
  });

  it('cash only moves by stated amounts: fees, bills and the accepted offer', () => {
    for (const seed of [3, 4, 5, 6]) {
      const start = festivalStage('indie', seed);
      const { state, events } = wholeFilm(seed);
      let expected = start.player.cash;
      for (const e of events) {
        if (e.type === 'FESTIVAL_SUBMITTED') expected -= e.fee;
        if (e.type === 'BILLS_CHARGED') expected -= e.amount;
        if (e.type === 'FILM_RELEASED') expected += e.amount;
        if (e.type === 'JOB_PAID' || e.type === 'BOOKED') throw new Error('unexpected income');
      }
      expect(state.player.cash).toBe(expected);
      expect(state.project).toBeNull();
      expect(state.credits[0]!.outcome).toMatch(/^(Released by |Self-released online)/);
      const released = events.filter((e) => e.type === 'FILM_RELEASED');
      expect(released).toHaveLength(1);
    }
  });

  it('random film commands never break the rules (budget, stages, one release, pending ⇒ no self-release)', () => {
    const r = new Rng(77);
    let s = festivalStage('nepo', 5);
    const ids = FESTIVALS.map((f) => f.id);
    for (let i = 0; i < 400; i++) {
      const roll = r.int(0, 5);
      const cmd: Command =
        roll === 0
          ? { type: 'SUBMIT_FESTIVAL', festivalId: r.pick(ids) }
          : roll === 1
            ? { type: 'ADVANCE', minutes: r.int(60, 2000) }
            : roll === 2
              ? { type: 'SELF_RELEASE' }
              : roll === 3
                ? { type: 'ACCEPT_OFFER', offerId: s.project?.offers[0]?.id ?? 'x' }
                : roll === 4
                  ? { type: 'START_PROJECT', scale: 'short' }
                  : { type: 'SKIP_TO_DONE' };
      const before = s;
      const res = step(s, cmd);
      s = res.state;
      const p = s.project;
      if (p) {
        for (const sub of p.submissions) expect(sub.tier).toBeLessThanOrEqual(FILM_SCALES[p.scale as keyof typeof FILM_SCALES].bestFestivalTier);
        expect(new Set(p.submissions.map((x) => x.festivalId)).size).toBe(p.submissions.length);
      }
      if (cmd.type === 'SELF_RELEASE' && before.project && before.project.submissions.some((x) => x.status === 'pending'))
        expect(types(res.events)).toEqual(['ACTION_REJECTED']);
      if (types(res.events).includes('FILM_RELEASED')) expect(s.project).toBeNull();
    }
  });
});
