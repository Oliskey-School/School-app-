import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AssignmentService } from '../services/assignment.service';
import prisma from '../config/database';

export const getAssignments = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        let classId = req.query.classId as string || req.query.class_id as string;

        // 1. Role-based filtering
        if (req.user.role === 'teacher') {
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
        } else if (req.user.role === 'student') {
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
        const branchId = (req.user.branch_id || req.query?.branchId || req.query?.branch_id) as string | undefined;

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
        const branchId = req.user.branch_id || req.body?.branch_id || req.query?.branchId;
        const result = await AssignmentService.createAssignment(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body?.branch_id || req.query?.branchId;
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
        const branchId = req.user.branch_id || req.body?.branch_id || req.query?.branchId;
        const result = await AssignmentService.gradeSubmission(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = (req.user.branch_id || req.body?.branch_id || req.query?.branchId) as string | undefined;
        
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
        await AssignmentService.deleteAssignment(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
