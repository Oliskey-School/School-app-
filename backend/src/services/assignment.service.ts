import prisma from '../config/database';
import { SocketService } from './socket.service';

export class AssignmentService {
    static async getAssignments(schoolId: string, branchId?: string, classId?: string, teacherId?: string, className?: string, subjects?: string[]) {
        const where: any = {
            class: {
                school_id: schoolId
            }
        };

        if (branchId && branchId !== 'all') {
            where.class.branch_id = branchId;
        }

        if (classId) where.class_id = classId;
        if (teacherId) where.teacher_id = teacherId;

        // Filter by class NAME. This was previously accepted as a parameter and then
        // silently ignored, so drilling into "SSS 2" returned every class's
        // assignments (SSS 1's and SSS 3's included) with their submission counts.
        // Matched case-insensitively because class names are free text ("SSS 2" vs
        // "sss 2"), and the caller only ever has the display name to work with.
        if (className) {
            where.class.name = { equals: className, mode: 'insensitive' };
        }

        // Restrict to a specific set of subjects. Used for students, who should only
        // see work for the subjects they actually take — a class's full assignment
        // list can span subjects a given student isn't enrolled in.
        if (subjects && subjects.length > 0) {
            where.subject = { in: subjects };
        }

        const assignments = await prisma.assignment.findMany({
            where,
            orderBy: {
                due_date: 'desc'
            },
            include: {
                class: {
                    include: {
                        _count: {
                            select: { enrollments: true }
                        }
                    }
                },
                submissions: true
            }
        });

        return assignments.map((a: any) => ({
            ...a,
            classId: a.class_id,
            class_name: a.class?.name,
            className: a.class?.name,
            total_students: a.class?._count?.enrollments || 0,
            submissions_count: a.submissions?.length || 0
        }));
    }

    static async createAssignment(schoolId: string, branchId: string | undefined, assignmentData: any) {
        const { attachments, ...mainData } = assignmentData;

        const allowedFields = ['title', 'description', 'subject', 'class_id', 'due_date', 'is_published', 'teacher_id', 'attachment_url'];
        const insertData: any = {};
        
        for (const field of allowedFields) {
            if (mainData[field] !== undefined) {
                insertData[field] = mainData[field];
            }
        }
        
        if (insertData.due_date) {
            insertData.due_date = new Date(insertData.due_date);
        }
        
        if (mainData.status) {
            insertData.is_published = mainData.status === 'published';
        } else if (mainData.is_published === undefined) {
            insertData.is_published = true;
        }

        insertData.school_id = schoolId;
        insertData.branch_id = branchId && branchId !== 'all' ? branchId : null;

        if (!insertData.subject && mainData.subject_id) {
            insertData.subject = mainData.subject_id;
        }

        if (!insertData.class_id) {
            throw new Error('Class is required');
        }

        const classWhere: any = {
            id: insertData.class_id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            classWhere.branch_id = branchId;
        }

        const targetClass = await prisma.class.findFirst({ where: classWhere });
        if (!targetClass) {
            throw new Error('Class not found or outside your branch');
        }

        if (insertData.teacher_id) {
            // Assignment is proven by (teacher_id + class_id) within the school. The
            // target class was already branch-validated above, so do NOT also filter the
            // classTeacher row by branch — the join row's branch tag can drift from the
            // class's branch and would otherwise falsely reject a legitimately-assigned
            // teacher ("Teacher is not assigned to this class").
            const assignedTeacher = await prisma.classTeacher.findFirst({
                where: {
                    school_id: schoolId,
                    teacher_id: insertData.teacher_id,
                    class_id: insertData.class_id,
                }
            });

            if (!assignedTeacher) {
                throw new Error('Teacher is not assigned to this class');
            }
        }

        const assignment = await prisma.assignment.create({
            data: insertData
        });

        SocketService.emitToSchool(schoolId, 'assignment:updated', { action: 'create', assignmentId: assignment.id });
        return assignment;
    }

    static async getSubmissions(schoolId: string, branchId: string | undefined, assignmentId: string) {
        const where: any = {
            assignment_id: assignmentId,
            assignment: {
                class: {
                    school_id: schoolId
                }
            }
        };

        if (branchId && branchId !== 'all') {
            where.assignment.class.branch_id = branchId;
        }

        const submissions = await prisma.assignmentSubmission.findMany({
            where,
            include: {
                student: true,
                assignment: { select: { due_date: true } }
            }
        });

        // is_late is not a stored column — there is no `is_late` field on
        // AssignmentSubmission, and the frontend has always read `sub.is_late`
        // expecting the backend to supply it, so every submission silently
        // rendered "On Time" regardless of whether it actually beat the
        // deadline. Compute it here from submitted_at vs. the assignment's
        // due_date instead of leaving it permanently false.
        return submissions.map((s: any) => ({
            ...s,
            is_late: !!(s.assignment?.due_date && s.submitted_at && new Date(s.submitted_at) > new Date(s.assignment.due_date))
        }));
    }

    static async gradeSubmission(schoolId: string, branchId: string | undefined, callerTeacherId: string | null, isAdmin: boolean, submissionId: string, gradeData: { score?: number; grade?: number; feedback?: string; status?: string }) {
        // First verify ownership
        const submission = await prisma.assignmentSubmission.findUnique({
            where: { id: submissionId },
            include: {
                assignment: {
                    include: { class: true }
                }
            }
        });

        const assignment = (submission as any)?.assignment;
        const classRecord = assignment?.class;
        const branchMismatch = branchId && branchId !== 'all' && classRecord?.branch_id && classRecord.branch_id !== branchId;

        if (!submission || classRecord?.school_id !== schoolId || branchMismatch) {
            throw new Error('Submission not found or access denied');
        }

        // Only an admin, or the teacher who owns the assignment (when one is set),
        // may grade it — never the submitting student themselves.
        if (!isAdmin && assignment?.teacher_id && assignment.teacher_id !== callerTeacherId) {
            const err: any = new Error('You do not have access to grade this submission');
            err.status = 403;
            throw err;
        }
        if (!isAdmin && !callerTeacherId) {
            const err: any = new Error('Only teachers or admins may grade submissions');
            err.status = 403;
            throw err;
        }

        // Whitelist — never spread the raw request body into an update().
        // The Prisma column is `grade` (there is no `score` column on
        // AssignmentSubmission); the teacher UI posts `grade`, so that must
        // be checked first. `score` is kept as a fallback alias for any other
        // caller. Bug found in round 17 review: this previously only ever
        // looked at `gradeData.score`, which the UI never sends — every
        // "graded" submission silently kept `grade: null` while `status`
        // flipped to 'Graded' and `feedback` saved, so students/parents saw
        // "Graded" with no score.
        const gradeValue = gradeData.grade !== undefined ? gradeData.grade : gradeData.score;
        const allowed: any = {};
        if (gradeValue !== undefined) allowed.grade = gradeValue;
        if (gradeData.feedback !== undefined) allowed.feedback = gradeData.feedback;
        allowed.status = gradeData.status || 'Graded';

        const updated = await prisma.assignmentSubmission.update({
            where: { id: submissionId },
            data: allowed
        });

        SocketService.emitToSchool(schoolId, 'assignment:updated', { action: 'grade', submissionId });
        return updated;
    }

    static async submitAssignment(schoolId: string, branchId: string | undefined, studentId: string, assignmentId: string, submissionData: any) {
        // Confirm the assignment actually belongs to this student's school/branch
        // before recording a submission against it.
        const owned = await prisma.assignment.findFirst({
            where: {
                id: assignmentId,
                class: { school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
            },
            select: { id: true },
        });
        if (!owned) throw new Error('Assignment not found in your school/branch');

        // Map frontend fields to Prisma fields if needed
        const insertData: any = {
            text_submission: submissionData.text_submission || submissionData.submission_text || submissionData.content,
            file_url: submissionData.file_url || submissionData.attachment_url || submissionData.files,
            student_id: studentId,
            assignment_id: assignmentId,
            status: 'Submitted',
            submitted_at: new Date()
        };

        const submission = await prisma.assignmentSubmission.upsert({
            where: {
                student_id_assignment_id: {
                    student_id: studentId,
                    assignment_id: assignmentId
                }
            },
            // school_id/branch_id are required on create; never overwritten on update.
            create: { ...insertData, school_id: schoolId, branch_id: (branchId && branchId !== 'all') ? branchId : null },
            update: insertData
        });

        SocketService.emitToSchool(schoolId, 'assignment:updated', { action: 'submit', assignmentId, studentId });
        return submission;
    }

    static async getAssignmentSubmission(schoolId: string, studentId: string, assignmentId: string) {
        return await prisma.assignmentSubmission.findUnique({
            where: {
                student_id_assignment_id: {
                    student_id: studentId,
                    assignment_id: assignmentId
                }
            }
        });
    }

    static async getAssignment(schoolId: string, id: string, branchId?: string) {
        const assignment = await prisma.assignment.findUnique({
            where: { id },
            include: {
                class: true,
                submissions: {
                    include: {
                        student: true
                    }
                }
            }
        });

        const classRecord = (assignment as any)?.class;
        const branchMismatch = branchId && branchId !== 'all' && classRecord?.branch_id && classRecord.branch_id !== branchId;

        if (!assignment || classRecord.school_id !== schoolId || branchMismatch) {
            throw new Error('Assignment not found');
        }

        return {
            ...assignment,
            classId: assignment.class_id,
            class_name: assignment.class?.name,
            className: assignment.class?.name
        };
    }

    static async deleteAssignment(schoolId: string, id: string, branchId?: string) {
        await this.getAssignment(schoolId, id, branchId);
        return await prisma.assignment.delete({
            where: { id }
        });
    }
}
