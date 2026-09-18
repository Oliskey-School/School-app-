import prisma from '../config/database';

/**
 * Term lookup service.
 *
 * The Lagos State / Nigerian academic year is three terms a session. Dates are
 * stored in the academic_calendars table so SuperAdmin can edit them each July
 * when Lagos publishes the new harmonised calendar — no redeploy required.
 *
 * All comparisons use Africa/Lagos (UTC+1, no DST). We compare against `Date`
 * objects because the DB stores TIMESTAMPTZ.
 */

export interface TermInfo {
    session: string;          // e.g. '2025/2026'
    term: number;             // 1 | 2 | 3
    resumption_date: Date;    // Term resumption (school resumes)
    closing_date: Date;       // Term closing (last day of school)
    label: string;            // 'Term 2 — 2025/2026'
    is_vacation: boolean;     // true if `date` is in vacation, term is upcoming
}

/**
 * Get the current term for a given date.
 *   - If date falls inside a term window → returns that term.
 *   - If date is in vacation → returns the NEXT upcoming term with is_vacation=true.
 *   - If no calendar rows match (e.g. past the last seeded session) → null.
 */
export async function getCurrentTerm(date: Date = new Date()): Promise<TermInfo | null> {
    // 1. In-term lookup
    const current = await prisma.academicCalendar.findFirst({
        where: {
            is_active: true,
            resumption_date: { lte: date },
            closing_date: { gte: date },
        },
        orderBy: { resumption_date: 'asc' },
    });

    if (current) {
        return {
            session: current.session,
            term: current.term,
            resumption_date: current.resumption_date,
            closing_date: current.closing_date,
            label: `Term ${current.term} — ${current.session}`,
            is_vacation: false,
        };
    }

    // 2. Vacation — return next upcoming term
    const upcoming = await prisma.academicCalendar.findFirst({
        where: {
            is_active: true,
            resumption_date: { gt: date },
        },
        orderBy: { resumption_date: 'asc' },
    });

    if (upcoming) {
        return {
            session: upcoming.session,
            term: upcoming.term,
            resumption_date: upcoming.resumption_date,
            closing_date: upcoming.closing_date,
            label: `Term ${upcoming.term} — ${upcoming.session} (upcoming)`,
            is_vacation: true,
        };
    }

    return null;
}

/**
 * Boot-time seed: if academic_calendars is empty, insert the 2025/2026 dates.
 * Safe to call multiple times. Real source of truth is the SQL migration —
 * this is a safety net for fresh dev databases.
 */
export async function seedAcademicCalendarIfEmpty(): Promise<void> {
    const count = await prisma.academicCalendar.count();
    if (count > 0) return;

    await prisma.academicCalendar.createMany({
        data: [
            { session: '2025/2026', term: 1, resumption_date: new Date('2025-09-15T00:00:00+01:00'), closing_date: new Date('2025-12-19T23:59:59+01:00') },
            { session: '2025/2026', term: 2, resumption_date: new Date('2026-01-12T00:00:00+01:00'), closing_date: new Date('2026-04-17T23:59:59+01:00') },
            { session: '2025/2026', term: 3, resumption_date: new Date('2026-05-04T00:00:00+01:00'), closing_date: new Date('2026-07-24T23:59:59+01:00') },
        ],
        skipDuplicates: true,
    });
    console.log('🌱 [TermService] Seeded Lagos State 2025/2026 academic calendar.');
}

/**
 * Standard Lagos-style term windows for the session that starts in September of
 * `startYear`. Used only when the calendar has no rows covering a date, so a
 * school can never be blocked from paying because nobody has typed in next
 * year's dates yet. SuperAdmin can still edit the generated rows afterwards.
 */
function standardSessionTerms(startYear: number) {
    const y = startYear, n = startYear + 1;
    const lagos = (d: string, end = false) => new Date(`${d}T${end ? '23:59:59' : '00:00:00'}+01:00`);
    return [
        { session: `${y}/${n}`, term: 1, resumption_date: lagos(`${y}-09-14`), closing_date: lagos(`${y}-12-18`, true) },
        { session: `${y}/${n}`, term: 2, resumption_date: lagos(`${n}-01-11`), closing_date: lagos(`${n}-04-16`, true) },
        { session: `${y}/${n}`, term: 3, resumption_date: lagos(`${n}-05-03`), closing_date: lagos(`${n}-07-23`, true) },
    ];
}

/**
 * Make sure the calendar has a term at (or after) `date`. Without this, the day
 * the last seeded session closes every paid activation fails with "No active
 * academic term configured" until someone adds the next session by hand.
 * Generates the standard windows for the session containing `date` (Sept → July)
 * when neither an in-term nor an upcoming row exists. Safe to call repeatedly.
 */
export async function ensureAcademicCalendarCoversDate(date: Date = new Date()): Promise<void> {
    if (await getCurrentTerm(date)) return;

    // A session starts in September: Jan–Aug belongs to the session that began the previous year.
    const startYear = date.getUTCMonth() >= 8 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
    const terms = standardSessionTerms(startYear);
    const session = terms[0].session;

    const existing = await prisma.academicCalendar.count({ where: { session } });
    if (existing > 0) return; // rows exist but are inactive/edited — leave SuperAdmin's choice alone

    await prisma.academicCalendar.createMany({ data: terms, skipDuplicates: true });
    console.log(`🌱 [TermService] Calendar had no term covering ${date.toISOString().slice(0, 10)} — generated standard ${session} session.`);
}

/**
 * List all terms in the active calendar — used by SuperAdmin UI to edit dates.
 */
export async function listAllTerms() {
    return prisma.academicCalendar.findMany({
        orderBy: [{ session: 'desc' }, { term: 'asc' }],
    });
}
