// Read-only views for the UI: what the player can do right now, what it costs, what it pays,
// and why not. Keeps every rule in src/sim so components only render and dispatch.
import * as C from './constants';
import { ARCHETYPES } from './content/archetypes';
import { JOBS, JOB_IDS } from './content/jobs';
import { CLASSES, HEADSHOTS_LOCATION, LEISURE, LEISURE_IDS, LOCATIONS, LOCATION_IDS, REPAIR_LOCATION } from './content/locations';
import { SUBMISSION_NAME, oddsFor, submissionFee } from './board';
import { bookingPayout, commute, dailyBills, hourOf, isExposure, type CommuteQuote } from './formulas';
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
