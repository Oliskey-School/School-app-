import prisma from '../config/database';
import { SocketService } from './socket.service';

export class AssignmentService {
    static async getAssignments(schoolId: string, branchId?: string, classId?: string, teacherId?: string, className?: string) {
        const where: any = {
            class: {
                school_id: schoolId
            }
        };

        if (branchId && branchId !== 'all') {
            where.class.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        if (classId) where.class_id = classId;
        if (teacherId) where.teacher_id = teacherId;

        const assignments = await prisma.assignment.findMany({
            where,
            orderBy: {
                due_date: 'desc'
            },
            include: {
                class: true,
                submissions: true
            }
        });

        return assignments.map((a: any) => ({
            ...a,
            class_name: a.class?.name,
            total_students: 0,
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

        if (!insertData.subject && mainData.subject_id) {
            insertData.subject = mainData.subject_id;
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
            where.assignment.class.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        return await prisma.assignmentSubmission.findMany({
            where,
            include: {
                student: true
            }
        });
    }

    static async gradeSubmission(schoolId: string, branchId: string | undefined, submissionId: string, gradeData: any) {
        // First verify ownership
        const submission = await prisma.assignmentSubmission.findUnique({
            where: { id: submissionId },
            include: { 
                assignment: {
                    include: { class: true }
                } 
            }
        });

        if (!submission || (submission as any).assignment.class.school_id !== schoolId) {
            throw new Error('Submission not found or access denied');
        }

        const updated = await prisma.assignmentSubmission.update({
            where: { id: submissionId },
            data: gradeData
        });

        SocketService.emitToSchool(schoolId, 'assignment:updated', { action: 'grade', submissionId });
        return updated;
    }

    static async submitAssignment(schoolId: string, branchId: string | undefined, studentId: string, assignmentId: string, submissionData: any) {
        const insertData: any = {
            ...submissionData,
            student_id: studentId,
            assignment_id: assignmentId,
            status: 'Submitted',
            submitted_at: new Date()
        };

        const submission = await prisma.assignmentSubmission.upsert({
            where: {
                id: submissionData.id || 'new-submission' 
            },
            create: insertData,
            update: insertData
        });

        SocketService.emitToSchool(schoolId, 'assignment:updated', { action: 'submit', assignmentId, studentId });
        return submission;
    }
}
