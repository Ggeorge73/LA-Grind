// Every career pipeline and scale in one place, so the project engine can stay medium-agnostic.
import { CREW_ROLES, FILM_PIPELINE, FILM_SCALES, FILM_SCALE_IDS, type CrewRole, type FilmScaleId } from './film';
import { MUSIC_CREW_ROLES, MUSIC_PIPELINE, MUSIC_SCALES, MUSIC_SCALE_IDS, type MusicCrewRole, type MusicScaleId } from './music';
import { SPEC_SCALE } from './writers';
import type { ProjectStage } from '../types';

export type ProjectMedium = 'film' | 'music' | 'tv';
export type ProjectScaleId = FilmScaleId | MusicScaleId | 'spec';
export type AnyCrewRole = CrewRole | MusicCrewRole;

/** What every scale has, whatever the medium. */
export interface ScaleInfo {
  id: ProjectScaleId;
  medium: ProjectMedium;
  name: string;
  minTier: number;
  budget: number;
  /** Develop-stage sessions: script drafts for film, songs for music. */
  writeSessions: number;
  crewSlots: number;
}

export const PROJECT_SCALES: Record<ProjectScaleId, ScaleInfo> = {
  ...(Object.fromEntries(
    FILM_SCALE_IDS.map((id) => {
      const f = FILM_SCALES[id];
      return [id, { id, medium: 'film', name: f.name, minTier: f.minTier, budget: f.budget, writeSessions: f.scriptSessions, crewSlots: f.crewSlots }];
    }),
  ) as Record<FilmScaleId, ScaleInfo>),
  ...(Object.fromEntries(
    MUSIC_SCALE_IDS.map((id) => {
      const m = MUSIC_SCALES[id];
      return [id, { id, medium: 'music', name: m.name, minTier: m.minTier, budget: m.budget, writeSessions: m.songs, crewSlots: m.crewSlots }];
    }),
  ) as Record<MusicScaleId, ScaleInfo>),
  spec: { id: 'spec', medium: 'tv', name: SPEC_SCALE.name, minTier: SPEC_SCALE.minTier, budget: 0, writeSessions: SPEC_SCALE.writeSessions, crewSlots: 0 },
};

export const SCALE_IDS_BY_MEDIUM: Record<ProjectMedium, readonly ProjectScaleId[]> = { film: FILM_SCALE_IDS, music: MUSIC_SCALE_IDS, tv: ['spec'] };

export interface PipelineStage {
  id: ProjectStage;
  kind: 'work' | 'raise' | 'hire' | 'circuit';
  label: string;
}

/** TV, the writer's side: no budget and no crew. A spec and a deck get you an agent; the agent gets you staffed. */
export const TV_PIPELINE: readonly PipelineStage[] = [
  { id: 'develop', kind: 'work', label: 'Write the spec pilot' },
  { id: 'deck', kind: 'work', label: 'Build the pitch deck' },
  { id: 'agent', kind: 'raise', label: 'Land an agent' },
  { id: 'staffing', kind: 'circuit', label: 'Staffing season' },
];

export const PIPELINES: Record<ProjectMedium, readonly PipelineStage[]> = { film: FILM_PIPELINE, music: MUSIC_PIPELINE, tv: TV_PIPELINE };

export const CREW_ROLE_IDS_BY_MEDIUM: Record<ProjectMedium, readonly AnyCrewRole[]> = {
  film: Object.keys(CREW_ROLES) as CrewRole[],
  music: Object.keys(MUSIC_CREW_ROLES) as MusicCrewRole[],
  tv: [],
};

export const CREW_ROLE_NAMES: Record<AnyCrewRole, string> = { ...CREW_ROLES, ...MUSIC_CREW_ROLES };
