// LAG-62: music career QA — write → book the studio → crew → record → release week, plus Fans and saves.
import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { ARCHETYPES, ARCHETYPE_IDS } from './content/archetypes';
import { MUSIC_CREW_ROLE_IDS, MUSIC_SCALES } from './content/music';
import { CHART_NAME, MUSIC_CREW_QUIRKS, STUDIOS } from './content/musicFlavor';
import { INVESTORS } from './content/filmFlavor';
import { LOCATIONS } from './content/locations';
import { chartRp, crewFee, crewPoolSize, dailyBills, dayOf, hourOf, minuteOfDay, recordScore, releaseStreams, writeScore } from './formulas';
import { projectView } from './actions';
import { crewQuality, peakPosition, projectQuality } from './project';
import { newGame, step, whyNot } from './reducer';
import { deserialize, serialize } from './save';
import type { ArchetypeId, Command, GameEvent, GameState } from './types';

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
const rested = (s: GameState) => {
  const t = structuredClone(s);
  t.player.energy = 100;
  t.player.spark = 100;
  return t;
};
/** ADVANCE to the next time the clock reads `hour`:00 (0 minutes if it already does). */
function advanceToHour(s: GameState, hour: number): GameState {
  const minutes = (hour * 60 - minuteOfDay(s.minute) + 1440) % 1440;
  return minutes ? run(s, { type: 'ADVANCE', minutes }).state : s;
}
const travelTo = (s: GameState, to: GameState['player']['location']) =>
  s.player.location === to ? s : run(s, { type: 'TRAVEL', to }, { type: 'SKIP_TO_DONE' }).state;
const write = (s: GameState) => run(rested(s), { type: 'WRITE_SESSION' }, { type: 'SKIP_TO_DONE' }).state;
const record = (s: GameState) => run(rested(travelTo(s, s.project!.location)), { type: 'RECORD_SESSION' }, { type: 'SKIP_TO_DONE' }).state;
const releaseDays = (e: GameEvent[]) => e.flatMap((x) => (x.type === 'RELEASE_DAY' ? [x] : []));

function startSingle(arch: ArchetypeId = 'producer', seed = 3): GameState {
  return run(newGame(arch, seed), { type: 'START_PROJECT', scale: 'single' }).state;
}
/** Song written, studio booked: the crew pool is up. */
function crewStage(arch: ArchetypeId = 'producer', seed = 3): GameState {
  const s = run(write(startSingle(arch, seed)), { type: 'SELF_FUND', amount: MUSIC_SCALES.single.budget }).state;
  expect(s.project!.stage).toBe('crew');
  return s;
}
/** Crew hired (the cheapest candidate): ready to record. */
function recordStage(arch: ArchetypeId = 'producer', seed = 3): GameState {
  const s0 = crewStage(arch, seed);
  const pick = [...s0.project!.crewPool].sort((a, b) => a.fee - b.fee)[0]!;
  const s = run(rested(s0), { type: 'HIRE_CREW', candidateId: pick.id }, { type: 'SKIP_TO_DONE' }).state;
  expect(s.project!.stage).toBe('record');
  return s;
}
/** Both sessions recorded: the single is ready to drop. */
function releaseStage(arch: ArchetypeId = 'producer', seed = 3): GameState {
  const s = record(record(recordStage(arch, seed)));
  expect(s.project!.stage).toBe('release');
  return s;
}
/** Released at 10:00 on a fresh day, rested. */
function released(arch: ArchetypeId = 'producer', seed = 3): GameState {
  const s = run(rested(advanceToHour(releaseStage(arch, seed), 10)), { type: 'RELEASE_RECORD' }).state;
  expect(s.project!.release).not.toBeNull();
  return s;
}
/** ADVANCE to the next 06:00 (always strictly later). */
function toNextSix(s: GameState): { state: GameState; events: GameEvent[] } {
  const minutes = ((6 * 60 - minuteOfDay(s.minute) + 1440) % 1440) || 1440;
  return run(s, { type: 'ADVANCE', minutes });
}

describe('starting a record', () => {
  it('Clout gates the scale: single at 1, EP at 2, album at 4', () => {
    const mw = newGame('midwest', 1);
    expect(whyNot(mw, { type: 'START_PROJECT', scale: 'single' })).toBeNull();
    expect(whyNot(mw, { type: 'START_PROJECT', scale: 'ep' })).toMatch(/EPs need Clout Tier 2/);
    expect(whyNot(mw, { type: 'START_PROJECT', scale: 'album' })).toMatch(/Albums need Clout Tier 4/);
    const nepo = newGame('nepo', 1); // 400 RP = Clout 3
    expect(whyNot(nepo, { type: 'START_PROJECT', scale: 'ep' })).toBeNull();
    expect(whyNot(nepo, { type: 'START_PROJECT', scale: 'album' })).toMatch(/Tier 4/);
    const star = structuredClone(nepo);
    star.player.rp = 900;
    expect(whyNot(star, { type: 'START_PROJECT', scale: 'album' })).toBeNull();
  });

  it('starts instantly with a title, a studio and its neighbourhood, the scale budget and a Trades headline', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s0 = newGame('producer', seed);
      const r = run(s0, { type: 'START_PROJECT', scale: 'single' });
      const p = r.state.project!;
      expect(p).toMatchObject({ medium: 'music', scale: 'single', stage: 'develop', budget: MUSIC_SCALES.single.budget, release: null });
      expect(p.title.split(' ').length).toBeGreaterThanOrEqual(2);
      const studio = STUDIOS.find((x) => x.name === p.studio);
      expect(studio).toBeDefined();
      expect(p.location).toBe(studio!.location);
      expect(p.scores.record).toEqual([]);
      expect(r.state.minute).toBe(s0.minute);
      expect(types(r.events)).toContain('PROJECT_STARTED');
      expect(r.state.trades[0]!.own).toBe(true);
    }
  });

  it('one project at a time, film or music', () => {
    const s = startSingle();
    expect(whyNot(s, { type: 'START_PROJECT', scale: 'short' })).toMatch(/current project/);
    expect(whyNot(s, { type: 'START_PROJECT', scale: 'single' })).toMatch(/current project/);
  });
});

describe('write → book the studio → crew', () => {
  it('songs use Music (+1 per song), not Writing; a single needs one song', () => {
    const s0 = rested(startSingle());
    const r = run(s0, { type: 'WRITE_SESSION' }, { type: 'SKIP_TO_DONE' });
    const pl = s0.player;
    expect(r.state.minute - s0.minute).toBe(C.WRITE_SESSION_HOURS * 60);
    expect(r.state.player.skills.music).toBe(pl.skills.music + 1);
    expect(r.state.player.skills.writing).toBe(pl.skills.writing);
    expect(r.events).toContainEqual({ type: 'SKILL_GAINED', skill: 'music', amount: 1 });
    const score = r.state.project!.scores.develop[0]!;
    expect(score).toBeGreaterThanOrEqual(Math.round(writeScore(pl.skills.music, pl.spark, 0)));
    expect(score).toBeLessThanOrEqual(Math.round(writeScore(pl.skills.music, pl.spark, 1)));
    expect(r.state.project!.stage).toBe('finance');
  });

  it('an EP needs four songs', () => {
    let s = run(newGame('nepo', 2), { type: 'START_PROJECT', scale: 'ep' }).state;
    for (let i = 0; i < 3; i++) s = write(s);
    expect(s.project!.stage).toBe('develop');
    s = write(s);
    expect(s.project!.stage).toBe('finance');
    expect(s.project!.scores.develop).toHaveLength(MUSIC_SCALES.ep.songs);
  });

  it('PITCH (film investors) is rejected for music — records pitch labels', () => {
    const s = write(startSingle());
    const inv = INVESTORS[0]!;
    const here = rested(travelTo(s, inv.location));
    expect(whyNot(here, { type: 'PITCH', investorId: inv.id })).toMatch(/pitched to labels/);
    const r = step(here, { type: 'PITCH', investorId: inv.id });
    expect(types(r.events)).toEqual(['ACTION_REJECTED']);
    expect(r.state).toBe(here);
  });

  it('self-funding the studio budget moves cash instantly and opens the crew stage', () => {
    const s = write(startSingle());
    const r = run(s, { type: 'SELF_FUND', amount: MUSIC_SCALES.single.budget });
    expect(r.state.player.cash).toBe(s.player.cash - MUSIC_SCALES.single.budget);
    expect(r.state.minute).toBe(s.minute);
    expect(r.state.project!.stage).toBe('crew');
    expect(whyNot(s, { type: 'SELF_FUND', amount: MUSIC_SCALES.single.budget + 1 })).toMatch(/only needs/);
  });

  it('the crew pool uses music roles and quirks, Network-sized, fees from the studio budget', () => {
    const s = crewStage('nepo', 4);
    const p = s.project!;
    expect(p.crewPool.length).toBe(crewPoolSize(s.player.network, MUSIC_SCALES.single.crewSlots));
    for (const c of p.crewPool) {
      expect(MUSIC_CREW_ROLE_IDS).toContain(c.role);
      expect(MUSIC_CREW_QUIRKS).toContain(c.quirk);
      expect(c.fee).toBe(crewFee(MUSIC_SCALES.single.budget, c.skill));
    }
    expect(p.crewPool[0]!.role).toBe('producer');
  });

  it('one hire fills a single and moves to record; the fee comes out of the budget', () => {
    const s0 = crewStage();
    const c = s0.project!.crewPool[0]!;
    const s = run(rested(s0), { type: 'HIRE_CREW', candidateId: c.id }, { type: 'SKIP_TO_DONE' }).state;
    expect(s.project!.spent).toBe(c.fee);
    expect(s.project!.stage).toBe('record');
  });
});

describe('record', () => {
  it('is refused before the record stage', () => {
    expect(whyNot(crewStage(), { type: 'RECORD_SESSION' })).toMatch(/Nothing to record/);
  });

  it('needs the studio neighbourhood', () => {
    const s = recordStage();
    const away = structuredClone(rested(s));
    away.player.location = s.project!.location === 'noho' ? 'santamonica' : 'noho';
    expect(whyNot(away, { type: 'RECORD_SESSION' })).toBe(`${s.project!.studio} is in ${LOCATIONS[s.project!.location].name}.`);
    expect(whyNot(rested(travelTo(s, s.project!.location)), { type: 'RECORD_SESSION' })).toBeNull();
  });

  it('a session takes 4h, scores within the formula range and raises Music; two sessions reach release', () => {
    const s0 = rested(travelTo(recordStage(), recordStage().project!.location));
    const r = run(s0, { type: 'RECORD_SESSION' }, { type: 'SKIP_TO_DONE' });
    expect(r.state.minute - s0.minute).toBe(C.RECORD_HOURS * 60);
    const pl = s0.player;
    const crew = crewQuality(s0.project!);
    const score = r.state.project!.scores.record[0]!;
    expect(score).toBeGreaterThanOrEqual(Math.round(recordScore(pl.skills.music, crew, pl.spark, 0)));
    expect(score).toBeLessThanOrEqual(Math.round(recordScore(pl.skills.music, crew, pl.spark, 1)));
    expect(r.state.player.skills.music).toBe(pl.skills.music + 1);
    expect(r.state.project!.stage).toBe('record');
    const s2 = record(r.state);
    expect(s2.project!.stage).toBe('release');
    expect(s2.project!.scores.record).toHaveLength(MUSIC_SCALES.single.recordSessions);
    expect(whyNot(s2, { type: 'RECORD_SESSION' })).toMatch(/Nothing to record/);
  });

  it('music quality = 0.40·Songs + 0.45·Recording + 0.15·Crew + production value', () => {
    const p = releaseStage().project!;
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const pv = (10 * (p.raised - p.spent)) / p.budget;
    const expected = 0.4 * avg(p.scores.develop) + 0.45 * avg(p.scores.record) + 0.15 * crewQuality(p) + pv;
    expect(projectQuality(p)).toBeCloseTo(Math.min(100, expected), 6);
  });
});

describe('RELEASE_RECORD', () => {
  it('only in the release stage, instantly, and only once', () => {
    expect(whyNot(recordStage(), { type: 'RELEASE_RECORD' })).toMatch(/Finish recording first/);
    const s = releaseStage();
    expect(whyNot(s, { type: 'PROMO' })).toMatch(/Release something first/);
    const r = run(s, { type: 'RELEASE_RECORD' });
    expect(r.state.minute).toBe(s.minute);
    expect(r.state.project!.release).toEqual({ releasedMinute: s.minute, lastPromoDay: null, promoPending: false, days: [] });
    expect(types(r.events)).toContain('RECORD_RELEASED');
    expect(whyNot(r.state, { type: 'RELEASE_RECORD' })).toMatch(/Already out/);
    expect(types(step(r.state, { type: 'RELEASE_RECORD' }).events)).toEqual(['ACTION_REJECTED']);
  });
});

describe('release week', () => {
  it('the first day lands at the next 06:00 after release, not the same minute', () => {
    // Released at exactly 06:00: that 06:00 has already passed, so day 1 is tomorrow.
    const s = run(advanceToHour(releaseStage(), 6), { type: 'RELEASE_RECORD' }).state;
    expect(hourOf(s.minute)).toBe(6);
    const before = run(s, { type: 'ADVANCE', minutes: 1439 });
    expect(releaseDays(before.events)).toHaveLength(0);
    const r = run(before.state, { type: 'ADVANCE', minutes: 1 });
    expect(releaseDays(r.events)).toHaveLength(1);
    expect(hourOf(r.state.minute)).toBe(6);
    expect(dayOf(r.state.minute)).toBe(dayOf(s.minute) + 1);
    // Released at 10:00: day 1 is the following 06:00, 20 hours later.
    const t = released();
    const r2 = toNextSix(t);
    expect(r2.state.minute - t.minute).toBe(20 * 60);
    expect(releaseDays(r2.events)).toEqual([expect.objectContaining({ day: 1 })]);
  });

  it('seven days of streams per the formula, then a credit and an empty project slot', () => {
    const s = released();
    const p = s.project!;
    const q = projectQuality(p);
    const r = run(s, { type: 'ADVANCE', minutes: 7 * 1440 });
    const days = releaseDays(r.events);
    expect(days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    let fans = s.player.fans;
    days.forEach((d, i) => {
      expect(d.streams).toBe(releaseStreams({ fans, quality: q, multiplier: 1, day: i, promoted: false }));
      fans += d.fans;
    });
    expect(r.state.project).toBeNull();
    const ended = r.events.find((e) => e.type === 'RELEASE_WEEK_ENDED');
    expect(ended).toMatchObject({ title: p.title, totalStreams: days.reduce((a, d) => a + d.streams, 0) });
    const peak = Math.min(...days.flatMap((d) => (d.position === null ? [] : [d.position])));
    expect(r.state.credits[0]).toMatchObject({ title: p.title, medium: 'music', scale: 'Single', quality: Math.round(q) });
    expect(r.state.credits[0]!.outcome).toBe(`Peaked at #${peak} on ${CHART_NAME}`);
    expect(whyNot(r.state, { type: 'PROMO' })).toMatch(/Release something first/);
    expect(whyNot(r.state, { type: 'RELEASE_RECORD' })).toMatch(/Finish recording first/);
    expect(whyNot(r.state, { type: 'START_PROJECT', scale: 'single' })).toBeNull();
  });

  it('a record that never charts ends as "Didn\'t chart" with 0 RP', () => {
    const s = structuredClone(released('midwest'));
    s.project!.scores.develop = [5];
    s.project!.scores.record = [5, 5];
    s.player.fans = 0;
    const r = run(s, { type: 'ADVANCE', minutes: 7 * 1440 });
    expect(releaseDays(r.events).every((d) => d.position === null)).toBe(true);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'RELEASE_WEEK_ENDED', peak: null, rp: 0 }));
    expect(r.state.credits[0]!.outcome).toBe("Didn't chart");
    expect(r.state.player.rp).toBe(s.player.rp);
  });

  it('fans and cash change only by the reported amounts (royalties, fans gained, bills); RP by chartRp(peak)', () => {
    for (const arch of ARCHETYPE_IDS) {
      const s = released(arch, 5);
      const r = run(s, { type: 'ADVANCE', minutes: 7 * 1440 });
      let cash = s.player.cash;
      let fans = s.player.fans;
      for (const e of r.events) {
        if (e.type === 'RELEASE_DAY') {
          cash += e.royalties;
          fans += e.fans;
        }
        if (e.type === 'BILLS_CHARGED') cash -= e.amount;
        expect(['JOB_PAID', 'BOOKED', 'SELF_FUNDED']).not.toContain(e.type);
      }
      expect(r.state.player.cash).toBe(cash);
      expect(r.state.player.fans).toBe(fans);
      const ended = r.events.find((e) => e.type === 'RELEASE_WEEK_ENDED');
      if (ended?.type !== 'RELEASE_WEEK_ENDED') throw new Error('week did not end');
      const peak = Math.min(...releaseDays(r.events).flatMap((d) => (d.position === null ? [] : [d.position])));
      expect(ended.peak).toBe(Number.isFinite(peak) ? peak : null);
      expect(ended.rp).toBe(chartRp(ended.peak));
      expect(r.state.player.rp - s.player.rp).toBe(ended.rp);
      expect(r.state.stats.totalEarned - s.stats.totalEarned).toBe(releaseDays(r.events).reduce((a, d) => a + d.royalties, 0));
    }
  });

  it('peakPosition is the best (lowest) chart position of the week so far', () => {
    const s = released();
    const r = run(s, { type: 'ADVANCE', minutes: 3 * 1440 });
    const ranks = r.state.project!.release!.days.map((d) => d.position).filter((x): x is number => x !== null);
    expect(peakPosition(r.state.project!)).toBe(Math.min(...ranks));
  });
});

describe('promo', () => {
  it('2h, costs Energy and Spark, once per day', () => {
    const s = released();
    const r = run(s, { type: 'PROMO' }, { type: 'SKIP_TO_DONE' });
    expect(r.state.minute - s.minute).toBe(C.PROMO_HOURS * 60);
    expect(r.state.player.spark).toBeCloseTo(s.player.spark - C.PROMO_SPARK, 5);
    expect(types(r.events)).toContain('PROMO_DONE');
    expect(r.state.project!.release).toMatchObject({ promoPending: true, lastPromoDay: dayOf(s.minute) });
    expect(whyNot(rested(r.state), { type: 'PROMO' })).toMatch(/One promo push a day/);
    // Midnight is a new day for the limit.
    const tomorrow = rested(advanceToHour(r.state, 0));
    expect(whyNot(tomorrow, { type: 'PROMO' })).toBeNull();
    const tired = structuredClone(s);
    tired.player.spark = C.PROMO_SPARK - 1;
    expect(whyNot(tired, { type: 'PROMO' })).toMatch(/Spark/);
  });

  it('is consumed by the next 06:00 and boosts that day by exactly ×1.5 (A/B, same RNG)', () => {
    const s = released();
    const a = run(s, { type: 'PROMO' }, { type: 'SKIP_TO_DONE' }).state;
    // B: the same state and RNG, the same 2 hours pass, no promo.
    const b = run(s, { type: 'ADVANCE', minutes: a.minute - s.minute }).state;
    expect(b.minute).toBe(a.minute);
    const dayA = toNextSix(a);
    const dayB = toNextSix(b);
    const [ra] = releaseDays(dayA.events);
    const [rb] = releaseDays(dayB.events);
    const q = projectQuality(s.project!);
    expect(ra!.streams).toBe(releaseStreams({ fans: s.player.fans, quality: q, multiplier: 1, day: 0, promoted: true }));
    expect(rb!.streams).toBe(releaseStreams({ fans: s.player.fans, quality: q, multiplier: 1, day: 0, promoted: false }));
    expect(Math.abs(ra!.streams - 1.5 * rb!.streams)).toBeLessThanOrEqual(1);
    expect(dayA.state.project!.release!.days[0]!.promoted).toBe(true);
    expect(dayA.state.project!.release!.promoPending).toBe(false);
    // Day 2 has no promo: the boost does not carry over.
    const next = toNextSix(dayA.state);
    expect(next.state.project!.release!.days[1]!.promoted).toBe(false);
    const d2 = releaseDays(next.events)[0]!;
    expect(d2.streams).toBe(
      releaseStreams({ fans: dayA.state.player.fans, quality: q, multiplier: 1, day: 1, promoted: false }),
    );
  });
});

describe('Fans', () => {
  it('newGame starts each archetype with its own fans', () => {
    for (const id of ARCHETYPE_IDS) expect(newGame(id, 1).player.fans).toBe(ARCHETYPES[id].fans);
    expect(ARCHETYPES.producer.fans).toBeGreaterThan(Math.max(ARCHETYPES.nepo.fans, ARCHETYPES.midwest.fans, ARCHETYPES.indie.fans));
  });

  it('persist after the project ends and lift the next release', () => {
    const s = released('midwest');
    const done = run(s, { type: 'ADVANCE', minutes: 7 * 1440 }).state;
    expect(done.project).toBeNull();
    expect(done.player.fans).toBeGreaterThan(s.player.fans);
    const again = run(done, { type: 'START_PROJECT', scale: 'single' }, { type: 'ADVANCE', minutes: 1440 }).state;
    expect(again.player.fans).toBe(done.player.fans);
    expect(deserialize(serialize(again))!.player.fans).toBe(done.player.fans);
  });
});

describe('music saves and determinism', () => {
  it('a save mid release week round-trips unchanged', () => {
    const s = run(released(), { type: 'PROMO' }, { type: 'SKIP_TO_DONE' }, { type: 'ADVANCE', minutes: 2 * 1440 }).state;
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('a v3 save without a project migrates to v4 with 0 fans', () => {
    const s = newGame('producer', 2);
    const { fans: _f, ...player } = s.player;
    const m = deserialize(JSON.stringify({ version: 3, savedAt: 0, state: { ...s, version: 3, player } }))!;
    expect(m.version).toBe(C.SAVE_VERSION);
    expect(m.player.fans).toBe(0);
    expect(m.project).toBeNull();
    expect(run(m, { type: 'START_PROJECT', scale: 'single' }).state.project!.medium).toBe('music');
  });

  it('a v3 save with an in-flight film migrates to the current version and the film still finishes', () => {
    // A short film shot and waiting for post.
    let s = run(newGame('indie', 3), { type: 'START_PROJECT', scale: 'short' }).state;
    s = write(write(s));
    s = run(s, { type: 'SELF_FUND', amount: 2000 }).state;
    for (const c of [...s.project!.crewPool].sort((a, b) => a.fee - b.fee).slice(0, 2))
      s = run(rested(s), { type: 'HIRE_CREW', candidateId: c.id }, { type: 'SKIP_TO_DONE' }).state;
    for (let i = 0; i < 2; i++) s = run(rested(advanceToHour(travelTo(s, s.project!.location), 6)), { type: 'SHOOT_DAY' }, { type: 'SKIP_TO_DONE' }).state;
    expect(s.project!.stage).toBe('post');

    const { studio: _st, release: _r, scores, ...oldProject } = s.project!;
    const { record: _rec, ...oldScores } = scores;
    const { fans: _f, ...oldPlayer } = s.player;
    const v3 = JSON.stringify({ version: 3, savedAt: 0, state: { ...s, version: 3, player: oldPlayer, project: { ...oldProject, scores: oldScores } } });
    const m = deserialize(v3)!;
    expect(m.version).toBe(C.SAVE_VERSION);
    expect(m.player.fans).toBe(0);
    expect(m.project).toMatchObject({ studio: null, release: null, medium: 'film' });
    expect(m.project!.scores).toEqual({ ...oldScores, record: [] });

    const edited = run(rested(m), { type: 'EDIT_SESSION' }, { type: 'SKIP_TO_DONE' }).state;
    expect(edited.project!.stage).toBe('festival');
    const fin = run(edited, { type: 'SELF_RELEASE' }).state;
    expect(fin.project).toBeNull();
    expect(fin.credits[0]).toMatchObject({ medium: 'film', outcome: 'Self-released online' });
  });

  /** A whole single, start to credit, with a promo every day of the release week. */
  function wholeSingle(arch: ArchetypeId, seed: number): { state: GameState; events: GameEvent[] } {
    let s = released(arch, seed);
    const events: GameEvent[] = [];
    for (let i = 0; i < C.RELEASE_DAYS && s.project; i++) {
      s = run(rested(s), { type: 'PROMO' }, { type: 'SKIP_TO_DONE' }).state;
      const r = toNextSix(s);
      events.push(...r.events);
      s = advanceToHour(r.state, 10);
    }
    expect(s.project).toBeNull();
    return { state: s, events };
  }

  it('same seed + same commands = identical state through a whole single', () => {
    for (const [arch, seed] of [['producer', 3], ['midwest', 8]] as const) expect(wholeSingle(arch, seed).state).toEqual(wholeSingle(arch, seed).state);
  });

  it('promoting every day boosts all seven days; the week still ends after seven', () => {
    const { state, events } = wholeSingle('producer', 3);
    const days = releaseDays(events);
    expect(days).toHaveLength(C.RELEASE_DAYS);
    const q = state.credits[0]!.quality;
    expect(state.credits[0]!.medium).toBe('music');
    let fans = ARCHETYPES.producer.fans;
    days.forEach((d, i) => {
      const plain = releaseStreams({ fans, quality: q, multiplier: 1, day: i, promoted: false });
      expect(d.streams / plain).toBeGreaterThan(1.45);
      fans += d.fans;
    });
    expect(state.player.fans).toBe(fans);
  });

  it('daily bills are the only other cash movement during the week', () => {
    const s = released('indie', 2);
    const r = run(s, { type: 'ADVANCE', minutes: 7 * 1440 });
    const bills = r.events.filter((e) => e.type === 'BILLS_CHARGED');
    expect(bills).toHaveLength(7);
    for (const b of bills) if (b.type === 'BILLS_CHARGED') expect(b.amount).toBe(dailyBills(ARCHETYPES.indie.rentPerDay));
  });
});

describe('projectView regression (music projects crashed the Projects screen)', () => {
  it('works for a music project at every stage: investors [], record/release present', () => {
    const stages: Array<[string, GameState]> = [
      ['develop', startSingle()],
      ['finance', write(startSingle())],
      ['crew', crewStage()],
      ['record', recordStage()],
      ['release (not yet out)', releaseStage()],
      ['release week', run(released(), { type: 'PROMO' }, { type: 'SKIP_TO_DONE' }, { type: 'ADVANCE', minutes: 2 * 1440 }).state],
    ];
    for (const [name, s] of stages) {
      expect(s.project, name).not.toBeNull();
      let v: ReturnType<typeof projectView> = null;
      expect(() => (v = projectView(s)), name).not.toThrow();
      const view = v as ReturnType<typeof projectView>;
      expect(view, name).not.toBeNull();
      expect(view!.investors, name).toEqual([]);
      expect(view!.record, name).not.toBeNull();
      expect(view!.release, name).not.toBeNull();
    }
  });

  it('a film project has no record or release view', () => {
    const s = run(newGame('indie', 1), { type: 'START_PROJECT', scale: 'short' }).state;
    const v = projectView(s)!;
    expect(v.record).toBeNull();
    expect(v.release).toBeNull();
    expect(v.investors.length).toBeGreaterThan(0);
  });
});
