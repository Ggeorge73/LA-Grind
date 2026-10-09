// LAG-82: TV writer's side QA — spec pilot → pitch deck → agent → staffing season → writers' room.
import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { AGENCIES, ROOM_TIERS, SPEC_SCALE } from './content/writers';
import { AGENCY_FLAVOR, ROOM_EVENTS } from './content/writersFlavor';
import { STUDIO_LOT } from './content/tv';
import { LOCATIONS, LOCATION_IDS } from './content/locations';
import { projectView, tvView } from './actions';
import { agentOdds, atHour, average, cloutTier, dayOf, deckScore, minuteOfDay, staffingOdds, writeScore } from './formulas';
import { agentOddsFor, projectQuality, resolveStaffing, staffingOddsFor } from './project';
import { newGame, step, whyNot } from './reducer';
import { Rng, nextFloat } from './rng';
import { deserialize, serialize } from './save';
import { resolveContractWeek, resolveRoomEvent, staffWriter } from './tv';
import type { ArchetypeId, Command, GameEvent, GameState, LocationId, RoomEventState } from './types';

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
const travelTo = (s: GameState, to: LocationId) => (s.player.location === to ? s : run(s, { type: 'TRAVEL', to }, { type: 'SKIP_TO_DONE' }).state);
/** Start a command on a rested player and finish it. */
const act = (s: GameState, cmd: Command) => run(rested(s), cmd, { type: 'SKIP_TO_DONE' });

function rngStateWhere(pred: (v: number) => boolean): number {
  for (let k = 1; ; k++) if (pred(nextFloat(k)[0])) return k;
}
const forceYes = (s: GameState) => tweak(s, (t) => (t.rngState = rngStateWhere((v) => v < 0.001)));
const forceNo = (s: GameState) => tweak(s, (t) => (t.rngState = rngStateWhere((v) => v > 0.999)));
function fixedRng(v: number): Rng {
  const r = new Rng(0);
  r.float = () => v;
  return r;
}

/** A rich, rested run on `day` at `hour`. */
function at(arch: ArchetypeId, day: number, hour = 9, seed = 1): GameState {
  const s = tweak(newGame(arch, seed), (t) => (t.player.cash += 100_000));
  return rested(toMinute(s, atHour(day, hour)).state);
}

/** A spec pilot already at `stage`, with the given spec/deck scores. */
function specAt(s0: GameState, stage: 'develop' | 'deck' | 'agent' | 'staffing', spec = [60, 60, 60], deck = [60, 60]): GameState {
  const s = run(s0, { type: 'START_PROJECT', scale: 'spec' }).state;
  return tweak(s, (t) => {
    const p = t.project!;
    p.stage = stage;
    if (stage !== 'develop') p.scores.develop = [...spec];
    if (stage === 'agent' || stage === 'staffing') p.scores.deck = [...deck];
    if (stage === 'staffing') {
      p.agent = { id: 'midsize', name: AGENCY_FLAVOR.midsize.name, heat: 0.1 };
      p.staffing = { tries: 0, nextMinute: atHour(dayOf(t.minute) + 1, C.BILLS_HOUR) };
    }
  });
}

/** Staffed on a `tier` room at 06:00 on `day` (week ends 7 days later). */
function staffed(tier: 1 | 2 | 3 | 4, arch: ArchetypeId = 'indie', day = 2): GameState {
  const s = toMinute(tweak(newGame(arch, 1), (t) => (t.player.cash += 100_000)), atHour(day, 6)).state;
  return tweak(s, (t) => {
    t.player.rp = [0, 100, 400, 900][tier - 1]!;
    staffWriter(t, 'Cozy Heights', 'KABLE 9');
  });
}
/** At the lot, rested, ready to start a room day. */
const atLot = (s: GameState) => rested(travelTo(s, STUDIO_LOT));
const roomDay = (s: GameState) => act(atLot(s), { type: 'ROOM_DAY' });
const event = (favor0: number, quality0: number, favor1 = 0, quality1 = 0): RoomEventState => ({
  prompt: 'Test prompt',
  choices: [
    { text: 'First', favor: favor0, quality: quality0 },
    { text: 'Second', favor: favor1, quality: quality1 },
  ],
});

// ---------- formulas ----------

describe('writer formulas', () => {
  it('deck score = 15 + 0.4·Writing + 0.3·Directing + 0.2·Spark + 0–15 luck, clamped 0–100', () => {
    expect(deckScore(40, 40, 60, 0.5)).toBeCloseTo(62.5, 6);
    expect(deckScore(0, 0, 0, 0)).toBe(15);
    expect(deckScore(10, 5, 20, 1)).toBeCloseTo(15 + 4 + 1.5 + 4 + 15, 6);
    expect(deckScore(100, 100, 100, 1)).toBe(100);
  });

  it('agent odds = logistic((0.4·Spec + 0.3·Deck + 10·Clout + 0.2·Network − (50 + mod)) / 12), clamped 5–85%', () => {
    // 24 + 18 + 10 + 3 = 55 → logistic(5/12)
    expect(agentOdds({ spec: 60, deck: 60, clout: 1, network: 15, difficultyMod: 0 })).toBeCloseTo(1 / (1 + Math.exp(-5 / 12)), 6);
    // Exactly at the difficulty → 50%
    expect(agentOdds({ spec: 50, deck: 50, clout: 1, network: 25, difficultyMod: 0 })).toBeCloseTo(0.5, 6);
    expect(agentOdds({ spec: 100, deck: 100, clout: 10, network: 100, difficultyMod: 12 })).toBe(C.PITCH_CEILING);
    expect(agentOdds({ spec: 0, deck: 0, clout: 1, network: 0, difficultyMod: 12 })).toBe(C.PITCH_FLOOR);
    // A harder agency is always the same or worse.
    const odds = AGENCIES.map((a) => agentOdds({ spec: 60, deck: 60, clout: 1, network: 15, difficultyMod: a.difficultyMod }));
    for (let i = 1; i < odds.length; i++) expect(odds[i]!).toBeLessThanOrEqual(odds[i - 1]!);
  });

  it('staffing odds = clamp(15% + (Spec + Deck)/500 + 5%·Clout + heat, 5%, 80%)', () => {
    expect(staffingOdds(60, 60, 1, 0.1)).toBeCloseTo(0.15 + 0.24 + 0.05 + 0.1, 6);
    expect(staffingOdds(0, 0, 1, 0)).toBeCloseTo(0.2, 6);
    expect(staffingOdds(100, 100, 4, 0.2)).toBe(C.STAFFING_MAX);
    expect(staffingOdds(0, 0, 0, -1)).toBe(C.STAFFING_MIN);
  });

  it('room tiers: $500/$1,000/$2,000/$3,500 a week for 6/8/10/10 weeks', () => {
    expect([1, 2, 3, 4].map((t) => ROOM_TIERS[t as 1 | 2 | 3 | 4].weeklyPay)).toEqual([500, 1000, 2000, 3500]);
    expect([1, 2, 3, 4].map((t) => ROOM_TIERS[t as 1 | 2 | 3 | 4].weeks)).toEqual([6, 8, 10, 10]);
  });
});

// ---------- spec pipeline ----------

describe('spec pilot: start', () => {
  it('starts instantly as a TV project at the Burbank lot with no budget and no crew; any Clout', () => {
    const s0 = newGame('midwest', 1);
    expect(whyNot(s0, { type: 'START_PROJECT', scale: 'spec' })).toBeNull();
    const r = run(s0, { type: 'START_PROJECT', scale: 'spec' });
    const p = r.state.project!;
    expect(p.medium).toBe('tv');
    expect(p.scale).toBe('spec');
    expect(p.location).toBe('burbank');
    expect(p.location).toBe(STUDIO_LOT);
    expect(p.budget).toBe(0);
    expect(p.crewPool).toEqual([]);
    expect(p.stage).toBe('develop');
    expect(p.studio).toBeNull();
    expect(p.agent).toBeNull();
    expect(p.staffing).toBeNull();
    expect(p.scores.deck).toEqual([]);
    expect(r.state.minute).toBe(s0.minute);
    expect(types(r.events)).toContain('PROJECT_STARTED');
    expect(whyNot(r.state, { type: 'START_PROJECT', scale: 'spec' })).toMatch(/current project/);
  });

  it('film/music-only commands are refused on a spec pilot', () => {
    const s = specAt(at('indie', 2), 'agent');
    expect(whyNot(s, { type: 'PITCH', investorId: 'dentist' })).not.toBeNull();
    expect(whyNot(s, { type: 'SELF_FUND', amount: 100 })).not.toBeNull();
    expect(whyNot(s, { type: 'RECORD_SESSION' })).not.toBeNull();
    expect(whyNot(s, { type: 'PITCH_LABEL', labelId: 'garage' })).not.toBeNull();
  });
});

describe('spec pilot: write → deck → agent (real commands)', () => {
  it('3 drafts move it to the deck stage; 2 deck sessions move it to the agent stage', () => {
    let s = run(at('indie', 2, 8), { type: 'START_PROJECT', scale: 'spec' }).state;
    expect(whyNot(s, { type: 'DECK_SESSION' })).toMatch(/No pitch deck/);
    const allEvents: GameEvent[] = [];
    for (let i = 0; i < SPEC_SCALE.writeSessions; i++) {
      const r = act(s, { type: 'WRITE_SESSION' });
      s = r.state;
      allEvents.push(...r.events);
    }
    expect(s.project!.scores.develop).toHaveLength(3);
    expect(s.project!.stage).toBe('deck');
    expect(of(allEvents, 'PROJECT_STAGE').map((e) => e.stage)).toEqual(['deck']);
    expect(whyNot(s, { type: 'WRITE_SESSION' })).not.toBeNull();
    expect(whyNot(s, { type: 'PITCH_AGENT', agencyId: 'midsize' })).toMatch(/spec and deck/);

    const d1 = act(s, { type: 'DECK_SESSION' });
    expect(d1.state.project!.stage).toBe('deck');
    const d2 = act(d1.state, { type: 'DECK_SESSION' });
    expect(d2.state.project!.scores.deck).toHaveLength(2);
    expect(d2.state.project!.stage).toBe('agent');
    expect(of(d2.events, 'PROJECT_STAGE').map((e) => e.stage)).toEqual(['agent']);
    expect(whyNot(d2.state, { type: 'DECK_SESSION' })).toMatch(/No pitch deck/);
  });

  it('a deck session: 2h anywhere, −10 Spark, −10 Energy (+ awake drain), score from the formula, Writing +1', () => {
    const s = rested(specAt(at('indie', 2, 9), 'deck'));
    expect(s.player.location).not.toBe(STUDIO_LOT); // home in Silver Lake: decks are built anywhere
    expect(whyNot(s, { type: 'DECK_SESSION' })).toBeNull();
    const started = run(s, { type: 'DECK_SESSION' }).state;
    expect(started.activity!.endMinute - started.minute).toBe(C.DECK_HOURS * 60);
    const roll = nextFloat(started.rngState)[0];
    const r = run(started, { type: 'SKIP_TO_DONE' });
    const p = r.state.player;
    expect(p.spark).toBeCloseTo(100 - C.DECK_SPARK, 6);
    expect(p.energy).toBeCloseTo(100 - C.DECK_ENERGY - (C.ENERGY_AWAKE_DRAIN_PER_HOUR * C.DECK_HOURS), 6);
    expect(p.skills.writing).toBe(s.player.skills.writing + C.PROJECT_SKILL_GAIN);
    // Scored at the end of the session (Spark already spent, Writing not yet raised).
    const expected = Math.round(deckScore(s.player.skills.writing, s.player.skills.directing, 100 - C.DECK_SPARK, roll));
    expect(r.state.project!.scores.deck).toEqual([expected]);
    expect(of(r.events, 'SESSION_SCORED')).toEqual([{ type: 'SESSION_SCORED', stage: 'deck', score: expected }]);
  });

  it('deck sessions need Spark and Energy', () => {
    const s = specAt(at('indie', 2), 'deck');
    expect(whyNot(tweak(s, (t) => (t.player.spark = C.DECK_SPARK - 1)), { type: 'DECK_SESSION' })).toMatch(/Spark/);
    expect(whyNot(tweak(s, (t) => (t.player.energy = 1)), { type: 'DECK_SESSION' })).toMatch(/exhausted/);
  });
});

describe('spec pilot: landing an agent', () => {
  const agency = AGENCIES.find((a) => a.id === 'midsize')!;

  it('meet an agency only at its neighbourhood, once a day; unknown agencies are refused', () => {
    const s = specAt(at('indie', 2), 'agent');
    expect(s.player.location).not.toBe('burbank');
    expect(whyNot(s, { type: 'PITCH_AGENT', agencyId: 'midsize' })).toBe(`They take meetings in ${LOCATIONS.burbank.name}.`);
    expect(whyNot(s, { type: 'PITCH_AGENT', agencyId: 'nope' })).toBe('Unknown agency.');
    for (const a of AGENCIES) {
      const there = rested(travelTo(s, a.location));
      expect(whyNot(there, { type: 'PITCH_AGENT', agencyId: a.id })).toBeNull();
    }
    const there = rested(travelTo(s, 'burbank'));
    const no = act(forceNo(there), { type: 'PITCH_AGENT', agencyId: 'midsize' }).state;
    expect(whyNot(rested(no), { type: 'PITCH_AGENT', agencyId: 'midsize' })).toMatch(/One agency meeting a day/);
    // Any agency, not just the same one.
    const weho = rested(travelTo(no, 'weho'));
    if (dayOf(weho.minute) === dayOf(no.minute)) expect(whyNot(weho, { type: 'PITCH_AGENT', agencyId: 'prestige' })).toMatch(/One agency meeting a day/);
    // Next day it's open again.
    const tomorrow = rested(toMinute(no, atHour(dayOf(no.minute) + 1, 9)).state);
    expect(whyNot(tomorrow, { type: 'PITCH_AGENT', agencyId: 'midsize' })).toBeNull();
    expect(whyNot(tweak(there, (t) => (t.player.energy = 1)), { type: 'PITCH_AGENT', agencyId: 'midsize' })).toMatch(/exhausted/);
  });

  it('a meeting takes 2h and −10 Energy; the odds are agentOdds(...) locked when it starts', () => {
    const s = rested(travelTo(specAt(at('indie', 2), 'agent', [70, 64, 58], [55, 61]), 'burbank'));
    const p = s.project!;
    const expected = agentOdds({ spec: average(p.scores.develop), deck: average(p.scores.deck), clout: cloutTier(s.player.rp), network: s.player.network, difficultyMod: agency.difficultyMod });
    expect(agentOddsFor(s, p, agency)).toBeCloseTo(expected, 10);
    const started = run(s, { type: 'PITCH_AGENT', agencyId: 'midsize' }).state;
    expect(started.activity!.odds).toBeCloseTo(expected, 10);
    expect(started.activity!.endMinute - started.minute).toBe(C.AGENT_PITCH_HOURS * 60);
    // Network jumps mid-meeting: the locked odds still decide.
    const boosted = tweak(started, (t) => (t.player.network = 100));
    const r = run(boosted, { type: 'SKIP_TO_DONE' });
    const e = of(r.events, 'AGENT_PITCHED')[0]!;
    expect(e.odds).toBeCloseTo(expected, 10);
    expect(r.state.player.energy).toBeCloseTo(100 - C.AGENT_PITCH_ENERGY - C.ENERGY_AWAKE_DRAIN_PER_HOUR * C.AGENT_PITCH_HOURS, 6);
  });

  it('a yes signs you and starts staffing season: next try at 06:00 five days later', () => {
    const s = rested(travelTo(specAt(at('indie', 2), 'agent'), 'burbank'));
    const r = act(forceYes(s), { type: 'PITCH_AGENT', agencyId: 'midsize' });
    const p = r.state.project!;
    expect(p.agent).toEqual({ id: 'midsize', name: AGENCY_FLAVOR.midsize.name, heat: agency.heat });
    expect(p.stage).toBe('staffing');
    expect(p.staffing).toEqual({ tries: 0, nextMinute: atHour(dayOf(r.state.minute) + C.STAFFING_INTERVAL_DAYS, C.BILLS_HOUR) });
    expect(minuteOfDay(p.staffing!.nextMinute)).toBe(C.BILLS_HOUR * 60);
    expect(p.pitches).toEqual([{ investorId: 'midsize', day: dayOf(s.minute), yes: true, amount: 0 }]);
    expect(of(r.events, 'AGENT_PITCHED')[0]).toMatchObject({ agencyId: 'midsize', agency: AGENCY_FLAVOR.midsize.name, yes: true });
    expect(of(r.events, 'PROJECT_STAGE').map((e) => e.stage)).toEqual(['staffing']);
    expect(r.state.trades.some((t) => t.text.includes(AGENCY_FLAVOR.midsize.name))).toBe(true);
    // No more agency meetings once signed.
    expect(whyNot(rested(r.state), { type: 'PITCH_AGENT', agencyId: 'midsize' })).not.toBeNull();
  });

  it('a no records the meeting and keeps you in the agent stage', () => {
    const s = rested(travelTo(specAt(at('indie', 2), 'agent'), 'burbank'));
    const r = act(forceNo(s), { type: 'PITCH_AGENT', agencyId: 'midsize' });
    expect(r.state.project!.agent).toBeNull();
    expect(r.state.project!.stage).toBe('agent');
    expect(r.state.project!.pitches[0]!.yes).toBe(false);
    expect(of(r.events, 'AGENT_PITCHED')[0]!.yes).toBe(false);
  });

  it('projectView.spec lists the five agencies with their odds, heat and where they meet', () => {
    const s = specAt(at('indie', 2), 'agent');
    const v = projectView(s)!.spec!;
    expect(v.agencies.map((a) => a.id)).toEqual(AGENCIES.map((a) => a.id));
    for (const a of v.agencies) {
      const ag = AGENCIES.find((x) => x.id === a.id)!;
      expect(a.odds).toBeCloseTo(agentOddsFor(s, s.project!, ag), 10);
      expect(a.heat).toBe(ag.heat);
      expect(a.where).toBe(LOCATIONS[ag.location].name);
      expect(a.disabledReason).toBe(whyNot(s, a.command));
    }
    expect(v.deck).toMatchObject({ done: 2, needed: 2 });
    expect(v.staffing).toBeNull();
    expect(projectView(run(newGame('indie', 1), { type: 'START_PROJECT', scale: 'short' }).state)!.spec).toBeNull();
  });
});

describe('spec pilot quality', () => {
  it('tv quality = 0.5·spec + 0.5·deck (unfinished stages count as 0)', () => {
    const s = specAt(at('indie', 2), 'agent', [60, 70, 80], [40, 50]);
    expect(projectQuality(s.project!)).toBeCloseTo(0.5 * 70 + 0.5 * 45, 6);
    const half = specAt(at('indie', 2), 'deck', [60, 70, 80]);
    expect(projectQuality(half.project!)).toBeCloseTo(35, 6);
  });

  it('an abandoned spec becomes a credit with that quality', () => {
    const s = specAt(at('indie', 2), 'agent', [60, 70, 80], [40, 50]);
    const r = run(s, { type: 'ABANDON_PROJECT' });
    expect(r.state.credits[0]).toMatchObject({ medium: 'tv', scale: SPEC_SCALE.name, quality: Math.round(57.5), outcome: 'Abandoned' });
  });
});

// ---------- staffing season ----------

describe('staffing season', () => {
  it('odds use spec, deck, Clout and the agency heat', () => {
    const s = specAt(at('indie', 2), 'staffing', [60, 60, 60], [50, 70]);
    expect(staffingOddsFor(s, s.project!)).toBeCloseTo(staffingOdds(60, 60, 1, 0.1), 10);
    expect(staffingOddsFor(s, s.project!)).toBeCloseTo(0.54, 10);
    const nepo = specAt(at('nepo', 2), 'staffing', [60, 60, 60], [50, 70]);
    expect(staffingOddsFor(nepo, nepo.project!)).toBeCloseTo(0.64, 10);
    expect(projectView(s)!.spec!.staffing).toMatchObject({ tries: 0, triesTotal: C.STAFFING_TRIES });
  });

  it('nothing happens before the next try is due', () => {
    const s = specAt(at('indie', 2), 'staffing');
    const t = tweak(s, (x) => resolveStaffing(x, fixedRng(0), []));
    expect(t.project!.staffing!.tries).toBe(0);
    expect(t.contract).toBeNull();
  });

  it('a yes: staff-writer contract at your Clout tier, credit "Staffed on X via Agency", a writing voucher', () => {
    for (const [arch, rp, tier] of [
      ['indie', 0, 1],
      ['indie', 150, 2],
      ['nepo', 400, 3],
      ['indie', 900, 4],
      ['indie', 5000, 4],
    ] as const) {
      const s = tweak(specAt(at(arch, 2), 'staffing'), (t) => {
        t.player.rp = rp;
        t.minute = t.project!.staffing!.nextMinute;
      });
      const events: GameEvent[] = [];
      const t = tweak(s, (x) => resolveStaffing(x, fixedRng(0), events));
      const c = t.contract!;
      const room = ROOM_TIERS[tier];
      expect(c.kind).toBe('writer');
      expect(c.tier).toBe(tier);
      expect(c.role).toBe('Staff writer');
      expect(c.weeklyPay).toBe(room.weeklyPay);
      expect(c.episodesTotal).toBe(room.weeks);
      expect(c.favor).toBe(C.FAVOR_START);
      expect(c.roomScores).toEqual([]);
      expect(c.episodesDone).toBe(0);
      expect(c.weekEndMinute).toBe(t.minute + 7 * C.MINUTES_PER_DAY);
      expect(t.project).toBeNull();
      expect(t.credits[0]!.outcome).toBe(`Staffed on ${c.showTitle} via ${AGENCY_FLAVOR.midsize.name}`);
      expect(t.credits[0]!.medium).toBe('tv');
      expect(t.player.guilds.writing.vouchers).toBe(1);
      const rolled = of(events, 'STAFFING_ROLLED')[0]!;
      expect(rolled).toMatchObject({ attempt: 1, staffed: true, final: true, show: c.showTitle, network: c.network });
      expect(rolled.odds).toBeCloseTo(staffingOddsFor(s, s.project!), 10);
      expect(of(events, 'GUILD_VOUCHER')).toEqual([{ type: 'GUILD_VOUCHER', guild: 'writing', total: 1 }]);
    }
  });

  it('writing-guild members are staffed at 1.25× the weekly pay; an acting membership does not count', () => {
    const base = tweak(specAt(at('indie', 2), 'staffing'), (t) => (t.minute = t.project!.staffing!.nextMinute));
    const writer = tweak(base, (t) => {
      t.player.guilds.writing.member = true;
      resolveStaffing(t, fixedRng(0), []);
    });
    expect(writer.contract!.weeklyPay).toBe(Math.round(500 * C.GUILD_CONTRACT_MINIMUM));
    expect(writer.player.guilds.writing.vouchers).toBe(0); // members earn no more vouchers
    const actor = tweak(base, (t) => {
      t.player.guilds.acting.member = true;
      resolveStaffing(t, fixedRng(0), []);
    });
    expect(actor.contract!.weeklyPay).toBe(500);
  });

  it('three noes, five days apart → "Didn\'t get staffed"', () => {
    let s = tweak(specAt(at('indie', 2), 'staffing'), (t) => (t.minute = t.project!.staffing!.nextMinute));
    const all: GameEvent[] = [];
    for (let i = 1; i <= C.STAFFING_TRIES; i++) {
      const before = s.minute;
      s = tweak(s, (t) => resolveStaffing(t, fixedRng(0.9999), all));
      if (i < C.STAFFING_TRIES) {
        expect(s.project!.staffing).toEqual({ tries: i, nextMinute: atHour(dayOf(before) + C.STAFFING_INTERVAL_DAYS, C.BILLS_HOUR) });
        s = tweak(s, (t) => (t.minute = t.project!.staffing!.nextMinute));
      }
    }
    const rolls = of(all, 'STAFFING_ROLLED');
    expect(rolls.map((e) => [e.attempt, e.staffed, e.final])).toEqual([
      [1, false, false],
      [2, false, false],
      [3, false, true],
    ]);
    expect(s.project).toBeNull();
    expect(s.contract).toBeNull();
    expect(s.credits[0]!.outcome).toBe("Didn't get staffed");
    expect(s.player.guilds.writing.vouchers).toBe(0);
  });

  it('a try is not spent while you are already on a show; the agent waits five more days', () => {
    const s = tweak(specAt(at('indie', 2), 'staffing'), (t) => {
      t.minute = t.project!.staffing!.nextMinute;
      t.contract = staffed(1).contract;
    });
    const events: GameEvent[] = [];
    const t = tweak(s, (x) => resolveStaffing(x, fixedRng(0), events));
    expect(events).toEqual([]);
    expect(t.project!.staffing).toEqual({ tries: 0, nextMinute: atHour(dayOf(s.minute) + C.STAFFING_INTERVAL_DAYS, C.BILLS_HOUR) });
    expect(t.contract!.showTitle).toBe('Cozy Heights');
  });

  it('the clock rolls staffing at 06:00 on the due day (and not before)', () => {
    const s = specAt(at('indie', 2, 9), 'staffing');
    const due = s.project!.staffing!.nextMinute;
    const before = toMinute(s, due - 1);
    expect(of(before.events, 'STAFFING_ROLLED')).toEqual([]);
    const r = run(before.state, { type: 'ADVANCE', minutes: 1 });
    const rolled = of(r.events, 'STAFFING_ROLLED');
    expect(rolled).toHaveLength(1);
    expect(rolled[0]!.attempt).toBe(1);
    expect(r.state.minute).toBe(due);
  });
});

// ---------- the writers' room ----------

describe("writers' room: ROOM_DAY rules", () => {
  it('needs a staff-writer contract (an actor contract does not count, and writers do not shoot episodes)', () => {
    const none = at('indie', 2);
    expect(whyNot(none, { type: 'ROOM_DAY' })).toMatch(/not staffed/);
    const actor = tweak(staffed(1), (t) => (t.contract!.kind = 'actor'));
    expect(whyNot(atLot(actor), { type: 'ROOM_DAY' })).toMatch(/not staffed/);
    expect(whyNot(atLot(staffed(1)), { type: 'SHOOT_EPISODE' })).toMatch(/writers' room/);
  });

  it('at the Burbank lot, once a week, early enough to finish before the 06:00 week end, with Energy', () => {
    const s = staffed(1);
    const away = rested(travelTo(s, 'weho'));
    expect(whyNot(away, { type: 'ROOM_DAY' })).toBe(`The writers' room is in ${LOCATIONS[STUDIO_LOT].name}.`);
    const lot = atLot(s);
    expect(whyNot(lot, { type: 'ROOM_DAY' })).toBeNull();
    expect(whyNot(tweak(lot, (t) => (t.player.energy = 1)), { type: 'ROOM_DAY' })).toMatch(/exhausted/);
    const done = roomDay(s).state;
    const answered = run(done, { type: 'ROOM_CHOICE', option: 0 }).state;
    expect(whyNot(atLot(answered), { type: 'ROOM_DAY' })).toMatch(/done your room day this week/);
    // Too late: an 8-hour day must end by the week's 06:00.
    const late = tweak(lot, (t) => (t.minute = t.contract!.weekEndMinute - C.ROOM_HOURS * 60 + 1));
    expect(whyNot(late, { type: 'ROOM_DAY' })).toMatch(/Too late/);
    const justInTime = tweak(lot, (t) => (t.minute = t.contract!.weekEndMinute - C.ROOM_HOURS * 60));
    expect(whyNot(justInTime, { type: 'ROOM_DAY' })).toBeNull();
  });
});

describe("writers' room: a room day", () => {
  it('8h, −30 Energy; scored on Writing and Spark; Writing +1; +10·tier RP; a politics event opens', () => {
    for (const tier of [1, 3] as const) {
      const s = atLot(staffed(tier));
      const started = run(s, { type: 'ROOM_DAY' }).state;
      expect(started.activity!.kind).toBe('room');
      expect(started.activity!.endMinute - started.minute).toBe(C.ROOM_HOURS * 60);
      const roll = nextFloat(started.rngState)[0];
      const r = run(started, { type: 'SKIP_TO_DONE' });
      const c = r.state.contract!;
      const spark = r.state.player.spark;
      const expected = Math.round(writeScore(s.player.skills.writing, spark, roll));
      expect(c.roomScores).toEqual([expected]);
      expect(c.shotThisWeek).toBe(true);
      expect(r.state.player.skills.writing).toBe(s.player.skills.writing + 1);
      expect(r.state.player.rp).toBe(s.player.rp + C.ROOM_RP_PER_TIER * tier);
      expect(r.state.player.energy).toBeCloseTo(100 - C.ROOM_ENERGY - C.ENERGY_AWAKE_DRAIN_PER_HOUR * C.ROOM_HOURS, 6);
      expect(of(r.events, 'ROOM_DAY_DONE')[0]).toEqual({ type: 'ROOM_DAY_DONE', showTitle: 'Cozy Heights', score: expected, rp: C.ROOM_RP_PER_TIER * tier });
      expect(of(r.events, 'SKILL_GAINED')).toContainEqual({ type: 'SKILL_GAINED', skill: 'writing', amount: 1 });
      const ev = r.state.roomEvent!;
      const source = ROOM_EVENTS.find((e) => e.prompt === ev.prompt)!;
      expect(source).toBeDefined();
      expect(ev.choices).toEqual([{ ...source.choices[0] }, { ...source.choices[1] }]);
      expect(of(r.events, 'ROOM_EVENT')).toEqual([{ type: 'ROOM_EVENT', prompt: ev.prompt }]);
    }
  });

  it('an open politics event blocks every other command (time can still pass)', () => {
    const s = rested(roomDay(staffed(1)).state);
    expect(s.roomEvent).not.toBeNull();
    const blocked: Command[] = [
      { type: 'TRAVEL', to: 'weho' },
      { type: 'SLEEP', hours: 8 },
      { type: 'ROOM_DAY' },
      { type: 'START_PROJECT', scale: 'spec' },
      { type: 'JOIN_GUILD', guild: 'writing' },
      { type: 'DECK_SESSION' },
      { type: 'START_JOB', jobId: 'barista' },
    ];
    for (const cmd of blocked) expect(whyNot(s, cmd)).toBe('The room is waiting on your answer.');
    expect(whyNot(s, { type: 'ADVANCE', minutes: 10 })).toBeNull();
    expect(whyNot(s, { type: 'ROOM_CHOICE', option: 0 })).toBeNull();
    expect(whyNot(s, { type: 'ROOM_CHOICE', option: 1 })).toBeNull();
    expect(whyNot(s, { type: 'ROOM_CHOICE', option: 2 })).toBe('Pick one of the two answers.');
    expect(whyNot(s, { type: 'ROOM_CHOICE', option: -1 })).toBe('Pick one of the two answers.');
    const answered = run(s, { type: 'ROOM_CHOICE', option: 1 }).state;
    expect(answered.roomEvent).toBeNull();
    expect(whyNot(answered, { type: 'ROOM_CHOICE', option: 0 })).toBe('Nothing to answer in the room right now.');
    expect(whyNot(answered, { type: 'TRAVEL', to: 'weho' })).toBeNull();
  });

  it('ROOM_CHOICE moves Favor (clamped 0–100) and the last room score (clamped 0–100), instantly', () => {
    const base = roomDay(staffed(1)).state;
    const set = (favor: number, last: number, ev: RoomEventState) =>
      tweak(base, (t) => {
        t.contract!.favor = favor;
        t.contract!.roomScores = [40, last];
        t.roomEvent = ev;
      });
    const a = run(set(50, 60, event(12, -6, -8, 6)), { type: 'ROOM_CHOICE', option: 0 });
    expect(a.state.contract!.favor).toBe(62);
    expect(a.state.contract!.roomScores).toEqual([40, 54]);
    expect(a.state.minute).toBe(base.minute);
    expect(of(a.events, 'ROOM_CHOICE_MADE')).toEqual([{ type: 'ROOM_CHOICE_MADE', text: 'First', favor: 12, quality: -6, favorNow: 62 }]);
    const b = run(set(50, 60, event(12, -6, -8, 6)), { type: 'ROOM_CHOICE', option: 1 });
    expect(b.state.contract!.favor).toBe(42);
    expect(b.state.contract!.roomScores).toEqual([40, 66]);
    const hi = run(set(95, 98, event(12, 6)), { type: 'ROOM_CHOICE', option: 0 }).state.contract!;
    expect([hi.favor, hi.roomScores[1]]).toEqual([100, 100]);
    const lo = run(set(5, 3, event(-12, -6)), { type: 'ROOM_CHOICE', option: 0 }).state.contract!;
    expect([lo.favor, lo.roomScores[1]]).toEqual([0, 0]);
  });

  it('left open, the event answers itself with choice 0 at 06:00', () => {
    const s = roomDay(staffed(1)).state;
    const ev = s.roomEvent!;
    const favor = s.contract!.favor;
    const next6 = atHour(dayOf(s.minute) + 1, 6);
    const r = toMinute(s, next6);
    expect(r.state.roomEvent).toBeNull();
    const made = of(r.events, 'ROOM_CHOICE_MADE');
    expect(made).toHaveLength(1);
    expect(made[0]!.text).toBe(ev.choices[0].text);
    expect(r.state.contract!.favor).toBe(Math.max(0, Math.min(100, favor + ev.choices[0].favor)));
  });

  it('resolveRoomEvent with nothing open is a no-op', () => {
    const s = staffed(1);
    const events: GameEvent[] = [];
    const t = tweak(s, (x) => resolveRoomEvent(x, 0, events));
    expect(t).toEqual(s);
    expect(events).toEqual([]);
  });

  it('tvView shows the writer contract (ROOM_DAY command, Favor, room average) and the open event', () => {
    const s = roomDay(staffed(2)).state;
    const v = tvView(s);
    expect(v.contract).toMatchObject({ kind: 'writer', favor: C.FAVOR_START, tier: 2, weeklyPay: 1000, episodesTotal: 8, command: { type: 'ROOM_DAY' } });
    expect(v.contract!.roomAverage).toBeCloseTo(average(s.contract!.roomScores), 10);
    expect(v.roomEvent!.prompt).toBe(s.roomEvent!.prompt);
    expect(v.roomEvent!.choices.map((c) => c.command)).toEqual([
      { type: 'ROOM_CHOICE', option: 0 },
      { type: 'ROOM_CHOICE', option: 1 },
    ]);
    expect(tvView(staffed(1)).roomEvent).toBeNull();
  });
});

describe("writers' room: weeks and the wrap", () => {
  it('a worked week pays in full at the week end; a missed week pays 25%, costs 15 Favor and 10·tier RP', () => {
    const worked = run(roomDay(staffed(2)).state, { type: 'ROOM_CHOICE', option: 0 }).state;
    const favorAfterChoice = worked.contract!.favor;
    const w = toMinute(worked, worked.contract!.weekEndMinute);
    const week = of(w.events, 'EPISODE_WEEK')[0]!;
    expect(week).toMatchObject({ episode: 1, pay: 1000, missed: false, rpLost: 0 });
    expect(w.state.contract!.favor).toBe(favorAfterChoice);
    expect(w.state.contract!.shotThisWeek).toBe(false);

    const idle = tweak(staffed(2), (t) => (t.player.rp = 150));
    const m = toMinute(idle, idle.contract!.weekEndMinute);
    const missed = of(m.events, 'EPISODE_WEEK')[0]!;
    expect(missed).toMatchObject({ episode: 1, pay: Math.round(1000 * C.MISSED_EPISODE_PAY), missed: true, rpLost: 20 });
    expect(m.state.contract!.favor).toBe(C.FAVOR_START - C.FAVOR_MISSED_WEEK);
    expect(m.state.contract!.episodesMissed).toBe(1);
    expect(m.state.contract!.weekEndMinute).toBe(idle.contract!.weekEndMinute + 7 * C.MINUTES_PER_DAY);
  });

  it('missed weeks never take Favor below 0', () => {
    const s = tweak(staffed(1), (t) => {
      t.contract!.favor = 10;
      t.minute = t.contract!.weekEndMinute;
    });
    const t = tweak(s, (x) => resolveContractWeek(x, new Rng(1), []));
    expect(t.contract!.favor).toBe(0);
  });

  /** The last week of a `tier` room with this Favor, the room day done (unless `missed`). */
  function lastWeek(tier: 1 | 2 | 3 | 4, favor: number, opts: { missed?: boolean; rp?: number; scores?: number[] } = {}): GameState {
    return tweak(staffed(tier), (t) => {
      const c = t.contract!;
      c.favor = favor;
      c.episodesDone = c.episodesTotal - 1;
      c.shotThisWeek = !opts.missed;
      c.roomScores = opts.scores ?? [50, 60, 70];
      if (opts.rp !== undefined) t.player.rp = opts.rp;
      t.minute = c.weekEndMinute;
    });
  }
  const wrap = (s: GameState) => {
    const events: GameEvent[] = [];
    const t = tweak(s, (x) => resolveContractWeek(x, new Rng(1), events));
    return { state: t, events, wrapped: of(events, 'ROOM_WRAPPED')[0]! };
  };

  it('Favor ≥ 70: promoted to story editor, +50·tier RP', () => {
    for (const tier of [1, 2, 3, 4] as const) {
      const s = lastWeek(tier, 70, { rp: 1000 });
      const { state, wrapped } = wrap(s);
      expect(wrapped).toMatchObject({ outcome: 'promoted', favor: 70, rp: C.PROMOTION_RP_PER_TIER * tier, weeks: ROOM_TIERS[tier].weeks });
      expect(state.player.rp).toBe(1000 + C.ROOM_RP_PER_TIER * 0 + C.PROMOTION_RP_PER_TIER * tier);
      expect(state.contract).toBeNull();
      expect(state.credits[0]).toMatchObject({
        title: 'Cozy Heights',
        medium: 'tv',
        scale: ROOM_TIERS[tier].label,
        quality: 60,
        outcome: `Staff writer on KABLE 9, ${ROOM_TIERS[tier].weeks} weeks (promoted to story editor)`,
      });
    }
  });

  it('Favor 30–69: a solid credit ("asked back"), no RP change', () => {
    for (const favor of [30, 50, 69]) {
      const { state, wrapped } = wrap(lastWeek(2, favor, { rp: 300 }));
      expect(wrapped.outcome).toBe('normal');
      expect(wrapped.rp).toBe(0);
      expect(state.player.rp).toBe(300);
      expect(state.credits[0]!.outcome).toBe('Staff writer on KABLE 9, 8 weeks (asked back)');
    }
  });

  it('Favor < 30: not asked back, −10·tier RP (never below 0)', () => {
    const { state, wrapped } = wrap(lastWeek(3, 29, { rp: 500 }));
    expect(wrapped).toMatchObject({ outcome: 'notAskedBack', rp: -30 });
    expect(state.player.rp).toBe(470);
    expect(state.credits[0]!.outcome).toBe('Staff writer on KABLE 9, 10 weeks (not asked back)');
    const broke = wrap(lastWeek(4, 0, { rp: 5 }));
    expect(broke.wrapped.rp).toBe(-5);
    expect(broke.state.player.rp).toBe(0);
    const zero = wrap(lastWeek(4, 0, { rp: 0 }));
    expect(zero.wrapped.rp === 0).toBe(true); // (−0: nothing to lose)
    expect(zero.state.player.rp).toBe(0);
  });

  it('a missed last week counts before the verdict (80 − 15 = 65 → asked back, not promoted)', () => {
    const { state, wrapped } = wrap(lastWeek(1, 80, { missed: true, rp: 500 }));
    expect(wrapped.favor).toBe(65);
    expect(wrapped.outcome).toBe('normal');
    expect(state.credits[0]!.outcome).toMatch(/asked back/);
  });

  it('a room with no room days wraps with quality 0', () => {
    const { state } = wrap(lastWeek(1, 50, { scores: [] }));
    expect(state.credits[0]!.quality).toBe(0);
  });

  it('a full tier-1 room end to end: 6 room days answered for Favor → promoted; paid $3,000 in all', () => {
    let s = staffed(1);
    const all: GameEvent[] = [];
    for (let w = 0; w < 6; w++) {
      s = rested(travelTo(toMinute(s, atHour(dayOf(s.minute) + 1, 9)).state, STUDIO_LOT));
      const r = run(s, { type: 'ROOM_DAY' }, { type: 'SKIP_TO_DONE' });
      const ev = r.state.roomEvent!;
      const best = ev.choices[0].favor >= ev.choices[1].favor ? 0 : 1;
      const a = run(r.state, { type: 'ROOM_CHOICE', option: best });
      s = toMinute(a.state, a.state.contract!.weekEndMinute).state;
      all.push(...r.events, ...a.events);
    }
    expect(s.contract).toBeNull();
    const credit = s.credits.find((c) => c.outcome.startsWith('Staff writer'))!;
    expect(credit).toBeDefined();
    expect(of(all, 'ROOM_DAY_DONE')).toHaveLength(6);
    // Every event has at least one choice ≥ +4 Favor, so 6 favor-first answers always clear 70.
    expect(credit.outcome).toMatch(/promoted/);
  });
});

// ---------- full flow, saves, determinism ----------

describe('writer path end to end', () => {
  it('spec → deck → agent → staffed → room → wrap, with real commands and the real clock', () => {
    let s = run(at('indie', 2, 8), { type: 'START_PROJECT', scale: 'spec' }).state;
    for (let i = 0; i < 3; i++) s = act(s, { type: 'WRITE_SESSION' }).state;
    for (let i = 0; i < 2; i++) s = act(s, { type: 'DECK_SESSION' }).state;
    s = rested(toMinute(s, atHour(dayOf(s.minute) + 1, 9)).state);
    s = rested(travelTo(s, 'silverlake'));
    s = act(forceYes(s), { type: 'PITCH_AGENT', agencyId: 'boutique' }).state;
    expect(s.project!.stage).toBe('staffing');
    // Max out spec and deck (65% a try with the boutique at Clout 1); walk the 06:00s through up to 3 tries.
    s = tweak(s, (t) => {
      t.project!.scores.develop = [100, 100, 100];
      t.project!.scores.deck = [100, 100];
    });
    expect(staffingOddsFor(s, s.project!)).toBeCloseTo(0.15 + 0.4 + 0.05 + 0.05, 10);
    const rolls: GameEvent[] = [];
    while (s.project) {
      const r = toMinute(s, s.project.staffing!.nextMinute);
      rolls.push(...of(r.events, 'STAFFING_ROLLED'));
      s = r.state;
    }
    expect(rolls.length).toBeGreaterThanOrEqual(1);
    expect(rolls.length).toBeLessThanOrEqual(C.STAFFING_TRIES);
    expect(s.contract!.kind).toBe('writer');
    expect(s.credits[0]!.outcome).toMatch(/^Staffed on .* via Lantern & Lark Talent$/);
    expect(s.player.guilds.writing.vouchers).toBe(1);
    // First week in the room, answered, then paid at the week end.
    s = rested(travelTo(toMinute(s, atHour(dayOf(s.minute) + 1, 9)).state, STUDIO_LOT));
    s = run(s, { type: 'ROOM_DAY' }, { type: 'SKIP_TO_DONE' }, { type: 'ROOM_CHOICE', option: 0 }).state;
    const paid = toMinute(s, s.contract!.weekEndMinute);
    expect(of(paid.events, 'EPISODE_WEEK')[0]).toMatchObject({ episode: 1, missed: false, pay: s.contract!.weeklyPay });
  });

  it('a save mid-room (open event, writer contract, guild state) round-trips', () => {
    const s = tweak(roomDay(staffed(2)).state, (t) => {
      t.player.guilds.writing.vouchers = 2;
      t.player.guilds.acting.member = true;
    });
    expect(deserialize(serialize(s, 1))).toEqual(s);
    const spec = specAt(at('indie', 2), 'staffing');
    expect(deserialize(serialize(spec, 1))).toEqual(spec);
  });
});

describe('writer invariants under random commands', () => {
  const AGENCY_IDS = AGENCIES.map((a) => a.id);
  function randomWriterCommands(seed: number, n: number): Command[] {
    const r = new Rng(seed);
    const cmds: Command[] = [];
    for (let i = 0; i < n; i++) {
      const roll = r.int(0, 15);
      if (roll === 0) cmds.push({ type: 'TRAVEL', to: r.pick(LOCATION_IDS) });
      else if (roll === 1) cmds.push({ type: 'TRAVEL', to: r.pick(['burbank', 'weho', 'silverlake', 'noho', 'hollywood'] as const) });
      else if (roll === 2) cmds.push({ type: 'SLEEP', hours: r.int(4, 10) });
      else if (roll === 3) cmds.push({ type: 'WRITE_SESSION' });
      else if (roll === 4) cmds.push({ type: 'DECK_SESSION' });
      else if (roll === 5) cmds.push({ type: 'PITCH_AGENT', agencyId: r.pick(AGENCY_IDS) });
      else if (roll === 6) cmds.push({ type: 'ROOM_DAY' });
      else if (roll === 7) cmds.push({ type: 'ROOM_CHOICE', option: r.int(0, 2) });
      else if (roll === 8) cmds.push({ type: 'JOIN_GUILD', guild: r.pick(['acting', 'writing', 'directing', 'music'] as const) });
      else if (roll === 9) cmds.push({ type: 'START_PROJECT', scale: 'spec' });
      else if (roll === 10) cmds.push({ type: 'LEISURE', leisureId: r.pick(['beach', 'screening', 'museum', 'records'] as const) });
      else if (roll <= 12) cmds.push({ type: 'SKIP_TO_DONE' });
      else cmds.push({ type: 'ADVANCE', minutes: r.int(30, 1500) });
    }
    return cmds;
  }

  /** Half the time a command that moves the writer path along (still odd timing), half the time pure noise. */
  function nudge(s: GameState, r: Rng, noise: Command): Command {
    if (r.float() < 0.5) return noise;
    const p = s.project;
    const c = s.contract;
    if (s.activity) return { type: 'SKIP_TO_DONE' };
    if (s.roomEvent) return { type: 'ROOM_CHOICE', option: r.int(0, 1) };
    if (s.player.energy < 25) return s.player.location === s.player.home ? { type: 'SLEEP', hours: 8 } : { type: 'TRAVEL', to: s.player.home };
    if (s.player.spark < 20) return s.player.location === 'hollywood' ? { type: 'LEISURE', leisureId: 'records' } : { type: 'TRAVEL', to: 'hollywood' };
    if (c?.kind === 'writer' && !c.shotThisWeek) return s.player.location === STUDIO_LOT ? { type: 'ROOM_DAY' } : { type: 'TRAVEL', to: STUDIO_LOT };
    if (s.player.guilds.writing.vouchers >= 3 && !s.player.guilds.writing.member)
      return s.player.location === 'weho' ? { type: 'JOIN_GUILD', guild: 'writing' } : { type: 'TRAVEL', to: 'weho' };
    if (!p) return { type: 'START_PROJECT', scale: 'spec' };
    if (p.stage === 'develop') return { type: 'WRITE_SESSION' };
    if (p.stage === 'deck') return { type: 'DECK_SESSION' };
    if (p.stage === 'agent') {
      const ag = AGENCIES[r.int(0, AGENCIES.length - 1)]!;
      return s.player.location === ag.location ? { type: 'PITCH_AGENT', agencyId: ag.id } : { type: 'TRAVEL', to: ag.location };
    }
    return { type: 'ADVANCE', minutes: r.int(60, 1440) };
  }

  it.each([1, 2, 3, 4])('seed %i: Favor, room scores, staffing tries and vouchers stay in range; an open event implies a writer contract', (seed) => {
    let s = tweak(newGame(seed % 2 ? 'indie' : 'nepo', seed), (t) => (t.player.cash += 50_000));
    const r = new Rng(seed * 7);
    const seen = { staffed: 0, notStaffed: 0, roomDays: 0, wraps: 0, joined: 0, dues: 0 };
    for (const noise of randomWriterCommands(seed * 31, 4000)) {
      const res = step(s, nudge(s, r, noise));
      s = res.state;
      seen.staffed += of(res.events, 'STAFFING_ROLLED').filter((e) => e.staffed).length;
      seen.notStaffed += of(res.events, 'STAFFING_ROLLED').filter((e) => e.final && !e.staffed).length;
      seen.roomDays += of(res.events, 'ROOM_DAY_DONE').length;
      seen.wraps += of(res.events, 'ROOM_WRAPPED').length;
      seen.joined += of(res.events, 'GUILD_JOINED').length;
      seen.dues += of(res.events, 'GUILD_DUES').length;
      const c = s.contract;
      if (c) {
        expect(c.favor).toBeGreaterThanOrEqual(0);
        expect(c.favor).toBeLessThanOrEqual(100);
        for (const x of c.roomScores) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(100);
        }
        expect(c.episodesDone).toBeLessThan(c.episodesTotal);
        expect(c.roomScores.length).toBeLessThanOrEqual(c.episodesDone + 1);
      }
      if (s.roomEvent) expect(c?.kind).toBe('writer');
      const st = s.project?.staffing;
      if (st) expect(st.tries).toBeLessThan(C.STAFFING_TRIES);
      if (s.project?.stage === 'staffing') expect(s.project.agent).not.toBeNull();
      for (const g of Object.values(s.player.guilds)) {
        expect(g.vouchers).toBeLessThanOrEqual(C.GUILD_VOUCHERS_NEEDED);
        if (g.healthPlan) expect(g.member).toBe(true);
      }
      expect(s.player.rp).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(s.player.cash)).toBe(true);
      if (s.status !== 'playing') break;
    }
    // The run really exercises the writer path (sanity for the test itself).
    expect(seen.staffed + seen.notStaffed).toBeGreaterThan(0);
    expect(seen.roomDays).toBeGreaterThan(0);
  });

  it('same seed + same writer commands = same outcome', () => {
    const cmds = randomWriterCommands(99, 1500);
    const start = tweak(newGame('nepo', 4), (t) => (t.player.cash += 10_000));
    const a = cmds.reduce((s, c) => step(s, c).state, start);
    const b = cmds.reduce((s, c) => step(s, c).state, start);
    expect(a).toEqual(b);
  });
});
