import { describe, it, expect } from 'vitest';
import { summarizeFees, buildAttendanceTrend, computeWorkload, localDayKey, sortBySubject } from '../../src/utils/analyticsMetrics';

describe('summarizeFees', () => {
    const now = new Date(2026, 9, 3, 10, 0, 0);
    it('returns zeros and total 0 when there are no fees', () => {
        expect(summarizeFees([], now)).toEqual({ paid: 0, overdue: 0, unpaid: 0, paidCount: 0, overdueCount: 0, unpaidCount: 0, total: 0 });
    });
    it('matches statuses case-insensitively and buckets every fee once', () => {
        const future = new Date(2026, 10, 1);
        const past = new Date(2026, 8, 1);
        const s = summarizeFees([
            { status: 'paid', amount: 100, paid_amount: 100, due_date: past },
            { status: 'Paid', amount: 100, paid_amount: 100, due_date: past },
            { status: 'OVERDUE', amount: 100, paid_amount: 0, due_date: future },
            { status: 'Pending', amount: 100, paid_amount: 0, due_date: past },   // past due -> overdue
            { status: 'Partial', amount: 100, paid_amount: 40, due_date: future }, // not yet due -> unpaid
            { status: 'Pending', amount: 100, paid_amount: 100, due_date: future }, // fully paid amount -> paid
        ], now);
        expect(s).toMatchObject({ paidCount: 3, overdueCount: 2, unpaidCount: 1, total: 6, paid: 50, overdue: 33, unpaid: 17 });
    });
});

describe('buildAttendanceTrend', () => {
    const now = new Date(2026, 9, 3, 10, 0, 0); // Sat 3 Oct 2026, local
    const utcDay = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
    it('returns 7 days oldest-first ending today', () => {
        const t = buildAttendanceTrend([], now);
        expect(t).toHaveLength(7);
        expect(t[6].date).toBe(localDayKey(now));
        expect(t[0].date).toBe('2026-09-27');
    });
    it('leaves days with no register as null, never 0', () => {
        const t = buildAttendanceTrend([{ date: utcDay(2026, 8, 30), status: 'Present' }], now);
        expect(t.filter((d) => d.rate === null)).toHaveLength(6);
        expect(t.find((d) => d.date === '2026-09-30')!.rate).toBe(100);
    });
    it('counts late as attended and is case-insensitive', () => {
        const day = utcDay(2026, 9, 1);
        const t = buildAttendanceTrend([
            { date: day, status: 'Present' }, { date: day, status: 'present' },
            { date: day, status: 'Late' }, { date: day, status: 'Absent' },
        ], now);
        expect(t.find((d) => d.date === '2026-10-01')).toEqual({ date: '2026-10-01', rate: 75, present: 2, late: 1, total: 4 });
    });
});

describe('computeWorkload', () => {
    const teachers = [{ id: 't1', full_name: 'John Smith' }, { id: 't2', full_name: 'Grace Adeyemi' }, { id: 't3', full_name: 'Michael Bassey' }];
    const lesson = (o: any) => ({ teacher_id: 't1', class_id: 'c1', class_name: 'SSS 1', subject: 'Mathematics', day_of_week: 1, start_time: '08:00', end_time: '09:00', ...o });
    it('credits lessons through subject assignments, not the stamped teacher_id', () => {
        const lessons = [
            lesson({}), lesson({ subject: 'English Language', start_time: '09:00', end_time: '10:00' }),
            lesson({ day_of_week: 2, start_time: '10:30', end_time: '11:15' }),
        ];
        const w = computeWorkload(teachers, [
            { teacher_id: 't1', class_id: 'other-id', class_name: 'sss 1', subject_name: 'mathematics' },
            { teacher_id: 't3', class_id: 'c1', class_name: null, subject_name: 'English Language' },
            { teacher_id: 't2', class_id: 'c1', class_name: 'SSS 1', subject_name: null }, // no subject -> ignored
        ], lessons);
        expect(w.map((x) => x.label)).toEqual(['John', 'Grace', 'Michael']);
        expect(w[0]).toMatchObject({ name: 'John Smith', value: 1.75, lessons: 2 });
        expect(w[1]).toMatchObject({ value: 0, lessons: 0 }); // falls back to teacher_id; none stamped t2
        expect(w[2]).toMatchObject({ value: 1, lessons: 1 });
    });
    it('does not count duplicated saves of the same slot twice', () => {
        const dupes = Array.from({ length: 50 }, () => lesson({}));
        const w = computeWorkload([teachers[0]], [], dupes);
        expect(w[0]).toMatchObject({ value: 1, lessons: 1 });
    });
    it('merges overlapping lessons on the same day (08:00-08:45 + 08:00-09:00 = 1h)', () => {
        const lessons = [1, 3, 5].flatMap((d) => [
            lesson({ day_of_week: d, start_time: '08:00', end_time: '08:45' }),
            lesson({ day_of_week: d, start_time: '08:00', end_time: '09:00' }),
        ]);
        const w = computeWorkload([teachers[0]], [], lessons);
        expect(w[0]).toMatchObject({ value: 3, lessons: 3 });
    });
    it('keeps back-to-back lessons as separate blocks and merges partial overlaps', () => {
        const w = computeWorkload([teachers[0]], [], [
            lesson({ start_time: '08:00', end_time: '09:00' }),
            lesson({ start_time: '09:00', end_time: '10:00' }),
            lesson({ start_time: '09:30', end_time: '10:30' }),
        ]);
        expect(w[0]).toMatchObject({ value: 2.5, lessons: 2 });
    });
});

describe('sortBySubject', () => {
    it('orders subjects A-Z case-insensitively and does not mutate the input', () => {
        const input = [{ label: 'Mathematics' }, { label: 'biology' }, { label: 'English Language' }, { label: 'Agricultural Science' }];
        expect(sortBySubject(input).map((r) => r.label)).toEqual(['Agricultural Science', 'biology', 'English Language', 'Mathematics']);
        expect(input[0].label).toBe('Mathematics');
    });
});
