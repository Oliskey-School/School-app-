import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AssignmentService } from '../services/assignment.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdminRole(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

export const getAssignments = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        let classId = req.query.classId as string || req.query.class_id as string;

        // 1. Role-based filtering
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });

            if (teacher) {
                teacherId = teacher.id;
            } else {
                console.warn(`⚠️ [Backend] No teacher profile found for user ${req.user.id}`);
                return res.json([]);
            }
        } else if (req.user.role === 'STUDENT') {
            // Students MUST be filtered by their class
            const student = await prisma.student.findUnique({
                where: { user_id: req.user.id },
                select: { 
                    id: true,
                    enrollments: {
                        where: { is_primary: true },
                        select: { class_id: true }
                    }
                }
            });

            if (student && student.enrollments.length > 0) {
                classId = student.enrollments[0].class_id;
            } else if (student) {
                // If no primary enrollment, try any enrollment
                const anyEnrollment = await prisma.studentEnrollment.findFirst({
                    where: { student_id: student.id },
                    select: { class_id: true }
                });
                if (anyEnrollment) classId = anyEnrollment.class_id;
            }

            if (!classId) {
                console.warn(`⚠️ [Backend] No class enrollment found for student ${req.user.id}`);
                return res.json([]);
            }
        }

        const className = req.query.className as string || req.query.class_name as string;
        const branchId = getEffectiveBranchId(req.user, (req.query?.branchId || req.query?.branch_id) as string);

        const result = await AssignmentService.getAssignments(
            req.user.school_id,
            branchId,
            classId,
            teacherId,
            className
        );
        res.json(result);
    } catch (error: any) {
        console.error('[AssignmentController] getAssignments error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const createAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.body?.branch_id || req.query?.branchId));
        
        // For teachers, automatically set the teacher_id
        if (req.user.role === 'TEACHER' && !req.body.teacher_id) {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) {
                req.body.teacher_id = teacher.id;
            }
        }
        
        const result = await AssignmentService.createAssignment(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        const status = error.message?.includes('outside your branch') || error.message?.includes('not assigned') ? 403 : 500;
        res.status(status).json({ message: error.message });
    }
};

export const getAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query?.branchId || req.query?.branch_id) as string);
        const result = await AssignmentService.getAssignment(req.user.school_id, req.params.id as string, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(error.message === 'Assignment not found' ? 404 : 500).json({ message: error.message });
    }
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
    try {
        // Listing every student's submissions for an assignment (names, files,
        // grades) is a teacher/admin grading view — never a student endpoint. A
        // student's own single submission goes through getAssignmentSubmission.
        if (!isAdminRole(req) && req.user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Only teachers or admins may view all submissions for an assignment' });
        }
        const branchId = getEffectiveBranchId(req.user, (req.body?.branch_id || req.query?.branchId));
        const result = await AssignmentService.getSubmissions(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAssignmentSubmission = async (req: AuthRequest, res: Response) => {
    try {
        const student = await prisma.student.findUnique({
            where: { user_id: req.user.id },
            select: { id: true }
        });

        if (!student) {
            return res.status(403).json({ message: 'Only students have personal assignment submissions' });
        }

        const result = await AssignmentService.getAssignmentSubmission(
            req.user.school_id,
            student.id,
            req.params.id as string
        );
        res.json(result);
    } catch (error: any) {
        console.error('[AssignmentController] getAssignmentSubmission error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const gradeSubmission = async (req: AuthRequest, res: Response) => {
    try {
        const isAdmin = isAdminRole(req);
        if (!isAdmin && req.user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Only teachers or admins may grade submissions' });
        }
        let callerTeacherId: string | null = null;
        if (!isAdmin) {
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            callerTeacherId = teacher?.id ?? null;
        }
        const branchId = getEffectiveBranchId(req.user, (req.body?.branch_id || req.query?.branchId));
        const result = await AssignmentService.gradeSubmission(req.user.school_id, branchId, callerTeacherId, isAdmin, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const submitAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.body?.branch_id || req.query?.branchId));
        
        // Resolve student ID from user ID
        const student = await prisma.student.findUnique({
            where: { user_id: req.user.id },
            select: { id: true }
        });

        if (!student) {
            return res.status(403).json({ message: 'Only students can submit assignments' });
        }

        const result = await AssignmentService.submitAssignment(
            req.user.school_id, 
            branchId, 
            student.id, 
            req.params.id as string, 
            req.body
        );
        res.status(201).json(result);
    } catch (error: any) {
        console.error('[AssignmentController] submitAssignment error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.body?.branch_id || req.query?.branchId) as string);
        await AssignmentService.deleteAssignment(req.user.school_id, req.params.id as string, branchId);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
