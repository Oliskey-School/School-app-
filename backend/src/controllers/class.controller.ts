import { Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import { ClassService } from '../services/class.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

function isAdmin(req: AuthRequest): boolean {
    return ['admin', 'proprietor', 'superadmin', 'super_admin'].includes((req.user?.role || '').toLowerCase());
}

export const getClass = async (req: AuthRequest, res: Response) => {
    try {
        const classId = req.params.id as string;
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const role = String(req.user.role || '').toUpperCase();
        const teacher = role === 'TEACHER'
            ? await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } })
            : null;
        const result = await ClassService.getClass(req.user.school_id, classId, branchId, teacher?.id);
        
        if (!result) {
            return res.status(404).json({ message: 'Class not found' });
        }
        
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

export const getClassStudents = async (req: AuthRequest, res: Response) => {
    try {
        const classId = req.params.id as string;
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const role = String(req.user.role || '').toUpperCase();
        const teacher = role === 'TEACHER'
            ? await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } })
            : null;
        const result = await ClassService.getClassStudents(req.user.school_id, classId, branchId, teacher?.id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

export const getClasses = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        const role = String(req.user.role || '').toUpperCase();

        if (role === 'TEACHER' && req.query.viewAll !== 'true') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });

            if (teacher) {
                teacherId = teacher.id;
            } else {
                // If teacher record not found, return empty list for safety
                return res.json([]);
            }
        }

        // A school-level admin can view all branches even though onboarding pins
        // them to the Main Branch (is_main_admin), not just admins with no branch.
        const canIncludeAll = ['ADMIN', 'SUPER_ADMIN', 'PROPRIETOR'].includes(role) && (!req.user.branch_id || req.user.is_main_admin);
        const includeAll = canIncludeAll && (req.query.includeAll === 'true' || req.query.include_all === 'true');
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ClassService.getClasses(req.user.school_id, includeAll ? undefined : branchId, teacherId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

export const createClass = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ClassService.createClass(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

export const updateClass = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ClassService.updateClass(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

export const deleteClass = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id || (req.query.branchId as string));
        await ClassService.deleteClass(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

export const getClassSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const grade = parseInt(req.query.grade as string);
        const section = req.query.section as string;

        if (isNaN(grade) || !section) {
            return res.status(400).json({ message: 'Grade and section are required' });
        }

        const result = await ClassService.getClassSubjects(req.user.school_id, grade, section);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

export const getClassSubjectsById = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ClassService.getClassSubjectsById(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

export const initializeClasses = async (req: AuthRequest, res: Response) => {
    try {
        const { classes, branch_id } = req.body;
        const branchId = getEffectiveBranchId(req.user, branch_id);
        const result = await ClassService.initializeStandardClasses(req.user.school_id, classes, branchId);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

/**
 * GET  /classes/:id/qr  → the class's QR token (created on first request)
 * POST /classes/:id/qr  → issue a NEW token (the old printed code stops working)
 * Admin only. The token is what gets printed; a teacher scans it before the
 * lesson (POST /classrooms/scan) and the school sees who taught what.
 */
export const getClassQr = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can manage class QR codes' });
        const cls = await prisma.class.findFirst({ where: { id: String(req.params.id), school_id: req.user.school_id, deleted_at: null } });
        if (!cls) return res.status(404).json({ message: 'Class not found' });
        let token = cls.qr_token;
        if (!token) {
            token = `CLS-${crypto.randomBytes(12).toString('hex')}`;
            await prisma.class.update({ where: { id: cls.id }, data: { qr_token: token } });
        }
        res.json({ class_id: cls.id, name: cls.name, grade: cls.grade, section: cls.section, qr_token: token });
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};

export const rotateClassQr = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can manage class QR codes' });
        const cls = await prisma.class.findFirst({ where: { id: String(req.params.id), school_id: req.user.school_id, deleted_at: null } });
        if (!cls) return res.status(404).json({ message: 'Class not found' });
        const token = `CLS-${crypto.randomBytes(12).toString('hex')}`;
        await prisma.class.update({ where: { id: cls.id }, data: { qr_token: token } });
        res.json({ class_id: cls.id, name: cls.name, grade: cls.grade, section: cls.section, qr_token: token, rotated: true });
    } catch (error: any) {
        sendError(res, error, 'class.controller.ts');
    }
};
