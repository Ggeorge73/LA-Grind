import { App } from '@capacitor/app';
import { Haptics as CapHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import type { Haptics, Lifecycle, Storage } from './index';

/** Capacitor Preferences: native key-value storage the OS will not clear like web storage. */
export const nativeStorage: Storage = {
  async get(key) {
    return (await Preferences.get({ key })).value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  },
};

export const nativeLifecycle: Lifecycle = {
  onPause(handler) {
    const sub = App.addListener('pause', handler);
    return () => void sub.then((s) => s.remove());
  },
  onResume(handler) {
    const sub = App.addListener('resume', handler);
    return () => void sub.then((s) => s.remove());
  },
};

export const nativeHaptics: Haptics = {
  pulse(kind) {
    const run =
      kind === 'tap'
        ? CapHaptics.impact({ style: ImpactStyle.Light })
        : CapHaptics.notification({ type: kind === 'success' ? NotificationType.Success : NotificationType.Warning });
    run.catch(() => {});
  },
};
