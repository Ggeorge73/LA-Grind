// step(state, command) -> { state, events }. The only way the game changes.
import * as C from './constants';
import { ARCHETYPES } from './content/archetypes';
import { JOBS } from './content/jobs';
import { CLASSES, HEADSHOTS_LOCATION, LEISURE, LOCATIONS, REPAIR_LOCATION } from './content/locations';
import { NPC_HEADLINES } from './content/headlines';
import { SUBMISSION_NAME, generateBoard, oddsFor, submissionFee } from './board';
import { advance, settleOverdraft } from './clock';
import { atHour, commute, cloutTier, hourOf, minuteOfDay } from './formulas';
import { Rng, seedToState } from './rng';
import type { Activity, ArchetypeId, Command, GameEvent, GameState } from './types';
import { addHeadline, addLog, formatMoney } from './world';
import { describeEvent } from './describe';
import { FILM_SCALES } from './content/film';
import {
  abandonProject,
  acceptOffer,
  eligibleFestivals,
  festivalById,
  fundingRoom,
  hiredCrew,
  investorById,
  pendingSubmissions,
  pitchOddsFor,
  pitchedToday,
  scaleOf,
  selfFund,
  selfRelease,
  startProject,
  submitFestival,
  submittedTo,
} from './project';

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export function newGame(archetype: ArchetypeId, seed: number, carriedNetwork = 0): GameState {
  const a = ARCHETYPES[archetype];
  const start = atHour(C.START_DAY, C.START_HOUR);
  const s: GameState = {
    version: C.SAVE_VERSION,
    seed,
    rngState: seedToState(seed),
    minute: start,
    player: {
      archetype,
      home: a.home,
      location: a.home,
      cash: a.cash,
      energy: C.STAT_MAX,
      burnout: 0,
      spark: 60,
      skills: { ...a.skills },
      network: Math.min(C.STAT_MAX, a.network + carriedNetwork),
      rp: a.rp,
      guildVouchers: 0,
      carHealth: a.carHealth,
      hasHeadshots: false,
      creativeBurnout: false,
    },
    activity: null,
    board: [],
    overdraft: null,
    trades: [],
    log: [],
    stats: {
      startMinute: start,
      bestBooking: null,
      peakTier: cloutTier(a.rp),
      totalEarned: 0,
      bookings: 0,
      brokeMinute: null,
      endHeadline: null,
    },
    status: 'playing',
    nextId: 0,
    project: null,
    credits: [],
  };
  const rng = new Rng(s.rngState);
  s.board = generateBoard(s, rng);
  const events: GameEvent[] = [];
  for (let i = 0; i < C.NPC_HEADLINES_PER_DAY; i++) addHeadline(s, events, rng.pick(NPC_HEADLINES), false);
  addLog(s, `You arrive in ${LOCATIONS[a.home].name} with ${formatMoney(a.cash)} and a dream.`);
  s.rngState = rng.state;
  return s;
}

/** Why a command cannot run right now, or null if it can. Shared by the reducer and the UI. */
export function whyNot(s: GameState, cmd: Command): string | null {
  const p = s.player;
  if (cmd.type === 'NEW_RUN') return null;
  if (s.status !== 'playing') return 'You moved back home. Start a new run.';
  if (cmd.type === 'ADVANCE') return null;
  if (cmd.type === 'SKIP_TO_DONE') return s.activity ? null : 'Nothing to skip.';
  if (s.activity) return `Busy: ${s.activity.label}.`;

  const hour = hourOf(s.minute);
  const tired = p.energy < C.MIN_ENERGY_TO_START ? 'Too exhausted. Sleep first.' : null;

  switch (cmd.type) {
    case 'TRAVEL':
      return cmd.to === p.location ? "You're already here." : null;
    case 'START_JOB': {
      const job = JOBS[cmd.jobId];
      if (job.location && job.location !== p.location) return `Go to ${LOCATIONS[job.location].name} first.`;
      if (job.startWindow && (hour < job.startWindow[0] || hour > job.startWindow[1]))
        return `Shifts start ${pad(job.startWindow[0])}:00–${pad(job.startWindow[1])}:00.`;
      if (job.id === 'rideshare') {
        if (p.carHealth <= 0) return 'Your car is dead. No rideshare until it is repaired.';
        const h = cmd.hours ?? 0;
        if (!Number.isInteger(h) || h < job.minHours || h > job.maxHours) return `Choose ${job.minHours}–${job.maxHours} hours.`;
      }
      return tired;
    }
    case 'SLEEP':
      if (p.location !== p.home) return 'You can only sleep at home.';
      if (!Number.isInteger(cmd.hours) || cmd.hours < C.SLEEP_MIN_HOURS || cmd.hours > C.SLEEP_MAX_HOURS)
        return `Sleep ${C.SLEEP_MIN_HOURS}–${C.SLEEP_MAX_HOURS} hours.`;
      return null;
    case 'LEISURE': {
      const spot = LEISURE[cmd.leisureId];
      if (spot.location !== p.location) return `Go to ${LOCATIONS[spot.location].name} first.`;
      if (p.cash < spot.cost) return `Needs $${spot.cost}.`;
      return null;
    }
    case 'TAKE_CLASS': {
      const info = CLASSES[cmd.skill];
      if (info.location !== p.location) return `Classes are in ${LOCATIONS[info.location].name}.`;
      if (p.cash < C.CLASS_COST) return `Needs $${C.CLASS_COST}.`;
      return tired;
    }
    case 'BUY_HEADSHOTS':
      if (p.hasHeadshots) return 'You already have headshots.';
      if (p.location !== HEADSHOTS_LOCATION) return `The photographer is in ${LOCATIONS[HEADSHOTS_LOCATION].name}.`;
      if (p.cash < C.HEADSHOTS_COST) return `Needs $${C.HEADSHOTS_COST}.`;
      return tired;
    case 'REPAIR_CAR':
      if (p.carHealth >= C.STAT_MAX) return 'Your car is as good as it gets.';
      if (p.location !== REPAIR_LOCATION) return `The mechanic is in ${LOCATIONS[REPAIR_LOCATION].name}.`;
      if (p.cash < C.CAR_REPAIR_COST) return `Needs $${C.CAR_REPAIR_COST}.`;
      return null;
    case 'PREP': {
      const opp = s.board.find((o) => o.id === cmd.opportunityId);
      if (!opp || opp.status !== 'open') return 'That opportunity is gone.';
      if (!Number.isInteger(cmd.hours) || cmd.hours < 1) return 'Prep at least 1 hour.';
      if (opp.prepHours + cmd.hours > C.PREP_MAX_HOURS) return `Max ${C.PREP_MAX_HOURS} hours of prep.`;
      if (p.spark < C.PREP_SPARK_PER_HOUR * cmd.hours) return 'Not enough Creative Spark. Go recharge.';
      return tired;
    }
    case 'START_PROJECT': {
      if (s.project) return 'Finish or abandon your current project first.';
      const sc = FILM_SCALES[cmd.scale];
      if (!sc) return 'Unknown project.';
      if (cloutTier(p.rp) < sc.minTier) return `${sc.name}s need Clout Tier ${sc.minTier}.`;
      return null;
    }
    case 'ABANDON_PROJECT':
      return s.project ? null : 'No project to abandon.';
    case 'WRITE_SESSION': {
      const pr = s.project;
      if (!pr || pr.stage !== 'develop') return 'No script to write right now.';
      if (p.spark < C.WRITE_SESSION_SPARK) return 'Not enough Creative Spark. Go recharge.';
      return tired;
    }
    case 'PITCH': {
      const pr = s.project;
      if (!pr || pr.stage !== 'finance') return 'Nothing to pitch right now.';
      const inv = investorById(cmd.investorId);
      if (!inv) return 'Unknown investor.';
      if (pitchedToday(s, pr)) return 'One pitch a day. Investors talk to each other.';
      if (p.location !== inv.location) return `${inv.name} takes meetings in ${LOCATIONS[inv.location].name}.`;
      return tired;
    }
    case 'SELF_FUND': {
      const pr = s.project;
      if (!pr || (pr.stage !== 'finance' && pr.stage !== 'crew')) return 'Nothing to fund right now.';
      if (!Number.isInteger(cmd.amount) || cmd.amount <= 0) return 'Enter an amount.';
      if (cmd.amount > p.cash) return "You don't have that much cash.";
      if (cmd.amount > fundingRoom(pr)) return `The budget only needs ${formatMoney(fundingRoom(pr))} more.`;
      return null;
    }
    case 'HIRE_CREW': {
      const pr = s.project;
      if (!pr || pr.stage !== 'crew') return 'Not hiring right now.';
      const c = pr.crewPool.find((x) => x.id === cmd.candidateId);
      if (!c) return 'That candidate is gone.';
      if (c.hired) return 'Already hired.';
      if (hiredCrew(pr).length >= scaleOf(pr).crewSlots) return 'Crew is full.';
      if (c.fee > pr.raised - pr.spent) return `Not enough budget left (${formatMoney(pr.raised - pr.spent)}). Self-fund to top up.`;
      return tired;
    }
    case 'SHOOT_DAY': {
      const pr = s.project;
      if (!pr || pr.stage !== 'shoot') return 'Nothing to shoot right now.';
      if (p.location !== pr.location) return `The set is in ${LOCATIONS[pr.location].name}.`;
      const [from, to] = C.SHOOT_CALL_WINDOW;
      if (hour < from || hour > to) return `Call time is ${pad(from)}:00–${pad(to)}:00.`;
      return tired;
    }
    case 'EDIT_SESSION': {
      const pr = s.project;
      if (!pr || pr.stage !== 'post') return 'Nothing to edit right now.';
      return tired;
    }
    case 'SUBMIT_FESTIVAL': {
      const pr = s.project;
      if (!pr || pr.stage !== 'festival') return 'Finish the film first.';
      const f = festivalById(cmd.festivalId);
      if (!f) return 'Unknown festival.';
      if (!eligibleFestivals(pr).includes(f)) return `A ${scaleOf(pr).name.toLowerCase()} can't get into ${f.name}.`;
      if (submittedTo(pr, f.id)) return 'Already submitted.';
      if (p.cash < f.fee) return `Needs $${f.fee}.`;
      return null;
    }
    case 'ACCEPT_OFFER': {
      const pr = s.project;
      if (!pr || pr.stage !== 'festival') return 'No offers right now.';
      return pr.offers.some((o) => o.id === cmd.offerId) ? null : 'That offer is gone.';
    }
    case 'SELF_RELEASE': {
      const pr = s.project;
      if (!pr || pr.stage !== 'festival') return 'Finish the film first.';
      if (pendingSubmissions(pr).length > 0) return 'Wait for your festival results first.';
      return null;
    }
    case 'SUBMIT': {
      const opp = s.board.find((o) => o.id === cmd.opportunityId);
      if (!opp || opp.status !== 'open') return 'That opportunity is gone.';
      if (opp.location !== p.location) return `Go to ${LOCATIONS[opp.location].name} first.`;
      const end = minuteOfDay(s.minute) + C.SUBMIT_HOURS * C.MINUTES_PER_HOUR;
      if (hour < opp.windowStart || end > opp.windowEnd * C.MINUTES_PER_HOUR)
        return `Window is ${pad(opp.windowStart)}:00–${pad(opp.windowEnd)}:00.`;
      if (opp.tier >= C.HEADSHOTS_MIN_TIER && !p.hasHeadshots) return 'Tier 2+ needs headshots and press photos.';
      const fee = submissionFee(p, opp);
      if (p.cash < fee) return `Needs $${fee}.`;
      return tired;
    }
  }
}

export function step(state: GameState, cmd: Command): StepResult {
  if (cmd.type === 'NEW_RUN') {
    const carried = state.status === 'movedHome' ? Math.floor(state.player.network * C.NEW_RUN_NETWORK_KEEP) : 0;
    return { state: newGame(cmd.archetype, cmd.seed, carried), events: [] };
  }

  const reason = whyNot(state, cmd);
  if (reason) return { state, events: [{ type: 'ACTION_REJECTED', reason }] };

  const s = structuredClone(state);
  const rng = new Rng(s.rngState);
  const events: GameEvent[] = [];

  switch (cmd.type) {
    case 'ADVANCE':
      advance(s, Math.max(0, Math.floor(cmd.minutes)), rng, events);
      break;
    case 'SKIP_TO_DONE':
      advance(s, s.activity!.endMinute - s.minute, rng, events);
      break;
    case 'START_PROJECT':
      startProject(s, rng, cmd.scale, events);
      break;
    case 'ABANDON_PROJECT':
      abandonProject(s, events);
      break;
    case 'SELF_FUND':
      selfFund(s, rng, cmd.amount, events);
      break;
    case 'SUBMIT_FESTIVAL':
      submitFestival(s, festivalById(cmd.festivalId)!, events);
      break;
    case 'ACCEPT_OFFER':
      acceptOffer(s, rng, cmd.offerId, events);
      settleOverdraft(s, events);
      break;
    case 'SELF_RELEASE':
      selfRelease(s, rng, events);
      break;
    default: {
      const activity = begin(s, cmd);
      s.activity = activity;
      events.push({ type: 'ACTION_STARTED', activity });
    }
  }

  for (const e of events) {
    const text = describeEvent(e);
    if (text) addLog(s, text);
  }
  s.rngState = rng.state;
  return { state: s, events };
}

/** Pay the up-front costs and build the activity. Only called after whyNot() passed. */
function begin(
  s: GameState,
  cmd: Exclude<
    Command,
    { type: 'ADVANCE' | 'SKIP_TO_DONE' | 'NEW_RUN' | 'START_PROJECT' | 'ABANDON_PROJECT' | 'SELF_FUND' | 'SUBMIT_FESTIVAL' | 'ACCEPT_OFFER' | 'SELF_RELEASE' }
  >,
): Activity {
  const p = s.player;
  const make = (kind: Activity['kind'], label: string, minutes: number, extra: Partial<Activity> = {}): Activity => ({
    kind,
    label,
    startMinute: s.minute,
    endMinute: s.minute + minutes,
    energyPerMinute: 0,
    sparkPerMinute: 0,
    carPerMinute: 0,
    ...extra,
  });
  const H = C.MINUTES_PER_HOUR;

  switch (cmd.type) {
    case 'TRAVEL': {
      const q = commute(p.location, cmd.to, hourOf(s.minute), p.carHealth);
      p.cash -= q.gas;
      p.carHealth = Math.max(0, p.carHealth - q.carWear);
      const how = q.byBus ? 'Bus' : 'Drive';
      return make('travel', `${how} to ${LOCATIONS[cmd.to].name}`, q.minutes, {
        to: cmd.to,
        energyPerMinute: q.energy / q.minutes,
      });
    }
    case 'START_JOB': {
      const job = JOBS[cmd.jobId];
      const hours = job.hours ?? cmd.hours ?? job.minHours;
      const energy = job.hours === null ? job.energyPerHour * hours : job.energy;
      return make('job', `${job.name} shift`, hours * H, {
        jobId: job.id,
        hours,
        energyPerMinute: energy / (hours * H),
        carPerMinute: -job.carPerHour / H,
      });
    }
    case 'SLEEP':
      return make('sleep', 'Sleeping', cmd.hours * H, { hours: cmd.hours });
    case 'LEISURE': {
      const spot = LEISURE[cmd.leisureId];
      p.cash -= spot.cost;
      return make('leisure', spot.name, C.LEISURE_HOURS * H, { leisureId: spot.id });
    }
    case 'TAKE_CLASS':
      p.cash -= C.CLASS_COST;
      return make('class', CLASSES[cmd.skill].name, C.CLASS_HOURS * H, {
        skill: cmd.skill,
        energyPerMinute: C.CLASS_ENERGY / (C.CLASS_HOURS * H),
      });
    case 'BUY_HEADSHOTS':
      p.cash -= C.HEADSHOTS_COST;
      return make('headshots', 'Headshots and press photos', C.HEADSHOTS_HOURS * H);
    case 'REPAIR_CAR':
      p.cash -= C.CAR_REPAIR_COST;
      return make('repair', 'Car in the shop', C.CAR_REPAIR_HOURS * H);
    case 'PREP': {
      const opp = s.board.find((o) => o.id === cmd.opportunityId)!;
      return make('prep', `Prepping: ${opp.title}`, cmd.hours * H, {
        opportunityId: opp.id,
        hours: cmd.hours,
        energyPerMinute: C.PREP_ENERGY_PER_HOUR / H,
        sparkPerMinute: -C.PREP_SPARK_PER_HOUR / H,
      });
    }
    case 'WRITE_SESSION':
      return make('project', `Writing: ${s.project!.title}`, C.WRITE_SESSION_HOURS * H, {
        projectAction: 'write',
        energyPerMinute: C.WRITE_SESSION_ENERGY / (C.WRITE_SESSION_HOURS * H),
        sparkPerMinute: -C.WRITE_SESSION_SPARK / (C.WRITE_SESSION_HOURS * H),
      });
    case 'PITCH': {
      const inv = investorById(cmd.investorId)!;
      return make('project', `Pitching ${inv.name}`, C.PITCH_HOURS * H, {
        projectAction: 'pitch',
        investorId: inv.id,
        energyPerMinute: C.PITCH_ENERGY / (C.PITCH_HOURS * H),
        odds: pitchOddsFor(s, s.project!, inv),
      });
    }
    case 'HIRE_CREW': {
      const c = s.project!.crewPool.find((x) => x.id === cmd.candidateId)!;
      return make('project', `Meeting ${c.name}`, C.HIRE_HOURS * H, {
        projectAction: 'hire',
        candidateId: c.id,
        energyPerMinute: C.HIRE_ENERGY / (C.HIRE_HOURS * H),
      });
    }
    case 'SHOOT_DAY':
      return make('project', `Shooting: ${s.project!.title}`, C.SHOOT_HOURS * H, {
        projectAction: 'shoot',
        energyPerMinute: C.SHOOT_ENERGY / (C.SHOOT_HOURS * H),
      });
    case 'EDIT_SESSION':
      return make('project', `Editing: ${s.project!.title}`, C.EDIT_HOURS * H, {
        projectAction: 'edit',
        energyPerMinute: C.EDIT_ENERGY / (C.EDIT_HOURS * H),
      });
    case 'SUBMIT': {
      const opp = s.board.find((o) => o.id === cmd.opportunityId)!;
      p.cash -= submissionFee(p, opp);
      return make('submit', `Sending ${SUBMISSION_NAME[opp.skill]}: ${opp.title}`, C.SUBMIT_HOURS * H, {
        opportunityId: opp.id,
        energyPerMinute: C.SUBMIT_ENERGY / (C.SUBMIT_HOURS * H),
        odds: oddsFor(p, opp),
      });
    }
  }
}

const pad = (n: number): string => String(n).padStart(2, '0');
