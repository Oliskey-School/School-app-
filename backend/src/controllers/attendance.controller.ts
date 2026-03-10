import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AttendanceService } from '../services/attendance.service';
import { supabase } from '../config/supabase';

export const getAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { classId, date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        let targetClassId = classId as string;

        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();

            if (!teacher) return res.json([]);

            // Verify teacher has access to the requested classId if provided
            if (targetClassId && targetClassId !== 'any' && targetClassId !== 'all') {
                const { data: access } = await supabase
                    .from('class_teachers')
                    .select('id')
                    .eq('teacher_id', teacher.id)
                    .eq('class_id', targetClassId)
                    .maybeSingle();

                if (!access) return res.status(403).json({ message: 'Unauthorized access to this class' });
            } else {
                // If no classId provided, fetch all classes for this teacher
                const { data: classes } = await supabase
                    .from('class_teachers')
                    .select('class_id')
                    .eq('teacher_id', teacher.id);

                if (!classes || classes.length === 0) return res.json([]);

                // For now, we return empty or implement a bulk fetch for multiple classes
                // Simple fix: if they want 'all' but are a teacher, they get nothing or we must filter.
                // Let's filter by their assigned classes.
                const classIds = classes.map(c => c.class_id);
                const branchId = req.user.branch_id || req.query.branch_id;
                let query = supabase
                    .from('student_attendance')
                    .select('*, students(name, avatar_url)')
                    .eq('school_id', req.user.school_id)
                    .eq('date', date)
                    .in('class_id', classIds);

                if (branchId && branchId !== 'all') {
                    query = query.eq('branch_id', branchId);
                }

                const { data } = await query;
                return res.json(data || []);
            }
        }

        // If classId is provided, fetch for class, otherwise fetch all for school on that date
        let result;
        const branchId = req.user.branch_id || req.query.branch_id;
        if (targetClassId && targetClassId !== 'any' && targetClassId !== 'all') {
            result = await AttendanceService.getAttendance(req.user.school_id, branchId, targetClassId, date as string);
        } else {
            let query = supabase
                .from('student_attendance')
                .select('*, students(name, avatar_url)')
                .eq('school_id', req.user.school_id)
                .eq('date', date);

            if (branchId && branchId !== 'all') {
                query = query.eq('branch_id', branchId);
            }

            const { data } = await query;
            result = data || [];
        }
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const saveAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { records } = req.body;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ message: 'records array is required' });
        }
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await AttendanceService.saveAttendance(req.user.school_id, branchId, records);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAttendanceByStudent = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const branchId = req.user.branch_id || req.query.branch_id;
        const result = await AttendanceService.getAttendanceByStudent(req.user.school_id, branchId, studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkFetchAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'studentIds array is required' });
        }
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await AttendanceService.getAttendanceByStudentIds(req.user.school_id, branchId, studentIds);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
