import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TeacherService } from '../services/teacher.service';
import { supabase } from '../config/supabase';

export const createTeacher = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.createTeacher(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllTeachers = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user.role === 'teacher') {
            const { data: teacher, error } = await supabase
                .from('teachers')
                .select('*')
                .eq('user_id', req.user.id)
                .single();

            if (error) throw error;
            return res.json(teacher ? [teacher] : []);
        }

        const branchId = req.query.branchId as string;
        const result = await TeacherService.getAllTeachers(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherById = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getTeacherById(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTeacher = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.updateTeacher(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTeacher = async (req: AuthRequest, res: Response) => {
    try {
        await TeacherService.deleteTeacher(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitMyAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.submitMyAttendance(req.user.school_id, req.user.id);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyHistory = async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 30;
        const result = await TeacherService.getMyAttendanceHistory(req.user.id, limit);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
