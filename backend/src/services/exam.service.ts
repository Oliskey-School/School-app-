import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ExamService {
    static async getExams(schoolId: string, branchId: string | undefined, teacherId?: string) {
        const whereClause: any = { school_id: schoolId };

        if (teacherId) {
            whereClause.teacher_id = teacherId;
        }

        if (branchId && branchId !== 'all') {
            whereClause.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        return await prisma.exam.findMany({
            where: whereClause,
            orderBy: { created_at: 'desc' }
        });
    }

    static async createExam(schoolId: string, branchId: string | undefined, examData: any) {
        const { type, date, time, className, schoolId: _sid, branchId: _bid, ...rest } = examData;
        
        const payload: any = {
            ...rest,
            title: type || 'Exam',
            exam_type: type,
            school_id: schoolId,
        };

        if (date) {
            // If time is also provided, combine them for start_time
            if (time) {
                const [hours, minutes] = time.split(':');
                const startTime = new Date(date);
                startTime.setHours(parseInt(hours), parseInt(minutes));
                payload.start_time = startTime;
            } else {
                payload.start_time = new Date(date);
            }
        }

        if (branchId && branchId !== 'all') {
            payload.branch_id = branchId;
        }

        if (className) {
            payload.class_name = className;
        }

        const exam = await prisma.exam.create({
            data: payload
        });

        SocketService.emitToSchool(schoolId, 'exam:updated', { action: 'create', examId: exam.id });
        return exam;
    }

    static async updateExam(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        const { type, date, time, className, schoolId: _sid, branchId: _bid, ...rest } = updates;
        
        const payload: any = { ...rest };

        if (type) {
            payload.title = type;
            payload.exam_type = type;
        }

        if (date) {
            if (time) {
                const [hours, minutes] = time.split(':');
                const startTime = new Date(date);
                startTime.setHours(parseInt(hours), parseInt(minutes));
                payload.start_time = startTime;
            } else {
                payload.start_time = new Date(date);
            }
        }

        if (className) {
            payload.class_name = className;
        }

        const whereClause: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            whereClause.branch_id = branchId;
        }

        const exam = await prisma.exam.update({
            where: whereClause,
            data: payload
        });

        SocketService.emitToSchool(schoolId, 'exam:updated', { action: 'update', examId: id });
        return exam;
    }

    static async deleteExam(schoolId: string, branchId: string | undefined, id: string) {
        const whereClause: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            whereClause.branch_id = branchId;
        }

        await prisma.exam.delete({
            where: whereClause
        });

        SocketService.emitToSchool(schoolId, 'exam:updated', { action: 'delete', examId: id });
        return true;
    }

    static async getExamResults(schoolId: string, branchId: string | undefined, examId: string) {
        const whereClause: any = {
            exam_id: examId,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            whereClause.branch_id = branchId;
        }

        const results = await prisma.examResult.findMany({
            where: whereClause,
            include: {
                exam: {
                    include: {
                        results: {
                            include: {
                                student: true
                            }
                        }
                    }
                }
            } as any
        });

        return results.map(r => ({
            ...r,
            students: (r as any).exam?.results?.map((er: any) => ({
                name: er.student?.full_name || er.student?.name
            })) || []
        }));
    }
}
