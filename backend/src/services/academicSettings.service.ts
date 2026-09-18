import prisma from '../config/database';

/**
 * Configurable academics with a fallback chain:
 *   branch override  →  school default  →  built-in default
 *
 * A branch row (branch_id set) overrides the school default (branch_id NULL).
 */

export interface TermDef { name: string; order: number; start_date?: string; end_date?: string; is_current?: boolean; }
export interface GradeBand { min: number; max: number; grade: string; remark: string; }
export interface GradingDef { ca_percent: number; exam_percent: number; bands: GradeBand[]; }

export const DEFAULT_TERMS: TermDef[] = [
    { name: 'First Term', order: 1, is_current: true },
    { name: 'Second Term', order: 2 },
    { name: 'Third Term', order: 3 },
];

export const DEFAULT_GRADING: GradingDef = {
    ca_percent: 0.4,
    exam_percent: 0.6,
    bands: [
        { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
        { min: 60, max: 69, grade: 'B', remark: 'Very Good' },
        { min: 50, max: 59, grade: 'C', remark: 'Good' },
        { min: 45, max: 49, grade: 'D', remark: 'Pass' },
        { min: 40, max: 44, grade: 'E', remark: 'Weak Pass' },
        { min: 0, max: 39, grade: 'F', remark: 'Fail' },
    ],
};

export class AcademicSettingsService {
    /** Effective settings for a branch (or the school when no branch given). */
    static async getEffective(schoolId: string, branchId?: string | null): Promise<{ terms: TermDef[]; grading: GradingDef; source: 'branch' | 'school' | 'default' }> {
        const orClauses: any[] = [{ branch_id: null }];
        if (branchId) orClauses.push({ branch_id: branchId });
        const rows = await prisma.academicSettings.findMany({ where: { school_id: schoolId, OR: orClauses } });

        const branchRow = branchId ? rows.find(r => r.branch_id === branchId) : undefined;
        const schoolRow = rows.find(r => r.branch_id === null);

        const terms = (branchRow?.terms as any) ?? (schoolRow?.terms as any) ?? DEFAULT_TERMS;
        const grading = (branchRow?.grading as any) ?? (schoolRow?.grading as any) ?? DEFAULT_GRADING;
        const source: 'branch' | 'school' | 'default' = branchRow?.terms ? 'branch' : (schoolRow?.terms ? 'school' : 'default');
        return { terms, grading, source };
    }

    /** The raw row for one scope (for the editor: shows what's actually configured, not the fallback). */
    static async getRaw(schoolId: string, branchId?: string | null) {
        return prisma.academicSettings.findFirst({ where: { school_id: schoolId, branch_id: branchId ?? null } });
    }

    /** Create or update the (school, branch) settings row. */
    static async save(schoolId: string, branchId: string | null, data: { terms?: TermDef[]; grading?: GradingDef }) {
        const existing = await prisma.academicSettings.findFirst({ where: { school_id: schoolId, branch_id: branchId ?? null } });
        const payload = {
            terms: (data.terms ?? (existing?.terms as any) ?? DEFAULT_TERMS) as any,
            grading: (data.grading ?? (existing?.grading as any) ?? DEFAULT_GRADING) as any,
        };
        if (existing) {
            return prisma.academicSettings.update({ where: { id: existing.id }, data: { ...payload, updated_at: new Date() } });
        }
        return prisma.academicSettings.create({ data: { school_id: schoolId, branch_id: branchId ?? null, ...payload } });
    }
}

/**
 * The calendar windows the terms of a session cover — ONE rule for every
 * feature that has to turn "First Term 2026/2027" into dates (attendance day
 * counts on report cards, term dashboards).
 *
 * The windows are GAPLESS: a session runs 1 Aug → 31 Jul, the first term
 * starts on 1 Aug, every later term starts the day after the previous one
 * closes, and the last term runs to the end of the session. Only the CLOSING
 * dates are taken from configuration, in this order of precedence:
 *   1. dates typed into the school's own term settings (end_date);
 *   2. the platform academic calendar (AcademicCalendar closing_date);
 *   3. the standard Nigerian calendar (mid-Dec, mid-Apr).
 * Gapless matters: a school that resumes and marks the register a week before
 * the official resumption date must still have those days counted — an
 * earlier version keyed on resumption dates and silently dropped them.
 */
export interface TermWindow { name: string; index: number; start: Date; end: Date; source: 'school' | 'calendar' | 'standard'; }

const ORDINALS = ['first', 'second', 'third'];
const lagos = (d: string, end = false) => new Date(`${d}T${end ? '23:59:59' : '00:00:00'}+01:00`);
const dayAfter = (d: Date) => { const n = new Date(d); n.setUTCDate(n.getUTCDate() + 1); n.setUTCHours(0, 0, 0, 0); return new Date(n.getTime() - 60 * 60 * 1000); }; // 00:00 Lagos

export function sessionStartYear(session: string): number {
    const y = parseInt(String(session || '').split('/')[0], 10);
    if (Number.isFinite(y)) return y;
    const now = new Date();
    return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

/** Standard closing dates (Lagos) for term index 0..2 of a session. */
export function standardTermClose(session: string, index: number): Date {
    const y = sessionStartYear(session), n = y + 1;
    return [lagos(`${y}-12-18`, true), lagos(`${n}-04-16`, true), lagos(`${n}-07-31`, true)][Math.min(Math.max(index, 0), 2)];
}

/** Index (0-based) of a term name within the configured list; falls back to the ordinal in the name. */
export function termIndexFromName(terms: TermDef[], termName: string): number {
    const wanted = String(termName || '').trim().toLowerCase();
    const sorted = [...terms].sort((a, b) => (a.order || 0) - (b.order || 0));
    const i = sorted.findIndex(t => String(t.name || '').trim().toLowerCase() === wanted);
    if (i >= 0) return i;
    const ord = ORDINALS.findIndex(o => wanted.includes(o));
    if (ord >= 0) return ord;
    const num = parseInt(wanted.replace(/\D/g, ''), 10);
    return Number.isFinite(num) && num >= 1 && num <= 3 ? num - 1 : 0;
}

export async function resolveTermWindows(schoolId: string, branchId: string | null | undefined, session: string): Promise<TermWindow[]> {
    const eff = await AcademicSettingsService.getEffective(schoolId, branchId ?? undefined);
    const terms: TermDef[] = Array.isArray(eff.terms) && eff.terms.length ? eff.terms : DEFAULT_TERMS;
    const sorted = [...terms].sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 3);
    const y = sessionStartYear(session);
    const sessionStart = lagos(`${y}-08-01`);
    const sessionEnd = lagos(`${y + 1}-07-31`, true);
    const calendar = await prisma.academicCalendar.findMany({ where: { session, is_active: true } }).catch(() => [] as any[]);

    const closes: { end: Date; source: TermWindow['source'] }[] = sorted.map((def, i) => {
        if (def?.end_date) {
            const end = lagos(String(def.end_date).slice(0, 10), true);
            if (!isNaN(end.getTime()) && end > sessionStart && end <= sessionEnd) return { end, source: 'school' };
        }
        const row = calendar.find((r: any) => r.term === i + 1);
        if (row?.closing_date) return { end: new Date(row.closing_date), source: 'calendar' };
        return { end: standardTermClose(session, i), source: 'standard' };
    });

    const windows: TermWindow[] = [];
    let cursor = sessionStart;
    for (let i = 0; i < sorted.length; i++) {
        const last = i === sorted.length - 1;
        let end = last ? new Date(Math.max(closes[i].end.getTime(), sessionEnd.getTime())) : closes[i].end;
        if (end <= cursor) end = dayAfter(cursor); // mis-ordered configuration: never produce an empty/negative window
        windows.push({ name: sorted[i].name, index: i, start: cursor, end, source: closes[i].source });
        cursor = dayAfter(end);
    }
    return windows;
}

export async function resolveTermWindow(schoolId: string, branchId: string | null | undefined, termName: string, session: string): Promise<TermWindow> {
    const windows = await resolveTermWindows(schoolId, branchId, session);
    const index = termIndexFromName(windows.map(w => ({ name: w.name, order: w.index + 1 })), termName);
    return windows[Math.min(index, windows.length - 1)];
}

/**
 * Which term (name + session) a date falls in, using the same gapless windows.
 */
export async function resolveCurrentTerm(schoolId: string, branchId: string | null | undefined, date: Date = new Date()): Promise<{ term: string; session: string; window: TermWindow }> {
    // Aug→Dec belongs to the session starting this year; Jan→Jul to the one before.
    const y = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
    const session = `${y}/${y + 1}`;
    const windows = await resolveTermWindows(schoolId, branchId, session);
    const pick = windows.find(w => date >= w.start && date <= w.end) || windows[windows.length - 1];
    return { term: pick.name, session, window: pick };
}
