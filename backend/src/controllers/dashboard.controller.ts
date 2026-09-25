import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

// Students and parents have their own dashboards; the school-wide stats
// (overdue fee totals, unpublished reports) and the activity/audit feed are
// staff views. No student or parent screen calls them.
const isStudentOrParent = (req: AuthRequest) => ['STUDENT', 'PARENT'].includes(String(req.user?.role || '').toUpperCase());

// The students a student/parent may see: themselves, or their linked children.
async function ownStudentIds(req: AuthRequest): Promise<string[]> {
    const role = String(req.user.role || '').toUpperCase();
    if (role === 'STUDENT') {
        const s = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        return s ? [s.id] : [];
    }
    const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    if (!parent) return [];
    const links = await prisma.parentChild.findMany({ where: { parent_id: parent.id, deleted_at: null }, select: { student_id: true } });
    return links.map(l => l.student_id);
}

export const getStats = async (req: AuthRequest, res: Response) => {
    try {
        if (isStudentOrParent(req)) return res.status(403).json({ message: 'School statistics are available to staff only.' });
        console.log(`[DashboardController] getStats requested. User Role: ${req.user.role}`);
        // Always trust the verified token's school_id, never a client-supplied param/query value.
        const schoolId = req.user.school_id;
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
        sendError(res, error, 'dashboard.controller.ts');
    }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        if (isStudentOrParent(req)) return res.status(403).json({ message: 'Activity logs are available to staff only.' });
        const schoolId = req.user.school_id;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const logs = await DashboardService.getAuditLogs(schoolId, limit, branchId);
        res.json(logs);
    } catch (error: any) {
        sendError(res, error, 'dashboard.controller.ts');
    }
};

export const getParentTodayUpdate = async (req: AuthRequest, res: Response) => {
    try {
        const result = await DashboardService.getParentTodayUpdate(req.user.id, req.user.school_id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'dashboard.controller.ts');
    }
};

export const globalSearch = async (req: AuthRequest, res: Response) => {
    try {
        const { term } = req.query;
        const schoolId = req.user.school_id;

        if (!term) {
            return res.status(400).json({ message: 'Search term is required' });
        }

        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const results: any = await DashboardService.globalSearch(
            schoolId,
            term as string,
            branchId as string
        );

        // Search is shared by every dashboard, but people results are not: a
        // student/parent got every matching student's full record (email etc.)
        // and every parent. They keep assignments/quizzes/notices/classes, see
        // only themselves / their own children, and a teacher's name + email.
        if (isStudentOrParent(req)) {
            const own = await ownStudentIds(req);
            results.students = (results.students || []).filter((s: any) => own.includes(s.id));
            results.parents = [];
            results.teachers = (results.teachers || []).map((t: any) => ({ id: t.id, full_name: t.full_name, email: t.email }));
        }
        res.json(results);
    } catch (error: any) {
        sendError(res, error, 'dashboard.controller.ts');
    }
};
