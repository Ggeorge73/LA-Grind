// In-game phone navigation (PI-3 Sprint 11; pocket phone since Sprint 12). Pure UI state: which app is open, whether the phone is out.
import { create } from 'zustand';
import type { AppId } from '../sim/content/phoneFlavor';
import type { ContactId } from '../sim/types';

interface PhoneStore {
  /** The pocket phone is out (raised over the 3D room). Closed by default (Sprint 12). */
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
  open: false,
  app: null,
  thread: null,
  sheetsMinimized: false,
  setOpen: (open) => set({ open }),
  openApp: (app, thread = null) => set({ open: true, app, thread: app === 'messages' ? thread : null }),
  goHome: () => set({ app: null, thread: null }),
  openThread: (thread) => set({ thread }),
  setSheetsMinimized: (sheetsMinimized) => set({ sheetsMinimized }),
  reset: () => set({ open: false, app: null, thread: null, sheetsMinimized: false }),
}));
