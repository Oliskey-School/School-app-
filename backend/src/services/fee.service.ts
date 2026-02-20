import { supabase } from '../config/supabase';

export class FeeService {
    static async createFee(schoolId: string, data: any) {
        // Map frontend camelCase to database snake_case
        const dbData = {
            school_id: schoolId,
            student_id: data.studentId,
            title: data.title,
            amount: data.amount,
            paid_amount: data.paidAmount || 0,
            status: data.status || 'Pending',
            due_date: data.dueDate
        };

        const { data: fee, error } = await supabase
            .from('student_fees')
            .insert([dbData])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Map back to camelCase for frontend
        return {
            id: fee.id,
            studentId: fee.student_id,
            title: fee.title,
            amount: fee.amount,
            paidAmount: fee.paid_amount,
            status: fee.status,
            dueDate: fee.due_date,
            createdAt: fee.created_at
        };
    }

    static async getAllFees(schoolId: string) {
        const { data, error } = await supabase
            .from('student_fees')
            .select('*')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Map to camelCase for frontend
        return data.map(fee => ({
            id: fee.id,
            studentId: fee.student_id,
            title: fee.title,
            amount: fee.amount,
            paidAmount: fee.paid_amount,
            status: fee.status,
            dueDate: fee.due_date,
            createdAt: fee.created_at
        }));
    }

    static async getFeeById(schoolId: string, id: string) {
        const { data, error } = await supabase
            .from('student_fees')
            .select('*')
            .eq('school_id', schoolId)
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            studentId: data.student_id,
            title: data.title,
            amount: data.amount,
            paidAmount: data.paid_amount,
            status: data.status,
            dueDate: data.due_date,
            createdAt: data.created_at
        };
    }

    static async updateFee(schoolId: string, id: string, updates: any) {
        // Map updates to snake_case
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.paidAmount !== undefined) dbUpdates.paid_amount = updates.paidAmount;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;

        const { data, error } = await supabase
            .from('student_fees')
            .update(dbUpdates)
            .eq('school_id', schoolId)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            studentId: data.student_id,
            title: data.title,
            amount: data.amount,
            paidAmount: data.paid_amount,
            status: data.status,
            dueDate: data.due_date,
            createdAt: data.created_at
        };
    }

    static async updateFeeStatus(schoolId: string, id: string, status: string) {
        const { data, error } = await supabase
            .from('student_fees')
            .update({ status })
            .eq('school_id', schoolId)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            studentId: data.student_id,
            title: data.title,
            amount: data.amount,
            paidAmount: data.paid_amount,
            status: data.status,
            dueDate: data.due_date,
            createdAt: data.created_at
        };
    }

    static async deleteFee(schoolId: string, id: string) {
        const { error } = await supabase
            .from('student_fees')
            .delete()
            .eq('school_id', schoolId)
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    }

    static async getFeesByStudentIds(schoolId: string, studentIds: string[], statusList?: string[]) {
        let query = supabase
            .from('student_fees')
            .select('*')
            .eq('school_id', schoolId)
            .in('student_id', studentIds);

        if (statusList && statusList.length > 0) {
            query = query.in('status', statusList);
        }

        const { data, error } = await query.order('due_date', { ascending: true });

        if (error) throw new Error(error.message);

        return (data || []).map(fee => ({
            id: fee.id,
            studentId: fee.student_id,
            title: fee.title,
            amount: fee.amount,
            paidAmount: fee.paid_amount,
            status: fee.status,
            dueDate: fee.due_date,
            createdAt: fee.created_at
        }));
    }
}

