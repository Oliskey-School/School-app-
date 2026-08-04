import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { LearningHubService } from '../services/learningHub.service';
import { StudentService } from '../services/student.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';

function isAdmin(req: AuthRequest): boolean {
    return LearningHubService.isAdmin(req.user.role);
}

// Same IDOR-safe pattern as student.controller.ts: a student may only view
// their own progress; a parent only their linked children; teacher/admin keep
// their existing school/branch-scoped access.
async function assertCanViewStudent(req: AuthRequest, studentId: string): Promise<boolean> {
    const role = (req.user.role || '').toUpperCase();
    if (role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        return !!student && student.id === studentId;
    }
    if (role === 'PARENT') {
        const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!parent) return false;
        const link = await prisma.parentChild.findFirst({ where: { parent_id: parent.id, student_id: studentId }, select: { id: true } });
        return !!link;
    }
    return true;
}

async function resolveSelfStudentId(req: AuthRequest): Promise<string | null> {
    const student = await prisma.student.findFirst({ where: { user_id: req.user.id, school_id: req.user.school_id }, select: { id: true } });
    return student?.id || null;
}

export const getResources = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const filters = {
            grade_level: req.query.grade_level as string,
            subject: req.query.subject as string,
            resource_kind: req.query.resource_kind as string,
            search: req.query.search as string,
            subject_area: req.query.subject_area as string,
            grade_band: req.query.grade_band as string,
            inclusive_feature: req.query.inclusive_feature as string,
        };
        const result = await LearningHubService.getResources(req.user.school_id, branchId, filters);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createResource = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can curate Learning Hub resources' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await LearningHubService.createResource(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateResource = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can edit Learning Hub resources' });
        const result = await LearningHubService.updateResource(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const deleteResource = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can delete Learning Hub resources' });
        await LearningHubService.deleteResource(req.user.school_id, req.params.id as string);
        res.json({ message: 'Resource deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const upsertMyProgress = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = await resolveSelfStudentId(req);
        if (!studentId) return res.status(403).json({ message: 'Only students can record Learning Hub progress' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await LearningHubService.upsertProgress(req.user.school_id, branchId, studentId, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getMyProgress = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = await resolveSelfStudentId(req);
        if (!studentId) return res.status(403).json({ message: 'Only students have Learning Hub progress' });
        const result = await LearningHubService.getStudentProgress(req.user.school_id, studentId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentProgress = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.params.studentId as string;
        if (!(await assertCanViewStudent(req, studentId))) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s progress' });
        }
        const result = await LearningHubService.getStudentProgress(req.user.school_id, studentId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentSummary = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.params.studentId as string;
        if (!(await assertCanViewStudent(req, studentId))) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s progress' });
        }
        const result = await LearningHubService.getStudentSummary(req.user.school_id, studentId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMySummary = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = await resolveSelfStudentId(req);
        if (!studentId) return res.status(403).json({ message: 'Only students have Learning Hub progress' });
        const result = await LearningHubService.getStudentSummary(req.user.school_id, studentId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createStudyPlan = async (req: AuthRequest, res: Response) => {
    try {
        const role = (req.user.role || '').toUpperCase();
        let studentId = req.body.student_id as string;
        if (role === 'STUDENT') {
            const selfId = await resolveSelfStudentId(req);
            if (!selfId) return res.status(403).json({ message: 'Student record not found' });
            studentId = selfId;
        } else if (!(await assertCanViewStudent(req, studentId))) {
            return res.status(403).json({ message: 'Not authorized to create a study plan for this student' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await LearningHubService.createStudyPlan(req.user.school_id, branchId, studentId, {
            ...req.body,
            generated_by: role === 'STUDENT' ? 'ai' : 'teacher',
            created_by: req.user.id,
        });
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudyPlans = async (req: AuthRequest, res: Response) => {
    try {
        const role = (req.user.role || '').toUpperCase();
        let studentId = req.params.studentId as string;
        if (role === 'STUDENT') {
            const selfId = await resolveSelfStudentId(req);
            if (!selfId) return res.status(403).json({ message: 'Student record not found' });
            studentId = selfId;
        } else if (!(await assertCanViewStudent(req, studentId))) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s study plan' });
        }
        const result = await LearningHubService.getStudyPlans(req.user.school_id, studentId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
