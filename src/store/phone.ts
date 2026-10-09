// In-game phone navigation (PI-3 Sprint 11). Pure UI state: which app is open, whether the phone is raised.
import { create } from 'zustand';
import type { AppId } from '../sim/content/phoneFlavor';
import type { ContactId } from '../sim/types';

interface PhoneStore {
  /** Mobile only: the phone sheet is raised over the world. Desktop always shows it. */
  open: boolean;
  /** null = home screen. */
  app: AppId | null;
  /** Messages app: the open chat thread (null = thread list). */
  thread: ContactId | null;
  /** The callback / writers'-room sheets were put away to answer later from Messages. */
  sheetsMinimized: boolean;
  setOpen(open: boolean): void;
  openApp(app: AppId, thread?: ContactId | null): void;
  goHome(): void;
  openThread(contact: ContactId | null): void;
  setSheetsMinimized(minimized: boolean): void;
  reset(): void;
}

export const usePhone = create<PhoneStore>((set) => ({
  open: true,
  app: null,
  thread: null,
  sheetsMinimized: false,
  setOpen: (open) => set({ open }),
  openApp: (app, thread = null) => set({ open: true, app, thread: app === 'messages' ? thread : null }),
  goHome: () => set({ app: null, thread: null }),
  openThread: (thread) => set({ thread }),
  setSheetsMinimized: (sheetsMinimized) => set({ sheetsMinimized }),
  reset: () => set({ open: true, app: null, thread: null, sheetsMinimized: false }),
}));
