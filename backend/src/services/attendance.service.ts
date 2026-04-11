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
                student: {
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : undefined
                }
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
        return await prisma.$transaction(async (tx) => {
            const results = [];
            for (const record of records) {
                const dateObj = new Date(record.date);
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
                        remark: record.notes
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
                student: {
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : undefined
                }
            },
            orderBy: { date: 'desc' }
        });
    }

    static async getAttendanceByStudentIds(schoolId: string, branchId: string | undefined, studentIds: string[]) {
        return await prisma.attendance.findMany({
            where: {
                student_id: { in: studentIds },
                student: {
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : undefined
                }
            },
            select: {
                student_id: true,
                status: true
            }
        });
    }
}
