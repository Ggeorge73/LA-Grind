// Read-only views for the UI: what the player can do right now, what it costs, what it pays,
// and why not. Keeps every rule in src/sim so components only render and dispatch.
import { FESTIVALS, FILM_SCALES } from './content/film';
import { MUSIC_SCALES } from './content/music';
import { CHART_NAME } from './content/musicFlavor';
import { LABELS, VENUES } from './content/musicBiz';
import { LABEL_FLAVOR, VENUE_FLAVOR } from './content/musicBizFlavor';
import { beatFee, beatLeaseChance, placementChance, showPay, soundtrackBonus } from './formulas';
import { playedShowToday } from './musicBiz';
import { CREW_ROLE_NAMES, PROJECT_SCALES, SCALE_IDS_BY_MEDIUM, type ProjectMedium } from './content/projects';
import { DISTRIBUTORS, FESTIVAL_BLURBS, INVESTORS } from './content/filmFlavor';
import {
  crewQuality,
  editorSkill,
  eligibleFestivals,
  labelOddsFor,
  filmScaleOf,
  musicScaleOf,
  peakPosition,
  pipelineOf,
  promotedToday,
  festivalOddsFor,
  fundingRoom,
  hiredCrew,
  pitchOddsFor,
  pitchedToday,
  productionValue,
  projectQuality,
  remainingBudget,
  scaleOf,
  scriptQuality,
  submittedTo,
} from './project';
import type { Project } from './types';
import * as C from './constants';
import { ARCHETYPES } from './content/archetypes';
import { JOBS, JOB_IDS } from './content/jobs';
import { CLASSES, HEADSHOTS_LOCATION, LEISURE, LEISURE_IDS, LOCATIONS, LOCATION_IDS, REPAIR_LOCATION } from './content/locations';
import { SUBMISSION_NAME, oddsFor, submissionFee } from './board';
import { average, bookingPayout, commute, dailyBills, hourOf, isExposure, type CommuteQuote } from './formulas';
import { whyNot } from './reducer';
import type { Command, GameState, LocationId, Opportunity, Skill } from './types';
import { formatMoney } from './world';

export interface ActionOption {
  id: string;
  group: 'work' | 'rest' | 'grow';
  title: string;
  detail: string;
  minutes: number;
  costs: string[];
  rewards: string[];
  command: Command;
  disabledReason: string | null;
}

const SKILLS: readonly Skill[] = ['acting', 'writing', 'directing', 'music'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function listActions(s: GameState, rideshareHours = 4, sleepHours = 8): ActionOption[] {
  const p = s.player;
  const out: ActionOption[] = [];
  const add = (o: Omit<ActionOption, 'disabledReason'>) => out.push({ ...o, disabledReason: whyNot(s, o.command) });

  for (const id of JOB_IDS) {
    const job = JOBS[id];
    const where = job.location ? LOCATIONS[job.location].name : 'Anywhere';
    if (job.hours === null) {
      const net = (job.payPerHour - job.gasPerHour) * rideshareHours;
      add({
        id: `job-${id}`,
        group: 'work',
        title: `${job.name} · ${rideshareHours}h`,
        detail: `${where} · ${job.flavour}`,
        minutes: rideshareHours * 60,
        costs: [`−${job.energyPerHour * rideshareHours} Energy`, `−${job.carPerHour * rideshareHours} Car`, `$${job.gasPerHour}/h gas`],
        rewards: [`+${formatMoney(net)} net`],
        command: { type: 'START_JOB', jobId: id, hours: rideshareHours },
      });
    } else {
      const window = job.startWindow ? `starts ${pad(job.startWindow[0])}–${pad(job.startWindow[1])}` : '';
      const rewards = [`+${formatMoney(job.pay)}`];
      if (job.networkGain) rewards.push(`${job.networkChance < 1 ? `${job.networkChance * 100}%: ` : ''}+${job.networkGain} Network`);
      if (job.rpGain) rewards.push(`+${job.rpGain} RP`);
      add({
        id: `job-${id}`,
        group: 'work',
        title: `${job.name} · ${job.hours}h`,
        detail: `${where}, ${window} · ${job.flavour}`,
        minutes: job.hours * 60,
        costs: [`−${job.energy} Energy`],
        rewards,
        command: { type: 'START_JOB', jobId: id },
      });
    }
  }

  if (p.location === p.home) {
    const mult = ARCHETYPES[p.archetype].sleepMultiplier;
    add({
      id: 'sleep',
      group: 'rest',
      title: `Sleep · ${sleepHours}h`,
      detail: ARCHETYPES[p.archetype].homeName,
      minutes: sleepHours * 60,
      costs: [],
      rewards: [`+${Math.round(C.ENERGY_SLEEP_GAIN_PER_HOUR * mult * sleepHours)} Energy`, `−${C.BURNOUT_RECOVERY_PER_HOUR * sleepHours} Burnout`],
      command: { type: 'SLEEP', hours: sleepHours },
    });
  }

  for (const id of LEISURE_IDS) {
    const spot = LEISURE[id];
    if (spot.location !== p.location) continue;
    add({
      id: `leisure-${id}`,
      group: 'rest',
      title: `${spot.name} · ${C.LEISURE_HOURS}h`,
      detail: spot.flavour,
      minutes: C.LEISURE_HOURS * 60,
      costs: spot.cost ? [`−$${spot.cost}`] : [],
      rewards: [`+${C.LEISURE_SPARK} Spark`, `−${C.LEISURE_BURNOUT_RELIEF} Burnout`],
      command: { type: 'LEISURE', leisureId: id },
    });
  }

  if (p.location === CLASSES.acting.location) {
    for (const skill of SKILLS) {
      add({
        id: `class-${skill}`,
        group: 'grow',
        title: `${CLASSES[skill].name} · ${C.CLASS_HOURS}h`,
        detail: `${cap(skill)} ${p.skills[skill]} → ${Math.min(100, p.skills[skill] + C.CLASS_SKILL_GAIN)}`,
        minutes: C.CLASS_HOURS * 60,
        costs: [`−$${C.CLASS_COST}`, `−${C.CLASS_ENERGY} Energy`],
        rewards: [`+${C.CLASS_SKILL_GAIN} ${cap(skill)}`],
        command: { type: 'TAKE_CLASS', skill },
      });
    }
  }

  if (p.location === HEADSHOTS_LOCATION && !p.hasHeadshots) {
    add({
      id: 'headshots',
      group: 'grow',
      title: `Headshots & press photos · ${C.HEADSHOTS_HOURS}h`,
      detail: 'One-time. Required for any Tier 2+ opportunity.',
      minutes: C.HEADSHOTS_HOURS * 60,
      costs: [`−$${C.HEADSHOTS_COST}`],
      rewards: ['Unlocks Tier 2+'],
      command: { type: 'BUY_HEADSHOTS' },
    });
  }

  if (p.location === REPAIR_LOCATION) {
    add({
      id: 'repair',
      group: 'grow',
      title: `Car repair · ${C.CAR_REPAIR_HOURS}h`,
      detail: `Car Health ${Math.round(p.carHealth)} → ${Math.min(100, Math.round(p.carHealth) + C.CAR_REPAIR_GAIN)}`,
      minutes: C.CAR_REPAIR_HOURS * 60,
      costs: [`−$${C.CAR_REPAIR_COST}`],
      rewards: [`+${C.CAR_REPAIR_GAIN} Car Health`],
      command: { type: 'REPAIR_CAR' },
    });
  }

  return out;
}

export interface TravelOption {
  to: LocationId;
  name: string;
  quote: CommuteQuote;
  disabledReason: string | null;
}

/** Live travel quotes to every other neighbourhood at the current hour. */
export function travelOptions(s: GameState): TravelOption[] {
  const p = s.player;
  return LOCATION_IDS.filter((id) => id !== p.location).map((to) => ({
    to,
    name: LOCATIONS[to].name,
    quote: commute(p.location, to, hourOf(s.minute), p.carHealth),
    disabledReason: whyNot(s, { type: 'TRAVEL', to }),
  }));
}

export interface OpportunityView {
  opp: Opportunity;
  odds: number;
  oddsWithMaxPrep: number;
  pay: number;
  rp: number;
  network: number;
  fee: number;
  submissionName: string;
  exposureRisk: boolean;
  where: string;
  window: string;
  prep: { hours: number; command: Command; disabledReason: string | null }[];
  submit: { command: Command; disabledReason: string | null };
}

export function opportunityView(s: GameState, opp: Opportunity): OpportunityView {
  const p = s.player;
  const payout = bookingPayout(opp.medium, opp.tier, p.guildVouchers >= C.GUILD_VOUCHERS_NEEDED);
  const remaining = C.PREP_MAX_HOURS - opp.prepHours;
  const prep = [1, 2, 4]
    .filter((h) => h <= remaining)
    .map((hours) => {
      const command: Command = { type: 'PREP', opportunityId: opp.id, hours };
      return { hours, command, disabledReason: whyNot(s, command) };
    });
  const submitCmd: Command = { type: 'SUBMIT', opportunityId: opp.id };
  return {
    opp,
    odds: oddsFor(p, opp),
    oddsWithMaxPrep: oddsFor(p, opp, remaining),
    pay: payout.pay,
    rp: payout.rp,
    network: payout.network,
    fee: submissionFee(p, opp),
    submissionName: SUBMISSION_NAME[opp.skill],
    exposureRisk: isExposure(p.skills[opp.skill], opp.tier),
    where: LOCATIONS[opp.location].name,
    window: `${pad(opp.windowStart)}:00–${pad(opp.windowEnd)}:00`,
    prep,
    submit: { command: submitCmd, disabledReason: whyNot(s, submitCmd) },
  };
}

export const todaysBill = (s: GameState): number => dailyBills(ARCHETYPES[s.player.archetype].rentPerDay);

const pad = (n: number) => String(n).padStart(2, '0');

// ---------- Projects (career engine) ----------


export interface ScaleOption {
  id: Project['scale'];
  medium: ProjectMedium;
  name: string;
  budget: number;
  minTier: number;
  summary: string;
  command: Command;
  disabledReason: string | null;
}

export function projectScaleOptions(s: GameState): ScaleOption[] {
  return (['film', 'music'] as const).flatMap((medium) =>
    SCALE_IDS_BY_MEDIUM[medium].map((id) => {
      const sc = PROJECT_SCALES[id];
      const command: Command = { type: 'START_PROJECT', scale: id };
      let summary: string;
      if (medium === 'film') {
        const f = FILM_SCALES[id as keyof typeof FILM_SCALES];
        summary = `${f.scriptSessions} writing sessions · ${f.crewSlots} crew · ${f.shootDays} shoot days · festivals up to tier ${f.bestFestivalTier}`;
      } else {
        const m = MUSIC_SCALES[id as keyof typeof MUSIC_SCALES];
        summary = `${m.songs} ${m.songs === 1 ? 'song' : 'songs'} · ${m.crewSlots} studio crew · ${m.recordSessions} studio sessions · 7-day release week`;
      }
      return { id, medium, name: sc.name, budget: sc.budget, minTier: sc.minTier, summary, command, disabledReason: whyNot(s, command) };
    }),
  );
}

export interface ProjectView {
  project: Project;
  scaleName: string;
  stages: { id: string; label: string; status: 'done' | 'current' | 'upcoming' }[];
  quality: number;
  script: { quality: number; done: number; needed: number; scores: number[] };
  write: { command: Command; disabledReason: string | null };
  budget: { budget: number; raised: number; selfFunded: number; spent: number; remaining: number; room: number };
  investors: { id: string; name: string; blurb: string; where: string; odds: number; pitchedToday: boolean; command: Command; disabledReason: string | null }[];
  /** Music only (empty for film): labels to pitch in "Book the studio". */
  labels: {
    id: string;
    name: string;
    blurb: string;
    where: string;
    odds: number;
    advance: string;
    royaltyCut: number;
    marketing: number;
    command: Command;
    disabledReason: string | null;
  }[];
  /** The label that signed this record, if any. */
  signedLabel: Project['label'];
  /** Film post stage: your catalogue records you could put on the soundtrack. */
  soundtrack: { current: Project['soundtrack']; options: { id: string; title: string; quality: number; bonus: number; command: Command; disabledReason: string | null }[] };
  selfFundReason: (amount: number) => string | null;
  crew: {
    slots: number;
    hired: number;
    quality: number;
    productionValue: number;
    candidates: { id: string; name: string; role: string; skill: number; fee: number; quirk: string; hired: boolean; command: Command; disabledReason: string | null }[];
  };
  shoot: {
    done: number;
    needed: number;
    scores: number[];
    average: number;
    where: string;
    command: Command;
    disabledReason: string | null;
  };
  post: { done: number; needed: number; scores: number[]; average: number; hasEditor: boolean; command: Command; disabledReason: string | null };
  festivals: {
    id: string;
    name: string;
    tier: number;
    blurb: string;
    fee: number;
    waitDays: number;
    /** Live odds if submitted now (locked odds once submitted). */
    odds: number;
    eligible: boolean;
    submission: { status: 'pending' | 'accepted' | 'rejected'; resultMinute: number; award: string | null } | null;
    command: Command;
    disabledReason: string | null;
  }[];
  offers: { id: string; distributor: string; blurb: string; festival: string; amount: number; command: Command; disabledReason: string | null }[];
  selfRelease: { command: Command; disabledReason: string | null; rp: number };
  /** Music only (null for film). */
  record: { done: number; needed: number; scores: number[]; average: number; studio: string; where: string; command: Command; disabledReason: string | null } | null;
  release: {
    released: boolean;
    chart: string;
    days: { day: number; streams: number; fans: number; royalties: number; position: number | null; promoted: boolean }[];
    daysTotal: number;
    peak: number | null;
    totalStreams: number;
    fans: number;
    releaseCommand: Command;
    releaseReason: string | null;
    promoCommand: Command;
    promoReason: string | null;
    promotedToday: boolean;
  } | null;
  abandon: Command;
}

export function projectView(s: GameState): ProjectView | null {
  const p = s.project;
  if (!p) return null;
  const sc = scaleOf(p);
  const pipeline = pipelineOf(p);
  const currentIdx = pipeline.findIndex((x) => x.id === p.stage);
  const film = p.medium === 'film';
  const writeCmd: Command = { type: 'WRITE_SESSION' };
  return {
    project: p,
    scaleName: sc.name,
    stages: pipeline.map((x, i) => ({ id: x.id, label: x.label, status: i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming' })),
    quality: projectQuality(p),
    script: { quality: scriptQuality(p), done: p.scores.develop.length, needed: sc.writeSessions, scores: p.scores.develop },
    write: { command: writeCmd, disabledReason: whyNot(s, writeCmd) },
    budget: {
      budget: p.budget,
      raised: p.raised,
      selfFunded: p.selfFunded,
      spent: p.spent,
      remaining: remainingBudget(p),
      room: Number.isFinite(fundingRoom(p)) ? fundingRoom(p) : 0,
    },
    // Investors are film-only for now (music labels arrive in Sprint 8).
    investors: (film ? INVESTORS : []).map((inv) => {
      const command: Command = { type: 'PITCH', investorId: inv.id };
      return {
        id: inv.id,
        name: inv.name,
        blurb: inv.blurb,
        where: LOCATIONS[inv.location].name,
        odds: pitchOddsFor(s, p, inv),
        pitchedToday: pitchedToday(s, p),
        command,
        disabledReason: whyNot(s, command),
      };
    }),
    labels: (film ? [] : LABELS).map((l) => {
      const command: Command = { type: 'PITCH_LABEL', labelId: l.id };
      return {
        id: l.id,
        name: LABEL_FLAVOR[l.id].name,
        blurb: LABEL_FLAVOR[l.id].blurb,
        where: LOCATIONS[l.location].name,
        odds: labelOddsFor(s, p, l),
        advance: `${Math.round(l.advanceMin * 100)}–${Math.round(l.advanceMax * 100)}%`,
        royaltyCut: l.royaltyCut,
        marketing: l.marketing,
        command,
        disabledReason: whyNot(s, command),
      };
    }),
    signedLabel: p.label,
    soundtrack: {
      current: p.soundtrack,
      options: film
        ? s.catalog.map((r) => {
            const command: Command = { type: 'PLACE_SONG', recordId: r.id };
            return { id: r.id, title: r.title, quality: r.quality, bonus: soundtrackBonus(r.quality), command, disabledReason: whyNot(s, command) };
          })
        : [],
    },
    selfFundReason: (amount: number) => whyNot(s, { type: 'SELF_FUND', amount }),
    crew: {
      slots: sc.crewSlots,
      hired: hiredCrew(p).length,
      quality: crewQuality(p),
      productionValue: productionValue(p),
      candidates: p.crewPool.map((c) => {
        const command: Command = { type: 'HIRE_CREW', candidateId: c.id };
        return { id: c.id, name: c.name, role: CREW_ROLE_NAMES[c.role], skill: c.skill, fee: c.fee, quirk: c.quirk, hired: c.hired, command, disabledReason: whyNot(s, command) };
      }),
    },
    shoot: (() => {
      const command: Command = { type: 'SHOOT_DAY' };
      return {
        done: p.scores.shoot.length,
        needed: film ? filmScaleOf(p).shootDays : 0,
        scores: p.scores.shoot,
        average: average(p.scores.shoot),
        where: LOCATIONS[p.location].name,
        command,
        disabledReason: whyNot(s, command),
      };
    })(),
    post: (() => {
      const command: Command = { type: 'EDIT_SESSION' };
      return {
        done: p.scores.post.length,
        needed: film ? filmScaleOf(p).editSessions : 0,
        scores: p.scores.post,
        average: average(p.scores.post),
        hasEditor: editorSkill(p) > 0,
        command,
        disabledReason: whyNot(s, command),
      };
    })(),
    festivals: FESTIVALS.map((f) => {
      const command: Command = { type: 'SUBMIT_FESTIVAL', festivalId: f.id };
      const sub = submittedTo(p, f.id);
      return {
        id: f.id,
        name: f.name,
        tier: f.tier,
        blurb: FESTIVAL_BLURBS[f.id] ?? '',
        fee: f.fee,
        waitDays: f.waitDays,
        odds: sub ? sub.odds : festivalOddsFor(s, p, f),
        eligible: film && eligibleFestivals(p).includes(f),
        submission: sub ? { status: sub.status, resultMinute: sub.resultMinute, award: sub.award } : null,
        command,
        disabledReason: whyNot(s, command),
      };
    }),
    offers: p.offers.map((o) => {
      const command: Command = { type: 'ACCEPT_OFFER', offerId: o.id };
      return {
        id: o.id,
        distributor: o.distributor,
        blurb: DISTRIBUTORS.find((d) => d.id === o.distributorId)?.blurb ?? '',
        festival: FESTIVALS.find((f) => f.id === o.festivalId)?.name ?? '',
        amount: o.amount,
        command,
        disabledReason: whyNot(s, command),
      };
    }),
    selfRelease: (() => {
      const command: Command = { type: 'SELF_RELEASE' };
      return { command, disabledReason: whyNot(s, command), rp: Math.round(Math.round(projectQuality(p)) * C.SELF_RELEASE_RP_PER_QUALITY) };
    })(),
    record: film
      ? null
      : (() => {
          const command: Command = { type: 'RECORD_SESSION' };
          return {
            done: p.scores.record.length,
            needed: musicScaleOf(p).recordSessions,
            scores: p.scores.record,
            average: average(p.scores.record),
            studio: p.studio ?? 'The studio',
            where: LOCATIONS[p.location].name,
            command,
            disabledReason: whyNot(s, command),
          };
        })(),
    release: film
      ? null
      : (() => {
          const releaseCommand: Command = { type: 'RELEASE_RECORD' };
          const promoCommand: Command = { type: 'PROMO' };
          const days = (p.release?.days ?? []).map((d, i) => ({ day: i + 1, ...d }));
          return {
            released: p.release !== null,
            chart: CHART_NAME,
            days,
            daysTotal: C.RELEASE_DAYS,
            peak: peakPosition(p),
            totalStreams: days.reduce((sum, d) => sum + d.streams, 0),
            fans: s.player.fans,
            releaseCommand,
            releaseReason: whyNot(s, releaseCommand),
            promoCommand,
            promoReason: whyNot(s, promoCommand),
            promotedToday: promotedToday(s, p),
          };
        })(),
    abandon: { type: 'ABANDON_PROJECT' },
  };
}

// ---------- Music business (Sprint 8) ----------

export interface MusicBizView {
  fans: number;
  shows: {
    id: string;
    name: string;
    blurb: string;
    where: string;
    capacity: number;
    minFans: number;
    ticketPrice: number;
    /** Expected tickets and your take at today's Fans (before ±20% luck). */
    expectedTickets: number;
    expectedPay: number;
    command: Command;
    disabledReason: string | null;
  }[];
  playedTonight: boolean;
  beats: { id: string; title: string; quality: number; leases: number; earned: number; leaseChance: number; fee: number }[];
  beatMax: number;
  makeBeat: { command: Command; disabledReason: string | null };
  catalog: { id: string; title: string; scale: string; quality: number; peak: number | null; placements: number; label: string | null; placementChance: number }[];
}

export function musicBizView(s: GameState): MusicBizView {
  const fans = s.player.fans;
  const makeBeat: Command = { type: 'MAKE_BEAT' };
  return {
    fans,
    shows: VENUES.map((v) => {
      const command: Command = { type: 'PLAY_SHOW', venueId: v.id };
      // Nothing to expect from a room that won't book you yet.
      const expectedTickets = fans < v.minFans ? 0 : Math.min(v.capacity, Math.round(fans * C.SHOW_DRAW));
      return {
        id: v.id,
        name: VENUE_FLAVOR[v.id].name,
        blurb: VENUE_FLAVOR[v.id].blurb,
        where: LOCATIONS[v.location].name,
        capacity: v.capacity,
        minFans: v.minFans,
        ticketPrice: v.ticketPrice,
        expectedTickets,
        expectedPay: showPay(expectedTickets, v.ticketPrice),
        command,
        disabledReason: whyNot(s, command),
      };
    }),
    playedTonight: playedShowToday(s),
    beats: s.beats.map((b) => ({ ...b, leaseChance: beatLeaseChance(b.quality, fans, b.leases), fee: beatFee(b.quality) })),
    beatMax: C.BEAT_MAX,
    makeBeat: { command: makeBeat, disabledReason: whyNot(s, makeBeat) },
    catalog: s.catalog.map((r) => ({
      id: r.id,
      title: r.title,
      scale: PROJECT_SCALES[r.scale].name,
      quality: r.quality,
      peak: r.peak,
      placements: r.placements,
      label: r.label,
      placementChance: placementChance(r.quality, r.peak !== null),
    })),
  };
}
