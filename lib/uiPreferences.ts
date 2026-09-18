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

// "Applied" marker is kept PER appearance scope (user + role). A single global
// marker was set by the first, role-less run of the sign-in effect and then
// blocked the real (user:role) run — so a new device silently stayed on the
// defaults even though the account held the saved look.
const appliedKey = (scope: string) => `oliskey:prefs_applied_at:${scope || 'guest'}`;
export const PREFERENCES_APPLIED_EVENT = 'oliskey:preferences-applied';

let pending: Record<string, unknown> = {};
let timer: number | undefined;
let currentScope = '';

/** Merge a change into the account copy (debounced). Safe to call often. */
export function syncUiPreference(patch: UiPreferences, scope?: string): void {
    if (scope) currentScope = scope;
    pending = { ...pending, ...patch };
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
        const body = pending; pending = {}; timer = undefined;
        try {
            const res = await api.updateUiPreferences(body);
            const at = res?.ui_preferences?.updated_at;
            // This device already shows what it just saved: mark it applied so the
            // next sign-in doesn't needlessly re-apply the same values.
            if (at && currentScope) localStorage.setItem(appliedKey(currentScope), at);
        } catch { /* offline or signed out — the local copy still applies */ }
    }, 600);
}

/** Apply the account copy on this device if this scope has not applied that version yet. */
export function applyAccountPreferences(prefs: UiPreferences | null | undefined, appearanceScope: string): boolean {
    if (!prefs || typeof prefs !== 'object' || !prefs.updated_at) return false;
    if (!appearanceScope || appearanceScope.endsWith(':')) return false; // role not known yet — wait for the real scope
    currentScope = appearanceScope;
    const lastApplied = localStorage.getItem(appliedKey(appearanceScope));
    if (lastApplied && lastApplied >= prefs.updated_at) return false;

    if (typeof prefs.darkMode === 'boolean') {
        localStorage.setItem('darkMode', String(prefs.darkMode));
        document.documentElement.classList.toggle('dark', prefs.darkMode);
    }
    if (prefs.appearance && typeof prefs.appearance === 'object') {
        // Same storage the appearance control reads, keyed per user+role.
        try { localStorage.setItem(`oliskey:appearance:${appearanceScope || 'guest'}`, JSON.stringify(prefs.appearance)); } catch { /* ignore */ }
    }
    localStorage.setItem(appliedKey(appearanceScope), prefs.updated_at);
    window.dispatchEvent(new CustomEvent(PREFERENCES_APPLIED_EVENT, { detail: prefs }));
    return true;
}
