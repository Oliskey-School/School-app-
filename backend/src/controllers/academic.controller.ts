import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AcademicService } from '../services/academic.service';
import { supabase } from '../config/supabase';

export const saveGrade = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, subject, term, score, session } = req.body;

        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();

            if (!teacher) return res.status(403).json({ message: 'Teacher profile not found' });

            // Check assignment in class_teachers or teacher_subjects
            const { data: assigned } = await supabase
                .from('class_teachers')
                .select('id, subjects!inner(name)')
                .eq('teacher_id', teacher.id)
                .eq('subjects.name', subject)
                .maybeSingle();

            if (!assigned) {
                // Fallback to legacy check
                const { data: legacyAssigned } = await supabase
                    .from('teacher_subjects')
                    .select('id')
                    .eq('teacher_id', teacher.id)
                    .eq('subject', subject)
                    .maybeSingle();

                if (!legacyAssigned) {
                    return res.status(403).json({ message: 'You are not assigned to this subject' });
                }
            }
        }

        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await AcademicService.saveGrade(req.user.school_id, branchId, studentId, subject, term, score, session);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getGrades = async (req: AuthRequest, res: Response) => {
    try {
        const { studentIds, subject, term } = req.body;

        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();

            if (!teacher) return res.json([]);

            // Check assignment
            const { data: assigned } = await supabase
                .from('class_teachers')
                .select('id, subjects!inner(name)')
                .eq('teacher_id', teacher.id)
                .eq('subjects.name', subject)
                .maybeSingle();

            if (!assigned) {
                const { data: legacyAssigned } = await supabase
                    .from('teacher_subjects')
                    .select('id')
                    .eq('teacher_id', teacher.id)
                    .eq('subject', subject)
                    .maybeSingle();

                if (!legacyAssigned) {
                    return res.status(403).json({ message: 'You are not assigned to this subject' });
                }
            }
        }

        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await AcademicService.getGrades(req.user.school_id, branchId, studentIds, subject, term);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = (req.query.school_id as string) || req.user.school_id;
        const branchId = (req.query.branch_id as string) || req.user.branch_id;

        const result = await AcademicService.getSubjects(schoolId, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = (req.query.schoolId as string) || req.user.school_id;
        const branchId = (req.query.branchId as string) || req.user.branch_id;
        const term = req.query.term as string;
        const classId = req.query.classId ? parseInt(req.query.classId as string) : null;

        const result = await AcademicService.getAnalytics(schoolId, branchId, term, classId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
