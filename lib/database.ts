
import { api } from './api';
import { toast } from 'react-hot-toast';
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

// (Removed fetchClasses - now in classService.ts)

// (Removed fetchParentsByClassId - now in parentService.ts)

/**
 * Complete Database Service for School Management System
 * All data fetching happens here - NO mock data!
 */

export * from '../services/studentService';
export * from '../services/financeService';
export * from '../services/authService';
export * from '../services/parentService';
export * from '../services/teacherService';
export * from '../services/classService';
export * from '../services/eventService';
export * from '../services/examService';
export * from '../services/assignmentService';
export * from '../services/quizService';

/**
 * Fetch audit logs from the backend
 */
export async function fetchAuditLogs(limit: number = 50, schoolId?: string): Promise<any[]> {
    try {
        return await api.getAuditLogs(schoolId || '', undefined);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return [];
    }
}
