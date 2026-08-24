import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TimetableService } from '../services/timetable.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

export const getTimetable = async (req: AuthRequest, res: Response) => {
    try {
        const { className } = req.query;
        let { teacherId } = req.query;
        const role = (req.user.role || '').toLowerCase();

        // Admins manage drafts; everyone else only sees published timetables.
        const publishedOnly = ['teacher', 'student', 'parent'].includes(role);

        if (role === 'teacher') {
            // For real users the middleware already loaded teacher_profile; reuse it.
            // For demo users (no teacher_profile on req.user) fall back to a DB lookup.
            const teacherRecord = req.user.teacher_profile
                || await (prisma as any).teacher.findUnique({
                    where: { user_id: req.user.id },
                    select: { id: true }
                });

            if (teacherRecord?.id) {
                teacherId = teacherRecord.id;
            } else {
                return res.json([]);
            }
        }

        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        teacherId = teacherId || req.query.teacher_id as string;

        const result = await TimetableService.getTimetable(
            req.user.school_id,
            branchId as string,
            className as string,
            teacherId as string,
            { publishedOnly }
        );
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'timetable.controller.ts');
    }
};

export const createTimetable = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Only admins can create timetable entries' });
        }
        const schoolId = req.user.school_id;
        const result = await TimetableService.createTimetable(schoolId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'timetable.controller.ts');
    }
};

export const updateTimetable = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Only admins can update timetable entries' });
        }
        const schoolId = req.user.school_id;
        const { id } = req.params;
        const result = await TimetableService.updateTimetable(schoolId, id as string, req.body);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'timetable.controller.ts');
    }
};

export const deleteTimetable = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Only admins can delete timetable entries' });
        }
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await TimetableService.deleteTimetable(schoolId, id as string);
        res.json({ success: true });
    } catch (error: any) {
        sendError(res, error, 'timetable.controller.ts');
    }
};

export const deleteTimetableByClass = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Only admins can delete timetable entries' });
        }
        const schoolId = req.user.school_id;
        const { classId } = req.params;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        await TimetableService.deleteTimetableByClass(schoolId, classId as string, branchId as string | undefined);
        res.json({ success: true });
    } catch (error: any) {
        sendError(res, error, 'timetable.controller.ts');
    }
};

export const notifyPublished = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { class_names } = req.body;
        await TimetableService.notifyPublished(schoolId, class_names || []);
        res.json({ success: true });
    } catch (error: any) {
        sendError(res, error, 'timetable.controller.ts');
    }
};

export const checkConflict = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await TimetableService.checkTeacherConflict(schoolId, req.body);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'timetable.controller.ts');
    }
};

