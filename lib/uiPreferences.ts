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
import { setLowDataMode } from './lowDataMode';
import { isDemoMode } from './apiHelpers';

export type ColorScheme = 'light' | 'dark' | 'system';

/**
 * How the dashboard's total cards are laid out.
 *
 * `comfortable` gives each card room for its full label on one or two lines;
 * `compact` fits more cards per row and shortens the label to suit. Both were
 * measured in the running app at 360-1600px: neither lets a label overflow its
 * card or split a word, which is what the fixed four-up layout did beside the
 * 256px sidebar (a 26px box for a 66px word at 1280).
 */
export type StatCardLayout = 'comfortable' | 'compact';

export interface UiPreferences {
    /** Legacy boolean kept for older saved copies; colorScheme wins when present. */
    darkMode?: boolean;
    colorScheme?: ColorScheme;
    statCardLayout?: StatCardLayout;
    appearance?: Record<string, unknown>;
    /**
     * Low Data Mode. It is still stored per device (a shared school computer
     * keeps it across sign-ins), but the user's own choice now also rides on
     * the account so it follows them to a new phone or laptop.
     */
    lowDataMode?: boolean;
    updated_at?: string;
}

const SCHEME_KEY = 'colorScheme';
const STAT_CARDS_KEY = 'statCardLayout';
const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function getColorScheme(): ColorScheme {
    try {
        const s = localStorage.getItem(SCHEME_KEY);
        if (s === 'light' || s === 'dark' || s === 'system') return s;
        return localStorage.getItem('darkMode') === 'true' ? 'dark' : 'light';
    } catch { return 'light'; }
}

/** Resolve + apply a scheme on this device (html.dark drives styles/dark-theme.css). */
export function applyColorScheme(scheme: ColorScheme, opts: { sync?: boolean } = {}): void {
    const dark = scheme === 'dark' || (scheme === 'system' && systemDark());
    document.documentElement.classList.toggle('dark', dark);
    try {
        localStorage.setItem(SCHEME_KEY, scheme);
        localStorage.setItem('darkMode', String(dark));
    } catch { /* storage unavailable */ }
    if (opts.sync) syncUiPreference({ colorScheme: scheme, darkMode: dark });
    window.dispatchEvent(new CustomEvent(PREFERENCES_APPLIED_EVENT, { detail: { colorScheme: scheme } }));
}

export function getStatCardLayout(): StatCardLayout {
    try {
        // Compact is the default: it is what the owner chose as the standard look.
        return localStorage.getItem(STAT_CARDS_KEY) === 'comfortable' ? 'comfortable' : 'compact';
    } catch { return 'compact'; }
}

/** Apply on this device, remember it, and (optionally) push to the account. */
export function applyStatCardLayout(layout: StatCardLayout, opts: { sync?: boolean } = {}): void {
    try { localStorage.setItem(STAT_CARDS_KEY, layout); } catch { /* storage unavailable */ }
    if (opts.sync) syncUiPreference({ statCardLayout: layout });
    window.dispatchEvent(new CustomEvent(PREFERENCES_APPLIED_EVENT, { detail: { statCardLayout: layout } }));
}

let systemListener: MediaQueryList | null = null;
/** Keep "system" in step with the OS while the app is open. */
export function watchSystemScheme(): void {
    if (systemListener || typeof window === 'undefined' || !window.matchMedia) return;
    systemListener = window.matchMedia('(prefers-color-scheme: dark)');
    systemListener.addEventListener('change', () => { if (getColorScheme() === 'system') applyColorScheme('system'); });
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
    // Demo accounts are shared by every visitor: one visitor's look must not
    // become everyone's. Keep it on this device only.
    if (isDemoMode()) return;
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
    // Shared demo account: ignore whatever earlier visitors saved to it.
    if (isDemoMode()) return false;
    if (!appearanceScope || appearanceScope.endsWith(':')) return false; // role not known yet — wait for the real scope
    currentScope = appearanceScope;
    const lastApplied = localStorage.getItem(appliedKey(appearanceScope));
    if (lastApplied && lastApplied >= prefs.updated_at) return false;

    if (prefs.colorScheme === 'light' || prefs.colorScheme === 'dark' || prefs.colorScheme === 'system') {
        applyColorScheme(prefs.colorScheme);
    } else if (typeof prefs.darkMode === 'boolean') {
        applyColorScheme(prefs.darkMode ? 'dark' : 'light');
    }
    if (prefs.statCardLayout === 'comfortable' || prefs.statCardLayout === 'compact') {
        applyStatCardLayout(prefs.statCardLayout);
    }
    if (typeof prefs.lowDataMode === 'boolean') {
        // Apply without syncing back — this value came FROM the account.
        setLowDataMode(prefs.lowDataMode, { sync: false });
    }
    if (prefs.appearance && typeof prefs.appearance === 'object') {
        // Same storage the appearance control reads, keyed per user+role.
        try { localStorage.setItem(`oliskey:appearance:${appearanceScope || 'guest'}`, JSON.stringify(prefs.appearance)); } catch { /* ignore */ }
    }
    localStorage.setItem(appliedKey(appearanceScope), prefs.updated_at);
    window.dispatchEvent(new CustomEvent(PREFERENCES_APPLIED_EVENT, { detail: prefs }));
    return true;
}
