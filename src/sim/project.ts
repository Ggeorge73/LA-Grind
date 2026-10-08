// The career project engine. A project is a pipeline of stages; each stage is one of four
// reusable kinds (work / raise / hire / circuit). Film is the first pipeline on top of it.
import * as C from './constants';
import { CREW_ROLE_IDS, FILM_LOCATIONS, FILM_PIPELINE, FILM_SCALES } from './content/film';
import {
  CREW_FIRST_NAMES,
  CREW_LAST_NAMES,
  CREW_QUIRKS,
  FILM_HEADLINES,
  FILM_TITLE_FIRST,
  FILM_TITLE_SECOND,
  INVESTORS,
  type FilmHeadlineKind,
  type Investor,
} from './content/filmFlavor';
import { average, clampStat, cloutTier, crewFee, crewPoolSize, dayOf, pitchOdds, writeScore } from './formulas';
import type { Rng } from './rng';
import type { Activity, CrewCandidate, GameEvent, GameState, Project, ProjectStage } from './types';
import { addHeadline, fillTemplate, formatMoney, newId, who } from './world';

export const scaleOf = (p: Project) => FILM_SCALES[p.scale];
export const stageInfo = (stage: ProjectStage) => FILM_PIPELINE.find((x) => x.id === stage)!;
export const investorById = (id: string): Investor | undefined => INVESTORS.find((i) => i.id === id);

export const scriptQuality = (p: Project): number => average(p.scores.develop);
export const remainingBudget = (p: Project): number => p.raised - p.spent;
export const hiredCrew = (p: Project): CrewCandidate[] => p.crewPool.filter((c) => c.hired);
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
  vars: { investor?: string; amount?: number } = {},
): void {
  const p = s.project;
  const text = fillTemplate(rng.pick(FILM_HEADLINES[kind]), {
    who: who(s),
    title: p?.title ?? '',
    investor: vars.investor ?? '',
    amount: formatMoney(vars.amount ?? 0),
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
  };
  s.project = project;
  events.push({ type: 'PROJECT_STARTED', project: structuredClone(project) });
  filmHeadline(s, rng, events, 'projectStarted');
}

export function abandonProject(s: GameState, events: GameEvent[]): void {
  const p = s.project!;
  s.credits.unshift({ title: p.title, medium: p.medium, scale: scaleOf(p).name, quality: Math.round(projectQuality(p)), outcome: 'Abandoned', minute: s.minute });
  s.project = null;
  events.push({ type: 'PROJECT_ABANDONED', title: p.title });
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
}

/** Move to the next stage when the current one's goal is met. */
export function advanceIfReady(s: GameState, rng: Rng, events: GameEvent[]): void {
  const p = s.project;
  if (!p) return;
  const sc = scaleOf(p);
  if (p.stage === 'develop' && p.scores.develop.length >= sc.scriptSessions) setStage(s, rng, events, 'finance');
  if (p.stage === 'finance' && p.raised >= p.budget) setStage(s, rng, events, 'crew');
  if (p.stage === 'crew' && hiredCrew(p).length >= sc.crewSlots) setStage(s, rng, events, 'shoot');
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
    default:
      break;
  }
  advanceIfReady(s, rng, events);
}

export const PROJECT_STAGES: readonly ProjectStage[] = FILM_PIPELINE.map((x) => x.id);
