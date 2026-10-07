/**
 * Small pure helpers for the admin Analytics cards (kept out of the component
 * so they can be unit-tested).
 */

/** First `limit` items while collapsed, every item when expanded. Order is kept. */
export function visibleItems<T>(items: T[], limit: number, expanded: boolean): T[] {
    if (!Array.isArray(items)) return [];
    return expanded ? items : items.slice(0, limit);
}

/** How many items are hidden behind "See more". */
export function hiddenCount(items: unknown[], limit: number): number {
    return Array.isArray(items) ? Math.max(0, items.length - limit) : 0;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface EnrollmentPoint { key: string; short: string; long: string; count: number }

/**
 * Turns the backend's per-month enrollment rows ({ label: 'YYYY-MM', count })
 * into chart points, filling the months in between with 0 (a month with no new
 * students really is zero). A row without a month (the backend's whole-year
 * fallback) is shown as that year.
 */
export function enrollmentPoints(rows: { year?: number; label?: string; count?: number }[]): EnrollmentPoint[] {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const monthly = new Map<string, number>();
    const yearly: EnrollmentPoint[] = [];
    for (const r of rows) {
        const m = /^(\d{4})-(\d{2})$/.exec(String(r.label ?? ''));
        if (m) monthly.set(`${m[1]}-${m[2]}`, (monthly.get(`${m[1]}-${m[2]}`) || 0) + (Number(r.count) || 0));
        else { const y = String(r.year ?? r.label ?? ''); yearly.push({ key: y, short: y, long: y, count: Number(r.count) || 0 }); }
    }
    if (monthly.size === 0) return yearly;
    const keys = [...monthly.keys()].sort();
    let [y, mo] = keys[0].split('-').map(Number);
    const [ey, em] = keys[keys.length - 1].split('-').map(Number);
    const out: EnrollmentPoint[] = [];
    while (y < ey || (y === ey && mo <= em)) {
        const key = `${y}-${String(mo).padStart(2, '0')}`;
        out.push({ key, short: `${MONTHS[mo - 1]} ${String(y).slice(2)}`, long: `${MONTHS[mo - 1]} ${y}`, count: monthly.get(key) || 0 });
        mo += 1; if (mo > 12) { mo = 1; y += 1; }
    }
    return out;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 'YYYY-MM-DD' -> { short: 'Mon 28', long: 'Monday 28 Sep' } without timezone drift. */
export function dayLabels(isoDay: string): { short: string; long: string } {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay || '');
    if (!m) return { short: isoDay, long: isoDay };
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const longDay = d.toLocaleDateString('en-GB', { weekday: 'long' });
    return { short: `${DAYS[d.getDay()]} ${d.getDate()}`, long: `${longDay} ${d.getDate()} ${MONTHS[d.getMonth()]}` };
}
