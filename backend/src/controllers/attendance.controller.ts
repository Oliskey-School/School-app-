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
        // If classId is provided, fetch for class, otherwise fetch all for school on that date
        let result;
        if (classId && classId !== 'any' && classId !== 'all') {
            result = await AttendanceService.getAttendance(req.user.school_id, classId as string, date as string);
        } else {
            result = await AttendanceService.getAttendanceByStudentIds(req.user.school_id, []); // Implementation below uses school_id + date
            // Refactor AttendanceService to have a proper getByDate
            const { data } = await supabase.from('student_attendance').select('*, students(name, avatar_url)').eq('school_id', req.user.school_id).eq('date', date);
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
        const result = await AttendanceService.saveAttendance(req.user.school_id, records);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAttendanceByStudent = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const result = await AttendanceService.getAttendanceByStudent(req.user.school_id, studentId as string);
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
        const result = await AttendanceService.getAttendanceByStudentIds(req.user.school_id, studentIds);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
