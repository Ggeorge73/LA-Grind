// The career project engine. A project is a pipeline of stages; each stage is one of four
// reusable kinds (work / raise / hire / circuit). Film and music are pipelines on top of it.
import * as C from './constants';
import { FESTIVALS, FILM_LOCATIONS, FILM_SCALES, type Festival, type FilmScale, type FilmScaleId } from './content/film';
import { MUSIC_SCALES, type MusicScale, type MusicScaleId } from './content/music';
import { CREW_ROLE_IDS_BY_MEDIUM, PIPELINES, PROJECT_SCALES, type ProjectMedium, type ScaleInfo } from './content/projects';
import {
  MUSIC_CREW_QUIRKS,
  MUSIC_HEADLINES,
  PROMO_STUNTS,
  RECORD_TITLE_FIRST,
  RECORD_TITLE_SECOND,
  STUDIOS,
  CHART_NAME,
  type MusicHeadlineKind,
} from './content/musicFlavor';
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
  chartPosition,
  chartRp,
  fansGained,
  pitchOdds,
  recordScore,
  releaseStreams,
  royalties,
  shootScore,
  writeScore,
} from './formulas';
import type { Rng } from './rng';
import type { Activity, CrewCandidate, GameEvent, GameState, Project, ProjectScaleId, ProjectStage } from './types';
import { addHeadline, changeNetwork, changeRp, earn, fillTemplate, formatMoney, newId, who } from './world';

export const scaleOf = (p: Project): ScaleInfo => PROJECT_SCALES[p.scale];
/** Film-only numbers (shoot days, festivals, pitch difficulty). Only call on film projects. */
export const filmScaleOf = (p: Project): FilmScale => FILM_SCALES[p.scale as FilmScaleId];
/** Music-only numbers (record sessions, stream multiplier). Only call on music projects. */
export const musicScaleOf = (p: Project): MusicScale => MUSIC_SCALES[p.scale as MusicScaleId];
export const pipelineOf = (p: Project) => PIPELINES[p.medium as ProjectMedium];
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

/** Quality from what is done so far (unfinished stages count as 0). */
export function projectQuality(p: Project): number {
  if (p.medium === 'music') {
    return clampStat(
      C.MUSIC_WEIGHT_SONGS * scriptQuality(p) +
        C.MUSIC_WEIGHT_RECORD * average(p.scores.record) +
        C.MUSIC_WEIGHT_CREW * crewQuality(p) +
        productionValue(p),
    );
  }
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
    difficulty: filmScaleOf(p).pitchDifficulty + investor.difficultyMod,
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

export function musicHeadline(
  s: GameState,
  rng: Rng,
  events: GameEvent[],
  kind: MusicHeadlineKind,
  vars: { position?: number; streams?: number } = {},
): void {
  const p = s.project;
  const text = fillTemplate(rng.pick(MUSIC_HEADLINES[kind]), {
    who: who(s),
    title: p?.title ?? '',
    scale: p && p.medium === 'music' ? musicScaleOf(p).short : '',
    studio: p?.studio ?? '',
    position: vars.position ?? '',
    streams: (vars.streams ?? 0).toLocaleString('en-US'),
    chart: CHART_NAME,
  });
  addHeadline(s, events, text, true);
}

export function startProject(s: GameState, rng: Rng, scale: ProjectScaleId, events: GameEvent[]): void {
  const sc = PROJECT_SCALES[scale];
  const music = sc.medium === 'music';
  const studio = music ? rng.pick(STUDIOS) : null;
  const project: Project = {
    id: newId(s, 'p'),
    medium: sc.medium,
    scale,
    title: music ? `${rng.pick(RECORD_TITLE_FIRST)} ${rng.pick(RECORD_TITLE_SECOND)}` : `${rng.pick(FILM_TITLE_FIRST)} ${rng.pick(FILM_TITLE_SECOND)}`,
    location: studio ? studio.location : rng.pick(FILM_LOCATIONS),
    studio: studio ? studio.name : null,
    stage: 'develop',
    startedMinute: s.minute,
    scores: { develop: [], shoot: [], post: [], record: [] },
    budget: sc.budget,
    raised: 0,
    selfFunded: 0,
    spent: 0,
    pitches: [],
    crewPool: [],
    submissions: [],
    offers: [],
    release: null,
  };
  s.project = project;
  events.push({ type: 'PROJECT_STARTED', project: structuredClone(project) });
  if (music) musicHeadline(s, rng, events, 'projectStarted');
  else filmHeadline(s, rng, events, 'projectStarted');
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
  const roles = CREW_ROLE_IDS_BY_MEDIUM[p.medium as ProjectMedium];
  const quirks = p.medium === 'music' ? MUSIC_CREW_QUIRKS : CREW_QUIRKS;
  return Array.from({ length: size }, (_, i) => {
    const skill = Math.max(1, Math.min(5, 1 + Math.floor(rng.float() * 4 + bonus)));
    return {
      id: newId(s, 'c'),
      name: `${rng.pick(CREW_FIRST_NAMES)} ${rng.pick(CREW_LAST_NAMES)}`,
      role: roles[i % roles.length]!,
      skill,
      fee: crewFee(p.budget, skill),
      quirk: rng.pick(quirks),
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
    if (p.medium === 'music') musicHeadline(s, rng, events, 'studioBooked');
    else filmHeadline(s, rng, events, 'greenlit', { amount: p.raised });
  }
  if (stage === 'shoot') filmHeadline(s, rng, events, 'crewComplete');
  if (stage === 'post') filmHeadline(s, rng, events, 'shootWrapped');
  if (stage === 'record') musicHeadline(s, rng, events, 'crewComplete');
  if (stage === 'release') musicHeadline(s, rng, events, 'recordWrapped');
}

/** Move to the next stage when the current one's goal is met. */
export function advanceIfReady(s: GameState, rng: Rng, events: GameEvent[]): void {
  const p = s.project;
  if (!p) return;
  const sc = scaleOf(p);
  const next = (): ProjectStage => {
    const pipe = pipelineOf(p);
    return pipe[pipe.findIndex((x) => x.id === p.stage) + 1]!.id;
  };
  if (p.stage === 'develop' && p.scores.develop.length >= sc.writeSessions) setStage(s, rng, events, next());
  if (p.stage === 'finance' && p.raised >= p.budget) setStage(s, rng, events, next());
  if (p.stage === 'crew' && hiredCrew(p).length >= sc.crewSlots) setStage(s, rng, events, next());
  if (p.stage === 'shoot' && p.scores.shoot.length >= filmScaleOf(p).shootDays) setStage(s, rng, events, next());
  if (p.stage === 'post' && p.scores.post.length >= filmScaleOf(p).editSessions) setStage(s, rng, events, next());
  if (p.stage === 'record' && p.scores.record.length >= musicScaleOf(p).recordSessions) setStage(s, rng, events, next());
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
      // Scripts use Writing; songs use Music.
      const skill = p.medium === 'music' ? 'music' : 'writing';
      const score = Math.round(writeScore(pl.skills[skill], pl.spark, rng.float()));
      p.scores.develop.push(score);
      pl.skills[skill] = clampStat(pl.skills[skill] + C.PROJECT_SKILL_GAIN);
      events.push({ type: 'SESSION_SCORED', stage: 'develop', score });
      events.push({ type: 'SKILL_GAINED', skill, amount: C.PROJECT_SKILL_GAIN });
      break;
    }
    case 'record': {
      const score = Math.round(recordScore(pl.skills.music, crewQuality(p), pl.spark, rng.float()));
      p.scores.record.push(score);
      pl.skills.music = clampStat(pl.skills.music + C.PROJECT_SKILL_GAIN);
      events.push({ type: 'SESSION_SCORED', stage: 'record', score });
      events.push({ type: 'SKILL_GAINED', skill: 'music', amount: C.PROJECT_SKILL_GAIN });
      break;
    }
    case 'promo': {
      const r = p.release;
      if (r) {
        r.promoPending = true;
        r.lastPromoDay = dayOf(a.startMinute);
      }
      events.push({ type: 'PROMO_DONE', stunt: rng.pick(PROMO_STUNTS) });
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
export const eligibleFestivals = (p: Project): Festival[] => FESTIVALS.filter((f) => f.tier <= filmScaleOf(p).bestFestivalTier);

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

// ---------- Music release week ----------

export const promotedToday = (s: GameState, p: Project): boolean => p.release?.lastPromoDay === dayOf(s.minute);

export function releaseRecord(s: GameState, rng: Rng, events: GameEvent[]): void {
  const p = s.project!;
  p.release = { releasedMinute: s.minute, lastPromoDay: null, promoPending: false, days: [] };
  events.push({ type: 'RECORD_RELEASED', title: p.title, quality: Math.round(projectQuality(p)) });
  musicHeadline(s, rng, events, 'released');
}

/** Called at 06:00: one release-week day lands; after the last day the record becomes a credit. */
export function resolveRelease(s: GameState, rng: Rng, events: GameEvent[]): void {
  const p = s.project;
  const r = p?.release;
  if (!p || !r || s.minute <= r.releasedMinute) return;
  const quality = projectQuality(p);
  const day = r.days.length;
  const promoted = r.promoPending;
  const streams = releaseStreams({ fans: s.player.fans, quality, multiplier: musicScaleOf(p).streamMultiplier, day, promoted });
  const fans = fansGained(streams, quality);
  const pay = royalties(streams);
  const position = chartPosition(streams);
  const prevPeak = peakPosition(p);
  r.promoPending = false;
  r.days.push({ streams, fans, royalties: pay, position, promoted });
  s.player.fans += fans;
  earn(s, pay);
  events.push({ type: 'RELEASE_DAY', day: day + 1, streams, fans, royalties: pay, position });

  if (day === 0) {
    if (position === null) musicHeadline(s, rng, events, 'missedChart', { streams });
    else musicHeadline(s, rng, events, position <= 10 ? 'chartTop10' : 'chartDebut', { position, streams });
  } else if (position !== null && position <= 10 && (prevPeak === null || position < prevPeak)) {
    musicHeadline(s, rng, events, 'chartTop10', { position, streams });
  }

  if (r.days.length >= C.RELEASE_DAYS) {
    const peak = peakPosition(p);
    const rp = chartRp(peak);
    const totalStreams = r.days.reduce((sum, d) => sum + d.streams, 0);
    if (peak !== null) musicHeadline(s, rng, events, 'weekEnd', { position: peak });
    events.push({ type: 'RELEASE_WEEK_ENDED', title: p.title, peak, rp, totalStreams });
    if (rp > 0) changeRp(s, rng, events, rp);
    finishProject(s, peak === null ? "Didn't chart" : `Peaked at #${peak} on ${CHART_NAME}`);
  }
}

export const peakPosition = (p: Project): number | null => {
  const ranks = (p.release?.days ?? []).map((d) => d.position).filter((x): x is number => x !== null);
  return ranks.length ? Math.min(...ranks) : null;
};

export const PROJECT_STAGES: readonly ProjectStage[] = [...PIPELINES.film.map((x) => x.id), 'record', 'release'];
