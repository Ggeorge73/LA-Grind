// 3D home UI state (PI-3 Sprint 12, LAG-94): which spot is selected, the walk in progress, and which spot
// started the running activity (so the character poses there). Pure UI state; the sim never sees it.
import { create } from 'zustand';
import type { HotspotId } from '../sim/actions';
import type { Command } from '../sim/types';

interface RoomStore {
  /** The spot whose action card is showing (null = the idle card). */
  selected: HotspotId | null;
  /** The character is walking to `spot`; `command` is dispatched on arrival. */
  pending: { spot: HotspotId; command: Command; label: string } | null;
  /** The spot whose action started the current activity. */
  origin: HotspotId | null;
  /** Why the sim refused the last action, shown on the card. */
  error: string | null;
  /** The "Room actions" list is expanded on screen. */
  listOpen: boolean;
  select(id: HotspotId | null): void;
  go(spot: HotspotId, command: Command, label: string): void;
  clearOrigin(): void;
  setListOpen(open: boolean): void;
  reset(): void;
}

export const useRoom = create<RoomStore>((set) => ({
  selected: null,
  pending: null,
  origin: null,
  error: null,
  listOpen: false,
  select: (selected) => set({ selected, error: null }),
  go: (spot, command, label) => set({ pending: { spot, command, label }, error: null }),
  clearOrigin: () => set({ origin: null }),
  setListOpen: (listOpen) => set({ listOpen }),
  reset: () => set({ selected: null, pending: null, origin: null, error: null, listOpen: false }),
}));
