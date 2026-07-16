import prisma from '../config/database';

// Grace rules (minutes). A scan-in more than LATE_GRACE after the scheduled
// start is "late"; a scan-out more than EARLY_GRACE before the scheduled end
// is an "early departure". Scans are only accepted from SCAN_WINDOW_BEFORE
// minutes before the start until the scheduled end of the lesson.
const LATE_GRACE_MIN = 10;
const EARLY_GRACE_MIN = 10;
const SCAN_WINDOW_BEFORE_MIN = 15;

function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Timetable day_of_week: 1=Mon .. 7=Sun; JS getDay(): 0=Sun .. 6=Sat.
function toIsoDayOfWeek(d: Date): number {
    return d.getDay() === 0 ? 7 : d.getDay();
}

// "HH:MM" on the given date -> Date (server local time).
function timeOnDate(date: Date, hhmm: string): Date | null {
    const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
    if (!m) return null;
    const d = new Date(date);
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d;
}

export class LessonAttendanceService {
    /**
     * Handle a teacher scanning a classroom QR code. The first valid scan of
     * the day for a lesson records the start; the second records the end.
     */
    static async scan(schoolId: string, teacherId: string, qrToken: string) {
        if (!qrToken?.trim()) throw new Error('No QR code provided');

        // Token must resolve to a classroom in the SAME school — a token from
        // another school behaves exactly like an unknown one.
        const classroom = await (prisma as any).classroom.findFirst({
            where: { qr_token: qrToken.trim(), school_id: schoolId, deleted_at: null },
        });
        if (!classroom) throw new Error('This QR code is not a valid classroom code for your school');

        const now = new Date();
        const dateStr = toLocalDateStr(now);
        const dow = toIsoDayOfWeek(now);

        // All of today's published lessons for this teacher in this classroom.
        const lessons = await prisma.timetable.findMany({
            where: {
                school_id: schoolId,
                teacher_id: teacherId,
                classroom_id: classroom.id,
                day_of_week: dow,
                status: 'Published',
                deleted_at: null,
            },
        });
        if (lessons.length === 0) {
            throw new Error(`You have no scheduled lesson in ${classroom.name} today`);
        }

        const existing = await (prisma as any).lessonAttendance.findMany({
            where: { timetable_id: { in: lessons.map(l => l.id) }, date: dateStr },
        });
        const byTimetable = new Map<string, any>(existing.map((r: any) => [r.timetable_id, r]));

        // 1) An open record (scanned in, not out) takes priority → scan-out.
        const openLesson = lessons.find(l => {
            const rec = byTimetable.get(l.id);
            return rec?.scan_in_at && !rec.scan_out_at;
        });
        if (openLesson) {
            const rec = byTimetable.get(openLesson.id);
            const end = timeOnDate(now, openLesson.end_time);
            const isEarly = !!end && now.getTime() < end.getTime() - EARLY_GRACE_MIN * 60_000;
            const durationMin = Math.max(0, Math.round((now.getTime() - new Date(rec.scan_in_at).getTime()) / 60_000));

            const updated = await (prisma as any).lessonAttendance.update({
                where: { id: rec.id },
                data: {
                    scan_out_at: now,
                    duration_minutes: durationMin,
                    is_early_departure: isEarly,
                    status: 'completed',
                },
            });
            return { action: 'out', classroom: classroom.name, lesson: openLesson, record: updated };
        }

        // 2) Otherwise this is a scan-in: find a lesson whose scan window
        //    (start - 15min .. end) contains "now" and hasn't been completed.
        const inWindow = lessons.filter(l => {
            if (byTimetable.get(l.id)?.scan_out_at) return false; // already done
            const start = timeOnDate(now, l.start_time);
            const end = timeOnDate(now, l.end_time);
            if (!start || !end) return false;
            return now.getTime() >= start.getTime() - SCAN_WINDOW_BEFORE_MIN * 60_000
                && now.getTime() <= end.getTime();
        });
        if (inWindow.length === 0) {
            throw new Error(`It is not time for any of your lessons in ${classroom.name}. Scanning opens ${SCAN_WINDOW_BEFORE_MIN} minutes before your lesson starts.`);
        }

        // Back-to-back overlap: prefer the lesson already in progress, then the
        // one starting soonest.
        inWindow.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
        const current = inWindow.find(l => {
            const start = timeOnDate(now, l.start_time);
            return !!start && now.getTime() >= start.getTime();
        });
        const lesson = current || inWindow[0];

        const start = timeOnDate(now, lesson.start_time)!;
        const isLate = now.getTime() > start.getTime() + LATE_GRACE_MIN * 60_000;

        const record = await (prisma as any).lessonAttendance.create({
            data: {
                school_id: schoolId,
                branch_id: lesson.branch_id ?? classroom.branch_id ?? null,
                timetable_id: lesson.id,
                teacher_id: teacherId,
                classroom_id: classroom.id,
                date: dateStr,
                subject: lesson.subject,
                class_name: lesson.class_name ?? null,
                scheduled_start: lesson.start_time,
                scheduled_end: lesson.end_time,
                scan_in_at: now,
                is_late: isLate,
                status: 'in_progress',
            },
        });
        return { action: 'in', classroom: classroom.name, lesson, record };
    }

    /**
     * Today's status of each of the teacher's own lessons (for the teacher UI).
     */
    static async getTeacherToday(schoolId: string, teacherId: string) {
        const now = new Date();
        const dateStr = toLocalDateStr(now);
        const records = await (prisma as any).lessonAttendance.findMany({
            where: { school_id: schoolId, teacher_id: teacherId, date: dateStr, deleted_at: null },
            include: { classroom: { select: { name: true } } },
        });
        return records;
    }

    /**
     * Admin daily report: every published, classroom-linked lesson scheduled
     * for `date`, joined with its scan record (if any) and given a derived
     * status the dashboard can render directly.
     */
    static async getDailyReport(schoolId: string, branchId: string | undefined, date?: string) {
        const now = new Date();
        const dateStr = date || toLocalDateStr(now);
        const target = new Date(`${dateStr}T12:00:00`);
        const dow = toIsoDayOfWeek(target);
        const isToday = dateStr === toLocalDateStr(now);

        const lessonWhere: any = {
            school_id: schoolId,
            day_of_week: dow,
            status: 'Published',
            classroom_id: { not: null },
            teacher_id: { not: null },
            deleted_at: null,
        };
        if (branchId && branchId !== 'all') lessonWhere.branch_id = branchId;

        const [lessons, records] = await Promise.all([
            prisma.timetable.findMany({
                where: lessonWhere,
                include: {
                    teacher: { select: { id: true, full_name: true, school_generated_id: true } },
                    classroom: { select: { id: true, name: true } },
                },
                orderBy: { start_time: 'asc' },
            } as any),
            (prisma as any).lessonAttendance.findMany({
                where: {
                    school_id: schoolId,
                    date: dateStr,
                    deleted_at: null,
                    ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
                },
            }),
        ]);
        const byTimetable = new Map<string, any>(records.map((r: any) => [r.timetable_id, r]));

        const rows = (lessons as any[]).map(l => {
            const rec = byTimetable.get(l.id) || null;
            const end = timeOnDate(target, l.end_time);
            const start = timeOnDate(target, l.start_time);

            // Derived status for the dashboard:
            //   completed / no_scan_out / in_progress  — from the scan record
            //   missed    — no scan and the lesson is over (or the date is past)
            //   upcoming  — no scan yet, lesson hasn't reached its window (today only)
            //   pending   — no scan yet, but the scan window is open (today only)
            let derived: string;
            if (rec) {
                derived = rec.status;
            } else if (!isToday || (end && now.getTime() > end.getTime())) {
                derived = 'missed';
            } else if (start && now.getTime() >= start.getTime() - SCAN_WINDOW_BEFORE_MIN * 60_000) {
                derived = 'pending';
            } else {
                derived = 'upcoming';
            }

            return {
                timetable_id: l.id,
                teacher_id: l.teacher?.id ?? l.teacher_id,
                teacher_name: l.teacher?.full_name ?? 'Unknown',
                teacher_generated_id: l.teacher?.school_generated_id ?? null,
                subject: l.subject,
                class_name: l.class_name,
                classroom_id: l.classroom?.id ?? l.classroom_id,
                classroom_name: l.classroom?.name ?? null,
                scheduled_start: l.start_time,
                scheduled_end: l.end_time,
                date: dateStr,
                status: derived,
                scan_in_at: rec?.scan_in_at ?? null,
                scan_out_at: rec?.scan_out_at ?? null,
                duration_minutes: rec?.duration_minutes ?? null,
                is_late: rec?.is_late ?? false,
                is_early_departure: rec?.is_early_departure ?? false,
            };
        });

        // Per-teacher daily summary.
        const summaryMap = new Map<string, any>();
        for (const r of rows) {
            const key = r.teacher_id || r.teacher_name;
            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    teacher_id: r.teacher_id,
                    teacher_name: r.teacher_name,
                    teacher_generated_id: r.teacher_generated_id,
                    assigned: 0, completed: 0, missed: 0, in_progress: 0,
                    no_scan_out: 0, late: 0, early_departure: 0, upcoming: 0, pending: 0,
                });
            }
            const s = summaryMap.get(key);
            s.assigned += 1;
            if (r.status === 'completed') s.completed += 1;
            else if (r.status === 'missed') s.missed += 1;
            else if (r.status === 'in_progress') s.in_progress += 1;
            else if (r.status === 'no_scan_out') s.no_scan_out += 1;
            else if (r.status === 'pending') s.pending += 1;
            else if (r.status === 'upcoming') s.upcoming += 1;
            if (r.is_late) s.late += 1;
            if (r.is_early_departure) s.early_departure += 1;
        }

        return { date: dateStr, lessons: rows, summary: Array.from(summaryMap.values()) };
    }

    /**
     * Close out stale records. Runs periodically on the server:
     *  - any record still in_progress past its scheduled end is closed with
     *    duration up to the scheduled end and flagged "no_scan_out".
     * Missed lessons (never scanned) are derived at report time, so no rows
     * need to be written for them.
     */
    static async autoCloseStale() {
        const now = new Date();
        const open = await (prisma as any).lessonAttendance.findMany({
            where: { status: 'in_progress', deleted_at: null },
        });

        let closed = 0;
        for (const rec of open) {
            // Reconstruct the scheduled end on the record's own date.
            const end = timeOnDate(new Date(`${rec.date}T12:00:00`), rec.scheduled_end);
            if (!end || now.getTime() <= end.getTime()) continue;

            const scanIn = rec.scan_in_at ? new Date(rec.scan_in_at) : null;
            const durationMin = scanIn
                ? Math.max(0, Math.round((end.getTime() - scanIn.getTime()) / 60_000))
                : null;
            await (prisma as any).lessonAttendance.update({
                where: { id: rec.id },
                data: { status: 'no_scan_out', duration_minutes: durationMin },
            });
            closed += 1;
        }
        return { closed };
    }
}
