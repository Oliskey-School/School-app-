/**
 * Account-level UI preferences that follow the user to a new device.
 *
 * Dark mode and the appearance (glass/accent) used to live only in this
 * browser's localStorage, so a new phone or laptop started from defaults.
 * They now also live on the account (User.ui_preferences). Rules:
 *   - a local change is applied instantly and pushed to the account (debounced,
 *     best-effort — the device keeps working offline);
 *   - on sign-in, the account copy is applied when it is NEWER than the last
 *     copy this device synced, so a fresh device picks the settings up and an
 *     older device catches up, while a live local choice is never clobbered by
 *     a stale server copy.
 */
import { api } from './api';

export interface UiPreferences {
    darkMode?: boolean;
    appearance?: Record<string, unknown>;
    updated_at?: string;
}

const SYNCED_AT_KEY = 'oliskey:prefs_synced_at';
export const PREFERENCES_APPLIED_EVENT = 'oliskey:preferences-applied';

let pending: Record<string, unknown> = {};
let timer: number | undefined;

/** Merge a change into the account copy (debounced). Safe to call often. */
export function syncUiPreference(patch: UiPreferences): void {
    pending = { ...pending, ...patch };
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
        const body = pending; pending = {}; timer = undefined;
        try {
            const res = await api.updateUiPreferences(body);
            const at = res?.ui_preferences?.updated_at;
            if (at) localStorage.setItem(SYNCED_AT_KEY, at);
        } catch { /* offline or signed out — the local copy still applies */ }
    }, 600);
}

/** Apply the account copy on this device if it is newer than what we last synced. */
export function applyAccountPreferences(prefs: UiPreferences | null | undefined, appearanceScope: string): boolean {
    if (!prefs || typeof prefs !== 'object' || !prefs.updated_at) return false;
    const lastSynced = localStorage.getItem(SYNCED_AT_KEY);
    if (lastSynced && lastSynced >= prefs.updated_at) return false;

    if (typeof prefs.darkMode === 'boolean') {
        localStorage.setItem('darkMode', String(prefs.darkMode));
        document.documentElement.classList.toggle('dark', prefs.darkMode);
    }
    if (prefs.appearance && typeof prefs.appearance === 'object') {
        // Same storage the appearance control reads, keyed per user+role.
        try { localStorage.setItem(`oliskey:appearance:${appearanceScope || 'guest'}`, JSON.stringify(prefs.appearance)); } catch { /* ignore */ }
    }
    localStorage.setItem(SYNCED_AT_KEY, prefs.updated_at);
    window.dispatchEvent(new CustomEvent(PREFERENCES_APPLIED_EVENT, { detail: prefs }));
    return true;
}
