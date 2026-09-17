import { useSyncExternalStore } from 'react';

/**
 * Low Data Mode — a per-device preference for expensive or unstable mobile
 * connections. When on, the app: loads photos/avatars only when tapped,
 * checks for updates half as often and prefers cached responses for longer,
 * drops the persistent realtime socket in favour of that polling, and
 * compresses uploads harder. Core school-management functions are unchanged.
 *
 * Stored per device (not per user): it describes the connection this device
 * is on, so a shared school computer keeps it across sign-ins. Also treated
 * as on when the browser itself reports Data Saver, without touching the
 * stored choice.
 */
const STORAGE_KEY = 'oliskey:low_data_mode';
export const LOW_DATA_EVENT = 'low-data-mode-change';

function stored(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

function browserDataSaver(): boolean {
  try { return !!(navigator as any).connection?.saveData; } catch { return false; }
}

export function isLowDataMode(): boolean {
  return stored() || browserDataSaver();
}

/** The user's explicit choice only (what the settings switch shows). */
export function isLowDataModeEnabledByUser(): boolean {
  return stored();
}

export function setLowDataMode(on: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(LOW_DATA_EVENT, { detail: { on: isLowDataMode() } }));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(LOW_DATA_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(LOW_DATA_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
};

/** Effective mode (user choice OR browser Data Saver); re-renders on change. */
export function useLowDataMode(): boolean {
  return useSyncExternalStore(subscribe, isLowDataMode, () => false);
}
