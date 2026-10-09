// LAG-82: guilds & unions QA — per-guild vouchers, joining, union rate, Global Rule One, dues, health plan, save v7.
import { describe, expect, it } from 'vitest';
import * as C from './constants';
import { FESTIVALS } from './content/film';
import { GUILDS, GUILD_SKILLS } from './content/guilds';
import { LABELS } from './content/musicBiz';
import { LOCATIONS } from './content/locations';
import { GUILD_FLAVOR } from './content/writersFlavor';
import { guildsView, opportunityView } from './actions';
import { atHour, bookingPayout, dayOf } from './formulas';
import { contractPay, emptyGuilds, grantVoucher, hasHealthPlan, isMember, isNonUnionTier, recordUnionEarnings, resolveDues } from './guilds';
import { completeProjectAction, resolveFestivals } from './project';
import { newGame, step, whyNot } from './reducer';
import { Rng, nextFloat } from './rng';
import { deserialize, serialize } from './save';
import { resolveCallback, resolvePilots } from './tv';
import type { Activity, ArchetypeId, Command, GameEvent, GameState, LocationId, Opportunity, Skill } from './types';

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
const toMinute = (s: GameState, minute: number) => (minute > s.minute ? run(s, { type: 'ADVANCE', minutes: minute - s.minute }) : { state: s, events: [] });
const travelTo = (s: GameState, to: LocationId) => (s.player.location === to ? s : run(s, { type: 'TRAVEL', to }, { type: 'SKIP_TO_DONE' }).state);
function rngStateWhere(pred: (v: number) => boolean): number {
  for (let k = 1; ; k++) if (pred(nextFloat(k)[0])) return k;
}
const forceYes = (s: GameState) => tweak(s, (t) => (t.rngState = rngStateWhere((v) => v < 0.001)));
function fixedRng(v: number): Rng {
  const r = new Rng(0);
  r.float = () => v;
  return r;
}
function at(arch: ArchetypeId, day: number, hour = 9, seed = 1): GameState {
  const s = tweak(newGame(arch, seed), (t) => (t.player.cash += 100_000));
  return rested(toMinute(s, atHour(day, hour)).state);
}
const member = (s: GameState, ...skills: Skill[]) =>
  tweak(s, (t) => {
    for (const k of skills) t.player.guilds[k].member = true;
  });
const vouchers = (s: GameState, skill: Skill, n: number) => tweak(s, (t) => (t.player.guilds[skill].vouchers = n));

/** Today's board replaced by one open gig here, inside its window, with headshots. */
function withGig(s: GameState, opp: Partial<Opportunity>): GameState {
  return tweak(s, (t) => {
    t.player.hasHeadshots = true;
    t.board = [
      {
        id: 'gig',
        templateId: 't',
        title: 'Test Gig',
        medium: 'tv',
        skill: 'acting',
        tier: 2,
        location: t.player.location,
        windowStart: 9,
        windowEnd: 17,
        day: dayOf(t.minute),
        prepHours: 0,
        status: 'open',
        ...opp,
      },
    ];
  });
}
/** Submit to the test gig with a forced yes and finish it. */
const book = (s: GameState) => run(forceYes(s), { type: 'SUBMIT', opportunityId: 'gig' }, { type: 'SKIP_TO_DONE' });

// ---------- basics ----------

describe('guild basics', () => {
  it('four guilds, one per skill; a new run starts with no vouchers and no memberships', () => {
    expect([...GUILD_SKILLS]).toEqual(['acting', 'writing', 'directing', 'music']);
    const g = emptyGuilds();
    for (const k of GUILD_SKILLS) expect(g[k]).toEqual({ vouchers: 0, member: false, joinedMinute: null, earnedThisCycle: 0, healthPlan: false });
    expect(newGame('nepo', 1).player.guilds).toEqual(g);
    expect(isNonUnionTier(1)).toBe(true);
    expect(isNonUnionTier(2)).toBe(false);
  });

  it('contract scale minimum: members ×1.25 (rounded), non-members as offered, per guild', () => {
    const p = member(newGame('indie', 1), 'writing').player;
    expect(contractPay(p, 'writing', 500)).toBe(625);
    expect(contractPay(p, 'writing', 1001)).toBe(1251);
    expect(contractPay(p, 'acting', 500)).toBe(500);
  });
});

// ---------- vouchers ----------

describe('vouchers', () => {
  it('a booked tier-2+ gig earns a voucher in that skill only; tier 1 earns none', () => {
    for (const skill of GUILD_SKILLS) {
      const medium = skill === 'music' ? 'music' : 'film';
      const window = skill === 'music' ? { windowStart: 19, windowEnd: 23 } : {};
      const hour = skill === 'music' ? 19 : 9;
      const base = at('indie', 2, hour);
      const r = book(withGig(base, { skill, medium, tier: 2, ...window }));
      expect(of(r.events, 'BOOKED')).toHaveLength(1);
      expect(r.state.player.guilds[skill].vouchers).toBe(1);
      expect(of(r.events, 'GUILD_VOUCHER')).toEqual([{ type: 'GUILD_VOUCHER', guild: skill, total: 1 }]);
      for (const other of GUILD_SKILLS.filter((k) => k !== skill)) expect(r.state.player.guilds[other].vouchers).toBe(0);
      const t1 = book(withGig(base, { skill, medium, tier: 1, ...window }));
      expect(of(t1.events, 'BOOKED')).toHaveLength(1);
      expect(t1.state.player.guilds[skill].vouchers).toBe(0);
    }
  });

  it('any booked pilot earns an Acting voucher (even a tier-1 web pilot)', () => {
    const s = tweak(at('indie', 9), (t) => {
      t.callback = {
        opportunityId: 'none',
        showTitle: 'Cozy Heights',
        network: 'StreamyTube',
        role: 'Barista #2',
        tier: 1,
        baseOdds: 0.5,
        beats: [{ note: 'n', reads: ['a', 'b', 'c'], best: 0, sensed: null }],
        picks: [0],
      };
    });
    const events: GameEvent[] = [];
    const t = tweak(s, (x) => resolveCallback(x, fixedRng(0), events));
    expect(of(events, 'CALLBACK_DONE')[0]!.booked).toBe(true);
    expect(t.player.guilds.acting.vouchers).toBe(1);
    // A pilot that doesn't book earns nothing.
    const no = tweak(s, (x) => resolveCallback(x, fixedRng(0.9999), []));
    expect(no.player.guilds.acting.vouchers).toBe(0);
  });

  it('a label signing earns a Music voucher (a pass does not)', () => {
    const s = tweak(run(at('producer', 2), { type: 'START_PROJECT', scale: 'single' }).state, (t) => (t.project!.stage = 'finance'));
    const label = LABELS[0]!;
    const a: Activity = { kind: 'project', label: 'x', startMinute: s.minute, endMinute: s.minute, energyPerMinute: 0, sparkPerMinute: 0, carPerMinute: 0, projectAction: 'labelPitch', investorId: label.id, odds: 0.5 };
    const events: GameEvent[] = [];
    const yes = tweak(s, (x) => completeProjectAction(x, a, fixedRng(0), events));
    expect(yes.project!.label).not.toBeNull();
    expect(yes.player.guilds.music.vouchers).toBe(1);
    expect(of(events, 'GUILD_VOUCHER')).toEqual([{ type: 'GUILD_VOUCHER', guild: 'music', total: 1 }]);
    const no = tweak(s, (x) => completeProjectAction(x, a, fixedRng(0.9999), []));
    expect(no.player.guilds.music.vouchers).toBe(0);
  });

  it('a festival acceptance earns a Directing voucher (a rejection does not)', () => {
    const s = tweak(run(at('indie', 2), { type: 'START_PROJECT', scale: 'short' }).state, (t) => {
      const f = FESTIVALS[0]!;
      t.project!.stage = 'festival';
      t.project!.submissions = [{ festivalId: f.id, tier: f.tier, submittedMinute: t.minute, resultMinute: t.minute, odds: 0.5, status: 'pending', award: null }];
    });
    const yes = tweak(s, (x) => resolveFestivals(x, fixedRng(0), []));
    expect(yes.project!.submissions[0]!.status).toBe('accepted');
    expect(yes.player.guilds.directing.vouchers).toBe(1);
    const no = tweak(s, (x) => resolveFestivals(x, fixedRng(0.9999), []));
    expect(no.project!.submissions[0]!.status).toBe('rejected');
    expect(no.player.guilds.directing.vouchers).toBe(0);
  });

  it('capped at 3, and none once you are a member', () => {
    const s = newGame('indie', 1);
    const events: GameEvent[] = [];
    const t = tweak(s, (x) => {
      for (let i = 0; i < 5; i++) grantVoucher(x, events, 'writing');
    });
    expect(t.player.guilds.writing.vouchers).toBe(C.GUILD_VOUCHERS_NEEDED);
    expect(of(events, 'GUILD_VOUCHER').map((e) => e.total)).toEqual([1, 2, 3]);
    const m = tweak(member(s, 'writing'), (x) => grantVoucher(x, events, 'writing'));
    expect(m.player.guilds.writing.vouchers).toBe(0);
    expect(of(events, 'GUILD_VOUCHER')).toHaveLength(3);
  });
});

// ---------- joining ----------

describe('JOIN_GUILD', () => {
  it('needs 3 vouchers, the guild HQ, $1,000 and not already being a member', () => {
    const s = at('indie', 2);
    const hq = GUILDS.writing.hq;
    const atHq = rested(travelTo(s, hq));
    expect(whyNot(atHq, { type: 'JOIN_GUILD', guild: 'writing' })).toBe(`Needs ${C.GUILD_VOUCHERS_NEEDED} vouchers (you have 0).`);
    expect(whyNot(vouchers(atHq, 'writing', 2), { type: 'JOIN_GUILD', guild: 'writing' })).toBe('Needs 3 vouchers (you have 2).');
    const ready = vouchers(atHq, 'writing', 3);
    expect(whyNot(ready, { type: 'JOIN_GUILD', guild: 'writing' })).toBeNull();
    // Vouchers in one guild don't count toward another.
    expect(whyNot(ready, { type: 'JOIN_GUILD', guild: 'acting' })).toMatch(/you have 0/);
    const away = vouchers(rested(travelTo(s, 'burbank')), 'writing', 3);
    expect(whyNot(away, { type: 'JOIN_GUILD', guild: 'writing' })).toBe(`${GUILD_FLAVOR.writing.short} HQ is in ${LOCATIONS[hq].name}.`);
    expect(whyNot(tweak(ready, (t) => (t.player.cash = C.GUILD_JOIN_FEE - 1)), { type: 'JOIN_GUILD', guild: 'writing' })).toBe('Initiation is $1,000.');
    expect(whyNot(tweak(ready, (t) => (t.player.cash = C.GUILD_JOIN_FEE)), { type: 'JOIN_GUILD', guild: 'writing' })).toBeNull();
    expect(whyNot(member(ready, 'writing'), { type: 'JOIN_GUILD', guild: 'writing' })).toMatch(/already in/);
    expect(whyNot(ready, { type: 'JOIN_GUILD', guild: 'cooking' as Skill })).toBe('Unknown guild.');
  });

  it('every guild HQ works', () => {
    for (const k of GUILD_SKILLS) {
      const s = vouchers(rested(travelTo(at('indie', 2), GUILDS[k].hq)), k, 3);
      expect(whyNot(s, { type: 'JOIN_GUILD', guild: k })).toBeNull();
    }
  });

  it('takes 1h; the $1,000 initiation is charged when it completes; you become a member', () => {
    const s = vouchers(rested(travelTo(at('indie', 2), 'weho')), 'writing', 3);
    const started = run(s, { type: 'JOIN_GUILD', guild: 'writing' }).state;
    expect(started.player.cash).toBe(s.player.cash);
    expect(started.activity!.kind).toBe('guild');
    expect(started.activity!.endMinute - started.minute).toBe(C.GUILD_JOIN_HOURS * 60);
    const r = run(started, { type: 'SKIP_TO_DONE' });
    const g = r.state.player.guilds.writing;
    expect(r.state.player.cash).toBe(s.player.cash - C.GUILD_JOIN_FEE);
    expect(g.member).toBe(true);
    expect(g.joinedMinute).toBe(r.state.minute);
    expect(g.earnedThisCycle).toBe(0);
    expect(g.healthPlan).toBe(false);
    expect(isMember(r.state.player, 'writing')).toBe(true);
    expect(isMember(r.state.player, 'acting')).toBe(false);
    expect(of(r.events, 'GUILD_JOINED')).toEqual([{ type: 'GUILD_JOINED', guild: 'writing', fee: C.GUILD_JOIN_FEE }]);
    expect(r.state.trades[0]!.text).toContain(GUILD_FLAVOR.writing.short);
  });

  it('guildsView mirrors state and whyNot', () => {
    const s = vouchers(member(at('indie', 2), 'acting'), 'writing', 2);
    const v = guildsView(s);
    expect(v.guilds.map((g) => g.skill)).toEqual([...GUILD_SKILLS]);
    const w = v.guilds.find((g) => g.skill === 'writing')!;
    expect(w).toMatchObject({ vouchers: 2, needed: 3, member: false, joinFee: 1000, dues: 100, healthThreshold: 2000, hq: LOCATIONS[GUILDS.writing.hq].name });
    expect(w.disabledReason).toBe(whyNot(s, w.command));
    expect(v.guilds.find((g) => g.skill === 'acting')!.member).toBe(true);
    expect(v.healthPlan).toBe(false);
  });
});

// ---------- union rate and Global Rule One ----------

describe('union rate and Global Rule One', () => {
  it('members get the union rate (2×) on gigs in their skill only', () => {
    const base = withGig(at('indie', 2), { skill: 'acting', medium: 'tv', tier: 2 });
    const plain = book(base);
    const actor = book(member(base, 'acting'));
    const writer = book(member(base, 'writing'));
    const pay = (r: { events: GameEvent[] }) => of(r.events, 'BOOKED')[0]!.pay;
    expect(pay(plain)).toBe(bookingPayout('tv', 2).pay);
    expect(pay(actor)).toBe(bookingPayout('tv', 2, true).pay);
    expect(pay(actor)).toBe(2 * pay(plain));
    expect(pay(writer)).toBe(pay(plain));
    // The board shows the same number.
    expect(opportunityView(member(base, 'acting'), base.board[0]!).pay).toBe(pay(actor));
    expect(opportunityView(member(base, 'writing'), base.board[0]!).pay).toBe(pay(plain));
  });

  it('union pay counts toward the member\'s health-plan cycle (and only for members)', () => {
    const base = withGig(at('indie', 2), { skill: 'acting', medium: 'tv', tier: 2 });
    const actor = book(member(base, 'acting')).state;
    expect(actor.player.guilds.acting.earnedThisCycle).toBe(bookingPayout('tv', 2, true).pay);
    expect(book(base).state.player.guilds.acting.earnedThisCycle).toBe(0);
    const t = tweak(newGame('indie', 1), (x) => recordUnionEarnings(x, 'music', 500));
    expect(t.player.guilds.music.earnedThisCycle).toBe(0);
  });

  it('Global Rule One: members can\'t SUBMIT to tier-1 gigs in their skill; other skills and tier 2+ are fine', () => {
    const t1 = withGig(at('indie', 2), { skill: 'acting', medium: 'tv', tier: 1 });
    expect(whyNot(t1, { type: 'SUBMIT', opportunityId: 'gig' })).toBeNull();
    expect(whyNot(member(t1, 'acting'), { type: 'SUBMIT', opportunityId: 'gig' })).toBe(`Global Rule One: ${GUILD_FLAVOR.acting.short} members can't take non-union work.`);
    expect(whyNot(member(t1, 'writing', 'music', 'directing'), { type: 'SUBMIT', opportunityId: 'gig' })).toBeNull();
    const t2 = withGig(at('indie', 2), { skill: 'acting', medium: 'tv', tier: 2 });
    expect(whyNot(member(t2, 'acting'), { type: 'SUBMIT', opportunityId: 'gig' })).toBeNull();
    // A rejected command never changes state.
    const r = step(member(t1, 'acting'), { type: 'SUBMIT', opportunityId: 'gig' });
    expect(r.events[0]!.type).toBe('ACTION_REJECTED');
  });

  it('acting members picked up for a series get the scale minimum (×1.25)', () => {
    const s = tweak(at('indie', 2), (t) => {
      t.pilots = [{ id: 'pp', showTitle: 'Cozy Heights', network: 'StreamyTube', role: 'Barista', tier: 1, right: 2, decisionMinute: t.minute }];
    });
    const plain = tweak(s, (t) => resolvePilots(t, fixedRng(0), []));
    const union = tweak(member(s, 'acting'), (t) => resolvePilots(t, fixedRng(0), []));
    expect(union.contract!.weeklyPay).toBe(Math.round(plain.contract!.weeklyPay * C.GUILD_CONTRACT_MINIMUM));
    expect(union.contract!.kind).toBe('actor');
  });
});

// ---------- dues and the health plan ----------

describe('dues and the health plan', () => {
  it('$100 per membership at 06:00 on days 31, 61, 91…; nothing on other days or with no memberships', () => {
    const s = member(newGame('indie', 1), 'acting', 'writing');
    const charged = (day: number, st = s) => {
      const events: GameEvent[] = [];
      const t = tweak(st, (x) => resolveDues(x, events, day));
      return { cash: st.player.cash - t.player.cash, events };
    };
    for (const day of [31, 61, 91, 121]) {
      const c = charged(day);
      expect(c.cash).toBe(200);
      expect(of(c.events, 'GUILD_DUES')).toEqual([{ type: 'GUILD_DUES', guilds: ['acting', 'writing'], total: 200 }]);
    }
    for (const day of [1, 2, 30, 32, 60, 62]) expect(charged(day).events).toEqual([]);
    expect(charged(31, newGame('indie', 1)).events).toEqual([]);
  });

  it('the clock charges dues at 06:00 on day 31 (with the bills)', () => {
    const s = member(tweak(newGame('indie', 1), (t) => (t.player.cash += 100_000)), 'music');
    const before = toMinute(s, atHour(31, 6) - 1);
    expect(of(before.events, 'GUILD_DUES')).toEqual([]);
    const r = run(before.state, { type: 'ADVANCE', minutes: 1 });
    expect(of(r.events, 'GUILD_DUES')).toEqual([{ type: 'GUILD_DUES', guilds: ['music'], total: 100 }]);
    expect(dayOf(r.state.minute)).toBe(31);
  });

  it('$2,000+ of union pay in a cycle → health plan next cycle (HEALTH_PLAN on each change); the cycle counter resets', () => {
    const s = tweak(member(newGame('indie', 1), 'acting', 'writing'), (t) => {
      t.player.guilds.acting.earnedThisCycle = C.HEALTH_PLAN_THRESHOLD;
      t.player.guilds.writing.earnedThisCycle = C.HEALTH_PLAN_THRESHOLD - 1;
    });
    const e1: GameEvent[] = [];
    const c1 = tweak(s, (t) => resolveDues(t, e1, 31));
    expect(c1.player.guilds.acting.healthPlan).toBe(true);
    expect(c1.player.guilds.writing.healthPlan).toBe(false);
    expect(c1.player.guilds.acting.earnedThisCycle).toBe(0);
    expect(c1.player.guilds.writing.earnedThisCycle).toBe(0);
    expect(of(e1, 'HEALTH_PLAN')).toEqual([{ type: 'HEALTH_PLAN', guild: 'acting', active: true }]);
    expect(hasHealthPlan(c1.player)).toBe(true);
    // Still covered next cycle: no event. Then it lapses.
    const e2: GameEvent[] = [];
    const c2 = tweak(c1, (t) => {
      t.player.guilds.acting.earnedThisCycle = 5000;
      resolveDues(t, e2, 61);
    });
    expect(of(e2, 'HEALTH_PLAN')).toEqual([]);
    const e3: GameEvent[] = [];
    const c3 = tweak(c2, (t) => resolveDues(t, e3, 91));
    expect(c3.player.guilds.acting.healthPlan).toBe(false);
    expect(of(e3, 'HEALTH_PLAN')).toEqual([{ type: 'HEALTH_PLAN', guild: 'acting', active: false }]);
    expect(hasHealthPlan(c3.player)).toBe(false);
  });

  it('with a health plan, Burnout builds at 0.75× (same tiring class, same Energy path)', () => {
    const s = tweak(rested(travelTo(at('indie', 2), 'hollywood')), (t) => {
      t.player.energy = 10;
      t.player.burnout = 0;
    });
    const covered = tweak(member(s, 'acting'), (t) => (t.player.guilds.acting.healthPlan = true));
    const cmd: Command = { type: 'TAKE_CLASS', skill: 'acting' };
    const a = run(s, cmd, { type: 'SKIP_TO_DONE' }).state.player;
    const b = run(covered, cmd, { type: 'SKIP_TO_DONE' }).state.player;
    expect(a.burnout).toBeGreaterThan(1);
    expect(b.energy).toBeCloseTo(a.energy, 10);
    expect(b.burnout).toBeCloseTo(a.burnout * C.HEALTH_PLAN_BURNOUT, 6);
    // A healthPlan flag without membership does nothing.
    const stale = tweak(s, (t) => (t.player.guilds.acting.healthPlan = true));
    expect(run(stale, cmd, { type: 'SKIP_TO_DONE' }).state.player.burnout).toBeCloseTo(a.burnout, 10);
  });

  it('staff-writer weeks count as Writing union pay (not Acting)', () => {
    // Writer contract week paid at the week end.
    const s = tweak(member(at('indie', 2), 'writing'), (t) => {
      t.contract = {
        kind: 'writer',
        favor: 50,
        roomScores: [],
        showTitle: 'Cozy Heights',
        network: 'KABLE 9',
        role: 'Staff writer',
        tier: 1,
        weeklyPay: 625,
        episodesTotal: 6,
        episodesDone: 0,
        episodesMissed: 0,
        shotThisWeek: true,
        weekEndMinute: atHour(dayOf(t.minute) + 1, C.BILLS_HOUR),
      };
    });
    const r = toMinute(s, s.contract!.weekEndMinute);
    expect(of(r.events, 'EPISODE_WEEK')[0]!.pay).toBe(625);
    expect(r.state.player.guilds.writing.earnedThisCycle).toBe(625);
    expect(r.state.player.guilds.acting.earnedThisCycle).toBe(0);
  });
});

// ---------- saves ----------

describe('save v6 → v7 migration', () => {
  /** A current state rewritten into its v6 shape. */
  function asV6(s: GameState, guildVouchers: number | undefined): string {
    const st = structuredClone(s) as unknown as Record<string, unknown> & { player: Record<string, unknown>; project: Record<string, unknown> | null; contract: Record<string, unknown> | null };
    delete st.player.guilds;
    if (guildVouchers !== undefined) st.player.guildVouchers = guildVouchers;
    delete st.roomEvent;
    if (st.project) {
      const scores = st.project.scores as Record<string, unknown>;
      delete scores.deck;
      delete st.project.agent;
      delete st.project.staffing;
    }
    if (st.contract) {
      delete st.contract.kind;
      delete st.contract.favor;
      delete st.contract.roomScores;
    }
    st.version = 6;
    return JSON.stringify({ version: 6, savedAt: 0, state: st });
  }

  it('the old voucher count becomes Acting vouchers (capped at 3); the field is gone; nobody is a member', () => {
    for (const [old, acting] of [
      [0, 0],
      [2, 2],
      [3, 3],
      [7, 3],
    ] as const) {
      const m = deserialize(asV6(newGame('indie', 1), old))!;
      expect(m.version).toBe(C.SAVE_VERSION);
      expect(m.player.guilds.acting.vouchers).toBe(acting);
      for (const k of GUILD_SKILLS) {
        expect(m.player.guilds[k].member).toBe(false);
        if (k !== 'acting') expect(m.player.guilds[k].vouchers).toBe(0);
      }
      expect('guildVouchers' in m.player).toBe(false);
      expect(m.roomEvent).toBeNull();
    }
    expect(deserialize(asV6(newGame('indie', 1), undefined))!.player.guilds.acting.vouchers).toBe(0);
  });

  it('an in-flight project gains scores.deck, agent and staffing; it carries on', () => {
    const s = run(at('indie', 2), { type: 'START_PROJECT', scale: 'short' }, { type: 'WRITE_SESSION' }, { type: 'SKIP_TO_DONE' }).state;
    const m = deserialize(asV6(s, 1))!;
    expect(m.project!.scores.deck).toEqual([]);
    expect(m.project!.agent).toBeNull();
    expect(m.project!.staffing).toBeNull();
    expect(m.project!.scores.develop).toEqual(s.project!.scores.develop);
    expect(run(rested(m), { type: 'WRITE_SESSION' }, { type: 'SKIP_TO_DONE' }).state.project!.scores.develop).toHaveLength(2);
  });

  it('an in-flight series contract becomes an actor contract with Favor 50 and no room scores', () => {
    const s = tweak(at('indie', 2), (t) => {
      t.pilots = [{ id: 'pp', showTitle: 'Cozy Heights', network: 'StreamyTube', role: 'Barista', tier: 1, right: 2, decisionMinute: t.minute }];
      resolvePilots(t, fixedRng(0), []);
    });
    const m = deserialize(asV6(s, 0))!;
    expect(m.contract).toMatchObject({ kind: 'actor', favor: 50, roomScores: [], showTitle: 'Cozy Heights', weeklyPay: s.contract!.weeklyPay });
    expect(whyNot(rested(travelTo(m, 'burbank')), { type: 'SHOOT_EPISODE' })).toBeNull();
  });

  it('a v1 save (Phase 1 shape, with guildVouchers) still loads and plays', () => {
    const s = newGame('midwest', 3);
    const st = structuredClone(s) as unknown as Record<string, unknown> & { player: Record<string, unknown> };
    for (const k of ['project', 'credits', 'beats', 'catalog', 'callback', 'pilots', 'contract', 'roomEvent']) delete st[k];
    for (const k of ['fans', 'lastShowDay', 'guilds']) delete st.player[k];
    st.player.guildVouchers = 2;
    st.version = 1;
    const m = deserialize(JSON.stringify({ version: 1, savedAt: 0, state: st }))!;
    expect(m).not.toBeNull();
    expect(m.version).toBe(C.SAVE_VERSION);
    expect(m.player.guilds.acting.vouchers).toBe(2);
    expect(m.player.fans).toBe(0);
    expect(m.project).toBeNull();
    expect(m.contract).toBeNull();
    expect(m.roomEvent).toBeNull();
    const started = run(m, { type: 'START_PROJECT', scale: 'spec' }).state;
    expect(started.project!.medium).toBe('tv');
    expect(run(m, { type: 'ADVANCE', minutes: 24 * 60 }).state.minute).toBe(m.minute + 24 * 60);
    expect(deserialize(serialize(m))).toEqual(m);
  });
});
