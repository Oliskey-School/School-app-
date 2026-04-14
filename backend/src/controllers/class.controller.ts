import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ClassService } from '../services/class.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getClass = async (req: AuthRequest, res: Response) => {
    try {
        const classId = req.params.id as string;
        const result = await ClassService.getClass(req.user.school_id, classId);
        
        if (!result) {
            return res.status(404).json({ message: 'Class not found' });
        }
        
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getClassStudents = async (req: AuthRequest, res: Response) => {
    try {
        const classId = req.params.id as string;
        const result = await ClassService.getClassStudents(req.user.school_id, classId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getClasses = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;

        if (req.user.role === 'teacher') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });

            if (teacher) {
                teacherId = teacher.id;
            } else {
                // If teacher record not found, return empty list for safety
                return res.json([]);
            }
        }

        const includeAll = req.query.includeAll === 'true' || req.query.include_all === 'true';
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ClassService.getClasses(req.user.school_id, branchId, includeAll ? undefined : teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createClass = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ClassService.createClass(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateClass = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ClassService.updateClass(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteClass = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        await ClassService.deleteClass(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getClassSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const grade = parseInt(req.query.grade as string);
        const section = req.query.section as string;
        
        if (isNaN(grade) || !section) {
            return res.status(400).json({ message: 'Grade and section are required' });
        }

        const result = await ClassService.getClassSubjects(req.user.school_id, grade, section);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const initializeClasses = async (req: AuthRequest, res: Response) => {
    try {
        const { classes, branch_id } = req.body;
        const branchId = getEffectiveBranchId(req.user, branch_id);
        const result = await ClassService.initializeStandardClasses(req.user.school_id, classes, branchId);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
