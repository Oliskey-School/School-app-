import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DepartmentService } from '../services/department.service';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/required/i.test(message)) return 400;
    return 500;
}

export const getDepartments = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await DepartmentService.getDepartments(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can create departments' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await DepartmentService.createDepartment(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update departments' });
        const result = await DepartmentService.updateDepartment(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const assignTeacher = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can assign teachers to departments' });
        const result = await DepartmentService.assignTeacher(req.user.school_id, req.params.id as string, req.body.teacher_id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const removeTeacher = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can remove teachers from departments' });
        const result = await DepartmentService.removeTeacher(req.user.school_id, req.params.teacherId as string);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const addBudget = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can add a budget line' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await DepartmentService.addBudget(req.user.school_id, branchId, req.params.id as string, req.body);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const createMeeting = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can log a department meeting' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await DepartmentService.createMeeting(req.user.school_id, branchId, req.params.id as string, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const updateMeetingMinutes = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update meeting minutes' });
        const result = await DepartmentService.updateMeetingMinutes(req.user.school_id, req.params.meetingId as string, req.body.minutes);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getReport = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view a department report' });
        const result = await DepartmentService.getReport(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};
