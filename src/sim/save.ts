// Versioned save format. Saves are JSON strings so any key-value store can hold them.
import { SAVE_VERSION } from './constants';
import type { GameState } from './types';

interface SaveFile {
  version: number;
  savedAt: number;
  state: GameState;
}

/** `savedAt` is supplied by the caller (platform clock), so the sim never reads the wall clock itself. */
export function serialize(state: GameState, savedAt = 0): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt, state };
  return JSON.stringify(file);
}

export function deserialize(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const file = migrate(JSON.parse(raw) as SaveFile);
    return file ? file.state : null;
  } catch {
    return null;
  }
}

type Migration = (file: SaveFile) => SaveFile;
/** MIGRATIONS[n] upgrades a version-n save to version n+1. */
const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2 (PI-2): careers. Old runs simply have no project and no credits yet.
  1: (file) => ({ ...file, version: 2, state: { ...file.state, version: 2, project: null, credits: [] } }),
  // v2 → v3 (Sprint 6): festival circuit. An in-flight project gets empty submissions and offers.
  2: (file) => {
    const project = file.state.project ? { ...file.state.project, submissions: [], offers: [] } : null;
    return { ...file, version: 3, state: { ...file.state, version: 3, project } };
  },
  // v3 → v4 (Sprint 7): music. Fans start at 0 for old runs; projects gain record scores, studio and release.
  3: (file) => {
    const old = file.state.project;
    const project = old ? { ...old, studio: null, release: null, scores: { ...old.scores, record: [] } } : null;
    return { ...file, version: 4, state: { ...file.state, version: 4, player: { ...file.state.player, fans: 0 }, project } };
  },
  // v4 → v5 (Sprint 8): music business. Empty beat store and catalogue; projects gain label and soundtrack slots.
  4: (file) => {
    const old = file.state.project;
    const project = old ? { ...old, label: null, soundtrack: null } : null;
    return {
      ...file,
      version: 5,
      state: { ...file.state, version: 5, player: { ...file.state.player, lastShowDay: null }, project, beats: [], catalog: [] },
    };
  },
  // v5 → v6 (Sprint 9): pilot season. No open callback, no pending pilots, no show yet.
  5: (file) => ({ ...file, version: 6, state: { ...file.state, version: 6, callback: null, pilots: [], contract: null } }),
};

export function migrate(file: SaveFile): SaveFile | null {
  if (!file || typeof file.version !== 'number' || !file.state) return null;
  let current = file;
  while (current.version < SAVE_VERSION) {
    const up = MIGRATIONS[current.version];
    if (!up) return null;
    current = up(current);
  }
  return current.version === SAVE_VERSION ? current : null;
}
