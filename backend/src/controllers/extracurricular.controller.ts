import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExtracurricularService } from '../services/extracurricular.service';
import { StudentService } from '../services/student.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

export const getAllActivities = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await ExtracurricularService.getActivities(schoolId, branchId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'extracurricular.controller.ts');
    }
};

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/required/i.test(message)) return 400;
    return 500;
}

export const createActivity = async (req: AuthRequest, res: Response) => {
    try {
        if (!ADMIN_ROLES.includes((req.user.role || '').toLowerCase())) return res.status(403).json({ message: 'Only admins can create a club' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ExtracurricularService.createActivity(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const markClubAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const role = (req.user.role || '').toLowerCase();
        if (!ADMIN_ROLES.includes(role) && role !== 'teacher') return res.status(403).json({ message: 'Only staff can mark club attendance' });
        const result = await ExtracurricularService.markAttendance(req.user.school_id, req.params.id as string, req.body.date, req.body.records, req.user.id);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getClubAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ExtracurricularService.getAttendance(req.user.school_id, req.params.id as string, req.query.date as string);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const addClubAchievement = async (req: AuthRequest, res: Response) => {
    try {
        const role = (req.user.role || '').toLowerCase();
        if (!ADMIN_ROLES.includes(role) && role !== 'teacher') return res.status(403).json({ message: 'Only staff can log a club achievement' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ExtracurricularService.addAchievement(req.user.school_id, branchId, req.params.id as string, req.body);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getClubAchievements = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ExtracurricularService.getClubAchievements(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const setActivityAdvisor = async (req: AuthRequest, res: Response) => {
    try {
        if (!ADMIN_ROLES.includes((req.user.role || '').toLowerCase())) return res.status(403).json({ message: 'Only admins can assign a club advisor' });
        const result = await ExtracurricularService.setAdvisor(req.user.school_id, req.params.id as string, req.body.teacher_id || null);
        res.json(result);
    } catch (error: any) {
        res.status(/not found/i.test(error.message) ? 404 : 500).json({ message: error.message });
    }
};

export const getMyActivities = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        const result = await ExtracurricularService.getMyActivities(student.id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'extracurricular.controller.ts');
    }
};

export const joinActivity = async (req: AuthRequest, res: Response) => {
    try {
        const { activityId } = req.body;
        if (!activityId) return res.status(400).json({ message: 'Activity ID is required' });

        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        const result = await ExtracurricularService.joinActivity(req.user.school_id, student.id, activityId);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const leaveActivity = async (req: AuthRequest, res: Response) => {
    try {
        const { activityId } = req.params;
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        await ExtracurricularService.leaveActivity(req.user.school_id, student.id, activityId as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getEventsByDateRange = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const result = await ExtracurricularService.getEvents(schoolId, branchId, startDate, endDate);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'extracurricular.controller.ts');
    }
};
