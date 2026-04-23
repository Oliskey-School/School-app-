import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AttendanceService } from '../services/attendance.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { classId, date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        let targetClassId = classId as string;

        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });

            if (!teacher) return res.json([]);

            // Verify teacher has access to the requested classId if provided
            if (targetClassId && targetClassId !== 'any' && targetClassId !== 'all') {
                const access = await prisma.classTeacher.findFirst({
                    where: {
                        teacher_id: teacher.id,
                        class_id: targetClassId
                    }
                });

                if (!access) return res.status(403).json({ message: 'Unauthorized access to this class' });
            } else {
                // If no classId provided, fetch all classes for this teacher
                const classes = await prisma.classTeacher.findMany({
                    where: { teacher_id: teacher.id },
                    select: { class_id: true }
                });

                if (!classes || classes.length === 0) return res.json([]);

                const classIds = classes.map(c => c.class_id);
                const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
                
                const attendance = await prisma.attendance.findMany({
                    where: {
                        class: {
                            school_id: req.user.school_id,
                            branch_id: branchId && branchId !== 'all' ? branchId : undefined
                        },
                        date: new Date(date as string),
                        class_id: { in: classIds }
                    },
                    include: {
                        student: true
                    }
                });
                
                return res.json(attendance || []);
            }
        }

        // If classId is provided, fetch for class, otherwise fetch all for school on that date
        let result;
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        if (targetClassId && targetClassId !== 'any' && targetClassId !== 'all') {
            result = await AttendanceService.getAttendance(req.user.school_id, branchId, targetClassId, date as string);
        } else {
            result = await prisma.attendance.findMany({
                where: {
                    class: {
                        school_id: req.user.school_id,
                        branch_id: branchId && branchId !== 'all' ? branchId : undefined
                    },
                    date: new Date(date as string)
                },
                include: {
                    student: true
                }
            });
        }
        res.json(result);
    } catch (error: any) {
        console.error('[AttendanceController] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const saveAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { records } = req.body;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ message: 'records array is required' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await AttendanceService.saveAttendance(req.user.school_id, branchId, records);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAttendanceByStudent = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await AttendanceService.getAttendanceByStudent(req.user.school_id, branchId, studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkFetchAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { studentIds, startDate, endDate } = req.body;
        if (!Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'studentIds array is required' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await AttendanceService.getAttendanceByStudentIds(req.user.school_id, branchId, studentIds, startDate, endDate);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
