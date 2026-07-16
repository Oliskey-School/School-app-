import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TeacherAssignmentService } from '../services/teacherAssignment.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/not the assigned|not authorized/i.test(message)) return 403;
    if (/required|already|must be/i.test(message)) return 400;
    return 500;
}

function sendError(res: Response, error: any) {
    if (error.requiresConfirmation) {
        return res.status(409).json({
            message: error.message,
            requiresConfirmation: true,
            currentTeacherName: error.currentTeacherName,
            conflicts: error.conflicts,
        });
    }
    res.status(errStatus(error.message)).json({ message: error.message });
}

export const getCoTeacherSetting = async (req: AuthRequest, res: Response) => {
    try {
        const allow = await TeacherAssignmentService.getCoTeacherSetting(req.user.school_id);
        res.json({ allow_co_class_teachers: allow });
    } catch (error: any) { sendError(res, error); }
};

export const setCoTeacherSetting = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can change this setting' });
        const result = await TeacherAssignmentService.setCoTeacherSetting(req.user.school_id, !!req.body.allow_co_class_teachers);
        res.json(result);
    } catch (error: any) { sendError(res, error); }
};

export const assignClassTeacher = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can assign class teachers' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await TeacherAssignmentService.assignClassTeacher(req.user.school_id, req.body, req.user.id, branchId);
        res.status(201).json(result);
    } catch (error: any) { sendError(res, error); }
};

export const assignSubjectTeacher = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can assign subject teachers' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await TeacherAssignmentService.assignSubjectTeacher(req.user.school_id, req.body, req.user.id, branchId);
        res.status(201).json(result);
    } catch (error: any) { sendError(res, error); }
};

export const removeAssignment = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can remove assignments' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await TeacherAssignmentService.removeAssignment(req.user.school_id, req.params.id as string, req.user.id, branchId);
        res.json(result);
    } catch (error: any) { sendError(res, error); }
};

export const transferClassTeacher = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can transfer class teachers' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await TeacherAssignmentService.transferClassTeacher(req.user.school_id, req.params.id as string, req.body.new_class_id, req.user.id, branchId);
        res.json(result);
    } catch (error: any) { sendError(res, error); }
};

export const listAssignments = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view assignments' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await TeacherAssignmentService.listAssignments(req.user.school_id, branchId, {
            role: req.query.role as string, classId: req.query.classId as string, teacherId: req.query.teacherId as string,
        });
        res.json(result);
    } catch (error: any) { sendError(res, error); }
};

export const getWorkload = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view workload' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await TeacherAssignmentService.getWorkload(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) { sendError(res, error); }
};

export const addDuty = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can assign duties' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await TeacherAssignmentService.addDuty(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) { sendError(res, error); }
};

export const removeDuty = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can remove duties' });
        await TeacherAssignmentService.removeDuty(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) { sendError(res, error); }
};

export const getTeachingHistory = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view teaching history' });
        const result = await TeacherAssignmentService.getTeachingHistory(req.user.school_id, req.params.teacherId as string);
        res.json(result);
    } catch (error: any) { sendError(res, error); }
};

/** The logged-in teacher's own roles/assignments — powers the adaptive dashboard. */
export const getMyRoles = async (req: AuthRequest, res: Response) => {
    try {
        const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!teacher) return res.json({ roles: [], class_teacher_of: [], subject_assignments: [] });
        const result = await TeacherAssignmentService.getTeacherRoles(req.user.school_id, teacher.id);
        res.json(result);
    } catch (error: any) { sendError(res, error); }
};

/** "My Class" hub — only the class's active Class Teacher may view it. */
export const getMyClassHub = async (req: AuthRequest, res: Response) => {
    try {
        const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!teacher) return res.status(403).json({ message: 'No teacher profile found for this account' });
        const result = await TeacherAssignmentService.getMyClassHub(req.user.school_id, teacher.id, req.params.classId as string);
        res.json(result);
    } catch (error: any) { sendError(res, error); }
};
