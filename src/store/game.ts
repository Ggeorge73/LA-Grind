// Thin Zustand wrapper around the pure sim: holds state, dispatches commands, saves.
import { create } from 'zustand';
import { haptics, now, storage } from '../platform';
import * as C from '../sim/constants';
import { dayOf } from '../sim/formulas';
import { newGame, step } from '../sim/reducer';
import { deserialize, serialize } from '../sim/save';
import type { ArchetypeId, Command, GameEvent, GameState } from '../sim/types';

const SAVE_KEY = 'la-grind/save';
export type Speed = (typeof C.SPEEDS)[number];

export interface Toast {
  id: number;
  tone: 'good' | 'bad' | 'info';
  text: string;
}

interface GameStore {
  state: GameState | null;
  loaded: boolean;
  speed: Speed;
  toast: Toast | null;
  load(): Promise<void>;
  save(): Promise<void>;
  start(archetype: ArchetypeId): void;
  /** Runs a command; returns the rejection reason if the sim refused it. */
  dispatch(cmd: Command): string | null;
  /** Advance by real elapsed ms at the current speed (called by the game loop). */
  tick(realMs: number): void;
  setSpeed(speed: Speed): void;
  dismissToast(): void;
}

let carryMs = 0;
let toastId = 0;

function feedback(events: GameEvent[]): Toast | null {
  let toast: Toast | null = null;
  for (const e of events) {
    if (e.type === 'BOOKED') {
      haptics.pulse('success');
      toast = { id: ++toastId, tone: 'good', text: `Booked! ${e.opportunity.title}` };
    } else if (e.type === 'REJECTED') {
      haptics.pulse('warning');
      toast = { id: ++toastId, tone: 'bad', text: `Passed on: ${e.opportunity.title}` };
    } else if (e.type === 'EXPOSED') {
      haptics.pulse('warning');
      toast = { id: ++toastId, tone: 'bad', text: e.rpLost > 0 ? `Exposed: −${e.rpLost} RP` : `Exposed on ${e.opportunity.title}` };
    } else if (e.type === 'BILLS_CHARGED') {
      haptics.pulse('tap');
      toast ??= { id: ++toastId, tone: 'info', text: `06:00 — bills: −$${e.amount}` };
    } else if (e.type === 'OVERDRAFT_STARTED') {
      haptics.pulse('warning');
      toast = { id: ++toastId, tone: 'bad', text: 'Overdraft! 3 days to get back to $0.' };
    } else if (e.type === 'TIER_CHANGED' && e.to > e.from) {
      haptics.pulse('success');
      toast = { id: ++toastId, tone: 'good', text: `Clout Tier ${e.to}!` };
    }
  }
  return toast;
}

export const useGame = create<GameStore>((set, get) => {
  const apply = (cmd: Command): string | null => {
    const current = get().state;
    if (!current) return 'No game running.';
    const { state, events } = step(current, cmd);
    const rejected = events.find((e) => e.type === 'ACTION_REJECTED');
    if (rejected && rejected.type === 'ACTION_REJECTED') return rejected.reason;
    const toast = feedback(events);
    const dayChanged = dayOf(state.minute) !== dayOf(current.minute);
    set({ state, ...(toast ? { toast } : {}), ...(state.status !== 'playing' ? { speed: 0 } : {}) });
    // Save on every player action and every new day; ticks within a day save on pause.
    if (cmd.type !== 'ADVANCE' || dayChanged || state.status !== 'playing') void get().save();
    return null;
  };

  return {
    state: null,
    loaded: false,
    speed: 1,
    toast: null,

    async load() {
      const state = deserialize(await storage.get(SAVE_KEY));
      set({ state, loaded: true });
    },

    async save() {
      const state = get().state;
      if (state) await storage.set(SAVE_KEY, serialize(state, now()));
    },

    start(archetype) {
      const previous = get().state;
      const seed = now() % 2147483647;
      const state =
        previous && previous.status === 'movedHome'
          ? step(previous, { type: 'NEW_RUN', archetype, seed }).state
          : newGame(archetype, seed);
      carryMs = 0;
      set({ state, speed: 1, toast: null });
      void get().save();
    },

    dispatch(cmd) {
      haptics.pulse('tap');
      return apply(cmd);
    },

    tick(realMs) {
      const { speed, state } = get();
      if (!state || speed === 0 || state.status !== 'playing') {
        carryMs = 0;
        return;
      }
      carryMs += Math.min(realMs, C.MAX_CATCHUP_REAL_MS) * speed;
      const minutes = Math.floor(carryMs / C.REAL_MS_PER_GAME_MINUTE);
      if (minutes < 1) return;
      carryMs -= minutes * C.REAL_MS_PER_GAME_MINUTE;
      apply({ type: 'ADVANCE', minutes });
    },

    setSpeed(speed) {
      carryMs = 0;
      set({ speed });
    },

    dismissToast() {
      set({ toast: null });
    },
  };
});

/** Forget the save entirely (used by "abandon run"). */
export async function clearSave(): Promise<void> {
  await storage.remove(SAVE_KEY);
}
