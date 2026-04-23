import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { VirtualClassService } from '../services/virtual-class.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

export const createVirtualClassSession = async (req: AuthRequest, res: Response) => {
    try {
        const sessionData = {
            ...req.body,
            school_id: req.user.school_id
        };

        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });

            if (!teacher) return res.status(403).json({ message: 'Teacher profile not found' });

            // Force teacher_id to match the logged in teacher
            sessionData.teacher_id = teacher.id;

            // Verify class access
            if (sessionData.class_id) {
                const access = await prisma.classTeacher.findFirst({
                    where: {
                        teacher_id: teacher.id,
                        class_id: sessionData.class_id
                    }
                });

                if (!access) return res.status(403).json({ message: 'Unauthorized access to this class' });
            }
        }

        const session = await VirtualClassService.createSession(sessionData);
        res.status(201).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getVirtualClassSessions = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        
        const sessions = await VirtualClassService.getSessions(req.user.school_id, branchId, teacherId);
        res.json(sessions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const recordVirtualAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { sessionId, studentId } = req.body;
        
        if (!sessionId || !studentId) {
            return res.status(400).json({ message: 'Session ID and Student ID are required' });
        }

        const attendance = await VirtualClassService.recordAttendance(sessionId, studentId);
        res.status(200).json(attendance);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
