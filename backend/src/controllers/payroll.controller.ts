import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabase } from '../config/supabase';

export const getPayslips = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        
        if (!teacherId) {
            return res.status(400).json({ message: 'Teacher ID is required' });
        }

        const { data, error } = await supabase
            .from('payslips')
            .select('*, payslip_items(*)')
            .eq('teacher_id', teacherId)
            .order('period_start', { ascending: false });
            
        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        
        if (!teacherId) {
            return res.status(400).json({ message: 'Teacher ID is required' });
        }

        const { data, error } = await supabase
            .from('payment_transactions')
            .select('*, payslips!inner(period_start, period_end, teacher_id)')
            .eq('payslips.teacher_id', teacherId)
            .order('payment_date', { ascending: false });

        if (error) {
             // Fallback for older supabase client syntax if inner join fails
             const { data: altData, error: altError } = await supabase
                .from('payment_transactions')
                .select('*, payslips(period_start, period_end)')
                .eq('payslip_id.teacher_id', teacherId)
                .order('payment_date', { ascending: false });
                
             if (altError) throw altError;
             return res.json(altData || []);
        }

        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
