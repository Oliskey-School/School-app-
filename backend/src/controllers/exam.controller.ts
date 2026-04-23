import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExamService } from '../services/exam.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getExams = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        if (req.user.role === 'teacher') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ExamService.getExams(req.user.school_id, branchId, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createExam = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ExamService.createExam(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateExam = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ExamService.updateExam(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteExam = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        await ExamService.deleteExam(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getExamResults = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ExamService.getExamResults(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
