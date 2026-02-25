import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AssignmentService } from '../services/assignment.service';
import { supabase } from '../config/supabase';

export const getAssignments = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        const result = await AssignmentService.getAssignments(req.user.school_id, req.query.classId as string, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const result = await AssignmentService.createAssignment(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
    try {
        const result = await AssignmentService.getSubmissions(req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const gradeSubmission = async (req: AuthRequest, res: Response) => {
    try {
        const result = await AssignmentService.gradeSubmission(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const result = await AssignmentService.submitAssignment(req.user.school_id, req.user.id, req.params.id as string, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
