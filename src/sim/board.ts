// The opportunity engine: one system for film, TV and music, driven by data rows.
import * as C from './constants';
import { ARCHETYPES } from './content/archetypes';
import { OPPORTUNITY_TEMPLATES, type OpportunityTemplate } from './content/opportunities';
import { boardSize, cloutTier, dayOf, isPilotSeason, successOdds } from './formulas';
import { generatePilots } from './tv';
import type { Rng } from './rng';
import type { GameState, Medium, Opportunity, Player } from './types';
import { newId } from './world';

/** Highest tier the player can see on the board (a manager shows one tier above Clout). */
export function visibleTier(p: Player): number {
  const bonus = ARCHETYPES[p.archetype].hasManager ? 1 : 0;
  return Math.min(C.MAX_TIER, cloutTier(p.rp) + bonus);
}

export function windowFor(medium: Medium): { start: number; end: number } {
  return medium === 'music' ? C.MUSIC_WINDOW : C.SCREEN_WINDOW;
}

export function generateBoard(s: GameState, rng: Rng): Opportunity[] {
  const maxTier = visibleTier(s.player);
  const pool = OPPORTUNITY_TEMPLATES.filter((t) => t.tier <= maxTier);
  const count = Math.min(pool.length, boardSize(s.player.network, rng.float()));
  const picked: OpportunityTemplate[] = [];

  // One per medium first so the board always mixes film, TV and music, then fill.
  for (const medium of ['film', 'tv', 'music'] as const) {
    const options = pool.filter((t) => t.medium === medium);
    if (options.length > 0 && picked.length < count) picked.push(weightedPick(options, maxTier, rng));
  }
  while (picked.length < count) {
    const options = pool.filter((t) => !picked.includes(t));
    if (options.length === 0) break;
    picked.push(weightedPick(options, maxTier, rng));
  }

  const day = dayOf(s.minute);
  const regular = picked.map((t) => {
    const w = windowFor(t.medium);
    return {
      id: newId(s, 'o'),
      templateId: t.id,
      title: t.title,
      medium: t.medium,
      skill: t.skill,
      tier: t.tier,
      location: t.location,
      windowStart: w.start,
      windowEnd: w.end,
      day,
      prepHours: 0,
      status: 'open',
    } satisfies Opportunity;
  });
  // Pilot season: extra pilot auditions on top of the normal board.
  return [...regular, ...generatePilots(s, rng, Math.min(maxTier, C.PILOT_MAX_TIER), day, isPilotSeason(day))];
}

/** Favour rows near the top of what the player can see, but keep lower rungs in play. */
function weightedPick(options: OpportunityTemplate[], maxTier: number, rng: Rng): OpportunityTemplate {
  const weights = options.map((t) => 1 + Math.max(0, 3 - (maxTier - t.tier)));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng.float() * total;
  for (let i = 0; i < options.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return options[i]!;
  }
  return options[options.length - 1]!;
}

export function oddsFor(p: Player, opp: Opportunity, extraPrepHours = 0): number {
  return successOdds({
    skill: p.skills[opp.skill],
    spark: p.spark,
    clout: cloutTier(p.rp),
    tier: opp.tier,
    prepHours: Math.min(C.PREP_MAX_HOURS, opp.prepHours + extraPrepHours),
    creativeBurnout: p.creativeBurnout,
  });
}

export function submissionFee(p: Player, opp: Opportunity): number {
  return ARCHETYPES[p.archetype].freeSubmissions.includes(opp.skill) ? 0 : C.SUBMIT_FEE;
}

export const SUBMISSION_NAME: Record<Opportunity['skill'], string> = {
  acting: 'self-tape',
  writing: 'writing sample',
  directing: 'directing reel',
  music: 'demo',
};
