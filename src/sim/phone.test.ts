// LAG-92 (PI-3 Sprint 11) QA: the phone's sim side. Bank ledger invariant and money sources,
// the Messages inbox (mail mapping, threads, READ_THREAD), bankView / inboxView, save v7 → v8, determinism.
import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { bankView, inboxView } from './actions';
import { ARCHETYPE_IDS } from './content/archetypes';
import { FESTIVALS } from './content/film';
import { INVESTORS } from './content/filmFlavor';
import { GUILDS, GUILD_SKILLS } from './content/guilds';
import { JOBS, JOB_IDS } from './content/jobs';
import { CLASSES, HEADSHOTS_LOCATION, LEISURE, LEISURE_IDS, LOCATIONS, LOCATION_IDS, REPAIR_LOCATION, leisureLocation } from './content/locations';
import { LABELS, VENUES } from './content/musicBiz';
import { CONTACTS, INBOX_SENDER, INBOX_TEMPLATES } from './content/phoneFlavor';
import { STUDIO_LOT } from './content/tv';
import { AGENCIES } from './content/writers';
import { atHour, commute, dayOf, hourOf } from './formulas';
import { resolveDues } from './guilds';
import { deliverMail, messagesFor, momCheckIn, postMessage, unreadCount } from './inbox';
import { completeShow, resolveBeatLeases, resolvePlacements } from './musicBiz';
import { acceptOffer, eligibleFestivals, fundingRoom, selfFund, submitFestival } from './project';
import { newGame, step, whyNot } from './reducer';
import { Rng, nextFloat } from './rng';
import { deserialize, serialize } from './save';
import { resolveCallback, resolveContractWeek, resolvePilots } from './tv';
import type {
  Activity,
  ArchetypeId,
  Command,
  ContactId,
  GameEvent,
  GameState,
  InboxKind,
  LedgerEntry,
  LedgerKind,
  LocationId,
  Opportunity,
  ProjectScaleId,
  SeriesContract,
} from './types';
import { earn, spend } from './world';

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
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
function rngStateWhere(pred: (v: number) => boolean): number {
  for (let k = 1; ; k++) if (pred(nextFloat(k)[0])) return k;
}
const forceYes = (s: GameState) => tweak(s, (t) => (t.rngState = rngStateWhere((v) => v < 0.001)));
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
/** Ledger rows a step added (the ledger is capped, so new rows are found by id). */
function newRows(before: GameState, after: GameState): LedgerEntry[] {
  const old = new Set(before.ledger.map((e) => e.id));
  return after.ledger.filter((e) => !old.has(e.id));
}
function withOpp(s: GameState, opp: Partial<Opportunity>): GameState {
  return tweak(s, (t) => {
    t.board = [
      {
        id: 'test-opp',
        templateId: 't',
        title: 'Test Gig',
        medium: 'film',
        skill: 'acting',
        tier: 1,
        location: t.player.location,
        windowStart: 0,
        windowEnd: 24,
        day: dayOf(t.minute),
        prepHours: 0,
        status: 'open',
        ...opp,
      },
    ];
  });
}
const contract = (s: GameState, kind: 'actor' | 'writer', weekEndMinute: number): SeriesContract => ({
  kind,
  favor: 50,
  roomScores: [],
  showTitle: 'Cozy Heights',
  network: 'StreamyTube',
  role: kind === 'writer' ? 'Staff writer' : 'Barista',
  tier: 1,
  weeklyPay: 1500,
  episodesTotal: 6,
  episodesDone: 0,
  episodesMissed: 0,
  shotThisWeek: true,
  weekEndMinute: weekEndMinute ?? s.minute,
});
/** A project started by the real command, then moved to `stage` (budget/score bookkeeping is the caller's). */
function projectAt(s0: GameState, scale: ProjectScaleId, stage: string): GameState {
  const s = run(s0, { type: 'START_PROJECT', scale }).state;
  return tweak(s, (t) => {
    t.project!.stage = stage as never;
  });
}

// ---------- a random driver that reaches every money source ----------

const SCALES: readonly ProjectScaleId[] = ['short', 'micro', 'single', 'ep', 'spec'];

/** Where a command has to be run, if anywhere in particular. */
function placeFor(s: GameState, cmd: Command): LocationId | null {
  const p = s.project;
  switch (cmd.type) {
    case 'SUBMIT':
    case 'PREP':
      return cmd.type === 'SUBMIT' ? s.board.find((o) => o.id === cmd.opportunityId)?.location ?? null : null;
    case 'START_JOB':
      return JOBS[cmd.jobId].location ?? null;
    case 'TAKE_CLASS':
      return CLASSES[cmd.skill].location;
    case 'LEISURE':
      return leisureLocation(LEISURE[cmd.leisureId], s.player.home);
    case 'BUY_HEADSHOTS':
      return HEADSHOTS_LOCATION;
    case 'REPAIR_CAR':
      return REPAIR_LOCATION;
    case 'SLEEP':
    case 'MAKE_BEAT':
      return s.player.home;
    case 'PITCH':
      return INVESTORS.find((i) => i.id === cmd.investorId)?.location ?? null;
    case 'PITCH_LABEL':
      return LABELS.find((l) => l.id === cmd.labelId)?.location ?? null;
    case 'PITCH_AGENT':
      return AGENCIES.find((a) => a.id === cmd.agencyId)?.location ?? null;
    case 'PLAY_SHOW':
      return VENUES.find((v) => v.id === cmd.venueId)?.location ?? null;
    case 'SHOOT_DAY':
    case 'RECORD_SESSION':
      return p?.location ?? null;
    case 'SHOOT_EPISODE':
    case 'ROOM_DAY':
      return STUDIO_LOT;
    case 'JOIN_GUILD':
      return GUILDS[cmd.guild].hq;
    default:
      return null;
  }
}

function candidates(s: GameState, r: Rng): Command[] {
  const p = s.project;
  const out: Command[] = [
    { type: 'TRAVEL', to: r.pick(LOCATION_IDS) },
    { type: 'START_JOB', jobId: r.pick(JOB_IDS), hours: r.int(1, 8) },
    { type: 'TAKE_CLASS', skill: r.pick(GUILD_SKILLS) },
    { type: 'LEISURE', leisureId: r.pick(LEISURE_IDS) },
    { type: 'BUY_HEADSHOTS' },
    { type: 'REPAIR_CAR' },
    { type: 'PLAY_SHOW', venueId: r.pick(VENUES).id },
    { type: 'MAKE_BEAT' },
    { type: 'SHOOT_EPISODE' },
    { type: 'ROOM_DAY' },
    { type: 'JOIN_GUILD', guild: r.pick(GUILD_SKILLS) },
    { type: 'START_PROJECT', scale: r.pick(SCALES) },
  ];
  const open = s.board.filter((o) => o.status === 'open');
  if (open.length) {
    const o = r.pick(open);
    out.push({ type: 'SUBMIT', opportunityId: o.id }, { type: 'SUBMIT', opportunityId: o.id }, { type: 'PREP', opportunityId: o.id, hours: r.int(1, 2) });
    const pilots = open.filter((x) => x.pilot);
    if (pilots.length) out.push({ type: 'SUBMIT', opportunityId: r.pick(pilots).id }, { type: 'SUBMIT', opportunityId: r.pick(pilots).id });
  }
  if (p) {
    if (r.float() < 0.03) out.push({ type: 'ABANDON_PROJECT' });
    const stage: Command[] = [];
    switch (p.stage) {
      case 'develop':
        stage.push({ type: 'WRITE_SESSION' });
        break;
      case 'finance': {
        const room = fundingRoom(p);
        if (s.player.cash > 0) stage.push({ type: 'SELF_FUND', amount: Math.max(1, Math.min(Math.floor(s.player.cash), room)) });
        stage.push(p.medium === 'film' ? { type: 'PITCH', investorId: r.pick(INVESTORS).id } : { type: 'PITCH_LABEL', labelId: r.pick(LABELS).id });
        break;
      }
      case 'crew': {
        const c = p.crewPool.filter((x) => !x.hired);
        if (c.length) stage.push({ type: 'HIRE_CREW', candidateId: r.pick(c).id });
        if (s.player.cash > 500) stage.push({ type: 'SELF_FUND', amount: r.int(100, 500) });
        break;
      }
      case 'shoot':
        stage.push({ type: 'SHOOT_DAY' });
        break;
      case 'post':
        stage.push({ type: 'EDIT_SESSION' });
        if (s.catalog.length) stage.push({ type: 'PLACE_SONG', recordId: r.pick(s.catalog).id });
        break;
      case 'festival': {
        const fs = eligibleFestivals(p);
        stage.push({ type: 'SUBMIT_FESTIVAL', festivalId: r.pick(fs).id });
        if (p.offers.length) stage.push({ type: 'ACCEPT_OFFER', offerId: p.offers[0]!.id });
        stage.push({ type: 'SELF_RELEASE' });
        break;
      }
      case 'record':
        stage.push({ type: 'RECORD_SESSION' });
        break;
      case 'release':
        stage.push({ type: 'RELEASE_RECORD' }, { type: 'PROMO' });
        break;
      case 'deck':
        stage.push({ type: 'DECK_SESSION' });
        break;
      case 'agent':
        stage.push({ type: 'PITCH_AGENT', agencyId: r.pick(AGENCIES).id });
        break;
      default:
        break;
    }
    for (let i = 0; i < 4; i++) out.push(...stage);
  }
  return out;
}

function drive(s: GameState, r: Rng): Command {
  if (s.activity) return r.float() < 0.85 ? { type: 'SKIP_TO_DONE' } : { type: 'ADVANCE', minutes: r.int(1, 120) };
  if (s.callback) return { type: 'CALLBACK_PICK', read: r.int(0, 2) };
  if (s.roomEvent) return { type: 'ROOM_CHOICE', option: r.int(0, 1) };
  if (r.float() < 0.03 && s.inbox.length) return { type: 'READ_THREAD', contact: r.pick(s.inbox).contact };
  // Join a guild as soon as one is ready (when it can be afforded).
  const ready = GUILD_SKILLS.find((g) => s.player.guilds[g].vouchers >= C.GUILD_VOUCHERS_NEEDED && !s.player.guilds[g].member);
  if (ready && s.player.cash >= C.GUILD_JOIN_FEE && s.player.energy >= 25 && r.float() < 0.5) {
    const hq = GUILDS[ready].hq;
    return s.player.location === hq ? { type: 'JOIN_GUILD', guild: ready } : { type: 'TRAVEL', to: hq };
  }
  if (r.float() < 0.12) return { type: 'ADVANCE', minutes: r.int(30, 1500) };
  if (s.player.energy < 25) return s.player.location === s.player.home ? { type: 'SLEEP', hours: r.int(6, 10) } : { type: 'TRAVEL', to: s.player.home };
  if (s.player.spark < 25 && r.float() < 0.5) return s.player.location === 'hollywood' ? { type: 'LEISURE', leisureId: 'records' } : { type: 'TRAVEL', to: 'hollywood' };
  const cmd = r.pick(candidates(s, r));
  if (whyNot(s, cmd) === null) return cmd;
  const where = placeFor(s, cmd);
  if (where && where !== s.player.location) return { type: 'TRAVEL', to: where };
  return r.float() < 0.5 ? cmd : { type: 'ADVANCE', minutes: r.int(30, 240) };
}

interface RunLog {
  final: GameState;
  rows: LedgerEntry[];
  events: GameEvent[];
}

/** Drive a run, checking the ledger and inbox invariants after every single step. */
function checkedRun(arch: ArchetypeId, seed: number, steps: number, bonusCash: number): RunLog {
  let s = tweak(newGame(arch, seed), (t) => {
    t.player.cash += bonusCash;
  });
  const r = new Rng(seed * 101 + 7);
  const rows: LedgerEntry[] = [];
  const events: GameEvent[] = [];
  for (let i = 0; i < steps && s.status === 'playing'; i++) {
    const before = s;
    const res = step(before, drive(before, r));
    s = res.state;
    events.push(...res.events);
    const added = newRows(before, s);
    rows.push(...added);
    // Ledger invariant: the cash delta is exactly what the new rows say.
    expect(added.length).toBeLessThan(C.LEDGER_MAX);
    expect(s.player.cash - before.player.cash).toBeCloseTo(sum(added.map((e) => e.amount)), 6);
    // Every earn adds the same amount to totalEarned (and spend never does).
    expect(s.stats.totalEarned - before.stats.totalEarned).toBeCloseTo(sum(added.filter((e) => e.amount > 0).map((e) => e.amount)), 6);
    for (const e of added) {
      expect(e.amount).not.toBe(0);
      expect(Number.isFinite(e.amount)).toBe(true);
      expect(e.minute).toBeGreaterThanOrEqual(before.minute);
      expect(e.minute).toBeLessThanOrEqual(s.minute);
      expect(e.label.length).toBeGreaterThan(0);
    }
    expect(s.ledger.length).toBeLessThanOrEqual(C.LEDGER_MAX);
    // Inbox invariants.
    const contacts = s.inbox.map((t) => t.contact);
    expect(new Set(contacts).size).toBe(contacts.length);
    for (let k = 1; k < s.inbox.length; k++) expect(s.inbox[k - 1]!.lastMinute).toBeGreaterThanOrEqual(s.inbox[k]!.lastMinute);
    for (const t of s.inbox) {
      expect(t.messages.length).toBeGreaterThan(0);
      expect(t.messages.length).toBeLessThanOrEqual(C.INBOX_THREAD_MAX);
      expect(t.unread).toBeGreaterThanOrEqual(0);
      expect(t.unread).toBeLessThanOrEqual(t.messages.length);
      for (const m of t.messages) {
        expect(INBOX_SENDER[m.kind]).toBe(t.contact);
        expect(m.text).not.toMatch(/[{}]/);
      }
    }
  }
  return { final: s, rows, events };
}

/** What each ledger label means: the kind it must be filed under. */
function expectedKind(row: LedgerEntry, bookedTitles: Set<string>): LedgerKind | 'gig|music' | 'film|music' | null {
  const l = row.label;
  if (bookedTitles.has(l) && row.amount > 0) return 'gig|music';
  if (l === 'Rent, food & car') return 'bills';
  if (/ shift$/.test(l)) return 'job';
  if (/^Pilot fee: |^Episode pay: |^Room pay: /.test(l)) return 'tv';
  if (/^Show at |^Beat lease: |^Sync: |^Royalties: /.test(l)) return 'music';
  if (/^Self-funded: /.test(l)) return 'film|music';
  if (/^Festival fee: |^Distribution: /.test(l)) return 'film';
  if (/^Gas to /.test(l) || l === 'Car repair') return 'travel';
  if (Object.values(LEISURE).some((x) => x.name === l)) return 'lifestyle';
  if (Object.values(CLASSES).some((x) => x.name === l) || l === 'Headshots' || /^Submission: /.test(l)) return 'career';
  if (l === 'Guild initiation' || l === 'Guild dues') return 'union';
  return null;
}

describe('bank ledger invariant under long random runs', () => {
  const runs: [ArchetypeId, number, number][] = [
    ['indie', 1, 40_000],
    ['producer', 2, 40_000],
    ['nepo', 3, 0],
    ['midwest', 4, 0],
    ['indie', 5, 0],
    ['producer', 6, 15_000],
    ['midwest', 7, 60_000],
    ['nepo', 8, 60_000],
  ];
  const seenKinds = new Set<LedgerKind>();
  const seenEvents = new Set<string>();

  it.each(runs)('%s seed %i (+$%i): cash delta = new ledger rows and totalEarned = earns, after every step', (arch, seed, bonus) => {
    const { rows, events } = checkedRun(arch, seed, 2500, bonus);
    expect(rows.length).toBeGreaterThan(20);
    const booked = new Set(of(events, 'BOOKED').map((e) => e.opportunity.title));
    for (const row of rows) {
      seenKinds.add(row.kind);
      const want = expectedKind(row, booked);
      expect(want, `unclassified ledger label "${row.label}"`).not.toBeNull();
      if (want === 'film|music') expect(['film', 'music']).toContain(row.kind);
      else if (want === 'gig|music') expect(['gig', 'music']).toContain(row.kind);
      else if (want) expect(row.kind, row.label).toBe(want);
      // Signs: only these move money in.
      if (['job', 'gig', 'tv'].includes(row.kind)) expect(row.amount).toBeGreaterThan(0);
      if (['bills', 'travel', 'lifestyle', 'career', 'union'].includes(row.kind)) expect(row.amount).toBeLessThan(0);
    }
    // Booking rows: the BOOKED events' titles and pays show up as gig (film/TV) or music rows.
    for (const e of of(events, 'BOOKED')) {
      const row = rows.find((x) => x.label === e.opportunity.title && x.amount === e.pay);
      expect(row, e.opportunity.title).toBeDefined();
      expect(row!.kind).toBe(e.opportunity.medium === 'music' ? 'music' : 'gig');
    }
    for (const e of events) seenEvents.add(e.type);
  });

  it('the runs above reached every ledger kind and the big money events (sanity for the test itself)', () => {
    expect([...seenKinds].sort()).toEqual(['bills', 'career', 'film', 'gig', 'job', 'lifestyle', 'music', 'travel', 'tv', 'union'].sort());
    for (const t of ['BOOKED', 'CALLBACK_DONE', 'FESTIVAL_RESULT', 'RELEASE_DAY', 'SHOW_PLAYED', 'GUILD_JOINED', 'SELF_FUNDED', 'OVERDRAFT_STARTED', 'MOVED_BACK_HOME']) {
      expect(seenEvents.has(t), t).toBe(true);
    }
  });
});

// ---------- each money source and sink ----------

describe('ledger rows: kind and label per source', () => {
  const only = (before: GameState, after: GameState): LedgerEntry => {
    const rows = newRows(before, after);
    expect(rows).toHaveLength(1);
    return rows[0]!;
  };

  it('06:00 bills: -dailyBills as "bills"', () => {
    const s = toMinute(newGame('midwest', 1), atHour(2, 6) - 1).state;
    const after = run(s, { type: 'ADVANCE', minutes: 1 }).state;
    expect(only(s, after)).toMatchObject({ amount: -55, kind: 'bills', label: 'Rent, food & car', minute: atHour(2, 6) });
  });

  it('a job shift pays as "job" with the job name', () => {
    const s = newGame('nepo', 1);
    const started = run(s, { type: 'START_JOB', jobId: 'barista' }).state;
    expect(newRows(s, started)).toHaveLength(0);
    const done = run(started, { type: 'SKIP_TO_DONE' }).state;
    expect(only(started, done)).toMatchObject({ amount: 130, kind: 'job', label: `${JOBS.barista.name} shift`, minute: done.minute });
    const ride = run(newGame('indie', 1), { type: 'START_JOB', jobId: 'rideshare', hours: 3 }, { type: 'SKIP_TO_DONE' }).state;
    expect(ride.ledger[0]).toMatchObject({ amount: 54, kind: 'job', label: `${JOBS.rideshare.name} shift` });
  });

  it('a booking pays as "gig" (film/TV) or "music" (music), labelled with the gig title; the submission fee is "career"', () => {
    for (const medium of ['film', 'tv', 'music'] as const) {
      const s = forceYes(rested(withOpp(newGame('midwest', 1), { medium, skill: 'acting', title: `A ${medium} gig` })));
      const started = run(s, { type: 'SUBMIT', opportunityId: 'test-opp' }).state;
      expect(only(s, started)).toMatchObject({ amount: -C.SUBMIT_FEE, kind: 'career', label: `Submission: A ${medium} gig` });
      const done = run(forceYes(started), { type: 'SKIP_TO_DONE' });
      const booked = of(done.events, 'BOOKED')[0]!;
      expect(only(started, done.state)).toMatchObject({ amount: booked.pay, kind: medium === 'music' ? 'music' : 'gig', label: `A ${medium} gig` });
    }
  });

  it('a free submission (home-studio demo) writes no row', () => {
    const s = rested(withOpp(newGame('producer', 1), { medium: 'music', skill: 'music' }));
    const started = run(s, { type: 'SUBMIT', opportunityId: 'test-opp' }).state;
    expect(started.player.cash).toBe(s.player.cash);
    expect(newRows(s, started)).toHaveLength(0);
  });

  it('a booked pilot callback pays the pilot fee as "tv"', () => {
    const s = tweak(at('indie', 2), (t) => {
      t.callback = { opportunityId: 'none', showTitle: 'Cozy Heights', network: 'StreamyTube', role: 'Barista', tier: 1, baseOdds: 0.5, beats: [], picks: [] };
    });
    const t = tweak(s, (x) => resolveCallback(x, fixedRng(0), []));
    const row = only(s, t);
    expect(row).toMatchObject({ kind: 'tv', label: 'Pilot fee: Cozy Heights' });
    expect(row.amount).toBeGreaterThan(0);
    expect(t.player.cash - s.player.cash).toBe(row.amount);
  });

  it('a series week pays "Episode pay" (actor) or "Room pay" (writer) as "tv", including a missed week', () => {
    for (const [kind, label] of [
      ['actor', 'Episode pay: Cozy Heights'],
      ['writer', 'Room pay: Cozy Heights'],
    ] as const) {
      for (const shot of [true, false]) {
        const s = tweak(at('indie', 2), (t) => {
          t.contract = { ...contract(t, kind, t.minute), shotThisWeek: shot };
        });
        const t = tweak(s, (x) => resolveContractWeek(x, fixedRng(0.5), []));
        expect(only(s, t)).toMatchObject({ kind: 'tv', label, amount: shot ? 1500 : Math.round(1500 * C.MISSED_EPISODE_PAY) });
      }
    }
  });

  it('a show, a beat lease and a sync placement are "music"', () => {
    const s = tweak(at('producer', 2), (t) => {
      t.player.fans = 5000;
      t.beats = [{ id: 'b1', title: 'Night Drive', quality: 90, madeMinute: 0, leases: 0, earned: 0 }];
      t.catalog = [{ id: 'r1', title: 'Hollow Moon', scale: 'single', quality: 90, peak: 3, releasedMinute: 0, placements: 0, label: null }];
    });
    const show = { kind: 'show', venueId: 'open-mic', label: '', startMinute: 0, endMinute: 0, energyPerMinute: 0, sparkPerMinute: 0, carPerMinute: 0 } as Activity;
    const a = tweak(s, (x) => completeShow(x, show, fixedRng(0.5), []));
    expect(only(s, a)).toMatchObject({ kind: 'music', label: 'Show at ' + a.ledger[0]!.label.slice('Show at '.length) });
    expect(a.ledger[0]!.label).toMatch(/^Show at /);
    expect(a.ledger[0]!.amount).toBeGreaterThan(0);
    const b = tweak(s, (x) => resolveBeatLeases(x, fixedRng(0), []));
    expect(only(s, b)).toMatchObject({ kind: 'music', label: 'Beat lease: Night Drive', amount: b.beats[0]!.earned });
    const c = tweak(s, (x) => resolvePlacements(x, fixedRng(0), []));
    expect(only(s, c)).toMatchObject({ kind: 'music', label: 'Sync: Hollow Moon' });
    expect(c.ledger[0]!.amount).toBeGreaterThan(0);
  });

  it('royalties land as "music" through the real release week', () => {
    let s = projectAt(at('producer', 2), 'single', 'release');
    s = tweak(s, (t) => {
      t.player.fans = 3000;
      t.project!.scores.record = [80, 80];
    });
    s = run(s, { type: 'RELEASE_RECORD' }).state;
    const next = toMinute(s, atHour(3, 6)).state;
    const roy = newRows(s, next).filter((e) => e.label.startsWith('Royalties: '));
    expect(roy).toHaveLength(1);
    expect(roy[0]).toMatchObject({ kind: 'music', label: `Royalties: ${s.project!.title}` });
  });

  it('self-funding is "film" for a film and "music" for a record; festival fees and distribution are "film"', () => {
    for (const [scale, kind] of [
      ['short', 'film'],
      ['single', 'music'],
    ] as const) {
      const s = projectAt(at('indie', 2), scale, 'finance');
      const t = tweak(s, (x) => selfFund(x, new Rng(1), 100, []));
      expect(only(s, t)).toMatchObject({ kind, amount: -100, label: `Self-funded: ${s.project!.title}` });
    }
    const f = projectAt(at('indie', 2), 'short', 'festival');
    const fest = FESTIVALS[0]!;
    const g = tweak(f, (x) => submitFestival(x, fest, []));
    expect(only(f, g)).toMatchObject({ kind: 'film', amount: -fest.fee, label: `Festival fee: ${fest.name}` });
    const offered = tweak(f, (x) => x.project!.offers.push({ id: 'off', festivalId: fest.id, distributorId: 'd', distributor: 'Moonbeam Pictures', amount: 4321 }));
    const h = tweak(offered, (x) => acceptOffer(x, new Rng(1), 'off', []));
    expect(only(offered, h)).toMatchObject({ kind: 'film', amount: 4321, label: 'Distribution: Moonbeam Pictures' });
    expect(h.stats.totalEarned - offered.stats.totalEarned).toBe(4321);
  });

  it('gas and repairs are "travel"; a bus ride (dead car, $0 gas) writes no row', () => {
    const s = newGame('producer', 1);
    const q = commute(s.player.location, 'santamonica', hourOf(s.minute), s.player.carHealth);
    const t = run(s, { type: 'TRAVEL', to: 'santamonica' }).state;
    expect(only(s, t)).toMatchObject({ kind: 'travel', amount: -q.gas, label: `Gas to ${LOCATIONS.santamonica.name}` });
    const dead = tweak(s, (x) => (x.player.carHealth = 0));
    const bus = run(dead, { type: 'TRAVEL', to: 'santamonica' }).state;
    expect(bus.activity!.label).toMatch(/^Bus/);
    expect(bus.player.cash).toBe(dead.player.cash);
    expect(newRows(dead, bus)).toHaveLength(0);
    const shop = tweak(travelTo(at('indie', 2), REPAIR_LOCATION), (x) => (x.player.carHealth = 50));
    const fixed = run(shop, { type: 'REPAIR_CAR' }).state;
    expect(only(shop, fixed)).toMatchObject({ kind: 'travel', amount: -C.CAR_REPAIR_COST, label: 'Car repair' });
  });

  it('leisure is "lifestyle" (a free beach walk writes no row)', () => {
    const s = travelTo(at('indie', 2), leisureLocation(LEISURE.museum, 'silverlake'));
    const t = run(s, { type: 'LEISURE', leisureId: 'museum' }).state;
    expect(only(s, t)).toMatchObject({ kind: 'lifestyle', amount: -LEISURE.museum.cost, label: LEISURE.museum.name });
    expect(LEISURE.beach.cost).toBe(0);
    const b = travelTo(at('indie', 2), leisureLocation(LEISURE.beach, 'silverlake'));
    expect(newRows(b, run(b, { type: 'LEISURE', leisureId: 'beach' }).state)).toHaveLength(0);
  });

  it('a class and headshots are "career"', () => {
    const s = travelTo(at('indie', 2), 'hollywood');
    const t = run(s, { type: 'TAKE_CLASS', skill: 'acting' }).state;
    expect(only(s, t)).toMatchObject({ kind: 'career', amount: -C.CLASS_COST, label: CLASSES.acting.name });
    const h0 = travelTo(at('indie', 2), HEADSHOTS_LOCATION);
    const h1 = run(h0, { type: 'BUY_HEADSHOTS' }).state;
    expect(only(h0, h1)).toMatchObject({ kind: 'career', amount: -C.HEADSHOTS_COST, label: 'Headshots' });
  });

  it('guild initiation (charged when the join finishes) and dues are "union"', () => {
    const s = tweak(travelTo(at('indie', 2), GUILDS.acting.hq), (t) => (t.player.guilds.acting.vouchers = C.GUILD_VOUCHERS_NEEDED));
    const started = run(s, { type: 'JOIN_GUILD', guild: 'acting' }).state;
    expect(newRows(s, started)).toHaveLength(0);
    const joined = run(started, { type: 'SKIP_TO_DONE' }).state;
    expect(only(started, joined)).toMatchObject({ kind: 'union', amount: -C.GUILD_JOIN_FEE, label: 'Guild initiation' });
    const d = tweak(joined, (x) => resolveDues(x, [], 1 + C.GUILD_DUES_CYCLE_DAYS));
    expect(only(joined, d)).toMatchObject({ kind: 'union', amount: -C.GUILD_DUES, label: 'Guild dues' });
  });

  it('earn/spend: zero amounts are skipped; the ledger is newest first and capped at LEDGER_MAX', () => {
    const s = structuredClone(newGame('indie', 1));
    earn(s, 0, 'nothing', 'job');
    spend(s, 0, 'nothing', 'bills');
    expect(s.ledger).toEqual([]);
    expect(s.stats.totalEarned).toBe(0);
    for (let i = 1; i <= 250; i++) (i % 2 ? earn : spend)(s, i, `row ${i}`, 'job');
    expect(s.ledger).toHaveLength(C.LEDGER_MAX);
    expect(C.LEDGER_MAX).toBe(200);
    expect(s.ledger[0]!.label).toBe('row 250');
    expect(s.ledger[C.LEDGER_MAX - 1]!.label).toBe('row 51');
    expect(s.ledger[0]!.amount).toBe(-250);
    expect(s.ledger[1]!.amount).toBe(249);
    expect(new Set(s.ledger.map((e) => e.id)).size).toBe(C.LEDGER_MAX);
    // totalEarned counts every earn, even ones that fell off the capped ledger.
    expect(s.stats.totalEarned).toBe(sum(Array.from({ length: 125 }, (_, k) => 2 * k + 1)));
  });
});

// ---------- inbox ----------

/** One sample event per mapping, with the kinds (in order) it should post. */
function sampleEvents(): [string, GameEvent, InboxKind[]][] {
  const opp = (medium: 'film' | 'tv' | 'music'): Opportunity => ({
    id: 'o1',
    templateId: 't',
    title: `Gig ${medium}`,
    medium,
    skill: 'acting',
    tier: 1,
    location: 'noho',
    windowStart: 9,
    windowEnd: 17,
    day: 1,
    prepHours: 0,
    status: 'booked',
  });
  const offer = { id: 'off', festivalId: 'slamdunce', distributorId: 'd', distributor: 'Moonbeam Pictures', amount: 12000 };
  return [
    ['pilot season', { type: 'PILOT_SEASON_OPENED' }, ['pilotSeasonOpen']],
    ['callback started', { type: 'CALLBACK_STARTED', showTitle: 'Cozy Heights', network: 'StreamyTube', role: 'Hot Detective #2' }, ['callbackStarted']],
    ['callback booked', { type: 'CALLBACK_DONE', showTitle: 'Cozy Heights', right: 2, odds: 0.5, booked: true, pay: 3000 }, ['callbackBooked']],
    ['callback passed', { type: 'CALLBACK_DONE', showTitle: 'Cozy Heights', right: 0, odds: 0.5, booked: false, pay: 0 }, ['callbackPassed']],
    ['film gig', { type: 'BOOKED', opportunity: opp('film'), pay: 150, rp: 10, odds: 0.5 }, ['gigBooked']],
    ['tv gig', { type: 'BOOKED', opportunity: opp('tv'), pay: 150, rp: 10, odds: 0.5 }, ['gigBooked']],
    ['music gig', { type: 'BOOKED', opportunity: opp('music'), pay: 75, rp: 10, odds: 0.5 }, ['gigBookedMusic']],
    ['pilot picked up', { type: 'PILOT_DECIDED', showTitle: 'Cozy Heights', network: 'StreamyTube', pickedUp: true, odds: 0.3, tookIt: true }, ['pilotPickedUp']],
    ['pilot picked up, already on a show', { type: 'PILOT_DECIDED', showTitle: 'Cozy Heights', network: 'StreamyTube', pickedUp: true, odds: 0.3, tookIt: false }, []],
    ['pilot passed', { type: 'PILOT_DECIDED', showTitle: 'Cozy Heights', network: 'StreamyTube', pickedUp: false, odds: 0.3, tookIt: false }, ['pilotPassed']],
    ['episode missed', { type: 'EPISODE_WEEK', showTitle: 'Cozy Heights', episode: 2, pay: 375, missed: true, rpLost: 10 }, ['episodeMissed']],
    ['episode shot', { type: 'EPISODE_WEEK', showTitle: 'Cozy Heights', episode: 2, pay: 1500, missed: false, rpLost: 0 }, []],
    ['series wrapped', { type: 'SERIES_WRAPPED', showTitle: 'Cozy Heights', episodes: 6, missed: 1 }, ['seriesWrapped']],
    ['agent yes', { type: 'AGENT_PITCHED', agencyId: 'boutique', agency: 'Tiny Desk Talent', yes: true, odds: 0.4 }, ['agentSigned']],
    ['agent no', { type: 'AGENT_PITCHED', agencyId: 'boutique', agency: 'Tiny Desk Talent', yes: false, odds: 0.4 }, []],
    ['staffed', { type: 'STAFFING_ROLLED', attempt: 1, odds: 0.3, staffed: true, show: 'Cozy Heights', network: 'StreamyTube', final: true }, ['staffed']],
    ['staffing no', { type: 'STAFFING_ROLLED', attempt: 2, odds: 0.3, staffed: false, show: null, network: null, final: false }, ['staffingNoOffer']],
    ['staffing over', { type: 'STAFFING_ROLLED', attempt: 3, odds: 0.3, staffed: false, show: null, network: null, final: true }, ['staffingOver']],
    ['room event', { type: 'ROOM_EVENT', prompt: 'The showrunner wants a dog in act two.' }, ['roomEvent']],
    ['room promoted', { type: 'ROOM_WRAPPED', showTitle: 'Cozy Heights', weeks: 6, favor: 80, outcome: 'promoted', rp: 50 }, ['roomPromoted']],
    ['room not asked back', { type: 'ROOM_WRAPPED', showTitle: 'Cozy Heights', weeks: 6, favor: 10, outcome: 'notAskedBack', rp: -10 }, ['roomNotAskedBack']],
    ['room wrapped', { type: 'ROOM_WRAPPED', showTitle: 'Cozy Heights', weeks: 6, favor: 50, outcome: 'normal', rp: 0 }, ['roomWrapped']],
    ['label yes', { type: 'LABEL_PITCHED', labelId: 'garage-press', label: 'Garage Press', yes: true, advance: 2400, odds: 0.5 }, ['labelSigned']],
    ['label no', { type: 'LABEL_PITCHED', labelId: 'garage-press', label: 'Garage Press', yes: false, advance: 0, odds: 0.5 }, ['labelPassed']],
    ['festival rejected', { type: 'FESTIVAL_RESULT', festivalId: 'slamdunce', accepted: false, odds: 0.3, rp: 0, award: null, offer: null }, ['festivalRejected']],
    ['festival accepted', { type: 'FESTIVAL_RESULT', festivalId: 'slamdunce', accepted: true, odds: 0.3, rp: 225, award: null, offer: null }, ['festivalAccepted']],
    ['festival accepted + offer', { type: 'FESTIVAL_RESULT', festivalId: 'slamdunce', accepted: true, odds: 0.3, rp: 225, award: 'Jury Prize', offer }, ['festivalAccepted', 'distributionOffer']],
    ['overdraft', { type: 'OVERDRAFT_STARTED', deadlineMinute: 9999 }, ['overdraftStarted']],
    ['overdraft cleared', { type: 'OVERDRAFT_CLEARED' }, ['overdraftCleared']],
    ['moved home', { type: 'MOVED_BACK_HOME' }, ['movedHome']],
    ['voucher 2', { type: 'GUILD_VOUCHER', guild: 'acting', total: 2 }, []],
    ['voucher 3', { type: 'GUILD_VOUCHER', guild: 'acting', total: 3 }, ['guildVoucherReady']],
    ['guild joined', { type: 'GUILD_JOINED', guild: 'writing', fee: 1000 }, ['guildJoined']],
    ['dues', { type: 'GUILD_DUES', guilds: ['acting', 'music'], total: 200 }, ['guildDues']],
    ['health on', { type: 'HEALTH_PLAN', guild: 'acting', active: true }, ['healthPlanOn']],
    ['health off', { type: 'HEALTH_PLAN', guild: 'acting', active: false }, ['healthPlanOff']],
    ['mom', { type: 'MOM_CHECK_IN' }, ['momCheckIn']],
    ['bills (no mail)', { type: 'BILLS_CHARGED', amount: 55 }, []],
    ['job (no mail)', { type: 'JOB_PAID', jobId: 'barista', amount: 130 }, []],
  ];
}

describe('inbox: which events send mail, from whom', () => {
  const cases = sampleEvents();

  it.each(cases)('%s', (_name, e, kinds) => {
    const s = newGame('indie', 1);
    expect(messagesFor(s, e).map((m) => m.kind)).toEqual(kinds);
    const t = tweak(s, (x) => deliverMail(x, new Rng(3), [e]));
    const posted = t.inbox.flatMap((th) => th.messages.map((m) => ({ contact: th.contact, ...m })));
    expect(posted.map((m) => m.kind).sort()).toEqual([...kinds].sort());
    for (const m of posted) {
      expect(m.contact).toBe(INBOX_SENDER[m.kind]);
      expect(m.text).not.toMatch(/[{}]/);
      expect(m.minute).toBe(s.minute);
    }
  });

  it('every inbox kind is reachable from some event, and every template variant fills completely', () => {
    const reached = new Set<InboxKind>();
    const s = newGame('indie', 1);
    for (const [, e] of cases) {
      for (const m of messagesFor(s, e)) {
        reached.add(m.kind);
        // Every variant, not just the one the RNG happens to pick.
        for (const tpl of INBOX_TEMPLATES[m.kind]) {
          const text = tpl.replace(/\{(\w+)\}/g, (match, k: string) => (k in m.vars ? String(m.vars[k]) : match));
          expect(text, `${m.kind}: ${tpl}`).not.toMatch(/[{}]/);
        }
      }
    }
    expect([...reached].sort()).toEqual(Object.keys(INBOX_TEMPLATES).sort());
  });

  it('message text carries the event details (show, money, festival, guild)', () => {
    const s = newGame('indie', 1);
    const textOf = (e: GameEvent) => tweak(s, (x) => deliverMail(x, new Rng(1), [e])).inbox[0]!.messages.at(-1)!.text;
    for (let seed = 0; seed < 6; seed++) {
      expect(tweak(s, (x) => deliverMail(x, new Rng(seed), [cases[2]![1]])).inbox[0]!.messages[0]!.text).toMatch(/Cozy Heights/);
    }
    expect(textOf({ type: 'CALLBACK_DONE', showTitle: 'Cozy Heights', right: 2, odds: 0.5, booked: true, pay: 12345 })).toMatch(/\$12,345/);
    expect(textOf({ type: 'FESTIVAL_RESULT', festivalId: 'slamdunce', accepted: false, odds: 0.3, rp: 0, award: null, offer: null })).toMatch(/SlamDunce/);
    expect(textOf({ type: 'GUILD_JOINED', guild: 'writing', fee: 1000 })).not.toMatch(/undefined/);
  });

  it('FESTIVAL_RESULT with an offer posts two messages in one festival thread, acceptance first', () => {
    const e = cases.find(([n]) => n === 'festival accepted + offer')![1];
    const t = tweak(newGame('indie', 1), (x) => deliverMail(x, new Rng(1), [e]));
    expect(t.inbox).toHaveLength(1);
    expect(t.inbox[0]!.contact).toBe('festival');
    expect(t.inbox[0]!.messages.map((m) => m.kind)).toEqual(['festivalAccepted', 'distributionOffer']);
    expect(t.inbox[0]!.unread).toBe(2);
    expect(t.inbox[0]!.messages[1]!.text).toMatch(/\$12,000|Moonbeam Pictures/);
  });

  it('a pilot picked up while you are already on a show sends no network mail', () => {
    const s = tweak(at('indie', 2), (t) => {
      t.contract = contract(t, 'actor', t.minute + 7 * C.MINUTES_PER_DAY);
      t.pilots = [{ id: 'pp', showTitle: 'Second Show', network: 'StreamyTube', role: 'Barista', tier: 1, right: 3, decisionMinute: t.minute }];
    });
    const events: GameEvent[] = [];
    const t = tweak(s, (x) => {
      resolvePilots(x, fixedRng(0), events);
      deliverMail(x, new Rng(1), events);
    });
    expect(of(events, 'PILOT_DECIDED')).toEqual([expect.objectContaining({ pickedUp: true, tookIt: false })]);
    expect(t.contract!.showTitle).toBe('Cozy Heights');
    expect(t.inbox).toEqual([]);
  });

  it('the callback text names the role even when the callback resolves in the same step (ADVANCE over 06:00)', () => {
    // A pilot submission that finishes, then 06:00 resolves the untouched callback, all in one ADVANCE.
    const s0 = at('indie', 2, 15);
    const base = withOpp(s0, { title: 'Pilot: "Cozy Heights"', medium: 'tv', skill: 'acting', tier: 1, pilot: { network: 'StreamyTube', role: 'Hot Detective #2', showTitle: 'Cozy Heights' } });
    const started = run(base, { type: 'SUBMIT', opportunityId: 'test-opp' }).state;
    const r = run(started, { type: 'ADVANCE', minutes: atHour(3, 7) - started.minute });
    expect(types(r.events)).toContain('CALLBACK_STARTED');
    expect(types(r.events)).toContain('CALLBACK_DONE');
    const msg = r.state.inbox.find((t) => t.contact === 'casting')!.messages.find((m) => m.kind === 'callbackStarted')!;
    expect(msg.text).toMatch(/Hot Detective #2/);
  });
});

describe('inbox: threads, unread and READ_THREAD', () => {
  const post = (s: GameState, kind: InboxKind, minute?: number) =>
    tweak(s, (t) => {
      if (minute !== undefined) t.minute = minute;
      postMessage(t, new Rng(t.nextId + 1), kind, { show: 'X', network: 'Y', role: 'Z', pay: '$1', title: 'T', festival: 'F', days: 3, guild: 'G', total: '$2' });
    });

  it('one thread per contact; the latest thread moves to the front; unread counts up', () => {
    let s = newGame('indie', 1);
    s = post(s, 'overdraftStarted');
    s = post(s, 'momCheckIn', s.minute + 10);
    s = post(s, 'callbackStarted', s.minute + 10);
    expect(s.inbox.map((t) => t.contact)).toEqual(['casting', 'mom', 'landlord']);
    s = post(s, 'overdraftCleared', s.minute + 10);
    expect(s.inbox.map((t) => t.contact)).toEqual(['landlord', 'casting', 'mom']);
    const landlord = s.inbox[0]!;
    expect(landlord.messages.map((m) => m.kind)).toEqual(['overdraftStarted', 'overdraftCleared']);
    expect(landlord.unread).toBe(2);
    expect(landlord.lastMinute).toBe(s.minute);
    expect(unreadCount(s)).toBe(4);
    // gigBooked and callbackBooked share the casting thread; gigBookedMusic is the booker.
    s = post(s, 'gigBooked', s.minute + 1);
    s = post(s, 'gigBookedMusic', s.minute + 1);
    expect(s.inbox.map((t) => t.contact)).toEqual(['booker', 'casting', 'landlord', 'mom']);
    expect(s.inbox[1]!.unread).toBe(2);
  });

  it('READ_THREAD zeroes that thread only, touches nothing else, and is not logged', () => {
    let s = newGame('indie', 1);
    s = post(s, 'overdraftStarted');
    s = post(s, 'momCheckIn');
    s = post(s, 'momCheckIn');
    const r = step(s, { type: 'READ_THREAD', contact: 'mom' });
    expect(r.events).toEqual([]);
    expect(r.state.inbox.find((t) => t.contact === 'mom')!.unread).toBe(0);
    expect(r.state.inbox.find((t) => t.contact === 'landlord')!.unread).toBe(1);
    expect(inboxView(r.state).unread).toBe(1);
    // Nothing but the unread count changed: same clock, RNG, ids, log, order.
    expect(r.state).toEqual(tweak(s, (t) => (t.inbox.find((x) => x.contact === 'mom')!.unread = 0)));
    // Reading an already-read thread is harmless.
    expect(step(r.state, { type: 'READ_THREAD', contact: 'mom' }).state).toEqual(r.state);
  });

  it('READ_THREAD is allowed mid-activity, during a callback, during a room event and after moving home', () => {
    const base = post(newGame('indie', 1), 'momCheckIn');
    const busy = run(base, { type: 'TRAVEL', to: 'burbank' }).state;
    expect(busy.activity).not.toBeNull();
    const inCallback = tweak(base, (t) => {
      t.callback = { opportunityId: 'o', showTitle: 'S', network: 'N', role: 'R', tier: 1, baseOdds: 0.5, beats: [], picks: [] };
    });
    const inRoom = tweak(base, (t) => {
      t.roomEvent = { prompt: 'P', choices: [{ text: 'a', favor: 1, quality: 1 }, { text: 'b', favor: -1, quality: -1 }] };
    });
    const home = tweak(base, (t) => (t.status = 'movedHome'));
    for (const s of [busy, inCallback, inRoom, home]) {
      expect(whyNot(s, { type: 'READ_THREAD', contact: 'mom' })).toBeNull();
      const r = step(s, { type: 'READ_THREAD', contact: 'mom' });
      expect(types(r.events)).not.toContain('ACTION_REJECTED');
      expect(r.state.inbox[0]!.unread).toBe(0);
      expect(r.state.activity).toEqual(s.activity);
      expect(r.state.minute).toBe(s.minute);
      expect(r.state.status).toBe(s.status);
    }
    // Other commands are still blocked in those states.
    expect(whyNot(inCallback, { type: 'SLEEP', hours: 8 })).toMatch(/callback/);
    expect(whyNot(home, { type: 'SLEEP', hours: 8 })).toMatch(/moved back home/);
  });

  it('READ_THREAD for a contact with no thread (or a made-up contact) is rejected and changes nothing', () => {
    const s = post(newGame('indie', 1), 'momCheckIn');
    for (const contact of ['landlord', 'nobody'] as ContactId[]) {
      const r = step(s, { type: 'READ_THREAD', contact });
      expect(r.state).toBe(s);
      expect(r.events).toEqual([{ type: 'ACTION_REJECTED', reason: expect.any(String) }]);
    }
    expect(step(newGame('indie', 1), { type: 'READ_THREAD', contact: 'mom' }).events[0]!.type).toBe('ACTION_REJECTED');
  });

  it('a thread keeps only the last INBOX_THREAD_MAX messages; unread never exceeds what is kept', () => {
    let s = structuredClone(newGame('indie', 1));
    const rng = new Rng(1);
    for (let i = 0; i < C.INBOX_THREAD_MAX + 15; i++) {
      s.minute += 1;
      postMessage(s, rng, 'momCheckIn', {});
    }
    const t = s.inbox[0]!;
    expect(s.inbox).toHaveLength(1);
    expect(t.messages).toHaveLength(C.INBOX_THREAD_MAX);
    expect(t.messages[0]!.minute).toBe(s.minute - C.INBOX_THREAD_MAX + 1);
    expect(t.messages.at(-1)!.minute).toBe(s.minute);
    expect(new Set(t.messages.map((m) => m.id)).size).toBe(C.INBOX_THREAD_MAX);
    expect(t.unread).toBe(C.INBOX_THREAD_MAX);
    s = step(s, { type: 'READ_THREAD', contact: 'mom' }).state;
    expect(s.inbox[0]!.unread).toBe(0);
  });

  it('mail is posted by step() for real events (overdraft → landlord, moving home → mom)', () => {
    let s = tweak(newGame('midwest', 1), (t) => (t.player.cash = -10));
    let r = run(s, { type: 'ADVANCE', minutes: 1 });
    expect(r.state.inbox[0]!.contact).toBe('landlord');
    expect(r.state.inbox[0]!.messages[0]!.kind).toBe('overdraftStarted');
    expect(r.state.inbox[0]!.messages[0]!.text).not.toMatch(/\{/);
    r = run(r.state, { type: 'ADVANCE', minutes: 4 * C.MINUTES_PER_DAY });
    expect(r.state.status).toBe('movedHome');
    const mom = r.state.inbox.find((t) => t.contact === 'mom')!;
    expect(mom.messages.map((m) => m.kind)).toContain('movedHome');
    s = step(r.state, { type: 'READ_THREAD', contact: 'mom' }).state;
    expect(s.inbox.find((t) => t.contact === 'mom')!.unread).toBe(0);
  });

  it(`Mom checks in at 06:00 about ${C.MOM_CHECK_IN_CHANCE * 100}% of mornings, never at other times`, () => {
    let s = tweak(newGame('nepo', 11), (t) => (t.player.cash = 10_000_000));
    let days = 0;
    let checkIns = 0;
    for (let i = 0; i < 600; i++) {
      const before = s;
      const r = step(s, { type: 'ADVANCE', minutes: C.MINUTES_PER_DAY });
      s = r.state;
      days += of(r.events, 'BILLS_CHARGED').length;
      const n = of(r.events, 'MOM_CHECK_IN').length;
      checkIns += n;
      const momBefore = before.inbox.find((t) => t.contact === 'mom')?.messages.length ?? 0;
      const momAfter = s.inbox.find((t) => t.contact === 'mom')?.messages.length ?? 0;
      if (momAfter < C.INBOX_THREAD_MAX) expect(momAfter - momBefore).toBe(n);
    }
    expect(days).toBe(600);
    expect(checkIns / days).toBeGreaterThan(C.MOM_CHECK_IN_CHANCE - 0.06);
    expect(checkIns / days).toBeLessThan(C.MOM_CHECK_IN_CHANCE + 0.06);
    // momCheckIn itself: a pure roll on the chance.
    const ev: GameEvent[] = [];
    momCheckIn(fixedRng(C.MOM_CHECK_IN_CHANCE - 0.001), ev);
    momCheckIn(fixedRng(C.MOM_CHECK_IN_CHANCE + 0.001), ev);
    expect(ev).toEqual([{ type: 'MOM_CHECK_IN' }]);
    // Only at 06:00: an advance that does not cross 06:00 never posts from Mom.
    const morning = toMinute(newGame('indie', 1), atHour(2, 7)).state;
    expect(of(run(morning, { type: 'ADVANCE', minutes: 22 * 60 }).events, 'MOM_CHECK_IN')).toEqual([]);
  });
});

// ---------- read models ----------

describe('bankView', () => {
  it('balance, daily bills and the next 06:00 bills (before, at and after 06:00)', () => {
    const s = newGame('midwest', 1);
    const v = bankView(s);
    expect(v.balance).toBe(1200);
    expect(v.dailyBills).toBe(55);
    expect(v.overdraft).toBeNull();
    expect(v.nextBillsMinute).toBe(atHour(2, 6)); // 08:00 day 1 → tomorrow 06:00
    const early = toMinute(s, atHour(2, 5) + 59).state;
    expect(bankView(early).nextBillsMinute).toBe(atHour(2, 6)); // 05:59 → in a minute
    const six = toMinute(s, atHour(2, 6)).state;
    expect(bankView(six).nextBillsMinute).toBe(atHour(3, 6)); // 06:00 → already paid today
    const late = toMinute(s, atHour(2, 23)).state;
    expect(bankView(late).nextBillsMinute).toBe(atHour(3, 6));
    for (const x of [s, early, six, late]) expect(bankView(x).nextBillsMinute).toBeGreaterThan(x.minute);
  });

  it('overdraft countdown: deadline and minutes left, never below 0', () => {
    const s = tweak(newGame('indie', 1), (t) => (t.player.cash = -10));
    const r = run(s, { type: 'ADVANCE', minutes: 1 }).state;
    const deadline = r.minute + C.OVERDRAFT_DAYS * C.MINUTES_PER_DAY;
    expect(bankView(r).overdraft).toEqual({ deadlineMinute: deadline, minutesLeft: C.OVERDRAFT_DAYS * C.MINUTES_PER_DAY });
    const later = run(r, { type: 'ADVANCE', minutes: 90 }).state;
    expect(bankView(later).overdraft!.minutesLeft).toBe(C.OVERDRAFT_DAYS * C.MINUTES_PER_DAY - 90);
    const past = tweak(later, (t) => (t.minute = deadline + 5));
    expect(bankView(past).overdraft!.minutesLeft).toBe(0);
  });

  it('week in/out sums only the last 7 days of ledger rows; entries are the ledger', () => {
    const s = tweak(newGame('indie', 1), (t) => {
      t.minute = atHour(20, 12);
      const row = (minute: number, amount: number): LedgerEntry => ({ id: `m${minute}`, minute, amount, label: 'x', kind: amount > 0 ? 'job' : 'bills' });
      t.ledger = [row(t.minute, 100), row(t.minute - 6 * C.MINUTES_PER_DAY, -40), row(t.minute - 7 * C.MINUTES_PER_DAY, 7), row(t.minute - 7 * C.MINUTES_PER_DAY - 1, 999), row(t.minute - 10 * C.MINUTES_PER_DAY, -500)];
    });
    const v = bankView(s);
    expect(v.week).toEqual({ in: 107, out: 40 });
    expect(v.entries).toBe(s.ledger);
    expect(v.totalEarned).toBe(s.stats.totalEarned);
  });

  it('week totals match the ledger after a real random run', () => {
    const { final } = checkedRun('indie', 21, 600, 5000);
    const v = bankView(final);
    const recent = final.ledger.filter((e) => e.minute >= final.minute - 7 * C.MINUTES_PER_DAY);
    expect(v.week.in).toBe(sum(recent.filter((e) => e.amount > 0).map((e) => e.amount)));
    expect(v.week.out).toBe(-sum(recent.filter((e) => e.amount < 0).map((e) => e.amount)));
    expect(v.week.out).toBeGreaterThan(0);
  });
});

describe('inboxView', () => {
  it('threads in inbox order with contact name/role/avatar, preview = newest message, a READ_THREAD command, unread totals', () => {
    let s = newGame('indie', 1);
    expect(inboxView(s)).toEqual({ threads: [], unread: 0 });
    s = tweak(s, (t) => {
      const rng = new Rng(2);
      postMessage(t, rng, 'overdraftStarted', { days: 3 });
      t.minute += 5;
      postMessage(t, rng, 'momCheckIn', {});
      t.minute += 5;
      postMessage(t, rng, 'momCheckIn', {});
    });
    const v = inboxView(s);
    expect(v.unread).toBe(3);
    expect(v.threads.map((t) => t.contact)).toEqual(['mom', 'landlord']);
    const mom = v.threads[0]!;
    expect(mom).toMatchObject({ name: CONTACTS.mom.name, role: CONTACTS.mom.role, avatar: CONTACTS.mom.avatar, unread: 2, lastMinute: s.minute });
    expect(mom.preview).toBe(s.inbox[0]!.messages[1]!.text);
    expect(mom.read).toEqual({ type: 'READ_THREAD', contact: 'mom' });
    const after = step(s, mom.read).state;
    expect(inboxView(after).unread).toBe(1);
    expect(inboxView(after).threads[0]!.unread).toBe(0);
  });
});

// ---------- saves ----------

describe('save v7 → v8 migration', () => {
  const asV7 = (s: GameState): string => {
    const st = structuredClone(s) as unknown as Record<string, unknown>;
    delete st.ledger;
    delete st.inbox;
    st.version = 7;
    return JSON.stringify({ version: 7, savedAt: 0, state: st });
  };

  it.each(ARCHETYPE_IDS)('%s: a v7 new game migrates to exactly the fresh state', (id) => {
    const fresh = newGame(id, 5);
    const m = deserialize(asV7(fresh))!;
    expect(m).not.toBeNull();
    expect(m.version).toBe(C.SAVE_VERSION);
    expect(C.SAVE_VERSION).toBe(8);
    expect(m).toEqual(fresh);
  });

  it('a v7 mid-run save gets an empty ledger and inbox, then fills them as it plays', () => {
    const { final } = checkedRun('producer', 31, 400, 10_000);
    const m = deserialize(asV7(final))!;
    expect(m).toEqual({ ...final, ledger: [], inbox: [] });
    const next = run(m, { type: 'ADVANCE', minutes: C.MINUTES_PER_DAY }).state;
    expect(next.ledger.some((e) => e.kind === 'bills')).toBe(true);
  });

  it('a v1 save still loads with an empty ledger and inbox and plays', () => {
    const s = newGame('midwest', 3);
    const st = structuredClone(s) as unknown as Record<string, unknown> & { player: Record<string, unknown> };
    for (const k of ['project', 'credits', 'beats', 'catalog', 'callback', 'pilots', 'contract', 'roomEvent', 'ledger', 'inbox']) delete st[k];
    for (const k of ['fans', 'lastShowDay', 'guilds']) delete st.player[k];
    st.player.guildVouchers = 1;
    st.version = 1;
    const m = deserialize(JSON.stringify({ version: 1, savedAt: 0, state: st }))!;
    expect(m).not.toBeNull();
    expect(m.version).toBe(C.SAVE_VERSION);
    expect(m.ledger).toEqual([]);
    expect(m.inbox).toEqual([]);
    const played = run(m, { type: 'ADVANCE', minutes: C.MINUTES_PER_DAY }).state;
    expect(played.ledger[0]).toMatchObject({ kind: 'bills', amount: -55 });
    expect(deserialize(serialize(played))).toEqual(played);
  });

  it('a save with a full ledger and inbox round-trips through JSON unchanged', () => {
    const { final } = checkedRun('nepo', 41, 800, 20_000);
    expect(final.ledger.length).toBeGreaterThan(0);
    expect(final.inbox.length).toBeGreaterThan(0);
    const restored = deserialize(serialize(final, 1))!;
    expect(restored).toEqual(final);
    expect(JSON.stringify(restored)).toBe(JSON.stringify(final));
  });
});

// ---------- determinism ----------

describe('determinism with mail', () => {
  it('same seed + same commands = identical state, inbox texts included', () => {
    const r = new Rng(77);
    const cmds: Command[] = [];
    let s = tweak(newGame('indie', 9), (t) => (t.player.cash += 30_000));
    const start = s;
    for (let i = 0; i < 1200 && s.status === 'playing'; i++) {
      const c = drive(s, r);
      cmds.push(c);
      s = step(s, c).state;
    }
    const a = cmds.reduce((x, c) => step(x, c).state, start);
    const b = cmds.reduce((x, c) => step(x, c).state, start);
    expect(a).toEqual(b);
    expect(a).toEqual(s);
    const texts = (x: GameState) => x.inbox.flatMap((t) => t.messages.map((m) => `${t.contact}|${m.id}|${m.text}`));
    expect(texts(a).length).toBeGreaterThan(3);
    expect(texts(a)).toEqual(texts(b));
    expect(a.ledger).toEqual(b.ledger);
    // A different seed gives a different story.
    const other = cmds.reduce((x, c) => step(x, c).state, tweak(newGame('indie', 10), (t) => (t.player.cash += 30_000)));
    expect(texts(other)).not.toEqual(texts(a));
  });
});

