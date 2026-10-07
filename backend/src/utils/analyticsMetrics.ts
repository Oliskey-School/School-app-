/**
 * Pure calculations behind the admin Analytics cards (Fee Compliance, Teacher
 * Workload, Attendance Trend). Kept free of Prisma so they can be unit-tested;
 * DashboardService does the tenant-scoped reads and hands the rows in here.
 */

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

/** Calendar day key (YYYY-MM-DD) of a local Date. */
export function localDayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Fee Compliance
// ---------------------------------------------------------------------------

export interface FeeRow { status: string | null; amount: number | null; paid_amount: number | null; due_date: Date | string | null }

export interface FeeSummary {
    paid: number; overdue: number; unpaid: number;   // percentages (sum to ~100)
    paidCount: number; overdueCount: number; unpaidCount: number;
    total: number;                                   // number of fee records
}

/**
 * Buckets every fee into exactly one of Paid / Overdue / Unpaid so the three
 * percentages add up. Status strings are matched case-insensitively ("paid",
 * "Paid"); a fee whose paid_amount covers its amount counts as Paid even if the
 * status was never flipped; "Partial" and "Pending" fees count as Overdue once
 * their due date has passed, otherwise as Unpaid.
 */
export function summarizeFees(rows: FeeRow[], now: Date = new Date()): FeeSummary {
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    let paidCount = 0, overdueCount = 0, unpaidCount = 0;
    for (const r of rows) {
        const status = norm(r.status);
        const amount = Number(r.amount) || 0;
        const paidAmt = Number(r.paid_amount) || 0;
        if (status === 'paid' || status === 'completed' || (amount > 0 && paidAmt >= amount)) { paidCount++; continue; }
        const due = r.due_date ? new Date(r.due_date) : null;
        const pastDue = !!due && !isNaN(due.getTime()) && due < startOfToday;
        if (status === 'overdue' || pastDue) overdueCount++;
        else unpaidCount++;
    }
    const total = paidCount + overdueCount + unpaidCount;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return { paid: pct(paidCount), overdue: pct(overdueCount), unpaid: pct(unpaidCount), paidCount, overdueCount, unpaidCount, total };
}

// ---------------------------------------------------------------------------
// Attendance trend
// ---------------------------------------------------------------------------

export interface AttendanceRow { date: Date | string; status: string | null }
export interface AttendanceDay { date: string; rate: number | null; present: number; late: number; total: number }

/**
 * One entry per calendar day for the last `days` days (oldest first, today
 * last). `rate` is (present + late) / marked — the same rule the attendance
 * service uses — and is null on a day with no register taken (weekend, holiday,
 * not marked yet) so the chart can leave a gap instead of plotting 0%.
 *
 * Attendance.date is a DATE column: Prisma returns it as UTC midnight, so the
 * row's calendar day is its UTC date; "today" is the server's local day.
 */
export function buildAttendanceTrend(rows: AttendanceRow[], now: Date = new Date(), days = 7): AttendanceDay[] {
    const byDay = new Map<string, { present: number; late: number; total: number }>();
    for (const row of rows) {
        const d = new Date(row.date);
        if (isNaN(d.getTime())) continue;
        const key = d.toISOString().slice(0, 10);
        const c = byDay.get(key) || { present: 0, late: 0, total: 0 };
        c.total += 1;
        const s = norm(row.status);
        if (s === 'present') c.present += 1;
        else if (s === 'late') c.late += 1;
        byDay.set(key, c);
    }
    const out: AttendanceDay[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
        const key = localDayKey(d);
        const c = byDay.get(key);
        out.push(c && c.total > 0
            ? { date: key, rate: Math.round(((c.present + c.late) / c.total) * 100), present: c.present, late: c.late, total: c.total }
            : { date: key, rate: null, present: 0, late: 0, total: 0 });
    }
    return out;
}

// ---------------------------------------------------------------------------
// Teacher workload
// ---------------------------------------------------------------------------

export interface WorkloadTeacher { id: string; full_name: string }
export interface WorkloadAssignment { teacher_id: string; class_id: string | null; class_name: string | null; subject_name: string | null }
export interface WorkloadLesson { teacher_id: string | null; class_id: string | null; class_name: string | null; subject: string | null; day_of_week: number | null; start_time: string | null; end_time: string | null }
export interface WorkloadEntry { label: string; name: string; value: number; lessons: number }

const toMinutes = (t: string | null) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? '').trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

/**
 * Weekly teaching hours per teacher, in the order the teachers are given.
 *
 * A lesson is credited to a teacher the same way the teacher's own timetable
 * is built (TimetableService): through their ClassTeacher assignments (same
 * subject AND same class, by id or by name). Only when a teacher has no
 * subject-level assignment do we fall back to the lesson's raw teacher_id —
 * demo/editor data often stamps one teacher_id on every lesson, which is what
 * inflated one teacher to thousands of hours.
 *
 * Overlapping lessons are merged per teacher per day (sort by start, then
 * union): a teacher cannot teach two lessons at once, so repeated saves of the
 * same timetable, or two entries that overlap in time, are counted once.
 * `lessons` is the number of merged teaching blocks.
 */
export function computeWorkload(teachers: WorkloadTeacher[], assignments: WorkloadAssignment[], lessons: WorkloadLesson[]): WorkloadEntry[] {
    const byTeacher = new Map<string, WorkloadAssignment[]>();
    for (const a of assignments) {
        if (!a.class_id && !a.class_name) continue;
        if (!a.subject_name) continue;
        const list = byTeacher.get(a.teacher_id) || [];
        list.push(a); byTeacher.set(a.teacher_id, list);
    }
    return teachers.map((t) => {
        const mine = byTeacher.get(t.id) || [];
        const matches = (l: WorkloadLesson) => mine.length > 0
            ? mine.some((a) => norm(a.subject_name) === norm(l.subject)
                && ((!!a.class_id && a.class_id === l.class_id) || (!!a.class_name && norm(a.class_name) === norm(l.class_name))))
            : l.teacher_id === t.id;
        // Collect each matching lesson as a [start, end) interval per day, then
        // merge overlapping/duplicate intervals so a teacher is never credited
        // for two lessons at the same time (e.g. 08:00-08:45 and 08:00-09:00
        // on the same day count as one 08:00-09:00 block = 1h).
        const byDay = new Map<string, Array<[number, number]>>();
        for (const l of lessons) {
            if (!matches(l)) continue;
            const start = toMinutes(l.start_time), end = toMinutes(l.end_time);
            if (!(end - start > 0)) continue;
            const day = String(l.day_of_week ?? '-');
            const list = byDay.get(day) || [];
            list.push([start, end]); byDay.set(day, list);
        }
        let minutes = 0, blocks = 0;
        byDay.forEach((list) => {
            list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            let [cs, ce] = list[0];
            for (let i = 1; i < list.length; i++) {
                const [s2, e2] = list[i];
                if (s2 < ce) { ce = Math.max(ce, e2); continue; }
                minutes += ce - cs; blocks++; [cs, ce] = [s2, e2];
            }
            minutes += ce - cs; blocks++;
        });
        const name = (t.full_name || '').trim() || 'Teacher';
        return { label: name.split(/\s+/)[0], name, value: Math.round((minutes / 60) * 100) / 100, lessons: blocks };
    });
}

// ---------------------------------------------------------------------------
// Student performance
// ---------------------------------------------------------------------------

/** Subjects A-Z (case-insensitive, then exact) so "the first 10" is stable between loads. */
export function sortBySubject<T extends { label: string }>(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
        const x = String(a.label ?? ''), y = String(b.label ?? '');
        return x.localeCompare(y, 'en', { sensitivity: 'base' }) || (x < y ? -1 : x > y ? 1 : 0);
    });
}
