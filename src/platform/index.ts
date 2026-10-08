// Everything that differs between web, iOS and Android lives behind these three
// interfaces. Nothing outside src/platform imports a Capacitor plugin.
import { Capacitor } from '@capacitor/core';
import { nativeHaptics, nativeLifecycle, nativeStorage } from './native';
import { webHaptics, webLifecycle, webStorage } from './web';

export interface Storage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface Lifecycle {
  /** Called when the app is backgrounded, the tab hides or the phone locks. Returns an unsubscribe. */
  onPause(handler: () => void): () => void;
  /** Called when the app comes back to the foreground. Returns an unsubscribe. */
  onResume(handler: () => void): () => void;
}

export type HapticKind = 'tap' | 'success' | 'warning';

export interface Haptics {
  pulse(kind: HapticKind): void;
}

const native = Capacitor.isNativePlatform();

export const storage: Storage = native ? nativeStorage : webStorage;
export const lifecycle: Lifecycle = native ? nativeLifecycle : webLifecycle;
export const haptics: Haptics = native ? nativeHaptics : webHaptics;
export const platformName = Capacitor.getPlatform();

/** Wall-clock time for things outside the simulation (save timestamps, new-run seeds). */
export const now = (): number => Date.now();
