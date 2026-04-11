import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExtracurricularService } from '../services/extracurricular.service';
import { StudentService } from '../services/student.service';

export const getAllActivities = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = req.query.branchId as string || req.query.branch_id as string;
        const result = await ExtracurricularService.getActivities(schoolId, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyActivities = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        const result = await ExtracurricularService.getMyActivities(student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const joinActivity = async (req: AuthRequest, res: Response) => {
    try {
        const { activityId } = req.body;
        if (!activityId) return res.status(400).json({ message: 'Activity ID is required' });

        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        const result = await ExtracurricularService.joinActivity(student.id, activityId);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const leaveActivity = async (req: AuthRequest, res: Response) => {
    try {
        const { activityId } = req.params;
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        await ExtracurricularService.leaveActivity(student.id, activityId);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getEventsByDateRange = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = req.query.branchId as string || req.query.branch_id as string;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const result = await ExtracurricularService.getEvents(schoolId, branchId, startDate, endDate);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
