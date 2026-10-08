// The clock advances the world one game minute at a time: stat drift, finishing
// the current activity, the 06:00 bills and board refresh, and the overdraft rule.
import * as C from './constants';
import { ARCHETYPES } from './content/archetypes';
import { JOBS } from './content/jobs';
import { LEISURE } from './content/locations';
import { NPC_HEADLINES } from './content/headlines';
import { generateBoard } from './board';
import {
  bookingPayout,
  burnoutGainPerMinute,
  clampStat,
  cloutTier,
  dailyBills,
  dayOf,
  exposureRpLoss,
  isExposure,
  minuteOfDay,
  nextCreativeBurnout,
} from './formulas';
import type { Rng } from './rng';
import type { Activity, GameEvent, GameState } from './types';
import { addHeadline, changeNetwork, changeRp, earn, ownHeadline } from './world';
import { completeProjectAction, resolveFestivals, resolveRelease } from './project';
import { completeBeat, completeShow, resolveBeatLeases, resolvePlacements } from './musicBiz';
import { announcePilotSeason, completeEpisode, resolveCallback, resolveContractWeek, resolvePilots, startCallback } from './tv';

/** Advance `minutes` game minutes (stops early if the run ends). */
export function advance(s: GameState, minutes: number, rng: Rng, events: GameEvent[]): void {
  for (let i = 0; i < minutes && s.status === 'playing'; i++) tick(s, rng, events);
}

function tick(s: GameState, rng: Rng, events: GameEvent[]): void {
  const p = s.player;
  const a = s.activity;
  const sleeping = a?.kind === 'sleep';
  const resting = sleeping || a?.kind === 'leisure';

  // Burnout is judged on the Energy the player had during this minute.
  if (a && !resting) p.burnout += burnoutGainPerMinute(p.energy);
  if (resting) p.burnout -= C.BURNOUT_RECOVERY_PER_HOUR / C.MINUTES_PER_HOUR;

  if (sleeping) {
    p.energy += (C.ENERGY_SLEEP_GAIN_PER_HOUR * ARCHETYPES[p.archetype].sleepMultiplier) / C.MINUTES_PER_HOUR;
  } else {
    p.energy -= C.ENERGY_AWAKE_DRAIN_PER_HOUR / C.MINUTES_PER_HOUR + (a?.energyPerMinute ?? 0);
  }
  if (a) {
    p.spark += a.sparkPerMinute;
    p.carHealth += a.carPerMinute;
  }
  p.energy = clampStat(p.energy);
  p.burnout = clampStat(p.burnout);
  p.spark = clampStat(p.spark);
  p.carHealth = clampStat(p.carHealth);

  s.minute += 1;

  const wasBurnt = p.creativeBurnout;
  p.creativeBurnout = nextCreativeBurnout(wasBurnt, p.burnout);
  if (!wasBurnt && p.creativeBurnout) {
    events.push({ type: 'CREATIVE_BURNOUT_STARTED' });
    ownHeadline(s, rng, events, 'creativeBurnout');
  } else if (wasBurnt && !p.creativeBurnout) {
    events.push({ type: 'CREATIVE_BURNOUT_CLEARED' });
  }

  if (a && s.minute >= a.endMinute) {
    s.activity = null;
    complete(s, a, rng, events);
  }

  if (minuteOfDay(s.minute) === C.BILLS_HOUR * C.MINUTES_PER_HOUR) newDay(s, rng, events);

  checkOverdraft(s, rng, events);
}

function newDay(s: GameState, rng: Rng, events: GameEvent[]): void {
  const bills = dailyBills(ARCHETYPES[s.player.archetype].rentPerDay);
  s.player.cash -= bills;
  events.push({ type: 'BILLS_CHARGED', amount: bills });

  s.board = generateBoard(s, rng);
  events.push({ type: 'BOARD_REFRESHED', count: s.board.length });

  for (let i = 0; i < C.NPC_HEADLINES_PER_DAY; i++) addHeadline(s, events, rng.pick(NPC_HEADLINES), false);

  resolveFestivals(s, rng, events);
  resolveRelease(s, rng, events);
  resolveBeatLeases(s, rng, events);
  resolvePlacements(s, rng, events);

  // TV: an unfinished callback resolves with the reads you made; networks decide; series weeks pay.
  if (s.callback) resolveCallback(s, rng, events);
  resolvePilots(s, rng, events);
  resolveContractWeek(s, rng, events);
  announcePilotSeason(s, rng, events, dayOf(s.minute));
}

/** Instant commands that pay out (e.g. accepting a distribution offer) settle an overdraft right away. */
export function settleOverdraft(s: GameState, events: GameEvent[]): void {
  if (s.overdraft && s.player.cash >= 0) {
    s.overdraft = null;
    events.push({ type: 'OVERDRAFT_CLEARED' });
  }
}

function checkOverdraft(s: GameState, rng: Rng, events: GameEvent[]): void {
  const p = s.player;
  if (p.cash < 0 && !s.overdraft) {
    s.overdraft = { startedMinute: s.minute, deadlineMinute: s.minute + C.OVERDRAFT_DAYS * C.MINUTES_PER_DAY };
    s.stats.brokeMinute ??= s.minute;
    events.push({ type: 'OVERDRAFT_STARTED', deadlineMinute: s.overdraft.deadlineMinute });
    ownHeadline(s, rng, events, 'overdraft');
  } else if (p.cash >= 0 && s.overdraft) {
    s.overdraft = null;
    events.push({ type: 'OVERDRAFT_CLEARED' });
  } else if (s.overdraft && s.minute >= s.overdraft.deadlineMinute) {
    s.status = 'movedHome';
    s.activity = null;
    s.stats.endHeadline = ownHeadline(s, rng, events, 'movedHome');
    events.push({ type: 'MOVED_BACK_HOME' });
  }
}

function complete(s: GameState, a: Activity, rng: Rng, events: GameEvent[]): void {
  const p = s.player;
  switch (a.kind) {
    case 'travel':
      if (a.to) p.location = a.to;
      events.push({ type: 'ARRIVED', location: p.location });
      return;
    case 'job': {
      const job = JOBS[a.jobId!];
      const amount = job.hours === null ? (job.payPerHour - job.gasPerHour) * (a.hours ?? 0) : job.pay;
      earn(s, amount);
      events.push({ type: 'JOB_PAID', jobId: job.id, amount });
      if (job.networkChance > 0 && rng.chance(job.networkChance)) changeNetwork(s, events, job.networkGain);
      if (job.rpGain > 0) changeRp(s, rng, events, job.rpGain);
      return;
    }
    case 'sleep':
      events.push({ type: 'WOKE_UP' });
      return;
    case 'leisure':
      p.spark = clampStat(p.spark + C.LEISURE_SPARK);
      events.push({ type: 'LEISURE_DONE', leisureId: a.leisureId ?? LEISURE.beach.id });
      return;
    case 'class':
      p.skills[a.skill!] = clampStat(p.skills[a.skill!] + C.CLASS_SKILL_GAIN);
      events.push({ type: 'SKILL_GAINED', skill: a.skill!, amount: C.CLASS_SKILL_GAIN });
      return;
    case 'headshots':
      p.hasHeadshots = true;
      events.push({ type: 'HEADSHOTS_TAKEN' });
      return;
    case 'repair':
      p.carHealth = clampStat(p.carHealth + C.CAR_REPAIR_GAIN);
      events.push({ type: 'CAR_REPAIRED' });
      return;
    case 'prep': {
      const opp = s.board.find((o) => o.id === a.opportunityId);
      if (opp) opp.prepHours = Math.min(C.PREP_MAX_HOURS, opp.prepHours + (a.hours ?? 0));
      events.push({ type: 'PREP_DONE', opportunityId: a.opportunityId!, hours: a.hours ?? 0 });
      return;
    }
    case 'submit':
      resolveSubmission(s, a, rng, events);
      return;
    case 'project':
      completeProjectAction(s, a, rng, events);
      return;
    case 'show':
      completeShow(s, a, rng, events);
      return;
    case 'beat':
      completeBeat(s, a, rng, events);
      return;
    case 'episode':
      completeEpisode(s, rng, events);
      return;
  }
}

function resolveSubmission(s: GameState, a: Activity, rng: Rng, events: GameEvent[]): void {
  const p = s.player;
  const opp = s.board.find((o) => o.id === a.opportunityId);
  if (!opp) return;
  if (opp.pilot) {
    startCallback(s, a, opp, rng, events);
    return;
  }
  const odds = a.odds ?? 0;

  if (rng.chance(odds)) {
    const union = p.guildVouchers >= C.GUILD_VOUCHERS_NEEDED;
    const { pay, rp, network } = bookingPayout(opp.medium, opp.tier, union);
    opp.status = 'booked';
    earn(s, pay);
    p.skills[opp.skill] = clampStat(p.skills[opp.skill] + C.BOOKED_SKILL_GAIN);
    s.stats.bookings += 1;
    if (!s.stats.bestBooking || pay > s.stats.bestBooking.pay) s.stats.bestBooking = { title: opp.title, pay };
    events.push({ type: 'BOOKED', opportunity: { ...opp }, pay, rp, odds });
    ownHeadline(s, rng, events, 'booked', { title: opp.title, tier: opp.tier, pay, medium: opp.medium });
    changeRp(s, rng, events, rp);
    changeNetwork(s, events, network);
    events.push({ type: 'SKILL_GAINED', skill: opp.skill, amount: C.BOOKED_SKILL_GAIN });
    if (opp.tier >= C.GUILD_VOUCHER_MIN_TIER && p.guildVouchers < C.GUILD_VOUCHERS_NEEDED) {
      p.guildVouchers += 1;
      events.push({ type: 'GUILD_VOUCHER', total: p.guildVouchers });
    }
    return;
  }

  if (isExposure(p.skills[opp.skill], opp.tier)) {
    const rpLost = Math.min(p.rp, exposureRpLoss(opp.tier, ARCHETYPES[p.archetype].exposedRpMultiplier));
    opp.status = 'exposed';
    events.push({ type: 'EXPOSED', opportunity: { ...opp }, rpLost, odds });
    ownHeadline(s, rng, events, 'exposed', { title: opp.title, tier: opp.tier, medium: opp.medium });
    changeRp(s, rng, events, -rpLost);
    return;
  }

  opp.status = 'rejected';
  events.push({ type: 'REJECTED', opportunity: { ...opp }, odds });
  ownHeadline(s, rng, events, 'rejected', { title: opp.title, tier: opp.tier, medium: opp.medium });
}

export const currentDay = (s: GameState): number => dayOf(s.minute);
export const currentTier = (s: GameState): number => cloutTier(s.player.rp);
