import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ClassroomService } from '../services/classroom.service';
import { LessonAttendanceService } from '../services/lessonAttendance.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

async function resolveTeacherId(req: AuthRequest): Promise<string | null> {
    if (req.user.teacher_profile?.id) return req.user.teacher_profile.id;
    const teacher = await (prisma as any).teacher.findUnique({
        where: { user_id: req.user.id },
        select: { id: true }
    });
    return teacher?.id ?? null;
}

// ---------- Classrooms (admin) ----------

export const getClassrooms = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await ClassroomService.getClassrooms(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createClassroom = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can manage classrooms' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id) || req.body.branch_id;
        const result = await ClassroomService.createClassroom(
            req.user.school_id,
            { ...req.body, branch_id: branchId },
            req.user.id
        );
        res.status(201).json(result);
    } catch (error: any) {
        const status = /required|not found|already exists/i.test(error.message) ? 400 : 500;
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'A classroom with this name already exists in this branch' });
        }
        res.status(status).json({ message: error.message });
    }
};

export const updateClassroom = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can manage classrooms' });
        const result = await ClassroomService.updateClassroom(req.user.school_id, req.params.id as string, req.body, req.user.id);
        res.json(result);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'A classroom with this name already exists in this branch' });
        }
        res.status(error.message === 'Classroom not found' ? 404 : 500).json({ message: error.message });
    }
};

export const deleteClassroom = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can manage classrooms' });
        const result = await ClassroomService.deleteClassroom(req.user.school_id, req.params.id as string, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.message === 'Classroom not found' ? 404 : 500).json({ message: error.message });
    }
};

// ---------- Lesson attendance (QR scans + reports) ----------

export const scanClassroom = async (req: AuthRequest, res: Response) => {
    try {
        const role = (req.user.role || '').toLowerCase();
        if (role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can scan classroom QR codes' });
        }
        const teacherId = await resolveTeacherId(req);
        if (!teacherId) return res.status(403).json({ message: 'No teacher profile found for this account' });

        const result = await LessonAttendanceService.scan(req.user.school_id, teacherId, req.body.qr_token);
        res.json(result);
    } catch (error: any) {
        // Scan rejections are expected user-facing outcomes, not server faults.
        res.status(400).json({ message: error.message });
    }
};

export const getMyLessonsToday = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = await resolveTeacherId(req);
        if (!teacherId) return res.json([]);
        const result = await LessonAttendanceService.getTeacherToday(req.user.school_id, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getDailyReport = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view lesson attendance reports' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await LessonAttendanceService.getDailyReport(
            req.user.school_id,
            branchId,
            req.query.date as string | undefined
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
