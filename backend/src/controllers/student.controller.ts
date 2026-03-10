import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { StudentService } from '../services/student.service';
import { supabase } from '../config/supabase';
import { getEffectiveBranchId } from '../utils/branchScope';

export const enrollStudent = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        if (!schoolId) {
            return res.status(400).json({ message: 'School ID is required' });
        }

        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await StudentService.enrollStudent(schoolId, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        console.error('Enrollment controller error:', error);
        if (error.message.includes('required for enrollment')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('User already registered') || error.message.includes('Auth creation failed')) {
            return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

export const getAllStudents = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();

            if (!teacher) return res.json([]);

            const { data: classes } = await supabase
                .from('class_teachers')
                .select('class_id')
                .eq('teacher_id', teacher.id);

            if (!classes || classes.length === 0) return res.json([]);

            const classIds = classes.map(c => c.class_id);

            const { data: students, error } = await supabase
                .from('students')
                .select('*')
                .eq('school_id', req.user.school_id)
                .in('current_class_id', classIds)
                .order('name');

            if (error) throw error;
            return res.json(students || []);
        }
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const classId = (req.query.class_id as string) || (req.query.classId as string);
        const result = await StudentService.getAllStudents(req.user.school_id, branchId, classId);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentById = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await StudentService.getStudentById(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await StudentService.updateStudent(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkUpdateStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { ids, status, branch_id } = req.body;
        if (!Array.isArray(ids) || !status) {
            return res.status(400).json({ message: 'IDs array and status are required' });
        }
        const branchId = getEffectiveBranchId(req.user, branch_id);
        const result = await StudentService.bulkUpdateStatus(req.user.school_id, branchId, ids, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        await StudentService.deleteStudent(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const result = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyPerformance = async (req: AuthRequest, res: Response) => {
    try {
        // We need to find the student ID first
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getPerformance(req.user.school_id, req.user.branch_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyQuizResults = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getQuizResults(req.user.school_id, req.user.branch_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const linkGuardian = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branchId || req.body.branch_id);
        const result = await StudentService.linkGuardian(schoolId, branchId, req.body);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const assignStudentToClass = async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.body;
        if (!classId) return res.status(400).json({ message: 'Class ID is required' });

        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await StudentService.assignStudentToClass(req.user.school_id, branchId, req.params.id as string, classId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const removeStudentFromClass = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await StudentService.removeStudentFromClass(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
