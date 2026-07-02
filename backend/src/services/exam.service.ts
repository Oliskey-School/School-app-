import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ExamService {
    static async getExams(schoolId: string, branchId: string | undefined, teacherId?: string) {
        const whereClause: any = { school_id: schoolId };

        if (teacherId) {
            whereClause.teacher_id = teacherId;
        }

        if (branchId && branchId !== 'all') {
            whereClause.branch_id = branchId; // strict branch isolation (untagged → All Branches only)
        }

        return await prisma.exam.findMany({
            where: whereClause,
            orderBy: { created_at: 'desc' }
        });
    }

    static async createExam(schoolId: string, branchId: string | undefined, examData: any) {
        const { type, date, time, className, term, schoolId: _sid, branchId: _bid, ...rest } = examData;
        
        const payload: any = {
            ...rest,
            title: type || examData.title || 'Exam',
            exam_type: type || examData.exam_type || 'Final',
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

        await prisma.exam.deleteMany({
            where: whereClause
        });

        SocketService.emitToSchool(schoolId, 'exam:updated', { action: 'delete', examId: id });
        return true;
    }

    static async upsertExamResults(schoolId: string, branchId: string | undefined, results: any[]) {
        const saved: any[] = [];
        for (const r of results) {
            const { exam_id, student_id, ca_score, exam_score, total_score, grade, curriculum_type } = r;
            if (!exam_id || !student_id) continue;

            const remarks = JSON.stringify({ ca_score: ca_score ?? 0, exam_score: exam_score ?? 0, curriculum_type: curriculum_type ?? null });

            const existing = await prisma.examResult.findFirst({
                where: { exam_id, student_id, school_id: schoolId }
            });

            if (existing) {
                const updated = await prisma.examResult.update({
                    where: { id: existing.id },
                    data: { score: total_score ?? 0, grade: grade ?? null, remarks, max_score: 100 }
                });
                saved.push(updated);
            } else {
                const created = await prisma.examResult.create({
                    data: {
                        exam_id,
                        student_id,
                        school_id: schoolId,
                        branch_id: branchId ?? null,
                        score: total_score ?? 0,
                        grade: grade ?? null,
                        remarks,
                        max_score: 100,
                    }
                });
                saved.push(created);
            }
        }
        return saved;
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
