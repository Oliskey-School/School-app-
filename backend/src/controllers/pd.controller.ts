import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PDService } from '../services/pd.service';
import { sendError } from '../utils/httpError';

export const getCourses = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const teacherId = await PDService.resolveTeacherId(req.user.id);
        const courses = await PDService.getCourses(schoolId, teacherId);
        res.json(courses || []);
    } catch (error: any) {
        sendError(res, error, 'pd.controller.ts');
    }
};

export const getMyEnrollments = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = await PDService.resolveTeacherId(req.user.id);
        if (!teacherId) return res.json([]);
        const enrollments = await PDService.getMyEnrollments(teacherId);
        res.json(enrollments || []);
    } catch (error: any) {
        sendError(res, error, 'pd.controller.ts');
    }
};

export const enrollInCourse = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = await PDService.resolveTeacherId(req.user.id);
        if (!teacherId) return res.status(400).json({ message: 'Teacher profile not found for this account' });
        const courseId = req.params.id || req.body.courseId;
        if (!courseId) return res.status(400).json({ message: 'courseId is required' });
        const result = await PDService.enrollInCourse(teacherId, String(courseId), req.user.school_id);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'pd.controller.ts');
    }
};

export const updateProgress = async (req: AuthRequest, res: Response) => {
    try {
        const enrollmentId = req.body.enrollmentId;
        const progress = req.body.progress;
        if (!enrollmentId) return res.status(400).json({ message: 'enrollmentId is required' });

        // A teacher may only update the progress on their OWN enrollment record.
        // Previously any authenticated teacher could pass another teacher's
        // enrollmentId and mark their PD course "Completed" — verified live
        // (round 8 audit) with two real teacher accounts.
        const teacherId = await PDService.resolveTeacherId(req.user.id);
        if (!teacherId) return res.status(403).json({ message: 'Teacher profile not found for this account' });
        const owns = await PDService.enrollmentBelongsToTeacher(enrollmentId, teacherId);
        if (!owns) return res.status(403).json({ message: 'You do not have access to this enrollment' });

        const result = await PDService.updateProgress(enrollmentId, progress);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'pd.controller.ts');
    }
};
