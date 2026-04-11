import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PDService } from '../services/pd.service';

export const getCourses = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const courses = await PDService.getCourses(schoolId);
        res.json(courses || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyEnrollments = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.user.id;
        const enrollments = await PDService.getMyEnrollments(teacherId);
        res.json(enrollments || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const enrollInCourse = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.user.id;
        const { courseId } = req.body;
        const result = await PDService.enrollInCourse(teacherId, courseId);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { enrollmentId, progress } = req.body;
        const result = await PDService.updateProgress(enrollmentId, progress);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
