/**
 * Supabase Service for Express Backend
 * This connects the Express API to Supabase for hybrid architecture
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('Warning: Supabase credentials not found. Some features may not work.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// ============================================
// STUDENTS
// ============================================

export const getAllStudents = async () => {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return data;
};

export const getStudentById = async (id: number) => {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

export const createStudent = async (studentData: any) => {
    const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateStudent = async (id: number, studentData: any) => {
    const { data, error } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteStudent = async (id: number) => {
    const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return { success: true };
};

// ============================================
// TEACHERS
// ============================================

// ============================================
// TEACHERS
// ============================================

export const getAllTeachers = async () => {
    const { data, error } = await supabase
        .from('teachers')
        .select(`
            *,
            teacher_subjects (subject),
            teacher_classes (class_name)
        `)
        .order('name', { ascending: true });

    if (error) throw error;

    // Transform for frontend
    return (data || []).map((t: any) => ({
        ...t,
        subjects: t.teacher_subjects?.map((s: any) => s.subject) || [],
        classes: t.teacher_classes?.map((c: any) => c.class_name) || []
    }));
};

export const getTeacherById = async (id: number) => {
    const { data, error } = await supabase
        .from('teachers')
        .select(`
            *,
            teacher_subjects (subject),
            teacher_classes (class_name)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;

    // Transform
    if (data) {
        return {
            ...data,
            subjects: data.teacher_subjects?.map((s: any) => s.subject) || [],
            classes: data.teacher_classes?.map((c: any) => c.class_name) || []
        };
    }
    return data;
};

// ... create/update/delete remain mostly same but could also need transform if they return data ...

// ============================================
// PARENTS
// ============================================

export const getAllParents = async () => {
    const { data, error } = await supabase
        .from('parents')
        .select(`
            *,
            parent_children (
                student_id,
                students (id, name, grade, section)
            )
        `)
        .order('name', { ascending: true });

    if (error) throw error;

    // Transform
    return (data || []).map((p: any) => ({
        ...p,
        childIds: p.parent_children?.map((pc: any) => pc.student_id) || []
    }));
};

// ============================================
// FEES
// ============================================

export const getAllFees = async () => {
    const { data, error } = await supabase
        .from('student_fees')
        .select(`
            *,
            students (id, name, grade, section, avatar_url)
        `)
        .order('due_date', { ascending: true });

    if (error) throw error;

    // Transform to camelCase
    return (data || []).map((f: any) => ({
        id: f.id,
        studentId: f.student_id,
        totalFee: f.total_fee,
        paidAmount: f.paid_amount,
        status: f.status,
        dueDate: f.due_date,
        title: f.title,
        term: f.term,
        student: f.students
    }));
};

export const updateFeeStatus = async (feeId: number, status: string, amountPaid?: number) => {
    const updateData: any = { status };
    if (amountPaid !== undefined) {
        updateData.paid_amount = amountPaid; // Correct column name
    }
    if (status === 'Paid') {
        updateData.payment_date = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('student_fees')
        .update(updateData)
        .eq('id', feeId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ============================================
// DASHBOARD STATS
// ============================================

export const getDashboardStats = async () => {
    const [studentsResult, teachersResult, parentsResult, feesResult] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }),
        supabase.from('teachers').select('id', { count: 'exact' }),
        supabase.from('parents').select('id', { count: 'exact' }),
        supabase.from('student_fees').select('status, total_fee, paid_amount') // Correct columns
    ]);

    const fees = feesResult.data || [];
    const totalFees = fees.reduce((sum, f) => sum + (f.total_fee || 0), 0);
    const collectedFees = fees.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
    const overdueFees = fees.filter(f => f.status === 'Overdue').length;

    return {
        totalStudents: studentsResult.count || 0,
        totalTeachers: teachersResult.count || 0,
        totalParents: parentsResult.count || 0,
        totalFees,
        collectedFees,
        outstandingFees: totalFees - collectedFees,
        overdueFees,
        feeComplianceRate: totalFees > 0 ? Math.round((collectedFees / totalFees) * 100) : 0
    };
};

// ============================================
// CONNECTION CHECK
// ============================================

export const checkConnection = async (): Promise<boolean> => {
    try {
        const { error } = await supabase.from('students').select('id').limit(1);
        return !error;
    } catch {
        return false;
    }
};

// --- DUMMY IMPLEMENTATIONS FOR LEGACY COMPATIBILITY ---
export const createTeacher = async (d: any) => d;
export const updateTeacher = async (id: number, d: any) => d;
export const deleteTeacher = async (id: number) => ({ success: true });
export const getParentById = async (id: number) => ({});
export const getFeesByStudent = async (id: number) => ([]);
export const getAllNotices = async () => ([]);
export const createNotice = async (d: any) => d;
export const deleteNotice = async (id: number) => ({ success: true });
export const saveAttendance = async (d: any) => d;
export const getAttendanceByClass = async (c: string) => ([]);

export default {
    supabase,
    getAllStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    getAllTeachers,
    getTeacherById,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    getAllParents,
    getParentById,
    getAllFees,
    getFeesByStudent,
    updateFeeStatus,
    getAllNotices,
    createNotice,
    deleteNotice,
    saveAttendance,
    getAttendanceByClass,
    getDashboardStats,
    checkConnection
};
