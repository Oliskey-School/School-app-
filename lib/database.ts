import { supabase } from './supabase';
import { api } from './api';
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

// Explicitly export common helpers from central utility to resolve star export conflicts
export {
    isDemoMode,
    backendFetch,
    getFormattedClassName,
    getGrade,
    API_BASE_URL,
    getAuthToken
} from './apiHelpers';

/**
 * Fetch classes with student counts, optimized for demo mode
 */
export async function fetchClasses(schoolId: string, branchId?: string): Promise<any[]> {
    if (!schoolId) return [];

    try {
        // Use standard API client
        const classes = await api.getClasses(schoolId, branchId);

        // If api returns no results, we should handle student counts carefully
        // but generally we want to return whatever api gives us augmented with counts if available

        // Direct Supabase augmentation (only for non-demo/direct access)
        const { data: counts } = await supabase
            .from('students')
            .select('class_id')
            .eq('school_id', schoolId);

        const countMap = (counts || []).reduce((acc: any, s: any) => {
            if (s.class_id) {
                acc[s.class_id] = (acc[s.class_id] || 0) + 1;
            }
            return acc;
        }, {});

        return classes.map(c => ({
            ...c,
            studentCount: countMap[c.id] || c.student_count || c.studentCount || 0
        }));
    } catch (error) {
        console.error('Error fetching classes:', error);
        return []; // Robust fallback
    }
}

/**
 * Complete Database Service for School Management System
 * All data fetching happens here - NO mock data!
 */

export * from '../services/studentService';
export * from '../services/financeService';
export * from '../services/authService';