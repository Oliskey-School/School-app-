/**
 * A once-a-day cache for AI results that do not need regenerating on every
 * screen open (e.g. a student's "Today's Learning Focus"). Keyed by feature,
 * subject id and the calendar day in Lagos, kept in this browser only.
 *
 * Storage can be unavailable (private mode, blocked site data); every access is
 * guarded so the feature simply regenerates instead of failing.
 */
const PREFIX = 'oliskey_ai_daily';

export function lagosDay(now = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const keyFor = (feature: string, id: string | number, day = lagosDay()) => `${PREFIX}:${feature}:${id}:${day}`;

export function readDailyCache<T>(feature: string, id: string | number): T | null {
    try {
        const raw = localStorage.getItem(keyFor(feature, id));
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

export function writeDailyCache<T>(feature: string, id: string | number, value: T): void {
    try {
        // Drop this feature's entries from earlier days so storage does not grow.
        const today = lagosDay();
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k.startsWith(`${PREFIX}:${feature}:`) && !k.endsWith(`:${today}`)) localStorage.removeItem(k);
        }
        localStorage.setItem(keyFor(feature, id, today), JSON.stringify(value));
    } catch {
        /* storage unavailable: the result is simply not cached */
    }
}
