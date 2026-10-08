// LAG-69: music business QA — label deals, live shows, the beat store, catalogue placements, soundtracks, saves.
import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { ARCHETYPES } from './content/archetypes';
import { FILM_SCALES } from './content/film';
import { MUSIC_SCALES } from './content/music';
import { LABELS, LABEL_DIFFICULTY, VENUES } from './content/musicBiz';
import { INVESTORS } from './content/filmFlavor';
import {
  beatFee,
  beatLeaseChance,
  beatQuality,
  cloutTier,
  dailyBills,
  dayOf,
  hourOf,
  labelOdds,
  minuteOfDay,
  placementChance,
  placementFee,
  releaseStreams,
  royalties,
  showPay,
  showTickets,
  soundtrackBonus,
} from './formulas';
import { musicBizView, projectView } from './actions';
import { labelOddsFor, projectQuality, scriptQuality } from './project';
import { newGame, step, whyNot } from './reducer';
import { Rng } from './rng';
import { deserialize, serialize } from './save';
import type { ArchetypeId, CatalogRecord, Command, GameEvent, GameState, LocationId } from './types';

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
const rested = (s: GameState) => {
  const t = structuredClone(s);
  t.player.energy = 100;
  t.player.spark = 100;
  return t;
};
const tweak = (s: GameState, f: (t: GameState) => void): GameState => {
  const t = structuredClone(s);
  f(t);
  return t;
};
function advanceToHour(s: GameState, hour: number): GameState {
  const minutes = (hour * 60 - minuteOfDay(s.minute) + 1440) % 1440;
  return minutes ? run(s, { type: 'ADVANCE', minutes }).state : s;
}
/** ADVANCE to the next 06:00 (always strictly later). */
function toNextSix(s: GameState): { state: GameState; events: GameEvent[] } {
  const minutes = ((6 * 60 - minuteOfDay(s.minute) + 1440) % 1440) || 1440;
  return run(s, { type: 'ADVANCE', minutes });
}
const travelTo = (s: GameState, to: LocationId) => (s.player.location === to ? s : run(s, { type: 'TRAVEL', to }, { type: 'SKIP_TO_DONE' }).state);
const write = (s: GameState) => run(rested(s), { type: 'WRITE_SESSION' }, { type: 'SKIP_TO_DONE' }).state;
const record = (s: GameState) => run(rested(travelTo(s, s.project!.location)), { type: 'RECORD_SESSION' }, { type: 'SKIP_TO_DONE' }).state;
const of = <T extends GameEvent['type']>(e: GameEvent[], t: T) => e.filter((x): x is Extract<GameEvent, { type: T }> => x.type === t);
/** Run the current activity to its last minute, so the RNG state is the one its completion will use. */
const toLastMinute = (s: GameState) => run(s, { type: 'ADVANCE', minutes: s.activity!.endMinute - s.minute - 1 }).state;
const types = (e: GameEvent[]) => e.map((x) => x.type);
const label = (id: string) => LABELS.find((l) => l.id === id)!;
const venue = (id: string) => VENUES.find((v) => v.id === id)!;

/** A record in the catalogue (state tweak), for tests that don't need a whole release week. */
function withRecord(s: GameState, over: Partial<CatalogRecord> = {}): GameState {
  return tweak(s, (t) => {
    t.catalog.push({ id: `r-test-${t.catalog.length}`, title: 'Test Tape', scale: 'single', quality: 60, peak: 80, releasedMinute: 0, placements: 0, label: null, ...over });
  });
}

/** A single (or EP) with its songs written, sitting in "Book the studio". */
function musicFinance(arch: ArchetypeId = 'producer', seed = 3, scale: 'single' | 'ep' = 'single'): GameState {
  let s = run(newGame(arch, seed), { type: 'START_PROJECT', scale }).state;
  while (s.project!.stage === 'develop') s = write(s);
  expect(s.project!.stage).toBe('finance');
  return s;
}
/** Start a label meeting at the label's office and force the answer (odds 1 = yes, 0 = no). */
function pitchLabel(s: GameState, labelId: string, forceOdds?: number): { state: GameState; events: GameEvent[]; started: GameState } {
  const started0 = run(rested(travelTo(s, label(labelId).location)), { type: 'PITCH_LABEL', labelId }).state;
  expect(started0.activity?.projectAction).toBe('labelPitch');
  const started = forceOdds === undefined ? started0 : tweak(started0, (t) => (t.activity!.odds = forceOdds));
  return { ...run(started, { type: 'SKIP_TO_DONE' }), started };
}
/** From finance: fund what is left, hire the cheapest crew, record, and release at 10:00. */
function finishAndRelease(s0: GameState): GameState {
  let s = s0;
  const room = s.project!.budget - s.project!.raised;
  if (room > 0) s = run(tweak(s, (t) => (t.player.cash += room)), { type: 'SELF_FUND', amount: room }).state;
  while (s.project!.stage === 'crew') {
    const pick = s.project!.crewPool.filter((c) => !c.hired).sort((a, b) => a.fee - b.fee)[0]!;
    s = run(rested(s), { type: 'HIRE_CREW', candidateId: pick.id }, { type: 'SKIP_TO_DONE' }).state;
  }
  while (s.project!.stage === 'record') s = record(s);
  expect(s.project!.stage).toBe('release');
  s = run(rested(advanceToHour(s, 10)), { type: 'RELEASE_RECORD' }).state;
  expect(s.project!.release).not.toBeNull();
  return s;
}

/** A short film at each stage (indie, seed 3). */
function filmAt(stage: 'develop' | 'finance' | 'crew' | 'shoot' | 'post' | 'festival', arch: ArchetypeId = 'indie', seed = 3): GameState {
  let s = run(newGame(arch, seed), { type: 'START_PROJECT', scale: 'short' }).state;
  if (stage === 'develop') return s;
  while (s.project!.stage === 'develop') s = write(s);
  if (stage === 'finance') return s;
  s = run(tweak(s, (t) => (t.player.cash += FILM_SCALES.short.budget)), { type: 'SELF_FUND', amount: FILM_SCALES.short.budget }).state;
  if (stage === 'crew') return s;
  while (s.project!.stage === 'crew') {
    const pick = s.project!.crewPool.filter((c) => !c.hired).sort((a, b) => a.fee - b.fee)[0]!;
    s = run(rested(s), { type: 'HIRE_CREW', candidateId: pick.id }, { type: 'SKIP_TO_DONE' }).state;
  }
  if (stage === 'shoot') return s;
  while (s.project!.stage === 'shoot') s = run(rested(advanceToHour(travelTo(s, s.project!.location), 6)), { type: 'SHOOT_DAY' }, { type: 'SKIP_TO_DONE' }).state;
  expect(s.project!.stage).toBe('post');
  if (stage === 'post') return s;
  while (s.project!.stage === 'post') s = run(rested(s), { type: 'EDIT_SESSION' }, { type: 'SKIP_TO_DONE' }).state;
  expect(s.project!.stage).toBe('festival');
  return s;
}

// ---------- labels ----------

describe('label deals', () => {
  it('odds follow labelOdds(songs, Clout, Fans, scale difficulty + label modifier) and are fixed when the meeting starts', () => {
    for (const scale of ['single', 'ep'] as const) {
      const s = musicFinance('nepo', 4, scale);
      const p = s.project!;
      for (const l of LABELS) {
        expect(labelOddsFor(s, p, l)).toBe(
          labelOdds({ songs: scriptQuality(p), clout: cloutTier(s.player.rp), fans: s.player.fans, difficulty: LABEL_DIFFICULTY[scale] + l.difficultyMod }),
        );
      }
      // Easier labels are likelier to say yes.
      const odds = LABELS.map((l) => labelOddsFor(s, p, l));
      expect([...odds].sort((a, b) => b - a)).toEqual(odds);
      const { started } = pitchLabel(s, 'tape-hiss');
      expect(started.activity!.odds).toBe(labelOddsFor(s, p, label('tape-hiss')));
      expect(started.activity!.endMinute - started.activity!.startMinute).toBe(C.LABEL_PITCH_HOURS * 60);
    }
  });

  it('only a music project in "Book the studio" can be shopped to a label', () => {
    const cmd: Command = { type: 'PITCH_LABEL', labelId: 'garage-press' };
    expect(whyNot(newGame('producer', 1), cmd)).toMatch(/No record to shop around/);
    const develop = run(newGame('producer', 1), { type: 'START_PROJECT', scale: 'single' }).state;
    expect(whyNot(develop, cmd)).toMatch(/No record to shop around/);
    const film = filmAt('finance', 'midwest');
    expect(whyNot(travelTo(film, 'noho'), cmd)).toMatch(/No record to shop around/);
    const crew = run(musicFinance(), { type: 'SELF_FUND', amount: MUSIC_SCALES.single.budget }).state;
    expect(crew.project!.stage).toBe('crew');
    expect(whyNot(crew, cmd)).toMatch(/No record to shop around/);
    expect(whyNot(musicFinance(), { type: 'PITCH_LABEL', labelId: 'nope' })).toMatch(/Unknown label/);
    expect(whyNot(rested(musicFinance()), cmd)).toBeNull(); // producer lives in NoHo, where Garage Press is
  });

  it("meetings happen at the label's neighbourhood and need Energy", () => {
    const s = rested(musicFinance());
    for (const l of LABELS) {
      const here = travelTo(s, l.location);
      expect(whyNot(rested(here), { type: 'PITCH_LABEL', labelId: l.id })).toBeNull();
      const away = tweak(here, (t) => (t.player.location = l.location === 'noho' ? 'santamonica' : 'noho'));
      expect(whyNot(away, { type: 'PITCH_LABEL', labelId: l.id })).toMatch(/takes meetings in/);
    }
    const tired = tweak(s, (t) => (t.player.energy = 2));
    expect(whyNot(tired, { type: 'PITCH_LABEL', labelId: 'garage-press' })).toMatch(/exhausted/);
  });

  it('one meeting a day (shared with the project pitch log); tomorrow is fine', () => {
    const r = pitchLabel(musicFinance(), 'garage-press', 0);
    const p = r.state.project!;
    expect(p.pitches).toEqual([{ investorId: 'garage-press', day: dayOf(r.started.minute), yes: false, amount: 0 }]);
    expect(of(r.events, 'LABEL_PITCHED')[0]).toMatchObject({ labelId: 'garage-press', yes: false, advance: 0, odds: 0 });
    for (const l of LABELS) expect(whyNot(rested(travelTo(r.state, l.location)), { type: 'PITCH_LABEL', labelId: l.id })).toMatch(/One meeting a day/);
    // Film investors are not an option for records, today or ever.
    expect(whyNot(rested(r.state), { type: 'PITCH', investorId: INVESTORS[0]!.id })).toMatch(/pitched to labels/);
    const tomorrow = rested(advanceToHour(r.state, 9));
    expect(dayOf(tomorrow.minute)).toBe(dayOf(r.started.minute) + 1);
    expect(whyNot(tomorrow, { type: 'PITCH_LABEL', labelId: 'garage-press' })).toBeNull();
    expect(p.label).toBeNull();
    expect(p.raised).toBe(0);
  });

  it('a yes signs the record: advance = [min, max] × budget from the next roll, the label is set, further meetings are blocked', () => {
    for (const id of LABELS.map((l) => l.id)) {
      const s = musicFinance('producer', 5);
      const { started } = pitchLabel(s, id, 1);
      const last = toLastMinute(started);
      const rng = new Rng(last.rngState);
      rng.float(); // yes / no
      const l = label(id);
      const share = l.advanceMin + rng.float() * (l.advanceMax - l.advanceMin);
      const r = run(last, { type: 'SKIP_TO_DONE' });
      const p = r.state.project!;
      const budget = MUSIC_SCALES.single.budget;
      const expected = Math.min(budget, Math.round(budget * share));
      expect(p.raised).toBe(expected);
      expect(expected).toBeGreaterThanOrEqual(Math.round(budget * l.advanceMin));
      expect(expected).toBeLessThanOrEqual(Math.round(budget * l.advanceMax));
      expect(p.label).toMatchObject({ id, advance: expected, royaltyCut: l.royaltyCut, marketing: l.marketing });
      expect(p.label!.name.length).toBeGreaterThan(2);
      expect(of(r.events, 'LABEL_PITCHED')[0]).toMatchObject({ labelId: id, yes: true, advance: expected, odds: 1 });
      expect(r.state.trades[0]!.own).toBe(true);
      // Cash is untouched: the advance goes into the studio budget.
      expect(r.state.player.cash).toBe(last.player.cash);
      const next = rested(advanceToHour(r.state, 9));
      // Fully funded moves on to the crew; partly funded stays in finance, signed.
      expect(whyNot(next, { type: 'PITCH_LABEL', labelId: 'garage-press' })).toMatch(expected < budget ? /Already signed to/ : /No record to shop around/);
      expect(p.stage).toBe(expected < budget ? 'finance' : 'crew');
    }
  });

  it('the advance is capped by what the budget still needs', () => {
    const s = run(musicFinance('producer', 5), { type: 'SELF_FUND', amount: 350 }).state;
    const r = pitchLabel(s, 'sunset-major', 1);
    expect(r.state.project!.raised).toBe(MUSIC_SCALES.single.budget);
    expect(r.state.project!.label!.advance).toBe(50);
    expect(r.state.project!.stage).toBe('crew');
  });

  it('release week: signed streams × (1 + marketing) and royalties × (1 − cut), exactly, vs the same record unsigned', () => {
    const signed = finishAndRelease(pitchLabel(musicFinance('producer', 7), 'algorithm', 1).state);
    const deal = signed.project!.label!;
    expect(deal.id).toBe('algorithm');
    const unsigned = tweak(signed, (t) => (t.project!.label = null));
    const q = projectQuality(signed.project!);
    const fans = signed.player.fans;
    const [a] = of(toNextSix(signed).events, 'RELEASE_DAY');
    const [b] = of(toNextSix(unsigned).events, 'RELEASE_DAY');
    expect(a!.streams).toBe(releaseStreams({ fans, quality: q, multiplier: 1 * (1 + deal.marketing), day: 0, promoted: false }));
    expect(b!.streams).toBe(releaseStreams({ fans, quality: q, multiplier: 1, day: 0, promoted: false }));
    expect(a!.streams / b!.streams).toBeCloseTo(1 + deal.marketing, 2);
    expect(a!.royalties).toBe(Math.round(royalties(a!.streams) * (1 - deal.royaltyCut)));
    expect(b!.royalties).toBe(royalties(b!.streams));
  });

  it('film pitching is unchanged: investors fund films, no label is attached, labels are not listed', () => {
    const s = filmAt('finance', 'indie');
    const inv = INVESTORS[0]!;
    const started = tweak(run(rested(travelTo(s, inv.location)), { type: 'PITCH', investorId: inv.id }).state, (t) => (t.activity!.odds = 1));
    const r = run(started, { type: 'SKIP_TO_DONE' });
    expect(types(r.events)).toContain('PITCHED');
    expect(types(r.events)).not.toContain('LABEL_PITCHED');
    expect(r.state.project!.raised).toBeGreaterThan(0);
    expect(r.state.project!.label).toBeNull();
    const v = projectView(r.state)!;
    expect(v.labels).toEqual([]);
    expect(v.investors.length).toBe(INVESTORS.length);
    const mv = projectView(musicFinance())!;
    expect(mv.investors).toEqual([]);
    expect(mv.labels.map((l) => l.id)).toEqual(LABELS.map((l) => l.id));
  });
});
// ---------- shows ----------

/** Producer (1,200 Fans) with a record out, rested at `venueId` at 19:00. */
function atVenue(venueId: string, over: (t: GameState) => void = () => {}): GameState {
  const v = venue(venueId);
  return rested(advanceToHour(travelTo(tweak(withRecord(newGame('producer', 6)), over), v.location), 19));
}

describe('live shows', () => {
  it('needs a record in the catalogue, enough Fans, the venue, the 19:00–22:00 start window, Energy', () => {
    const club = atVenue('club');
    const cmd: Command = { type: 'PLAY_SHOW', venueId: 'club' };
    expect(whyNot(club, cmd)).toBeNull();
    expect(whyNot(tweak(club, (t) => (t.catalog = [])), cmd)).toMatch(/Release a record first/);
    expect(whyNot(tweak(club, (t) => (t.player.fans = venue('club').minFans - 1)), cmd)).toMatch(/books acts with 1,000\+ fans/);
    expect(whyNot(tweak(club, (t) => (t.player.fans = venue('club').minFans)), cmd)).toBeNull();
    expect(whyNot(club, { type: 'PLAY_SHOW', venueId: 'basement' })).toMatch(/is in Silver Lake/);
    expect(whyNot(club, { type: 'PLAY_SHOW', venueId: 'nope' })).toMatch(/Unknown venue/);
    expect(whyNot(tweak(club, (t) => (t.player.energy = 2)), cmd)).toMatch(/exhausted/);
    for (const [h, ok] of [[18, false], [19, true], [22, true], [23, false], [12, false]] as const) {
      const t = rested(advanceToHour(club, h));
      expect(hourOf(t.minute)).toBe(h);
      expect(whyNot(t, cmd) === null).toBe(ok);
      if (!ok) expect(whyNot(t, cmd)).toMatch(/Doors are 19:00–22:00/);
    }
    // The open mic books anyone with a record out.
    expect(whyNot(atVenue('open-mic', (t) => (t.player.fans = 0)), { type: 'PLAY_SHOW', venueId: 'open-mic' })).toBeNull();
  });

  it('tickets = min(capacity, round(Fans × draw × (0.8 + 0.4·roll))), you keep the door split; Fans, RP, cash follow', () => {
    for (const [venueId, fans] of [['club', 1200], ['club', 2000], ['basement', 700], ['open-mic', 300], ['theater', 9000]] as const) {
      const s0 = atVenue(venueId, (t) => (t.player.fans = fans));
      const v = venue(venueId);
      const started = run(s0, { type: 'PLAY_SHOW', venueId }).state;
      expect(started.activity!.endMinute - started.minute).toBe(C.SHOW_HOURS * 60);
      expect(started.player.lastShowDay).toBe(dayOf(s0.minute));
      const last = toLastMinute(started);
      const roll = new Rng(last.rngState).float();
      const r = run(last, { type: 'SKIP_TO_DONE' });
      const tickets = showTickets(fans, v.capacity, roll);
      expect(tickets).toBe(Math.min(v.capacity, Math.round(fans * C.SHOW_DRAW * (0.8 + 0.4 * roll))));
      expect(tickets).toBeLessThanOrEqual(v.capacity);
      const pay = showPay(tickets, v.ticketPrice);
      expect(pay).toBe(Math.round(tickets * v.ticketPrice * C.SHOW_DOOR_SPLIT));
      const [e] = of(r.events, 'SHOW_PLAYED');
      expect(e).toMatchObject({ venueId, tickets, pay, soldOut: tickets >= v.capacity, fans: Math.round(tickets * C.SHOW_FAN_GAIN), rp: Math.floor(tickets / C.SHOW_TICKETS_PER_RP) });
      expect(r.state.player.cash - s0.player.cash).toBe(pay);
      expect(r.state.player.fans - s0.player.fans).toBe(Math.round(tickets * C.SHOW_FAN_GAIN));
      expect(r.state.player.rp - s0.player.rp).toBe(Math.floor(tickets / C.SHOW_TICKETS_PER_RP));
      expect(r.state.player.energy).toBeLessThan(s0.player.energy - C.SHOW_ENERGY + 1);
    }
  });

  it('a sold-out show adds +1 Network; a half-empty room does not', () => {
    const full = atVenue('open-mic', (t) => (t.player.fans = 100_000));
    const r = run(full, { type: 'PLAY_SHOW', venueId: 'open-mic' }, { type: 'SKIP_TO_DONE' });
    expect(of(r.events, 'SHOW_PLAYED')[0]).toMatchObject({ tickets: venue('open-mic').capacity, soldOut: true });
    expect(r.state.player.network - full.player.network).toBe(1);
    expect(r.events).toContainEqual({ type: 'NETWORK_GAINED', amount: 1 });
    const thin = atVenue('club');
    const r2 = run(thin, { type: 'PLAY_SHOW', venueId: 'club' }, { type: 'SKIP_TO_DONE' });
    expect(of(r2.events, 'SHOW_PLAYED')[0]!.soldOut).toBe(false);
    expect(r2.state.player.network).toBe(thin.player.network);
  });

  it('one show a night: a 22:00 show ending after midnight still allows the next evening', () => {
    const s = rested(advanceToHour(atVenue('club'), 22));
    const r = run(s, { type: 'PLAY_SHOW', venueId: 'club' }, { type: 'SKIP_TO_DONE' });
    expect(hourOf(r.state.minute)).toBe(1);
    const sameNight = rested(tweak(s, (t) => (t.player.lastShowDay = dayOf(s.minute))));
    expect(whyNot(sameNight, { type: 'PLAY_SHOW', venueId: 'club' })).toMatch(/One show a night/);
    const nextEvening = rested(advanceToHour(r.state, 19));
    expect(whyNot(nextEvening, { type: 'PLAY_SHOW', venueId: 'club' })).toBeNull();
  });

  it('pay scales with Fans: the club pays ~1 barista shift at 1,000 Fans and ~3 at 3,000 (expected, before luck)', () => {
    const shift = 130;
    const expected = (fans: number, id: string) => showPay(showTickets(fans, venue(id).capacity, 0.5), venue(id).ticketPrice);
    expect(expected(1000, 'club') / shift).toBeGreaterThan(0.8);
    expect(expected(1000, 'club') / shift).toBeLessThan(1.5);
    expect(expected(3000, 'club') / shift).toBeGreaterThan(2.5);
    expect(expected(3000, 'club') / shift).toBeLessThan(3.5);
    expect(expected(2000, 'club')).toBeLessThan(540 / 1.5); // LAG-69: was ~$540
    for (const v of VENUES) expect(expected(v.minFans * 2, v.id)).toBeGreaterThanOrEqual(expected(v.minFans, v.id));
  });
});

// ---------- beats ----------

describe('beat store', () => {
  const home = (arch: ArchetypeId = 'producer', seed = 2) => rested(advanceToHour(newGame(arch, seed), 10));

  it('made at home only, up to 8, needs Spark and Energy', () => {
    const s = home();
    expect(whyNot(s, { type: 'MAKE_BEAT' })).toBeNull();
    expect(whyNot(travelTo(s, 'hollywood'), { type: 'MAKE_BEAT' })).toMatch(/made at home/);
    expect(whyNot(tweak(s, (t) => (t.player.spark = C.BEAT_SPARK - 1)), { type: 'MAKE_BEAT' })).toMatch(/Creative Spark/);
    expect(whyNot(tweak(s, (t) => (t.player.energy = 2)), { type: 'MAKE_BEAT' })).toMatch(/exhausted/);
    let t = s;
    for (let i = 0; i < C.BEAT_MAX; i++) t = run(rested(t), { type: 'MAKE_BEAT' }, { type: 'SKIP_TO_DONE' }).state;
    expect(t.beats).toHaveLength(C.BEAT_MAX);
    expect(whyNot(rested(t), { type: 'MAKE_BEAT' })).toMatch(/beat store is full \(8\)/);
  });

  it('takes 2h, costs Spark; quality = clamp(10 + 0.7·Music + 20·roll) from the third roll; no cash moves', () => {
    for (const [arch, seed] of [['producer', 2], ['midwest', 3], ['nepo', 9]] as const) {
      const s = home(arch, seed);
      const started = run(s, { type: 'MAKE_BEAT' }).state;
      expect(started.activity!.endMinute - s.minute).toBe(C.BEAT_HOURS * 60);
      const last = toLastMinute(started);
      const rng = new Rng(last.rngState);
      rng.float(); // title, first word
      rng.float(); // title, second word
      const q = beatQuality(s.player.skills.music, rng.float());
      const r = run(last, { type: 'SKIP_TO_DONE' });
      const beat = r.state.beats[0]!;
      expect(beat).toMatchObject({ quality: q, leases: 0, earned: 0, madeMinute: r.state.minute });
      expect(q).toBeGreaterThanOrEqual(Math.round(10 + 0.7 * s.player.skills.music));
      expect(q).toBeLessThanOrEqual(Math.round(30 + 0.7 * s.player.skills.music));
      expect(beat.title.split(' ').length).toBeGreaterThanOrEqual(2);
      expect(of(r.events, 'BEAT_MADE')[0]!.beat).toEqual(beat);
      expect(r.state.player.spark).toBeCloseTo(s.player.spark - C.BEAT_SPARK, 6);
      expect(r.state.player.cash).toBe(s.player.cash);
    }
  });

  /** A producer with a full store of beats of quality `q`, at 07:00. */
  const store = (q: number, fans = 1200, leases = 0) =>
    tweak(home(), (t) => {
      t.player.fans = fans;
      t.beats = Array.from({ length: C.BEAT_MAX }, (_, i) => ({ id: `b-${i}`, title: `Beat ${i}`, quality: q, madeMinute: 0, leases, earned: 0 }));
    });

  it('leases land only at 06:00, pay the fee formula, and cash moves only by bills + reported fees', () => {
    let s = store(60, 2000);
    let leases = 0;
    let trials = 0;
    for (let d = 0; d < 20; d++) {
      const before = s;
      // Nothing between 10:00 and 05:59.
      const quiet = run(s, { type: 'ADVANCE', minutes: 1440 - (minuteOfDay(s.minute) - 360) - 1 });
      expect(of(quiet.events, 'BEAT_LEASED')).toEqual([]);
      const r = run(quiet.state, { type: 'ADVANCE', minutes: 1 });
      expect(hourOf(r.state.minute)).toBe(6);
      const leased = of(r.events, 'BEAT_LEASED');
      for (const e of leased) expect(e.fee).toBe(beatFee(60));
      const bills = of(r.events, 'BILLS_CHARGED')[0]!.amount;
      expect(bills).toBe(dailyBills(ARCHETYPES.producer.rentPerDay));
      expect(r.state.player.cash - before.player.cash).toBe(leased.reduce((a, e) => a + e.fee, 0) - bills);
      for (const b of r.state.beats) {
        const was = before.beats.find((x) => x.id === b.id)!;
        const n = leased.filter((e) => e.beatId === b.id).length;
        expect(b.leases).toBe(was.leases + n);
        expect(b.earned).toBe(was.earned + n * beatFee(60));
      }
      leases += leased.length;
      trials += C.BEAT_MAX;
      s = advanceToHour(r.state, 10);
    }
    // ~0.19 per beat per day at the start, decaying 0.9× per lease.
    expect(leases / trials).toBeGreaterThan(0.06);
    expect(leases / trials).toBeLessThan(0.25);
  });

  it('lease chance decays with each lease; a worn-out or worthless beat never leases', () => {
    expect(beatLeaseChance(60, 2000, 3)).toBeCloseTo(beatLeaseChance(60, 2000, 0) * C.BEAT_LEASE_DECAY ** 3, 12);
    for (const s of [store(60, 2000, 400), store(0, 0)]) {
      const r = run(s, { type: 'ADVANCE', minutes: 5 * 1440 });
      expect(of(r.events, 'BEAT_LEASED')).toEqual([]);
    }
  });

  it('eight good beats earn under one barista shift a day (expected), and the Bedroom Producer earns the most', () => {
    const shift = 130;
    const perDay = (q: number, fans: number) => C.BEAT_MAX * beatLeaseChance(q, fans, 0) * beatFee(q);
    expect(perDay(60, 2000)).toBeLessThan(shift);
    expect(perDay(60, 10_000)).toBeLessThan(shift * 1.1);
    const typical = (arch: ArchetypeId) => perDay(Math.round(20 + 0.7 * ARCHETYPES[arch].skills.music), ARCHETYPES[arch].fans);
    for (const arch of ['nepo', 'midwest', 'indie'] as const) expect(typical('producer')).toBeGreaterThan(typical(arch));
  });
});

// ---------- catalogue, placements, soundtracks ----------

describe('catalogue and placements', () => {
  it('a record joins the catalogue when its release week ends: quality, peak, label', () => {
    const s = finishAndRelease(pitchLabel(musicFinance('producer', 8), 'garage-press', 1).state);
    const p = s.project!;
    const q = projectQuality(p);
    const r = run(s, { type: 'ADVANCE', minutes: 7 * 1440 });
    expect(r.state.project).toBeNull();
    const ended = of(r.events, 'RELEASE_WEEK_ENDED')[0]!;
    expect(r.state.catalog).toEqual([
      { id: expect.any(String), title: p.title, scale: 'single', quality: Math.round(q), peak: ended.peak, releasedMinute: p.release!.releasedMinute, placements: 0, label: p.label!.name },
    ]);
    // Unsigned records are catalogued with no label.
    const own = finishAndRelease(musicFinance('producer', 8));
    const r2 = run(own, { type: 'ADVANCE', minutes: 7 * 1440 });
    expect(r2.state.catalog[0]!.label).toBeNull();
  });

  it('a placement lands at 06:00: fee by formula, +10 RP, placements + 1, cash moves by bills + fee only', () => {
    // Quality 5,000 is not a real record: it pushes the chance past 100% so the roll always hits.
    const s = withRecord(rested(advanceToHour(newGame('midwest', 4), 10)), { quality: 5000, scale: 'ep', peak: 40 });
    expect(placementChance(5000, true)).toBeGreaterThan(1);
    const r = toNextSix(s);
    const [e] = of(r.events, 'PLACEMENT');
    const fee = placementFee(5000, MUSIC_SCALES.ep.streamMultiplier);
    expect(e).toMatchObject({ recordId: s.catalog[0]!.id, fee, rp: C.PLACEMENT_RP });
    expect(r.state.catalog[0]!.placements).toBe(1);
    expect(r.state.player.rp - s.player.rp).toBe(C.PLACEMENT_RP);
    const bills = of(r.events, 'BILLS_CHARGED')[0]!.amount;
    expect(r.state.player.cash - s.player.cash).toBe(fee - bills);
    expect(r.state.trades[0]!.own).toBe(true);
    // Nothing between mornings.
    expect(of(run(advanceToHour(r.state, 7), { type: 'ADVANCE', minutes: 22 * 60 }).events, 'PLACEMENT')).toEqual([]);
  });

  it('placements are rare: a quality-0 record never places; a good charted single is ~2%/day', () => {
    const s = withRecord(rested(newGame('midwest', 4)), { quality: 0 });
    expect(of(run(s, { type: 'ADVANCE', minutes: 10 * 1440 }).events, 'PLACEMENT')).toEqual([]);
    expect(placementChance(75, true)).toBeLessThanOrEqual(0.025);
    expect(1 / placementChance(60, false)).toBeGreaterThan(60); // an uncharted single: less than once in two months
  });

  it('PLACE_SONG only in a film post stage, once per film, for a record you own', () => {
    const cmd = (id: string): Command => ({ type: 'PLACE_SONG', recordId: id });
    const music = withRecord(musicFinance());
    expect(whyNot(music, cmd(music.catalog[0]!.id))).toMatch(/Soundtracks get picked in post/);
    expect(whyNot(withRecord(newGame('indie', 1)), cmd('r-test-0'))).toMatch(/Soundtracks get picked in post/);
    for (const stage of ['develop', 'finance', 'crew', 'shoot', 'festival'] as const) {
      const f = withRecord(filmAt(stage));
      expect(whyNot(f, cmd(f.catalog[0]!.id))).toMatch(/Soundtracks get picked in post/);
    }
    const post = withRecord(filmAt('post'));
    expect(whyNot(post, cmd('r-nope'))).toMatch(/not in your catalogue/);
    expect(whyNot(filmAt('post'), cmd('r-test-0'))).toMatch(/not in your catalogue/);
    expect(whyNot(post, cmd(post.catalog[0]!.id))).toBeNull();
    const placed = run(post, cmd(post.catalog[0]!.id)).state;
    expect(whyNot(withRecord(placed), cmd('r-test-1'))).toMatch(/already on the soundtrack/);
  });

  it('a soundtrack adds min(8, round(Q/10)) to film quality, instantly; the record counts a placement', () => {
    for (const q of [35, 60, 73, 95]) {
      const post = withRecord(filmAt('post'), { quality: q });
      const before = projectQuality(post.project!);
      const r = run(post, { type: 'PLACE_SONG', recordId: post.catalog[0]!.id });
      const bonus = soundtrackBonus(q);
      expect(bonus).toBe(Math.min(C.SOUNDTRACK_BONUS_MAX, Math.round(q / C.SOUNDTRACK_QUALITY_DIVISOR)));
      expect(r.state.minute).toBe(post.minute);
      expect(r.state.project!.soundtrack).toEqual({ recordId: post.catalog[0]!.id, title: 'Test Tape', bonus });
      expect(projectQuality(r.state.project!)).toBeCloseTo(Math.min(100, before + bonus), 9);
      expect(r.state.catalog[0]!.placements).toBe(1);
      expect(r.events).toContainEqual({ type: 'SOUNDTRACK_SET', title: 'Test Tape', bonus });
      expect(r.state.player.cash).toBe(post.player.cash);
      // The bonus lasts through edit to the festival stage.
      const edited = run(rested(r.state), { type: 'EDIT_SESSION' }, { type: 'SKIP_TO_DONE' }).state;
      expect(edited.project!.stage).toBe('festival');
      const without = projectQuality(tweak(edited, (t) => (t.project!.soundtrack = null)).project!);
      expect(projectQuality(edited.project!)).toBeCloseTo(Math.min(100, without + bonus), 9);
    }
  });
});

// ---------- saves, determinism, views ----------

describe('music business saves, determinism and views', () => {
  it('a v4 save (no beats, catalogue, lastShowDay, label, soundtrack) migrates to v5 and the new actions work', () => {
    for (const s of [musicFinance('indie', 2), filmAt('post'), newGame('midwest', 1)]) {
      const { beats: _b, catalog: _c, ...rest } = s;
      const { lastShowDay: _l, ...player } = s.player;
      const project = s.project ? (({ label: _x, soundtrack: _y, ...p }) => p)(s.project) : null;
      const v4 = JSON.stringify({ version: 4, savedAt: 0, state: { ...rest, version: 4, player, project } });
      const m = deserialize(v4)!;
      expect(m.version).toBe(C.SAVE_VERSION);
      expect(C.SAVE_VERSION).toBeGreaterThanOrEqual(5);
      expect(m.beats).toEqual([]);
      expect(m.catalog).toEqual([]);
      expect(m.player.lastShowDay).toBeNull();
      if (s.project) expect(m.project).toEqual({ ...s.project, label: null, soundtrack: null });
      else expect(m.project).toBeNull();
      expect(() => musicBizView(m)).not.toThrow();
      expect(() => projectView(m)).not.toThrow();
      if (m.project?.medium === 'music') expect(pitchLabel(m, 'tape-hiss', 1).state.project!.label!.id).toBe('tape-hiss');
      if (m.project?.stage === 'post') {
        const w = withRecord(m);
        expect(run(w, { type: 'PLACE_SONG', recordId: w.catalog[0]!.id }).state.project!.soundtrack).not.toBeNull();
      }
    }
  });

  it('a v5 save with beats, a catalogue and a signed record round-trips unchanged', () => {
    let s = pitchLabel(musicFinance('producer', 3), 'garage-press', 1).state;
    s = withRecord(run(rested(advanceToHour(travelTo(s, 'noho'), 10)), { type: 'MAKE_BEAT' }, { type: 'SKIP_TO_DONE' }).state);
    expect(s.beats).toHaveLength(1);
    expect(deserialize(serialize(s))).toEqual(s);
  });

  /** Sign, release, play a show, make beats, ride a week of 06:00s. */
  function businessWeek(seed: number): GameState {
    // A real (unforced) meeting: a yes or a no, both replay identically.
    let s = finishAndRelease(pitchLabel(musicFinance('producer', seed), 'garage-press').state);
    s = run(s, { type: 'ADVANCE', minutes: 7 * 1440 }).state;
    s = rested(advanceToHour(travelTo(s, 'weho'), 19));
    s = run(s, { type: 'PLAY_SHOW', venueId: 'club' }, { type: 'SKIP_TO_DONE' }).state;
    for (let i = 0; i < 3; i++) s = run(rested(advanceToHour(travelTo(s, 'noho'), 10)), { type: 'MAKE_BEAT' }, { type: 'SKIP_TO_DONE' }).state;
    return run(s, { type: 'ADVANCE', minutes: 5 * 1440 }).state;
  }

  it('same seed + same commands = identical state through labels, shows, beats and placements', () => {
    for (const seed of [3, 11]) {
      const a = businessWeek(seed);
      expect(a.catalog).toHaveLength(1);
      expect(a.beats).toHaveLength(3);
      expect(a).toEqual(businessWeek(seed));
    }
  });

  it('projectView and musicBizView never throw, for music and film at every stage and with no project', () => {
    const states: GameState[] = [newGame('nepo', 1), withRecord(newGame('midwest', 1))];
    let m = run(newGame('producer', 3), { type: 'START_PROJECT', scale: 'single' }).state;
    states.push(m);
    m = musicFinance();
    states.push(m, pitchLabel(m, 'garage-press', 0).state);
    m = pitchLabel(m, 'garage-press', 1).state;
    states.push(m);
    let rec = run(tweak(m, (t) => (t.player.cash += 400)), { type: 'SELF_FUND', amount: m.project!.budget - m.project!.raised }).state;
    states.push(rec);
    while (rec.project!.stage === 'crew') {
      const pick = rec.project!.crewPool.filter((c) => !c.hired).sort((a, b) => a.fee - b.fee)[0]!;
      rec = run(rested(rec), { type: 'HIRE_CREW', candidateId: pick.id }, { type: 'SKIP_TO_DONE' }).state;
    }
    states.push(rec, record(rec));
    const released = finishAndRelease(m);
    states.push(tweak(released, (t) => (t.project!.release = null)), released, toNextSix(released).state);
    states.push(run(released, { type: 'ADVANCE', minutes: 7 * 1440 }).state);
    for (const stage of ['develop', 'finance', 'crew', 'shoot', 'post', 'festival'] as const) states.push(withRecord(filmAt(stage)));
    const post = withRecord(filmAt('post'));
    states.push(run(post, { type: 'PLACE_SONG', recordId: post.catalog[0]!.id }).state);
    states.push(atVenue('club'), withRecord(tweak(newGame('producer', 2), (t) => (t.beats = [{ id: 'b', title: 'B', quality: 50, madeMinute: 0, leases: 2, earned: 100 }]))));
    const stages = new Set(states.map((s) => s.project?.stage ?? 'none'));
    expect([...stages].sort()).toEqual(['crew', 'develop', 'festival', 'finance', 'none', 'post', 'record', 'release', 'shoot']);
    for (const s of states) {
      expect(() => projectView(s)).not.toThrow();
      expect(() => musicBizView(s)).not.toThrow();
      const v = musicBizView(s);
      expect(v.shows).toHaveLength(VENUES.length);
      for (const sh of v.shows) {
        expect(sh.disabledReason).toBe(whyNot(s, sh.command));
        const bookable = s.player.fans >= sh.minFans;
        expect(sh.expectedTickets).toBe(bookable ? Math.min(sh.capacity, Math.round(s.player.fans * C.SHOW_DRAW)) : 0);
        expect(sh.expectedPay).toBe(showPay(sh.expectedTickets, sh.ticketPrice));
      }
      expect(v.makeBeat.disabledReason).toBe(whyNot(s, v.makeBeat.command));
      for (const b of v.beats) {
        const raw = s.beats.find((x) => x.id === b.id)!;
        expect(b.leaseChance).toBe(beatLeaseChance(raw.quality, s.player.fans, raw.leases));
        expect(b.fee).toBe(beatFee(raw.quality));
      }
      for (const c of v.catalog) expect(c.placementChance).toBe(placementChance(c.quality, c.peak !== null));
      const pv = projectView(s);
      if (!pv) expect(s.project).toBeNull();
      else if (s.project!.medium === 'film') {
        expect(pv.labels).toEqual([]);
        for (const o of pv.soundtrack.options) expect(o.disabledReason).toBe(whyNot(s, o.command));
      } else {
        expect(pv.soundtrack.options).toEqual([]);
        for (const l of pv.labels) expect(l.disabledReason).toBe(whyNot(s, l.command));
      }
    }
  });
});
