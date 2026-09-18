import prisma from '../config/database';
import { SocketService } from './socket.service';
import { resolveTermWindow } from './academicSettings.service';

export class AttendanceService {
    static async getAttendance(schoolId: string, branchId: string | undefined, classId: string, date: string) {
        // date is expected as YYYY-MM-DD
        const dateObj = new Date(date);

        return await prisma.attendance.findMany({
            where: {
                class_id: classId,
                date: dateObj,
                // Scope by the Attendance row's OWN school_id/branch_id — matching
                // how saveAttendance stamps them at write time — not by joining
                // through the student's current branch, which can legitimately
                // diverge (e.g. after a branch transfer) and would silently hide
                // real attendance rows from both the teacher and the admin.
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar_url: true
                    }
                }
            }
        });
    }

    static async saveAttendance(schoolId: string, branchId: string | undefined, records: any[]) {
        // records: { student_id, class_id, date, status, notes }
        const scopedBranch = branchId && branchId !== 'all' ? branchId : null;

        // The controller already confirms the caller owns each class_id, but
        // never checks that student_id actually belongs to this school/branch
        // — without this, attendance could be recorded against a student from
        // a completely different branch just by passing their id.
        const studentIds = [...new Set(records.map((r: any) => r.student_id).filter(Boolean))];
        if (studentIds.length > 0) {
            const owned = await prisma.student.findMany({
                where: { id: { in: studentIds }, school_id: schoolId, ...(scopedBranch ? { branch_id: scopedBranch } : {}) },
                select: { id: true },
            });
            const ownedSet = new Set(owned.map(s => s.id));
            const unauthorized = studentIds.filter(id => !ownedSet.has(id));
            if (unauthorized.length > 0) {
                throw new Error('One or more students are not in your school/branch');
            }
        }

        return await prisma.$transaction(async (tx) => {
            const results = [];
            for (const record of records) {
                const dateObj = new Date(record.date);
                // school_id is required on Attendance; resolve the branch from the
                // class when the caller didn't pass an explicit one, so the row is
                // correctly tenant- and branch-scoped.
                let branchForRow = scopedBranch ?? record.branch_id ?? null;
                if (!branchForRow && record.class_id) {
                    const cls = await tx.class.findUnique({ where: { id: record.class_id }, select: { branch_id: true } });
                    branchForRow = cls?.branch_id ?? null;
                }
                const result = await tx.attendance.upsert({
                    where: {
                        student_id_class_id_date: {
                            student_id: record.student_id,
                            class_id: record.class_id,
                            date: dateObj
                        }
                    },
                    create: {
                        student_id: record.student_id,
                        class_id: record.class_id,
                        date: dateObj,
                        status: record.status,
                        remark: record.notes,
                        school_id: schoolId,
                        branch_id: branchForRow
                    },
                    update: {
                        status: record.status,
                        remark: record.notes
                    }
                });
                results.push(result);
            }
            SocketService.emitToSchool(schoolId, 'attendance:updated', { 
                classId: records.length > 0 ? records[0].class_id : undefined,
                date: records.length > 0 ? records[0].date : undefined
            });
            return results;
        });
    }

    static async getAttendanceByStudent(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.attendance.findMany({
            where: {
                student_id: studentId,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            orderBy: { date: 'desc' }
        });
    }

    static async getAttendanceByStudentIds(schoolId: string, branchId: string | undefined, studentIds: string[], startDate?: string, endDate?: string) {
        return await prisma.attendance.findMany({
          where: {
            student_id: { in: studentIds },
            date: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined
            },
            school_id: schoolId,
            branch_id: branchId && branchId !== 'all' ? branchId : undefined
          },
          select: {
            student_id: true,
            status: true,
            date: true,
            class_id: true,
            student: {
              select: {
                id: true,
                full_name: true,
                avatar_url: true
              }
            }
          }
        });
    }

    static async getAttendanceByDateRange(schoolId: string, branchId: string | undefined, startDate: string, endDate: string, classId?: string) {
        const where: any = {
            school_id: schoolId,
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        if (classId) {
            where.class_id = classId;
        }

        return await prisma.attendance.findMany({
            where,
            select: {
                student_id: true,
                status: true,
                date: true,
                class_id: true,
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar_url: true
                    }
                }
            }
        });
    }

    /**
     * Day counts for a term, derived from the attendance register — the ONE
     * source every screen uses (report card "Attendance Record", the teacher's
     * class list, the parent/student attendance page), so they never disagree.
     *
     *  - total   = days school opened for the student's class in the term window
     *              (distinct dates on which that class was marked);
     *  - present / absent / late / leave = the student's own marks;
     *  - percentage = (present + late) / total.
     *
     * Pass `classId` to summarise a whole class in one query, or `studentIds`
     * for specific students (their class is taken from their own marks).
     */
    static async getTermSummary(
        schoolId: string,
        branchId: string | undefined,
        opts: { term: string; session: string; studentIds?: string[]; classId?: string }
    ) {
        const window = await resolveTermWindow(schoolId, branchId && branchId !== 'all' ? branchId : null, opts.term, opts.session);
        const scope: any[] = [];
        if (opts.classId) scope.push({ class_id: opts.classId });
        if (opts.studentIds?.length) scope.push({ student_id: { in: opts.studentIds } });
        const empty = { term: window.name, session: opts.session, from: window.start, to: window.end, window_source: window.source, students: {} as Record<string, any> };
        if (scope.length === 0) return empty;

        const rows = await prisma.attendance.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                date: { gte: window.start, lte: window.end },
                OR: scope,
            },
            select: { student_id: true, class_id: true, date: true, status: true },
        });

        // Days school opened, per class, within the window.
        const openDays = new Map<string, Set<string>>();
        // A student's marks may come from a class we only scoped by student id —
        // count that class's open days too, in a second cheap query.
        const classesSeen = new Set(rows.map(r => r.class_id).filter(Boolean) as string[]);
        const extraClasses = [...classesSeen].filter(c => c !== opts.classId);
        const classRows = extraClasses.length
            ? await prisma.attendance.findMany({
                where: { school_id: schoolId, class_id: { in: extraClasses }, date: { gte: window.start, lte: window.end } },
                select: { class_id: true, date: true },
            })
            : [];
        for (const r of [...rows, ...classRows]) {
            const key = String(r.class_id || '');
            if (!openDays.has(key)) openDays.set(key, new Set());
            openDays.get(key)!.add(new Date(r.date).toISOString().slice(0, 10));
        }

        const students: Record<string, { total: number; present: number; absent: number; late: number; leave: number; marked: number; percentage: number; class_id: string | null }> = {};
        const ensure = (id: string) => (students[id] ||= { total: 0, present: 0, absent: 0, late: 0, leave: 0, marked: 0, percentage: 0, class_id: null });
        for (const id of opts.studentIds || []) ensure(id);
        const classCount = new Map<string, Map<string, number>>();
        for (const r of rows) {
            const st = ensure(r.student_id);
            const s = String(r.status || '').toLowerCase();
            if (s === 'present') st.present++;
            else if (s === 'absent') st.absent++;
            else if (s === 'late') st.late++;
            else if (s === 'leave' || s === 'excused') st.leave++;
            else st.present++; // unknown value: the register treats it as attended
            st.marked++;
            const byClass = classCount.get(r.student_id) || new Map<string, number>();
            byClass.set(String(r.class_id || ''), (byClass.get(String(r.class_id || '')) || 0) + 1);
            classCount.set(r.student_id, byClass);
        }
        for (const [id, st] of Object.entries(students)) {
            const byClass = classCount.get(id);
            let cls = opts.classId || null;
            if (!cls && byClass?.size) cls = [...byClass.entries()].sort((a, b) => b[1] - a[1])[0][0];
            st.class_id = cls;
            st.total = cls ? (openDays.get(cls)?.size || 0) : 0;
            // The student can never have more marks than days open (e.g. marks in a
            // class outside the scope): keep the counts self-consistent.
            if (st.total < st.marked) st.total = st.marked;
            st.percentage = st.total > 0 ? Math.round(((st.present + st.late) / st.total) * 100) : 0;
        }
        return { ...empty, students };
    }
}
