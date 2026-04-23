import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TimetableService } from '../services/timetable.service';
import prisma from '../config/database';

export const getTimetable = async (req: AuthRequest, res: Response) => {
    try {
        const { className } = req.query;
        let { teacherId } = req.query;

        if (req.user.role === 'TEACHER') {
            const teacher = await (prisma as any).teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });

            if (teacher) {
                teacherId = teacher.id;
            } else {
                return res.json([]);
            }
        }

        const branchId = req.user.branch_id || req.query.branchId as string || req.query.branch_id as string;
        teacherId = teacherId || req.query.teacher_id as string;

        const result = await TimetableService.getTimetable(
            req.user.school_id,
            branchId as string,
            className as string,
            teacherId as string
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createTimetable = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await TimetableService.createTimetable(schoolId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTimetable = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        const result = await TimetableService.updateTimetable(schoolId, id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTimetable = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await TimetableService.deleteTimetable(schoolId, id as string);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTimetableByClass = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { classId } = req.params;
        await TimetableService.deleteTimetableByClass(schoolId, classId as string);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const checkConflict = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await TimetableService.checkTeacherConflict(schoolId, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

