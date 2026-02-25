import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AssignmentService } from '../services/assignment.service';
import { supabase } from '../config/supabase';

export const getAssignments = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        // If teacher role, only show THEIR assignments by default
        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .maybeSingle();

            if (teacher) {
                teacherId = teacher.id;
            } else {
                // Try email fallback if user_id is missing or doesn't match
                const { data: teacherByEmail } = await supabase
                    .from('teachers')
                    .select('id')
                    .eq('email', req.user.email)
                    .maybeSingle();

                if (teacherByEmail) {
                    teacherId = teacherByEmail.id;
                } else {
                    console.warn(`⚠️ [Backend] No teacher profile found for user ${req.user.id}`);
                    return res.json([]);
                }
            }
        }

        const { classId, className } = req.query;
        const result = await AssignmentService.getAssignments(
            req.user.school_id,
            classId as string,
            teacherId,
            className as string
        );
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
