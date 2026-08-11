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
        // Students only ever see work for subjects they actually take (see below).
        let subjects: string[] | undefined;

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
                    assigned_subjects: true,
                    enrollments: {
                        where: { is_primary: true },
                        select: { class_id: true }
                    }
                }
            });

            // Admin-picked per-student subject list. When set it's authoritative, so
            // the student sees only their own subjects' work rather than everything
            // set for the class. Left empty (the default), no subject filter is
            // applied and they inherit the class's full list — matching how
            // assigned_subjects is treated elsewhere in the app.
            const assigned = (student?.assigned_subjects || []).filter(Boolean);
            if (assigned.length > 0) subjects = assigned;

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
            className,
            subjects
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
        
        // Teachers may only ever create an assignment authored as themselves —
        // a client-supplied teacher_id is ignored for the TEACHER role so one
        // teacher can't attribute/spoof an assignment as another teacher.
        if (req.user.role === 'TEACHER') {
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
        const isAdmin = isAdminRole(req);
        if (!isAdmin && req.user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Only teachers or admins may view all submissions for an assignment' });
        }
        const branchId = getEffectiveBranchId(req.user, (req.body?.branch_id || req.query?.branchId));

        // A teacher may only view submissions for an assignment they own —
        // otherwise any teacher could read another teacher's students' files
        // and grades by guessing/enumerating the assignment id.
        if (!isAdmin) {
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            const assignment = await AssignmentService.getAssignment(req.user.school_id, req.params.id as string, branchId);
            if (!teacher || (assignment.teacher_id && assignment.teacher_id !== teacher.id)) {
                return res.status(403).json({ message: 'You do not have access to view submissions for this assignment' });
            }
        }

        const result = await AssignmentService.getSubmissions(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        const status = error.message === 'Assignment not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
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
        // Deleting an assignment is a teacher/admin action — never a student's.
        // Previously this had no role check at all, so any authenticated
        // student could delete any assignment in their school/branch by ID.
        const isAdmin = isAdminRole(req);
        if (!isAdmin && req.user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Only teachers or admins may delete assignments' });
        }

        const branchId = getEffectiveBranchId(req.user, (req.body?.branch_id || req.query?.branchId) as string);

        if (!isAdmin) {
            // A teacher may only delete their own assignment, matching the
            // ownership rule already enforced for grading submissions.
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            const assignment = await AssignmentService.getAssignment(req.user.school_id, req.params.id as string, branchId);
            if (!teacher || (assignment.teacher_id && assignment.teacher_id !== teacher.id)) {
                return res.status(403).json({ message: 'You do not have access to delete this assignment' });
            }
        }

        await AssignmentService.deleteAssignment(req.user.school_id, req.params.id as string, branchId);
        res.status(204).send();
    } catch (error: any) {
        const status = error.message === 'Assignment not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};
