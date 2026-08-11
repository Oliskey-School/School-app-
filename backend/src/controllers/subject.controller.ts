import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SubjectService } from '../services/subject.service';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await SubjectService.getSubjects(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCurriculumTopics = async (req: AuthRequest, res: Response) => {
    try {
        const subjectId = req.params.subjectId as string;
        const term = req.query.term as string | undefined;
        const branchId = getEffectiveBranchId(req.user);
        const result = await SubjectService.getCurriculumTopics(req.user.school_id, branchId, subjectId, term);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const createSubject = async (req: AuthRequest, res: Response) => {
    try {
        const { name, color } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Subject name is required' });
        }
        // Create the subject in the admin's ACTIVE branch so it stays isolated.
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await SubjectService.createSubject(req.user.school_id, branchId, name, color);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSubjectColor = async (req: AuthRequest, res: Response) => {
    try {
        const role = (req.user.role || '').toLowerCase();
        if (!['admin', 'superadmin', 'proprietor'].includes(role)) {
            return res.status(403).json({ message: 'Only an admin can update subjects.' });
        }
        const result = await SubjectService.updateSubjectColor(req.user.school_id, req.params.id as string, req.body.color ?? null);
        res.json(result);
    } catch (error: any) {
        const status = error.message === 'Subject not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

export const deleteSubject = async (req: AuthRequest, res: Response) => {
    try {
        // School-wide subject removal is an admin decision, not a teacher's.
        const role = (req.user.role || '').toLowerCase();
        if (!['admin', 'superadmin', 'proprietor'].includes(role)) {
            return res.status(403).json({ message: 'Only an admin can delete subjects.' });
        }
        const result = await SubjectService.deleteSubject(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        const status = error.message === 'Subject not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};
