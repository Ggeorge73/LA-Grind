// The career project engine. A project is a pipeline of stages; each stage is one of four
// reusable kinds (work / raise / hire / circuit). Film is the first pipeline on top of it.
import * as C from './constants';
import { CREW_ROLE_IDS, FESTIVALS, FILM_LOCATIONS, FILM_PIPELINE, FILM_SCALES, type Festival } from './content/film';
import {
  CREW_FIRST_NAMES,
  CREW_LAST_NAMES,
  CREW_QUIRKS,
  DISTRIBUTORS,
  FESTIVAL_AWARDS,
  FILM_HEADLINES,
  FILM_TITLE_FIRST,
  FILM_TITLE_SECOND,
  INVESTORS,
  type FilmHeadlineKind,
  type Investor,
} from './content/filmFlavor';
import {
  atHour,
  average,
  awardChance,
  clampStat,
  cloutTier,
  crewFee,
  crewPoolSize,
  dayOf,
  editScore,
  festivalOdds,
  offerAmount,
  offerChance,
  pitchOdds,
  shootScore,
  writeScore,
} from './formulas';
import type { Rng } from './rng';
import type { Activity, CrewCandidate, GameEvent, GameState, Project, ProjectStage } from './types';
import { addHeadline, changeNetwork, changeRp, earn, fillTemplate, formatMoney, newId, who } from './world';

export const scaleOf = (p: Project) => FILM_SCALES[p.scale];
export const stageInfo = (stage: ProjectStage) => FILM_PIPELINE.find((x) => x.id === stage)!;
export const investorById = (id: string): Investor | undefined => INVESTORS.find((i) => i.id === id);
export const festivalById = (id: string): Festival | undefined => FESTIVALS.find((f) => f.id === id);

export const scriptQuality = (p: Project): number => average(p.scores.develop);
export const remainingBudget = (p: Project): number => p.raised - p.spent;
export const hiredCrew = (p: Project): CrewCandidate[] => p.crewPool.filter((c) => c.hired);
/** Skill of the best hired Editor, or 0 without one. */
export const editorSkill = (p: Project): number => Math.max(0, ...hiredCrew(p).filter((c) => c.role === 'editor').map((c) => c.skill));
export const crewQuality = (p: Project): number => average(hiredCrew(p).map((c) => c.skill)) * C.CREW_QUALITY_PER_SKILL;
export const productionValue = (p: Project): number =>
  Math.max(0, Math.min(C.PRODUCTION_VALUE_MAX, (C.PRODUCTION_VALUE_MAX * remainingBudget(p)) / p.budget));

/** Film quality from what is done so far (unfinished stages count as 0). */
export function projectQuality(p: Project): number {
  const q =
    C.FILM_WEIGHT_SCRIPT * scriptQuality(p) +
    C.FILM_WEIGHT_SHOOT * average(p.scores.shoot) +
    C.FILM_WEIGHT_POST * average(p.scores.post) +
    C.FILM_WEIGHT_CREW * crewQuality(p) +
    productionValue(p);
  return clampStat(q);
}

export function pitchOddsFor(s: GameState, p: Project, investor: Investor): number {
  return pitchOdds({
    script: scriptQuality(p),
    clout: cloutTier(s.player.rp),
    network: s.player.network,
    difficulty: scaleOf(p).pitchDifficulty + investor.difficultyMod,
  });
}

export const pitchedToday = (s: GameState, p: Project): boolean => p.pitches.some((x) => x.day === dayOf(s.minute));

export function filmHeadline(
  s: GameState,
  rng: Rng,
  events: GameEvent[],
  kind: FilmHeadlineKind,
  vars: { investor?: string; amount?: number; festival?: string; distributor?: string; award?: string } = {},
): void {
  const p = s.project;
  const text = fillTemplate(rng.pick(FILM_HEADLINES[kind]), {
    who: who(s),
    title: p?.title ?? '',
    investor: vars.investor ?? '',
    amount: formatMoney(vars.amount ?? 0),
    festival: vars.festival ?? '',
    distributor: vars.distributor ?? '',
    award: vars.award ?? '',
    scale: p ? scaleOf(p).name.toLowerCase() : '',
  });
  addHeadline(s, events, text, true);
}

export function startProject(s: GameState, rng: Rng, scale: Project['scale'], events: GameEvent[]): void {
  const sc = FILM_SCALES[scale];
  const project: Project = {
    id: newId(s, 'p'),
    medium: 'film',
    scale,
    title: `${rng.pick(FILM_TITLE_FIRST)} ${rng.pick(FILM_TITLE_SECOND)}`,
    location: rng.pick(FILM_LOCATIONS),
    stage: 'develop',
    startedMinute: s.minute,
    scores: { develop: [], shoot: [], post: [] },
    budget: sc.budget,
    raised: 0,
    selfFunded: 0,
    spent: 0,
    pitches: [],
    crewPool: [],
    submissions: [],
    offers: [],
  };
  s.project = project;
  events.push({ type: 'PROJECT_STARTED', project: structuredClone(project) });
  filmHeadline(s, rng, events, 'projectStarted');
}

export function abandonProject(s: GameState, events: GameEvent[]): void {
  const title = s.project!.title;
  finishProject(s, 'Abandoned');
  events.push({ type: 'PROJECT_ABANDONED', title });
}

function generateCrewPool(s: GameState, rng: Rng, p: Project): CrewCandidate[] {
  const sc = scaleOf(p);
  const size = crewPoolSize(s.player.network, sc.crewSlots);
  const bonus = s.player.network / 50;
  return Array.from({ length: size }, (_, i) => {
    const skill = Math.max(1, Math.min(5, 1 + Math.floor(rng.float() * 4 + bonus)));
    return {
      id: newId(s, 'c'),
      name: `${rng.pick(CREW_FIRST_NAMES)} ${rng.pick(CREW_LAST_NAMES)}`,
      role: CREW_ROLE_IDS[i % CREW_ROLE_IDS.length]!,
      skill,
      fee: crewFee(p.budget, skill),
      quirk: rng.pick(CREW_QUIRKS),
      hired: false,
    };
  });
}

function setStage(s: GameState, rng: Rng, events: GameEvent[], stage: ProjectStage): void {
  const p = s.project!;
  p.stage = stage;
  events.push({ type: 'PROJECT_STAGE', stage });
  if (stage === 'crew') {
    p.crewPool = generateCrewPool(s, rng, p);
    filmHeadline(s, rng, events, 'greenlit', { amount: p.raised });
  }
  if (stage === 'shoot') filmHeadline(s, rng, events, 'crewComplete');
  if (stage === 'post') filmHeadline(s, rng, events, 'shootWrapped');
}

/** Move to the next stage when the current one's goal is met. */
export function advanceIfReady(s: GameState, rng: Rng, events: GameEvent[]): void {
  const p = s.project;
  if (!p) return;
  const sc = scaleOf(p);
  if (p.stage === 'develop' && p.scores.develop.length >= sc.scriptSessions) setStage(s, rng, events, 'finance');
  if (p.stage === 'finance' && p.raised >= p.budget) setStage(s, rng, events, 'crew');
  if (p.stage === 'crew' && hiredCrew(p).length >= sc.crewSlots) setStage(s, rng, events, 'shoot');
  if (p.stage === 'shoot' && p.scores.shoot.length >= sc.shootDays) setStage(s, rng, events, 'post');
  if (p.stage === 'post' && p.scores.post.length >= sc.editSessions) setStage(s, rng, events, 'festival');
}

export function selfFund(s: GameState, rng: Rng, amount: number, events: GameEvent[]): void {
  const p = s.project!;
  s.player.cash -= amount;
  p.raised += amount;
  p.selfFunded += amount;
  events.push({ type: 'SELF_FUNDED', amount });
  advanceIfReady(s, rng, events);
}

/** How much more the project can take in the current stage (finance: up to budget). */
export const fundingRoom = (p: Project): number => (p.stage === 'finance' ? Math.max(0, p.budget - p.raised) : Number.POSITIVE_INFINITY);

/** Resolve a finished project activity (write / pitch / hire). */
export function completeProjectAction(s: GameState, a: Activity, rng: Rng, events: GameEvent[]): void {
  const p = s.project;
  if (!p) return;
  const pl = s.player;
  switch (a.projectAction) {
    case 'write': {
      const score = Math.round(writeScore(pl.skills.writing, pl.spark, rng.float()));
      p.scores.develop.push(score);
      pl.skills.writing = clampStat(pl.skills.writing + C.PROJECT_SKILL_GAIN);
      events.push({ type: 'SESSION_SCORED', stage: 'develop', score });
      events.push({ type: 'SKILL_GAINED', skill: 'writing', amount: C.PROJECT_SKILL_GAIN });
      break;
    }
    case 'pitch': {
      const inv = investorById(a.investorId!)!;
      const odds = a.odds ?? 0;
      const yes = rng.chance(odds);
      const share = inv.shareMin + rng.float() * (inv.shareMax - inv.shareMin);
      const amount = yes ? Math.min(fundingRoom(p), Math.round(p.budget * share)) : 0;
      p.pitches.push({ investorId: inv.id, day: dayOf(a.startMinute), yes, amount });
      if (yes) p.raised += amount;
      events.push({ type: 'PITCHED', investorId: inv.id, yes, amount, odds });
      filmHeadline(s, rng, events, yes ? 'pitchYes' : 'pitchNo', { investor: inv.name, amount });
      break;
    }
    case 'hire': {
      const c = p.crewPool.find((x) => x.id === a.candidateId);
      if (c && !c.hired) {
        c.hired = true;
        p.spent += c.fee;
        events.push({ type: 'CREW_HIRED', candidate: { ...c } });
      }
      break;
    }
    case 'shoot': {
      const score = Math.round(
        shootScore({ directing: pl.skills.directing, acting: pl.skills.acting, crew: crewQuality(p) }, rng.float()),
      );
      p.scores.shoot.push(score);
      pl.skills.directing = clampStat(pl.skills.directing + C.PROJECT_SKILL_GAIN);
      events.push({ type: 'SESSION_SCORED', stage: 'shoot', score });
      events.push({ type: 'SKILL_GAINED', skill: 'directing', amount: C.PROJECT_SKILL_GAIN });
      break;
    }
    case 'edit': {
      const score = Math.round(editScore(pl.skills.directing, editorSkill(p), rng.float()));
      p.scores.post.push(score);
      events.push({ type: 'SESSION_SCORED', stage: 'post', score });
      break;
    }
    default:
      break;
  }
  advanceIfReady(s, rng, events);
}

// ---------- Festival circuit ----------

export const festivalOddsFor = (s: GameState, p: Project, f: Festival): number =>
  festivalOdds(projectQuality(p), cloutTier(s.player.rp), f.tier);

/** Festivals this film may enter (up to the scale's best tier). */
export const eligibleFestivals = (p: Project): Festival[] => FESTIVALS.filter((f) => f.tier <= scaleOf(p).bestFestivalTier);

export const submittedTo = (p: Project, festivalId: string) => p.submissions.find((x) => x.festivalId === festivalId);
export const pendingSubmissions = (p: Project) => p.submissions.filter((x) => x.status === 'pending');

export function submitFestival(s: GameState, f: Festival, events: GameEvent[]): void {
  const p = s.project!;
  const odds = festivalOddsFor(s, p, f);
  const resultMinute = atHour(dayOf(s.minute) + f.waitDays, C.BILLS_HOUR);
  s.player.cash -= f.fee;
  p.submissions.push({ festivalId: f.id, tier: f.tier, submittedMinute: s.minute, resultMinute, odds, status: 'pending', award: null });
  events.push({ type: 'FESTIVAL_SUBMITTED', festivalId: f.id, fee: f.fee, odds, resultMinute });
}

/** Called each minute-of-day 06:00: festival results that are due land now. */
export function resolveFestivals(s: GameState, rng: Rng, events: GameEvent[]): void {
  const p = s.project;
  if (!p) return;
  const quality = projectQuality(p);
  for (const sub of p.submissions) {
    if (sub.status !== 'pending' || s.minute < sub.resultMinute) continue;
    const f = festivalById(sub.festivalId)!;
    const accepted = rng.chance(sub.odds);
    sub.status = accepted ? 'accepted' : 'rejected';
    if (!accepted) {
      events.push({ type: 'FESTIVAL_RESULT', festivalId: f.id, accepted, odds: sub.odds, rp: 0, award: null, offer: null });
      filmHeadline(s, rng, events, 'festivalRejected', { festival: f.name });
      continue;
    }
    let rp = f.rp;
    filmHeadline(s, rng, events, 'festivalAccepted', { festival: f.name });
    if (rng.chance(awardChance(quality, f.tier))) {
      sub.award = rng.pick(FESTIVAL_AWARDS);
      rp += Math.round(f.rp * C.AWARD_RP_MULTIPLIER);
      filmHeadline(s, rng, events, 'award', { festival: f.name, award: sub.award });
    }
    let offer = null;
    if (rng.chance(offerChance(quality))) {
      const d = rng.pick(DISTRIBUTORS);
      offer = { id: newId(s, 'o'), festivalId: f.id, distributorId: d.id, distributor: d.name, amount: offerAmount(p.budget, quality, f.offerMultiplier) };
      p.offers.push(offer);
      filmHeadline(s, rng, events, 'offer', { distributor: d.name, amount: offer.amount });
    }
    events.push({ type: 'FESTIVAL_RESULT', festivalId: f.id, accepted, odds: sub.odds, rp, award: sub.award, offer: offer && { ...offer } });
    changeRp(s, rng, events, rp);
  }
}

function finishProject(s: GameState, outcome: string): void {
  const p = s.project!;
  s.credits.unshift({ title: p.title, medium: p.medium, scale: scaleOf(p).name, quality: Math.round(projectQuality(p)), outcome, minute: s.minute });
  s.project = null;
}

export function acceptOffer(s: GameState, rng: Rng, offerId: string, events: GameEvent[]): void {
  const p = s.project!;
  const offer = p.offers.find((o) => o.id === offerId)!;
  const quality = Math.round(projectQuality(p));
  earn(s, offer.amount);
  filmHeadline(s, rng, events, 'released', { distributor: offer.distributor, amount: offer.amount });
  events.push({ type: 'FILM_RELEASED', title: p.title, quality, amount: offer.amount, distributor: offer.distributor, rp: 0 });
  changeNetwork(s, events, C.RELEASE_NETWORK);
  finishProject(s, `Released by ${offer.distributor} (${formatMoney(offer.amount)})`);
}

export function selfRelease(s: GameState, rng: Rng, events: GameEvent[]): void {
  const p = s.project!;
  const quality = Math.round(projectQuality(p));
  const rp = Math.round(quality * C.SELF_RELEASE_RP_PER_QUALITY);
  filmHeadline(s, rng, events, 'selfReleased');
  events.push({ type: 'FILM_RELEASED', title: p.title, quality, amount: 0, distributor: null, rp });
  changeRp(s, rng, events, rp);
  finishProject(s, 'Self-released online');
}

export const PROJECT_STAGES: readonly ProjectStage[] = FILM_PIPELINE.map((x) => x.id);
