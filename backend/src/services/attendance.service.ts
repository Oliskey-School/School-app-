import prisma from '../config/database';
import { SocketService } from './socket.service';

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
}
