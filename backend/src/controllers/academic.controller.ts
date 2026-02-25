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

        const result = await AcademicService.saveGrade(req.user.school_id, studentId, subject, term, score, session);
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

        const result = await AcademicService.getGrades(req.user.school_id, studentIds, subject, term);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
