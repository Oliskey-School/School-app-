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
            // `date` is a separate column the frontend reads directly
            // (services/examService.ts fetchExams maps e.date -> Exam.date) —
            // must be written too, or every exam shows as 1 Jan 1970 in the UI.
            payload.date = new Date(date);
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
            // Same as createExam — keep the `date` column in sync with start_time.
            payload.date = new Date(date);
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

            // Confirm both the exam and the student actually belong to this
            // caller's school/branch before recording a result — otherwise a
            // result could be written for a student in another branch/school.
            const [examOwned, studentOwned] = await Promise.all([
                prisma.exam.findFirst({ where: { id: exam_id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) }, select: { id: true } }),
                prisma.student.findFirst({ where: { id: student_id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) }, select: { id: true } }),
            ]);
            if (!examOwned || !studentOwned) continue;

            const remarks = JSON.stringify({ ca_score: ca_score ?? 0, exam_score: exam_score ?? 0, curriculum_type: curriculum_type ?? null });

            const existing = await prisma.examResult.findFirst({
                where: { exam_id, student_id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) }
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

        return results.map(r => {
            // ca_score/exam_score/curriculum_type are packed into `remarks` as JSON by
            // upsertExamResults (the ExamResult table has no dedicated columns for them).
            // Unpack them here so callers (e.g. the teacher results-entry screen) can
            // repopulate previously-saved CA/Exam breakdowns, not just the total/grade.
            let ca_score: number | undefined;
            let exam_score: number | undefined;
            let curriculum_type: string | null = null;
            if (r.remarks) {
                try {
                    const parsed = JSON.parse(r.remarks);
                    ca_score = parsed.ca_score;
                    exam_score = parsed.exam_score;
                    curriculum_type = parsed.curriculum_type ?? null;
                } catch {
                    // remarks predates this format (plain text) — leave breakdown fields undefined
                }
            }

            return {
                ...r,
                ca_score,
                exam_score,
                total_score: r.score,
                curriculum_type,
                students: (r as any).exam?.results?.map((er: any) => ({
                    name: er.student?.full_name || er.student?.name
                })) || []
            };
        });
    }
}
