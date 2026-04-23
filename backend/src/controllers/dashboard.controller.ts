import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getStats = async (req: AuthRequest, res: Response) => {
    try {
        console.log(`[DashboardController] getStats requested. User Role: ${req.user.role}`);
        const schoolId = req.params.schoolId || req.user.school_id || (req.query.schoolId as string) || (req.query.school_id as string);
        let teacherId = (req.query.teacherId || req.query.teacher_id) as string | undefined;

        if (req.user.role === 'TEACHER' && !teacherId) {
            console.log('[DashboardController] User is a teacher. Fetching teacher record...');
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true, email: true }
            });

            if (teacher) {
                teacherId = teacher.id;
            } else {
                return res.json({ totalStudents: 0, totalTeachers: 0, totalParents: 0, totalClasses: 0, overdueFees: 0, recentActivity: [] });
            }
        }

        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        console.log(`[DashboardController] Calling DashboardService.getStats with schoolId: ${schoolId}, teacherId: ${teacherId}, branchId: ${branchId}`);
        const stats = await DashboardService.getStats(schoolId, teacherId, branchId);
        res.json(stats);
    } catch (error: any) {
        console.error('[DashboardController] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.params.schoolId || req.user.school_id || (req.query.schoolId as string) || (req.query.school_id as string);
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const logs = await DashboardService.getAuditLogs(schoolId, limit, branchId);
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getParentTodayUpdate = async (req: AuthRequest, res: Response) => {
    try {
        const result = await DashboardService.getParentTodayUpdate(req.user.id, req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const globalSearch = async (req: AuthRequest, res: Response) => {
    try {
        const { term } = req.query;
        const schoolId = (req.query.schoolId as string) || req.user.school_id;

        if (!term) {
            return res.status(400).json({ message: 'Search term is required' });
        }

        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const results = await DashboardService.globalSearch(
            schoolId,
            term as string,
            branchId as string
        );
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
