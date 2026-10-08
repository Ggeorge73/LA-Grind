export type MusicScaleId = 'single' | 'ep' | 'album';

export interface MusicScale {
  id: MusicScaleId;
  name: string;
  /** Lower-case name for headlines ("single", "EP", "album"). */
  short: string;
  minTier: number;
  /** Studio budget: self-funded in Sprint 7, label advances in Sprint 8. */
  budget: number;
  songs: number;
  crewSlots: number;
  recordSessions: number;
  /** Multiplies release-week streams. */
  streamMultiplier: number;
}

export const MUSIC_SCALES: Record<MusicScaleId, MusicScale> = {
  single: { id: 'single', name: 'Single', short: 'single', minTier: 1, budget: 600, songs: 1, crewSlots: 1, recordSessions: 2, streamMultiplier: 1 },
  ep: { id: 'ep', name: 'EP', short: 'EP', minTier: 2, budget: 4000, songs: 4, crewSlots: 2, recordSessions: 5, streamMultiplier: 2.5 },
  album: { id: 'album', name: 'Album', short: 'album', minTier: 4, budget: 15000, songs: 10, crewSlots: 3, recordSessions: 12, streamMultiplier: 6 },
};

export const MUSIC_SCALE_IDS: readonly MusicScaleId[] = ['single', 'ep', 'album'];

export type MusicCrewRole = 'producer' | 'engineer' | 'session' | 'feature';

export const MUSIC_CREW_ROLES: Record<MusicCrewRole, string> = {
  producer: 'Producer',
  engineer: 'Recording Engineer',
  session: 'Session Player',
  feature: 'Featured Artist',
};

export const MUSIC_CREW_ROLE_IDS: readonly MusicCrewRole[] = ['producer', 'engineer', 'session', 'feature'];

/** The music pipeline: same reusable stage kinds as film. */
export const MUSIC_PIPELINE = [
  { id: 'develop', kind: 'work', label: 'Write the songs' },
  { id: 'finance', kind: 'raise', label: 'Book the studio' },
  { id: 'crew', kind: 'hire', label: 'Studio crew' },
  { id: 'record', kind: 'work', label: 'Record' },
  { id: 'release', kind: 'circuit', label: 'Release week' },
] as const;
