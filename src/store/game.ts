// Thin Zustand wrapper around the pure sim: holds state, dispatches commands, saves.
import { create } from 'zustand';
import { haptics, now, storage } from '../platform';
import { usePhone } from './phone';
import * as C from '../sim/constants';
import { describeEvent } from '../sim/describe';
import { dayOf } from '../sim/formulas';
import { newGame, step } from '../sim/reducer';
import { deserialize, serialize } from '../sim/save';
import { CONTACTS, type AppId } from '../sim/content/phoneFlavor';
import type { ArchetypeId, Command, ContactId, GameEvent, GameState } from '../sim/types';

const SAVE_KEY = 'la-grind/save';
export type Speed = (typeof C.SPEEDS)[number];

/** A phone notification banner. `app` is what tapping it opens (null = home screen). */
export interface Toast {
  id: number;
  tone: 'good' | 'bad' | 'info';
  text: string;
  app: AppId | null;
  /** Messages notifications open this contact's thread. */
  contact?: ContactId;
  /** Banner title; defaults to the app's name. */
  title?: string;
}

/** At most this many banners are stacked at once (newest on top). */
export const MAX_NOTICES = 2;

interface GameStore {
  state: GameState | null;
  loaded: boolean;
  speed: Speed;
  /** Notification banners, oldest first (max MAX_NOTICES). */
  notices: Toast[];
  load(): Promise<void>;
  save(): Promise<void>;
  start(archetype: ArchetypeId): void;
  /** Runs a command; returns the rejection reason if the sim refused it. */
  dispatch(cmd: Command): string | null;
  /** Advance by real elapsed ms at the current speed (called by the game loop). */
  tick(realMs: number): void;
  setSpeed(speed: Speed): void;
  dismissNotice(id: number): void;
  /** Abandon the current run and go back to the archetype picker. */
  abandonRun(): Promise<void>;
}

let carryMs = 0;
let toastId = 0;

/** Toast text for events whose log line (describe.ts) already says it best. */
function say(tone: Toast['tone'], e: GameEvent, app: AppId | null): Toast {
  return { id: ++toastId, tone, text: describeEvent(e) ?? e.type, app };
}

function feedback(events: GameEvent[]): Toast | null {
  let toast: Toast | null = null;
  for (const e of events) {
    if (e.type === 'BOOKED') {
      haptics.pulse('success');
      toast = { id: ++toastId, tone: 'good', text: `Booked! ${e.opportunity.title}`, app: 'messages' };
    } else if (e.type === 'REJECTED') {
      haptics.pulse('warning');
      toast = { id: ++toastId, tone: 'bad', text: `Passed on: ${e.opportunity.title}`, app: 'casting' };
    } else if (e.type === 'EXPOSED') {
      haptics.pulse('warning');
      toast = { id: ++toastId, tone: 'bad', text: e.rpLost > 0 ? `Exposed: −${e.rpLost} RP` : `Exposed on ${e.opportunity.title}`, app: 'casting' };
    } else if (e.type === 'BILLS_CHARGED') {
      haptics.pulse('tap');
      toast ??= { id: ++toastId, tone: 'info', text: `06:00 — bills: −$${e.amount}`, app: 'bank' };
    } else if (e.type === 'OVERDRAFT_STARTED') {
      haptics.pulse('warning');
      toast = { id: ++toastId, tone: 'bad', text: 'Overdraft! 3 days to get back to $0.', app: 'bank' };
    } else if (e.type === 'CALLBACK_DONE') {
      haptics.pulse(e.booked ? 'success' : 'warning');
      toast = e.booked
        ? { id: ++toastId, tone: 'good', text: `Booked the pilot “${e.showTitle}” (${e.right}/3 reads)! Network decides in a week.`, app: 'messages' }
        : { id: ++toastId, tone: 'bad', text: `Passed on for “${e.showTitle}” (${e.right}/3 reads).`, app: 'messages' };
    } else if (e.type === 'PILOT_DECIDED') {
      haptics.pulse(e.tookIt ? 'success' : 'warning');
      toast = !e.pickedUp
        ? { id: ++toastId, tone: 'bad', text: `${e.network} passed on “${e.showTitle}”.`, app: 'messages' }
        : e.tookIt
          ? { id: ++toastId, tone: 'good', text: `“${e.showTitle}” picked up by ${e.network}! You're a series regular.`, app: 'messages' }
          : { id: ++toastId, tone: 'info', text: `“${e.showTitle}” got picked up, but you're on a show. Your agent passed.`, app: 'messages' };
    } else if (e.type === 'EPISODE_SHOT') {
      haptics.pulse('success');
      toast = { id: ++toastId, tone: 'good', text: `Episode ${e.episode} of “${e.showTitle}” in the can: +${e.rp} RP`, app: 'gigs' };
    } else if (e.type === 'EPISODE_WEEK') {
      toast = e.missed
        ? { id: ++toastId, tone: 'bad', text: `Missed set on “${e.showTitle}”: half pay, −${e.rpLost} RP.`, app: 'messages' }
        : { id: ++toastId, tone: 'good', text: `“${e.showTitle}” ep. ${e.episode} paid: +$${e.pay.toLocaleString('en-US')}`, app: 'bank' };
    } else if (e.type === 'SERIES_WRAPPED') {
      haptics.pulse('success');
      toast = { id: ++toastId, tone: 'good', text: `That's a wrap on “${e.showTitle}”: ${e.episodes} episodes. New TV credit!`, app: 'messages' };
    } else if (e.type === 'PILOT_SEASON_OPENED') {
      toast = { id: ++toastId, tone: 'info', text: 'Pilot season is open: pilots are on CastBoard.', app: 'casting' };
    } else if (e.type === 'AGENT_PITCHED') {
      haptics.pulse(e.yes ? 'success' : 'warning');
      toast = say(e.yes ? 'good' : 'bad', e, e.yes ? 'messages' : 'studio');
    } else if (e.type === 'STAFFING_ROLLED') {
      haptics.pulse(e.staffed ? 'success' : 'warning');
      toast = say(e.staffed ? 'good' : e.final ? 'bad' : 'info', e, 'messages');
    } else if (e.type === 'ROOM_DAY_DONE') {
      haptics.pulse('success');
      toast = say('good', e, 'gigs');
    } else if (e.type === 'ROOM_WRAPPED') {
      haptics.pulse(e.outcome === 'notAskedBack' ? 'warning' : 'success');
      toast = say(e.outcome === 'notAskedBack' ? 'bad' : 'good', e, 'messages');
    } else if (e.type === 'GUILD_VOUCHER') {
      if (e.total >= C.GUILD_VOUCHERS_NEEDED) haptics.pulse('success');
      toast = say(e.total >= C.GUILD_VOUCHERS_NEEDED ? 'good' : 'info', e, e.total >= C.GUILD_VOUCHERS_NEEDED ? 'messages' : 'union');
    } else if (e.type === 'GUILD_JOINED') {
      haptics.pulse('success');
      toast = say('good', e, 'union');
    } else if (e.type === 'GUILD_DUES') {
      toast ??= say('info', e, 'bank');
    } else if (e.type === 'HEALTH_PLAN') {
      haptics.pulse(e.active ? 'success' : 'warning');
      toast = say(e.active ? 'good' : 'bad', e, 'union');
    } else if (e.type === 'TIER_CHANGED' && e.to > e.from) {
      haptics.pulse('success');
      toast = { id: ++toastId, tone: 'good', text: `Clout Tier ${e.to}!`, app: null };
    }
  }
  return toast;
}

/** Threads that received a message during this step, newest first. */
function newMessages(before: GameState, after: GameState) {
  const lastId = new Map(before.inbox.map((t) => [t.contact, t.messages[t.messages.length - 1]?.id]));
  return after.inbox.filter((t) => t.messages.length > 0 && lastId.get(t.contact) !== t.messages[t.messages.length - 1]!.id);
}

/**
 * Route inbox-related banners to the thread that just got the text, and turn a new text with no
 * other banner into a Messages notification.
 */
function withInbox(toast: Toast | null, before: GameState, after: GameState): Toast | null {
  const fresh = newMessages(before, after);
  if (fresh.length === 0) return toast;
  const thread = fresh[0]!;
  const name = CONTACTS[thread.contact].name;
  if (toast) return toast.app === 'messages' ? { ...toast, contact: thread.contact, title: name } : toast;
  const last = thread.messages[thread.messages.length - 1]!;
  return { id: ++toastId, tone: 'info', text: last.text, app: 'messages', contact: thread.contact, title: name };
}

export const useGame = create<GameStore>((set, get) => {
  const apply = (cmd: Command): string | null => {
    const current = get().state;
    if (!current) return 'No game running.';
    const { state, events } = step(current, cmd);
    const rejected = events.find((e) => e.type === 'ACTION_REJECTED');
    if (rejected && rejected.type === 'ACTION_REJECTED') return rejected.reason;
    const toast = withInbox(feedback(events), current, state);
    const dayChanged = dayOf(state.minute) !== dayOf(current.minute);
    set({
      state,
      ...(toast ? { notices: [...get().notices, toast].slice(-MAX_NOTICES) } : {}),
      ...(state.status !== 'playing' ? { speed: 0 } : {}),
    });
    // Save on every player action and every new day; ticks within a day save on pause.
    if (cmd.type !== 'ADVANCE' || dayChanged || state.status !== 'playing') void get().save();
    return null;
  };

  return {
    state: null,
    loaded: false,
    speed: 1,
    notices: [],

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
      usePhone.getState().reset();
      set({ state, speed: 1, notices: [] });
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

    dismissNotice(id) {
      set({ notices: get().notices.filter((n) => n.id !== id) });
    },

    async abandonRun() {
      carryMs = 0;
      set({ state: null, speed: 1, notices: [] });
      await clearSave();
    },
  };
});

/** Forget the save entirely (used by "abandon run"). */
export async function clearSave(): Promise<void> {
  await storage.remove(SAVE_KEY);
}
