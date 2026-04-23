import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TeacherService } from '../services/teacher.service';
import prisma from '../config/database'; // Added prisma if needed, but the controller mainly uses TeacherService
import { getEffectiveBranchId } from '../utils/branchScope';

export const createTeacher = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await TeacherService.createTeacher(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getTeacherProfileByUserId(req.user.school_id, req.user.id);
        if (!result) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllTeachers = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user.role === 'teacher') {
            const result = await TeacherService.getTeacherProfileByUserId(req.user.school_id, req.user.id);
            return res.json(result ? [result] : []);
        }

        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const result = await TeacherService.getAllTeachers(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherById = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await TeacherService.getTeacherById(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTeacher = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await TeacherService.updateTeacher(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTeacher = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId as string) || req.body?.branch_id);
        await TeacherService.deleteTeacher(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitMyAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const result = await TeacherService.submitMyAttendance(req.user.school_id, branchId, req.user.id);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyHistory = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const limit = parseInt(req.query.limit as string) || 30;
        const result = await TeacherService.getMyAttendanceHistory(req.user.school_id, branchId, req.user.id, limit);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id as string) || (req.query.branchId as string));
        const filters = {
            date: req.query.date as string,
            status: req.query.status as string,
            teacher_id: (req.query.teacher_id as string) || (req.query.teacherId as string),
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string
        };
        const result = await TeacherService.getTeacherAttendance(req.user.school_id, branchId, filters);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const saveTeacherAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const { records } = req.body;
        const result = await TeacherService.saveTeacherAttendance(req.user.school_id, branchId, records);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const approveTeacherAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const result = await TeacherService.approveTeacherAttendance(req.user.school_id, req.params.id as string, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyStudentsWithCredentials = async (req: AuthRequest, res: Response) => {
    try {
        const teacher = await TeacherService.getTeacherProfileByUserId(req.user.school_id, req.user.id);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }

        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await TeacherService.getStudentsWithCredentials(req.user.school_id, branchId, teacher.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPendingStudents = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await TeacherService.getPendingStudentsForSchool(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const getMyAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const teacher = await TeacherService.getTeacherProfileByUserId(req.user.school_id, req.user.id);
        if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });

        const branchId = getEffectiveBranchId(req.user);
        const result = await TeacherService.getTeacherAppointments(req.user.school_id, branchId, teacher.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateMyAppointmentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const result = await TeacherService.updateAppointmentStatus(req.user.school_id, req.params.id as string, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyBadges = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getTeacherBadges(req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyRecognitions = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getTeacherRecognitions(req.user.school_id, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyMentoring = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getMentoringMatches(req.user.school_id, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createMyMentoring = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.createMentoringMatch(req.user.id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherCertificates = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getTeacherCertificates(req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSubstituteRequests = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await TeacherService.getSubstituteRequests(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createSubstituteRequest = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.createSubstituteRequest(req.user.school_id, req.user.id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherEvaluation = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getTeacherEvaluation(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitTeacherEvaluation = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.submitTeacherEvaluation(req.user.school_id, req.params.id as string, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherPerformance = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getTeacherPerformance(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


