// Sprint 12 (LAG-96) QA: the 3D home's read model (homeView), the home TV
// leisure, and the home flavour content contract.
import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { homeView, listActions } from './actions';
import { oddsFor } from './board';
import { ARCHETYPES, ARCHETYPE_IDS } from './content/archetypes';
import { BUSY, HOME_FLAVOR, HOTSPOTS, MOODS, SOON, STREET, type HotspotId } from './content/homeFlavor';
import { LEISURE, LEISURE_IDS, LOCATION_IDS, leisureLocation } from './content/locations';
import { atHour } from './formulas';
import { newGame, step, whyNot } from './reducer';
import type { ActivityKind, ArchetypeId, Command, GameEvent, GameState, LocationId, Opportunity, ProjectScaleId, ProjectStage } from './types';

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
/** A rested run on day 1 at `hour`, at home. */
function at(arch: ArchetypeId, hour = 10, seed = 1): GameState {
  const s = newGame(arch, seed);
  const t = run(s, { type: 'ADVANCE', minutes: atHour(1, hour) - s.minute }).state;
  return tweak(t, (x) => {
    x.player.energy = 100;
    x.player.spark = 100;
    x.player.burnout = 0;
    x.player.cash += 10_000;
  });
}
const travelTo = (s: GameState, to: LocationId) => (s.player.location === to ? s : run(s, { type: 'TRAVEL', to }, { type: 'SKIP_TO_DONE' }).state);
const awayFrom = (home: LocationId): LocationId => LOCATION_IDS.find((l) => l !== home)!;
const spot = (s: GameState, id: HotspotId) => homeView(s).hotspots.find((h) => h.id === id)!;
function withProject(s0: GameState, scale: ProjectScaleId, stage: ProjectStage): GameState {
  const s = run(s0, { type: 'START_PROJECT', scale }).state;
  expect(s.project).not.toBeNull();
  return tweak(s, (t) => (t.project!.stage = stage));
}
function opp(s: GameState, o: Partial<Opportunity> & { id: string }): Opportunity {
  return {
    templateId: 't',
    title: `Gig ${o.id}`,
    medium: 'film',
    skill: 'acting',
    tier: 1,
    location: s.player.location,
    windowStart: 0,
    windowEnd: 24,
    day: 1,
    prepHours: 0,
    status: 'open',
    ...o,
  };
}

const ALL_SPOTS: readonly HotspotId[] = ['bed', 'desk', 'ringlight', 'tv', 'fridge', 'shower', 'table', 'door'];

// ---------- homeView ----------

describe('homeView: where you are', () => {
  it.each(ARCHETYPE_IDS)('%s starts at home, and is not at home after leaving', (arch) => {
    const s = at(arch);
    expect(s.player.location).toBe(ARCHETYPES[arch].home);
    expect(homeView(s).atHome).toBe(true);
    const away = travelTo(s, awayFrom(s.player.home));
    expect(homeView(away).atHome).toBe(false);
    expect(homeView(travelTo(away, s.player.home)).atHome).toBe(true);
  });

  it('lists every hotspot exactly once, in a stable order', () => {
    expect(homeView(at('indie')).hotspots.map((h) => h.id)).toEqual(ALL_SPOTS);
  });

  it('every action disabledReason equals whyNot for its command (at home, away, busy)', () => {
    const home = withProject(at('indie'), 'short', 'develop');
    const states = [home, travelTo(home, awayFrom(home.player.home)), run(home, { type: 'LEISURE', leisureId: 'tv' }).state];
    for (const s of states)
      for (const h of homeView(s).hotspots) for (const a of h.actions) expect(a.disabledReason).toBe(whyNot(s, a.command));
  });
});

describe('homeView: hotspot commands', () => {
  it('bed: Sleep 8h, with the archetype sleep multiplier in the Energy chip', () => {
    for (const arch of ARCHETYPE_IDS) {
      const bed = spot(at(arch), 'bed');
      expect(bed.soon).toBeNull();
      expect(bed.actions).toHaveLength(1);
      expect(bed.actions[0]!.command).toEqual({ type: 'SLEEP', hours: 8 });
      expect(bed.actions[0]!.minutes).toBe(480);
      expect(bed.actions[0]!.label).toBe('Sleep 8h');
      expect(bed.actions[0]!.effects[0]).toBe(`+${Math.round(C.ENERGY_SLEEP_GAIN_PER_HOUR * ARCHETYPES[arch].sleepMultiplier * 8)} Energy`);
      expect(bed.actions[0]!.disabledReason).toBeNull();
    }
  });

  const deskCases: [string, (s: GameState) => GameState, [string, Command['type']][]][] = [
    ['no project', (s) => s, [['Make a beat', 'MAKE_BEAT']]],
    ['film develop', (s) => withProject(s, 'short', 'develop'), [['Write the script', 'WRITE_SESSION'], ['Make a beat', 'MAKE_BEAT']]],
    ['music develop', (s) => withProject(s, 'single', 'develop'), [['Write a song', 'WRITE_SESSION'], ['Make a beat', 'MAKE_BEAT']]],
    ['tv develop', (s) => withProject(s, 'spec', 'develop'), [['Write a draft', 'WRITE_SESSION'], ['Make a beat', 'MAKE_BEAT']]],
    ['tv deck', (s) => withProject(s, 'spec', 'deck'), [['Build the pitch deck', 'DECK_SESSION'], ['Make a beat', 'MAKE_BEAT']]],
    ['film post', (s) => withProject(s, 'short', 'post'), [['Edit the cut', 'EDIT_SESSION'], ['Make a beat', 'MAKE_BEAT']]],
    ['film finance (nothing to do at the desk)', (s) => withProject(s, 'short', 'finance'), [['Make a beat', 'MAKE_BEAT']]],
  ];
  it.each(deskCases)('desk with %s', (_name, setup, expected) => {
    const s = setup(at('indie'));
    const desk = spot(s, 'desk');
    expect(desk.soon).toBeNull();
    expect(desk.actions.map((a) => [a.label, a.command.type])).toEqual(expected);
    // Rested, at home, project in the right stage: every desk action is runnable and actually starts.
    for (const a of desk.actions) {
      expect(a.disabledReason).toBeNull();
      const r = step(s, a.command);
      expect(r.events.some((e) => e.type === 'ACTION_REJECTED')).toBe(false);
      expect(r.state.activity?.endMinute! - r.state.activity?.startMinute!).toBe(a.minutes);
    }
  });

  it('tv: one LEISURE tv action; fridge, shower and table are previews; door has no actions', () => {
    const v = homeView(at('nepo'));
    const tv = v.hotspots.find((h) => h.id === 'tv')!;
    expect(tv.soon).toBeNull();
    expect(tv.actions.map((a) => a.command)).toEqual([{ type: 'LEISURE', leisureId: 'tv' }]);
    expect(tv.actions[0]!.label).toBe(LEISURE.tv.name);
    expect(tv.actions[0]!.minutes).toBe(C.LEISURE_HOURS * 60);
    expect(tv.actions[0]!.effects).toEqual(['+12 Spark', `−${C.LEISURE_BURNOUT_RELIEF} Burnout`]);
    for (const id of ['fridge', 'shower', 'table'] as const) {
      const h = v.hotspots.find((x) => x.id === id)!;
      expect(h.actions).toEqual([]);
      expect(h.soon).toBeTruthy();
    }
    const door = v.hotspots.find((h) => h.id === 'door')!;
    expect(door.actions).toEqual([]);
    expect(door.soon).toBeNull();
  });
});

describe('homeView: disabled reasons', () => {
  it('away from home: bed, beat and TV are disabled with location reasons', () => {
    const s = travelTo(at('midwest'), 'santamonica');
    expect(spot(s, 'bed').actions[0]!.disabledReason).toBe('You can only sleep at home.');
    expect(spot(s, 'desk').actions.find((a) => a.command.type === 'MAKE_BEAT')!.disabledReason).toMatch(/at home/);
    expect(spot(s, 'tv').actions[0]!.disabledReason).toBe('That is at home.');
  });

  it('too tired for a beat or a write session', () => {
    const s = tweak(withProject(at('indie'), 'short', 'develop'), (t) => (t.player.energy = C.MIN_ENERGY_TO_START - 1));
    for (const a of spot(s, 'desk').actions) expect(a.disabledReason).toBe('Too exhausted. Sleep first.');
    // Sleep and TV don't need Energy.
    expect(spot(s, 'bed').actions[0]!.disabledReason).toBeNull();
    expect(spot(s, 'tv').actions[0]!.disabledReason).toBeNull();
  });

  it('not enough Spark for a write session, beat or prep', () => {
    const s0 = withProject(at('indie'), 'short', 'develop');
    const s = tweak(s0, (t) => {
      t.player.spark = 0;
      t.board = [opp(t, { id: 'a' })];
    });
    for (const a of spot(s, 'desk').actions) expect(a.disabledReason).toBe('Not enough Creative Spark. Go recharge.');
    expect(spot(s, 'ringlight').actions[0]!.disabledReason).toBe('Not enough Creative Spark. Go recharge.');
    // TV is how you get Spark back.
    expect(spot(s, 'tv').actions[0]!.disabledReason).toBeNull();
  });

  it('busy: every action reports the running activity', () => {
    const s = run(at('producer'), { type: 'SLEEP', hours: 8 }).state;
    for (const h of homeView(s).hotspots) for (const a of h.actions) expect(a.disabledReason).toBe('Busy: Sleeping.');
  });
});

describe('homeView: ring light', () => {
  it('picks the open opportunity with the best odds that still has prep room', () => {
    const base = tweak(at('indie'), (t) => {
      t.player.skills.acting = 90;
      t.player.skills.music = 5;
    });
    const s = tweak(base, (t) => {
      t.board = [
        opp(t, { id: 'full', skill: 'acting', tier: 1, prepHours: C.PREP_MAX_HOURS }), // best odds, but no prep room
        opp(t, { id: 'booked', skill: 'acting', tier: 1, status: 'booked' }),
        opp(t, { id: 'weak', skill: 'music', tier: 1 }),
        opp(t, { id: 'best', skill: 'acting', tier: 1, prepHours: 1 }),
        opp(t, { id: 'hard', skill: 'acting', tier: 3 }),
      ];
    });
    const eligible = s.board.filter((o) => o.status === 'open' && o.prepHours < C.PREP_MAX_HOURS);
    const max = Math.max(...eligible.map((o) => oddsFor(s.player, o)));
    const ring = spot(s, 'ringlight');
    expect(ring.soon).toBeNull();
    expect(ring.actions).toHaveLength(1);
    const a = ring.actions[0]!;
    expect(a.command).toEqual({ type: 'PREP', opportunityId: 'best', hours: 1 });
    expect(oddsFor(s.player, s.board.find((o) => o.id === 'best')!)).toBe(max);
    expect(a.label).toBe('Prep for "Gig best"');
    expect(a.minutes).toBe(60);
    expect(a.disabledReason).toBeNull();

    // Running it really preps: +1h on that opportunity, Spark spent.
    const done = run(s, a.command, { type: 'SKIP_TO_DONE' }).state;
    expect(done.board.find((o) => o.id === 'best')!.prepHours).toBe(2);
    expect(done.player.spark).toBeLessThan(s.player.spark);
  });

  it('works through the whole board: each prep moves on once an opportunity is full', () => {
    let s = tweak(at('indie'), (t) => (t.board = [opp(t, { id: 'only', prepHours: C.PREP_MAX_HOURS - 1 })]));
    expect(spot(s, 'ringlight').actions[0]!.command).toMatchObject({ opportunityId: 'only' });
    s = run(s, spot(s, 'ringlight').actions[0]!.command, { type: 'SKIP_TO_DONE' }).state;
    expect(s.board[0]!.prepHours).toBe(C.PREP_MAX_HOURS);
    expect(spot(s, 'ringlight').actions).toEqual([]);
    expect(spot(s, 'ringlight').soon).toBeTruthy();
  });

  it('empty or closed board: no actions and a soon line', () => {
    const empty = tweak(at('nepo'), (t) => (t.board = []));
    expect(spot(empty, 'ringlight').actions).toEqual([]);
    expect(spot(empty, 'ringlight').soon).toBeTruthy();
    const closed = tweak(at('nepo'), (t) => (t.board = [opp(t, { id: 'x', status: 'rejected' }), opp(t, { id: 'y', status: 'exposed' })]));
    expect(spot(closed, 'ringlight').actions).toEqual([]);
  });

  it('PREP has no location rule in the reducer (whyNot is the same at home and away)', () => {
    const s = tweak(at('indie'), (t) => (t.board = [opp(t, { id: 'a', location: 'burbank' })]));
    const cmd = spot(s, 'ringlight').actions[0]!.command;
    expect(whyNot(s, cmd)).toBeNull();
    const away = travelTo(s, awayFrom(s.player.home));
    expect(whyNot(away, cmd)).toBeNull();
    expect(homeView(away).atHome).toBe(false);
  });
});

// ---------- home TV leisure ----------

describe('home TV leisure', () => {
  it('is defined as a free, home, +12 Spark leisure; others stay on the default', () => {
    expect(LEISURE.tv).toMatchObject({ id: 'tv', location: 'home', cost: 0, spark: 12 });
    expect(LEISURE_IDS).toContain('tv');
    for (const id of LEISURE_IDS) if (id !== 'tv') expect(LEISURE[id].spark).toBeUndefined();
    expect(C.LEISURE_SPARK).toBe(25);
  });

  it.each(ARCHETYPE_IDS)('%s: allowed only at their own home', (arch) => {
    const s = at(arch);
    const home = s.player.home;
    expect(leisureLocation(LEISURE.tv, home)).toBe(home);
    expect(whyNot(s, { type: 'LEISURE', leisureId: 'tv' })).toBeNull();
    for (const loc of LOCATION_IDS) {
      if (loc === home) continue;
      const away = travelTo(s, loc);
      expect(whyNot(away, { type: 'LEISURE', leisureId: 'tv' })).toBe('That is at home.');
      const r = step(away, { type: 'LEISURE', leisureId: 'tv' });
      expect(r.state).toBe(away);
      expect(r.events[0]!.type).toBe('ACTION_REJECTED');
    }
  });

  it('another archetype’s home neighbourhood is not your home', () => {
    // nepo lives in WeHo; NoHo is midwest's and producer's home.
    const s = travelTo(at('nepo'), ARCHETYPES.midwest.home);
    expect(s.player.location).not.toBe(s.player.home);
    expect(whyNot(s, { type: 'LEISURE', leisureId: 'tv' })).toBe('That is at home.');
  });

  it.each(ARCHETYPE_IDS)('%s: +12 Spark, usual burnout relief, $0 and no ledger row', (arch) => {
    const s = tweak(at(arch), (t) => {
      t.player.spark = 40;
      t.player.burnout = 30;
    });
    const r = run(s, { type: 'LEISURE', leisureId: 'tv' });
    expect(r.state.activity).toMatchObject({ kind: 'leisure', leisureId: 'tv', label: LEISURE.tv.name });
    expect(r.state.activity!.endMinute - r.state.activity!.startMinute).toBe(C.LEISURE_HOURS * 60);
    const done = run(r.state, { type: 'SKIP_TO_DONE' });
    expect(done.state.player.spark).toBe(52);
    expect(done.state.player.burnout).toBeCloseTo(30 - C.LEISURE_BURNOUT_RELIEF, 6);
    expect(C.BURNOUT_RECOVERY_PER_HOUR * C.LEISURE_HOURS).toBe(C.LEISURE_BURNOUT_RELIEF);
    expect(done.state.player.cash).toBe(s.player.cash);
    expect(done.state.ledger).toEqual(s.ledger);
    expect(done.events).toContainEqual({ type: 'LEISURE_DONE', leisureId: 'tv' });
    expect(done.state.player.location).toBe(s.player.home);
  });

  it('Spark is clamped at 100', () => {
    const s = tweak(at('indie'), (t) => (t.player.spark = 95));
    expect(run(s, { type: 'LEISURE', leisureId: 'tv' }, { type: 'SKIP_TO_DONE' }).state.player.spark).toBe(100);
  });

  it('allowed with $0 or overdrawn cash (it is free)', () => {
    const s = tweak(at('midwest'), (t) => (t.player.cash = -50));
    expect(whyNot(s, { type: 'LEISURE', leisureId: 'tv' })).toBeNull();
    expect(run(s, { type: 'LEISURE', leisureId: 'tv' }, { type: 'SKIP_TO_DONE' }).state.player.cash).toBe(-50);
    // The beach is free too.
    const beach = tweak(travelTo(at('midwest'), 'santamonica'), (t) => (t.player.cash = -50));
    expect(whyNot(beach, { type: 'LEISURE', leisureId: 'beach' })).toBeNull();
    // Paid leisure still needs the cash.
    const museum = tweak(travelTo(at('midwest'), LEISURE.museum.location as LocationId), (t) => (t.player.cash = 0));
    expect(whyNot(museum, { type: 'LEISURE', leisureId: 'museum' })).toBe(`Needs $${LEISURE.museum.cost}.`);
  });

  it('the episode busy caption is about being on set (actor episodes), not writing', () => {
    expect(BUSY.episode).not.toMatch(/writ/i);
  });

  it('the beach is unchanged: +25 Spark', () => {
    const s = tweak(travelTo(at('indie'), 'santamonica'), (t) => (t.player.spark = 40));
    expect(run(s, { type: 'LEISURE', leisureId: 'beach' }, { type: 'SKIP_TO_DONE' }).state.player.spark).toBe(65);
  });

  it('paid leisure still costs and still gives +25 (museum)', () => {
    const s = tweak(travelTo(at('indie'), LEISURE.museum.location as LocationId), (t) => (t.player.spark = 40));
    const done = run(s, { type: 'LEISURE', leisureId: 'museum' }, { type: 'SKIP_TO_DONE' }).state;
    expect(done.player.spark).toBe(65);
    expect(done.ledger[0]).toMatchObject({ amount: -LEISURE.museum.cost, kind: 'lifestyle', label: LEISURE.museum.name });
  });

  it.each(ARCHETYPE_IDS)('%s: listActions shows the TV only at home, with its real numbers', (arch) => {
    const s = at(arch);
    const tv = listActions(s).find((a) => a.id === 'leisure-tv');
    expect(tv).toBeDefined();
    expect(tv!.command).toEqual({ type: 'LEISURE', leisureId: 'tv' });
    expect(tv!.costs).toEqual([]);
    expect(tv!.rewards[0]).toBe('+12 Spark');
    expect(tv!.disabledReason).toBeNull();
    for (const loc of LOCATION_IDS) {
      if (loc === s.player.home) continue;
      expect(listActions(travelTo(s, loc)).some((a) => a.id === 'leisure-tv')).toBe(false);
    }
  });

  it('listActions still shows the beach at the beach with +25', () => {
    const beach = listActions(travelTo(at('nepo'), 'santamonica')).find((a) => a.id === 'leisure-beach');
    expect(beach!.rewards[0]).toBe('+25 Spark');
  });
});

// ---------- content ----------

describe('home flavour content', () => {
  it('HOTSPOTS covers exactly the spots homeView returns, within length limits', () => {
    const ids = homeView(at('indie')).hotspots.map((h) => h.id);
    expect(Object.keys(HOTSPOTS).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const h = HOTSPOTS[id];
      expect(h.name.length, id).toBeLessThanOrEqual(18);
      expect(h.blurb.length, id).toBeLessThanOrEqual(90);
      expect(h.icon.length).toBeGreaterThan(0);
    }
  });

  it('HOME_FLAVOR covers every archetype with 4 idle lines', () => {
    expect(Object.keys(HOME_FLAVOR).sort()).toEqual([...ARCHETYPE_IDS].sort());
    for (const arch of ARCHETYPE_IDS) {
      const f = HOME_FLAVOR[arch];
      expect(f.place.length, arch).toBeLessThanOrEqual(32);
      expect(f.idle).toHaveLength(4);
      for (const line of f.idle) expect(line.length, line).toBeLessThanOrEqual(110);
    }
  });

  it('STREET covers every location', () => {
    expect(Object.keys(STREET).sort()).toEqual([...LOCATION_IDS].sort());
    for (const loc of LOCATION_IDS) {
      expect(STREET[loc].heading.length).toBeLessThanOrEqual(28);
      expect(STREET[loc].line.length).toBeLessThanOrEqual(100);
    }
  });

  it('BUSY covers every ActivityKind', () => {
    const kinds: Record<ActivityKind, true> = {
      project: true, travel: true, job: true, sleep: true, leisure: true, class: true, headshots: true,
      repair: true, prep: true, submit: true, show: true, beat: true, episode: true, room: true, guild: true,
    };
    expect(Object.keys(BUSY).sort()).toEqual(Object.keys(kinds).sort());
    for (const line of Object.values(BUSY)) expect(line.length, line).toBeLessThanOrEqual(60);
  });

  it('MOODS are sorted best → worst with a 0 floor, so every average gets a mood', () => {
    for (let i = 1; i < MOODS.length; i++) expect(MOODS[i]!.min).toBeLessThan(MOODS[i - 1]!.min);
    expect(MOODS[MOODS.length - 1]!.min).toBe(0);
    for (let avg = 0; avg <= 100; avg++) expect(MOODS.find((m) => avg >= m.min)).toBeDefined();
  });

  it('SOON covers the three preview spots, each ending "(coming soon)"', () => {
    expect(Object.keys(SOON).sort()).toEqual(['fridge', 'shower', 'table']);
    for (const line of Object.values(SOON)) {
      expect(line.length).toBeLessThanOrEqual(90);
      expect(line.endsWith('(coming soon)')).toBe(true);
    }
  });
});
