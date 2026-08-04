import { ReportCard, ReportCardAcademicRecord } from '../types';

/** The three terms every school session is built from, in order. */
export const CANONICAL_TERMS = ['First Term', 'Second Term', 'Third Term'];

export function gradeFromTotal(total: number): string {
    if (total >= 70) return 'A';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 45) return 'D';
    return 'F';
}

/**
 * Combines a set of already-published term report cards (First/Second/Third
 * Term, same session) into one cumulative result — the standard "annual"
 * view shown alongside a Third Term report card. Each subject's total is
 * the average of whichever terms actually have a score for it, so a
 * subject missing one term's result still gets averaged from the terms it
 * does have rather than being blocked entirely. Attendance is summed
 * across the terms used, since it's a running count for the whole session
 * rather than a per-term rate.
 */
export function buildAnnualReportCard(termReports: ReportCard[]): ReportCard | null {
    const usable = termReports.filter(r => CANONICAL_TERMS.includes(r.term));
    if (usable.length === 0) return null;

    const bySubject = new Map<string, number[]>();
    usable.forEach(r => {
        (r.academicRecords || []).forEach(rec => {
            const total = Number(rec.total);
            if (!rec.subject || Number.isNaN(total)) return;
            if (!bySubject.has(rec.subject)) bySubject.set(rec.subject, []);
            bySubject.get(rec.subject)!.push(total);
        });
    });

    const academicRecords: ReportCardAcademicRecord[] = Array.from(bySubject.entries()).map(([subject, totals]) => {
        const avg = Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10;
        return {
            subject,
            test1: 0,
            test2: 0,
            exam: 0,
            total: avg,
            grade: gradeFromTotal(avg),
            remark: '',
        };
    });

    const attendance = usable.reduce((acc, r) => ({
        total: acc.total + (r.attendance?.total || 0),
        present: acc.present + (r.attendance?.present || 0),
        absent: acc.absent + (r.attendance?.absent || 0),
        late: acc.late + (r.attendance?.late || 0),
    }), { total: 0, present: 0, absent: 0, late: 0 });

    const last = usable[usable.length - 1];
    return {
        term: 'Third Term',
        session: last.session,
        academicRecords,
        skills: {},
        psychomotor: {},
        attendance,
        teacherComment: '',
        principalComment: '',
        status: 'Published',
    };
}
