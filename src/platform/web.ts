import type { Haptics, Lifecycle, Storage } from './index';

export const webStorage: Storage = {
  async get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Private mode or full storage: the game keeps running, it just will not persist.
    }
  },
  async remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const webLifecycle: Lifecycle = {
  onPause(handler) {
    const onVisibility = () => document.visibilityState === 'hidden' && handler();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', handler);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', handler);
    };
  },
  onResume(handler) {
    const onVisibility = () => document.visibilityState === 'visible' && handler();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  },
};

/** The web has no reliable haptics; this is deliberately a no-op. */
export const webHaptics: Haptics = {
  pulse() {},
};
