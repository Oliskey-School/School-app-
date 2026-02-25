import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { VirtualClassService } from '../services/virtual-class.service';
import { supabase } from '../config/supabase';

export const createVirtualClassSession = async (req: AuthRequest, res: Response) => {
    try {
        const sessionData = { 
            ...req.body,
            school_id: req.user.school_id 
        };

        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            
            if (!teacher) return res.status(403).json({ message: 'Teacher profile not found' });
            
            // Force teacher_id to match the logged in teacher
            sessionData.teacher_id = teacher.id;

            // Verify class access
            if (sessionData.class_id) {
                const { data: access } = await supabase
                    .from('class_teachers')
                    .select('id')
                    .eq('teacher_id', teacher.id)
                    .eq('class_id', sessionData.class_id)
                    .maybeSingle();
                
                if (!access) return res.status(403).json({ message: 'Unauthorized access to this class' });
            }
        }

        const session = await VirtualClassService.createSession(sessionData);
        res.status(201).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
