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
const MIGRATIONS: Record<number, Migration> = {};

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
