// Read-only views for the UI: what the player can do right now, what it costs, what it pays,
// and why not. Keeps every rule in src/sim so components only render and dispatch.
import { guildName, hasHealthPlan, isMember } from './guilds';
import { CONTACTS } from './content/phoneFlavor';
import { SOON } from './content/homeFlavor';
import { unreadCount } from './inbox';
import type { ContactId, InboxThread, LedgerEntry } from './types';
import { AGENCIES, SPEC_SCALE } from './content/writers';
import { AGENCY_FLAVOR, GUILD_FLAVOR } from './content/writersFlavor';
import { GUILDS, GUILD_SKILLS } from './content/guilds';
import { FESTIVALS, FILM_SCALES } from './content/film';
import { MUSIC_SCALES } from './content/music';
import { CHART_NAME } from './content/musicFlavor';
import { LABELS, VENUES } from './content/musicBiz';
import { LABEL_FLAVOR, VENUE_FLAVOR } from './content/musicBizFlavor';
import { beatFee, beatLeaseChance, placementChance, showPay, soundtrackBonus } from './formulas';
import { playedShowToday } from './musicBiz';
import { PILOT_TIERS, STUDIO_LOT, type PilotTier } from './content/tv';
import { callbackOdds, cloutTier, cycleDay, dayOf, isPilotSeason, pickupOdds } from './formulas';
import { rightReads } from './tv';
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
  agentOddsFor,
  staffingOddsFor,
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
import { CLASSES, HEADSHOTS_LOCATION, LEISURE, LEISURE_IDS, LOCATIONS, LOCATION_IDS, REPAIR_LOCATION, leisureLocation } from './content/locations';
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
    if (leisureLocation(spot, p.home) !== p.location) continue;
    add({
      id: `leisure-${id}`,
      group: 'rest',
      title: `${spot.name} · ${C.LEISURE_HOURS}h`,
      detail: spot.flavour,
      minutes: C.LEISURE_HOURS * 60,
      costs: spot.cost ? [`−$${spot.cost}`] : [],
      rewards: [`+${spot.spark ?? C.LEISURE_SPARK} Spark`, `−${C.LEISURE_BURNOUT_RELIEF} Burnout`],
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
  /** Pilot auditions: callback instead of an instant roll; no exposure risk; pays PILOT_FEE_MULTIPLIER×. */
  pilot: { network: string; role: string; showTitle: string; label: string } | null;
}

export function opportunityView(s: GameState, opp: Opportunity): OpportunityView {
  const p = s.player;
  const payout = bookingPayout(opp.medium, opp.tier, isMember(p, opp.skill));
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
    pay: opp.pilot ? payout.pay * C.PILOT_FEE_MULTIPLIER : payout.pay,
    rp: payout.rp,
    network: payout.network,
    fee: submissionFee(p, opp),
    submissionName: SUBMISSION_NAME[opp.skill],
    exposureRisk: !opp.pilot && isExposure(p.skills[opp.skill], opp.tier),
    where: LOCATIONS[opp.location].name,
    window: `${pad(opp.windowStart)}:00–${pad(opp.windowEnd)}:00`,
    prep,
    submit: { command: submitCmd, disabledReason: whyNot(s, submitCmd) },
    pilot: opp.pilot ? { ...opp.pilot, label: PILOT_TIERS[opp.tier as PilotTier].label } : null,
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
  return (['film', 'music', 'tv'] as const).flatMap((medium) =>
    SCALE_IDS_BY_MEDIUM[medium].map((id) => {
      const sc = PROJECT_SCALES[id];
      const command: Command = { type: 'START_PROJECT', scale: id };
      let summary: string;
      if (medium === 'film') {
        const f = FILM_SCALES[id as keyof typeof FILM_SCALES];
        summary = `${f.scriptSessions} writing sessions · ${f.crewSlots} crew · ${f.shootDays} shoot days · festivals up to tier ${f.bestFestivalTier}`;
      } else if (medium === 'tv') {
        summary = `${SPEC_SCALE.writeSessions} drafts · ${SPEC_SCALE.deckSessions} deck sessions · land an agent · ${C.STAFFING_TRIES} staffing tries`;
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
  /** TV spec pilot only (null otherwise): deck, agencies, staffing season. */
  spec: {
    deck: { done: number; needed: number; scores: number[]; average: number; command: Command; disabledReason: string | null };
    agencies: { id: string; name: string; blurb: string; where: string; odds: number; heat: number; command: Command; disabledReason: string | null }[];
    pitchedToday: boolean;
    agent: Project['agent'];
    staffing: { tries: number; triesTotal: number; nextMinute: number; odds: number } | null;
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
  // LAG-82: TV spec pilots have no labels, studio or release week (this used to assume "not film" = music and crashed).
  const music = p.medium === 'music';
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
    labels: (music ? LABELS : []).map((l) => {
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
    record: !music
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
    release: !music
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
    spec:
      p.medium === 'tv'
        ? (() => {
            const deckCmd: Command = { type: 'DECK_SESSION' };
            return {
              deck: {
                done: p.scores.deck.length,
                needed: SPEC_SCALE.deckSessions,
                scores: p.scores.deck,
                average: average(p.scores.deck),
                command: deckCmd,
                disabledReason: whyNot(s, deckCmd),
              },
              agencies: AGENCIES.map((a) => {
                const command: Command = { type: 'PITCH_AGENT', agencyId: a.id };
                return {
                  id: a.id,
                  name: AGENCY_FLAVOR[a.id].name,
                  blurb: AGENCY_FLAVOR[a.id].blurb,
                  where: LOCATIONS[a.location].name,
                  odds: agentOddsFor(s, p, a),
                  heat: a.heat,
                  command,
                  disabledReason: whyNot(s, command),
                };
              }),
              pitchedToday: pitchedToday(s, p),
              agent: p.agent,
              staffing: p.staffing
                ? { tries: p.staffing.tries, triesTotal: C.STAFFING_TRIES, nextMinute: p.staffing.nextMinute, odds: staffingOddsFor(s, p) }
                : null,
            };
          })()
        : null,
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

// ---------- TV: pilot season (Sprint 9) ----------

export interface TvView {
  season: { active: boolean; dayOfCycle: number; daysLeft: number; startsInDays: number };
  callback: {
    showTitle: string;
    network: string;
    role: string;
    tier: number;
    baseOdds: number;
    /** Current beat index (0-based), or beats.length when done. */
    beatIndex: number;
    beats: { note: string; reads: readonly string[]; sensed: number | null; picked: number | null }[];
    /** Booking odds if every remaining beat goes right / wrong from here. */
    oddsIfRight: number;
    oddsIfWrong: number;
    pick: (read: number) => Command;
  } | null;
  pilots: { id: string; showTitle: string; network: string; role: string; tier: number; right: number; decisionMinute: number; pickupOdds: number }[];
  contract: {
    /** actor: shoot an episode a week. writer: one room day a week. */
    kind: 'actor' | 'writer';
    /** Writers' room standing 0–100 (70+ promoted, under 30 not asked back). */
    favor: number;
    roomAverage: number;
    showTitle: string;
    network: string;
    role: string;
    tier: number;
    weeklyPay: number;
    episode: number;
    episodesTotal: number;
    episodesMissed: number;
    shotThisWeek: boolean;
    weekEndMinute: number;
    where: string;
    command: Command;
    disabledReason: string | null;
  } | null;
  /** A writers' room politics question waiting for your answer. */
  roomEvent: { prompt: string; choices: { text: string; favor: number; quality: number; command: Command }[] } | null;
}

export function tvView(s: GameState): TvView {
  const day = dayOf(s.minute);
  const cd = cycleDay(day);
  const active = isPilotSeason(day);
  const cb = s.callback;
  const clout = cloutTier(s.player.rp);
  const work: Command = s.contract?.kind === 'writer' ? { type: 'ROOM_DAY' } : { type: 'SHOOT_EPISODE' };
  return {
    season: {
      active,
      dayOfCycle: cd,
      daysLeft: active ? C.PILOT_SEASON_LAST - cd + 1 : 0,
      startsInDays: active ? 0 : (C.PILOT_SEASON_FIRST - cd + C.PILOT_SEASON_CYCLE_DAYS) % C.PILOT_SEASON_CYCLE_DAYS,
    },
    callback: cb
      ? (() => {
          const right = rightReads(cb);
          const left = cb.beats.length - cb.picks.length;
          return {
            showTitle: cb.showTitle,
            network: cb.network,
            role: cb.role,
            tier: cb.tier,
            baseOdds: cb.baseOdds,
            beatIndex: cb.picks.length,
            beats: cb.beats.map((b, i) => ({ note: b.note, reads: b.reads, sensed: b.sensed, picked: cb.picks[i] ?? null })),
            oddsIfRight: callbackOdds(cb.baseOdds, right + left),
            oddsIfWrong: callbackOdds(cb.baseOdds, right),
            pick: (read: number): Command => ({ type: 'CALLBACK_PICK', read }),
          };
        })()
      : null,
    pilots: s.pilots.map((p) => ({ ...p, pickupOdds: pickupOdds(p.right, clout, p.tier) })),
    contract: s.contract
      ? {
          kind: s.contract.kind,
          favor: s.contract.favor,
          roomAverage: average(s.contract.roomScores),
          showTitle: s.contract.showTitle,
          network: s.contract.network,
          role: s.contract.role,
          tier: s.contract.tier,
          weeklyPay: s.contract.weeklyPay,
          episode: s.contract.episodesDone + 1,
          episodesTotal: s.contract.episodesTotal,
          episodesMissed: s.contract.episodesMissed,
          shotThisWeek: s.contract.shotThisWeek,
          weekEndMinute: s.contract.weekEndMinute,
          where: LOCATIONS[STUDIO_LOT].name,
          command: work,
          disabledReason: whyNot(s, work),
        }
      : null,
    roomEvent: s.roomEvent
      ? {
          prompt: s.roomEvent.prompt,
          choices: s.roomEvent.choices.map((c, option) => ({ ...c, command: { type: 'ROOM_CHOICE', option } as Command })),
        }
      : null,
  };
}

// ---------- Guilds & unions (Sprint 10) ----------

export interface GuildView {
  skill: Skill;
  name: string;
  short: string;
  blurb: string;
  hq: string;
  vouchers: number;
  needed: number;
  member: boolean;
  healthPlan: boolean;
  earnedThisCycle: number;
  healthThreshold: number;
  joinFee: number;
  dues: number;
  command: Command;
  disabledReason: string | null;
}

export function guildsView(s: GameState): { guilds: GuildView[]; healthPlan: boolean } {
  const p = s.player;
  return {
    healthPlan: hasHealthPlan(p),
    guilds: GUILD_SKILLS.map((skill) => {
      const g = p.guilds[skill];
      const command: Command = { type: 'JOIN_GUILD', guild: skill };
      return {
        skill,
        name: GUILD_FLAVOR[skill].name,
        short: guildName(skill),
        blurb: GUILD_FLAVOR[skill].blurb,
        hq: LOCATIONS[GUILDS[skill].hq].name,
        vouchers: g.vouchers,
        needed: C.GUILD_VOUCHERS_NEEDED,
        member: g.member,
        healthPlan: g.healthPlan,
        earnedThisCycle: g.earnedThisCycle,
        healthThreshold: C.HEALTH_PLAN_THRESHOLD,
        joinFee: C.GUILD_JOIN_FEE,
        dues: C.GUILD_DUES,
        command,
        disabledReason: whyNot(s, command),
      };
    }),
  };
}

// ---------- Phone OS (PI-3 Sprint 11) ----------

export interface BankView {
  balance: number;
  /** Set while cash is below $0: when you move home unless you get back to $0. */
  overdraft: { deadlineMinute: number; minutesLeft: number } | null;
  dailyBills: number;
  /** The next 06:00 bills. */
  nextBillsMinute: number;
  /** Money in / out over the last 7 game days. */
  week: { in: number; out: number };
  entries: LedgerEntry[];
  totalEarned: number;
}

export function bankView(s: GameState): BankView {
  const day = dayOf(s.minute);
  const billsToday = day * C.MINUTES_PER_DAY + C.BILLS_HOUR * C.MINUTES_PER_HOUR;
  const weekStart = s.minute - 7 * C.MINUTES_PER_DAY;
  const recent = s.ledger.filter((e) => e.minute >= weekStart);
  return {
    balance: s.player.cash,
    overdraft: s.overdraft ? { deadlineMinute: s.overdraft.deadlineMinute, minutesLeft: Math.max(0, s.overdraft.deadlineMinute - s.minute) } : null,
    dailyBills: dailyBills(ARCHETYPES[s.player.archetype].rentPerDay),
    nextBillsMinute: s.minute < billsToday ? billsToday : billsToday + C.MINUTES_PER_DAY,
    week: {
      in: recent.filter((e) => e.amount > 0).reduce((n, e) => n + e.amount, 0),
      out: -recent.filter((e) => e.amount < 0).reduce((n, e) => n + e.amount, 0),
    },
    entries: s.ledger,
    totalEarned: s.stats.totalEarned,
  };
}

export interface ThreadView {
  contact: ContactId;
  name: string;
  role: string;
  avatar: string;
  unread: number;
  lastMinute: number;
  preview: string;
  messages: InboxThread['messages'];
  read: Command;
}

export function inboxView(s: GameState): { threads: ThreadView[]; unread: number } {
  return {
    unread: unreadCount(s),
    threads: s.inbox.map((t) => {
      const c = CONTACTS[t.contact];
      return {
        contact: t.contact,
        name: c.name,
        role: c.role,
        avatar: c.avatar,
        unread: t.unread,
        lastMinute: t.lastMinute,
        preview: t.messages[t.messages.length - 1]?.text ?? '',
        messages: t.messages,
        read: { type: 'READ_THREAD', contact: t.contact },
      };
    }),
  };
}

// ---------- 3D home (PI-3 Sprint 12) ----------

export type HotspotId = 'bed' | 'desk' | 'ringlight' | 'tv' | 'fridge' | 'shower' | 'table' | 'door';

export interface HotspotAction {
  label: string;
  /** What it gives and costs, for chips on the action card. */
  effects: string[];
  minutes: number;
  command: Command;
  disabledReason: string | null;
}

export interface HotspotView {
  id: HotspotId;
  /** Real actions here; empty for spots whose systems arrive later (see `soon`). */
  actions: HotspotAction[];
  /** Set when the spot is a preview of a later sprint (needs arrive in Sprint 14). */
  soon: string | null;
}

/** The apartment's tap-to-act spots, each mapped to real commands. Only meaningful at home. */
export function homeView(s: GameState): { atHome: boolean; hotspots: HotspotView[] } {
  const p = s.player;
  const act = (label: string, minutes: number, effects: string[], command: Command): HotspotAction => ({
    label,
    minutes,
    effects,
    command,
    disabledReason: whyNot(s, command),
  });
  const mult = ARCHETYPES[p.archetype].sleepMultiplier;
  const sleepHours = 8;

  const desk: HotspotAction[] = [];
  const pr = s.project;
  if (pr?.stage === 'develop') {
    desk.push(act(pr.medium === 'music' ? 'Write a song' : pr.medium === 'tv' ? 'Write a draft' : 'Write the script', C.WRITE_SESSION_HOURS * 60, [`−${C.WRITE_SESSION_ENERGY} Energy`, `−${C.WRITE_SESSION_SPARK} Spark`], { type: 'WRITE_SESSION' }));
  }
  if (pr?.medium === 'tv' && pr.stage === 'deck') desk.push(act('Build the pitch deck', C.DECK_HOURS * 60, [`−${C.DECK_ENERGY} Energy`, `−${C.DECK_SPARK} Spark`], { type: 'DECK_SESSION' }));
  if (pr?.stage === 'post') desk.push(act('Edit the cut', C.EDIT_HOURS * 60, [`−${C.EDIT_ENERGY} Energy`], { type: 'EDIT_SESSION' }));
  desk.push(act('Make a beat', C.BEAT_HOURS * 60, [`−${C.BEAT_ENERGY} Energy`, `−${C.BEAT_SPARK} Spark`], { type: 'MAKE_BEAT' }));

  // Ring light: prep for the open audition you're most likely to book (prep raises odds).
  const prepable = s.board
    .filter((o) => o.status === 'open' && o.prepHours < C.PREP_MAX_HOURS)
    .map((o) => ({ o, odds: oddsFor(p, o) }))
    .sort((a, b) => b.odds - a.odds)[0];
  const ring: HotspotAction[] = prepable
    ? [act(`Prep for "${prepable.o.title}"`, 60, [`−${C.PREP_SPARK_PER_HOUR} Spark`, 'Better odds'], { type: 'PREP', opportunityId: prepable.o.id, hours: 1 })]
    : [];

  return {
    atHome: p.location === p.home,
    hotspots: [
      { id: 'bed', soon: null, actions: [act(`Sleep ${sleepHours}h`, sleepHours * 60, [`+${Math.round(C.ENERGY_SLEEP_GAIN_PER_HOUR * mult * sleepHours)} Energy`, `−${C.BURNOUT_RECOVERY_PER_HOUR * sleepHours} Burnout`], { type: 'SLEEP', hours: sleepHours })] },
      { id: 'desk', soon: null, actions: desk },
      { id: 'ringlight', soon: prepable ? null : 'No auditions to prep for on today’s board.', actions: ring },
      { id: 'tv', soon: null, actions: [act(LEISURE.tv.name, C.LEISURE_HOURS * 60, [`+${LEISURE.tv.spark ?? C.LEISURE_SPARK} Spark`, `−${C.LEISURE_BURNOUT_RELIEF} Burnout`], { type: 'LEISURE', leisureId: 'tv' })] },
      { id: 'fridge', soon: SOON.fridge, actions: [] },
      { id: 'shower', soon: SOON.shower, actions: [] },
      { id: 'table', soon: SOON.table, actions: [] },
      { id: 'door', soon: null, actions: [] },
    ],
  };
}
