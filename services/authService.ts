import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { Database } from '../types/supabase';
import {
    Student,
    Teacher,
    Parent,
    Notice,
    ClassInfo,
    Assignment,
    Exam,
    Conversation,
    Message,
    ReportCard,
    Bus
} from '../types';

import {
    isDemoMode,
    backendFetch,
    getFormattedClassName,
    getGrade
} from '../lib/apiHelpers';


/**
 * Complete Database Service for School Management System
 * All data fetching happens here - NO mock data!
 */


// ============================================
// CONNECTION CHECK
// ============================================

export async function checkSupabaseConnection(): Promise<boolean> {
    try {
        const { error } = await supabase.from('students').select('id').limit(1);
        if (error) {
            console.error('Supabase connection check failed:', error.message);
            return false;
        }
        console.log('✅ Supabase connected successfully');
        return true;
    } catch (err) {
        console.error('Supabase connection exception:', err);
        return false;
    }
}

// ============================================
// ATTENDANCE OPERATIONS
// ============================================

export async function saveAttendanceRecords(records: Array<{
    studentId: string | number;
    date: string;
    status: string;
    className?: string;
}>): Promise<boolean> {
    try {
        const inserts = records.map(r => ({
            student_id: r.studentId,
            date: r.date,
            status: r.status,
            class_name: r.className
        }));

        const { error } = await supabase
            .from('student_attendance')
            .upsert(inserts, {
                onConflict: 'student_id,date',
                ignoreDuplicates: false
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error saving attendance records:', err);
        return false;
    }
}

export async function fetchAttendanceForClass(className: string, date: string): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('student_attendance')
            .select('*')
            .eq('class_name', className)
            .eq('date', date);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching attendance:', err);
        return [];
    }
}

