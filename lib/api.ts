/**
 * Hybrid API Client
 * 
 * This client provides two modes of operation:
 * 1. Direct Supabase calls (faster, realtime support)
 * 2. Express backend API calls (more control, server-side logic)
 */

import { supabase, isSupabaseConfigured } from './supabase';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiOptions {
    useBackend?: boolean;
    headers?: Record<string, string>;
}

const getAuthToken = async (): Promise<string | null> => {
    const local = localStorage.getItem('auth_token');
    if (local) {
        console.log('🔑 [API] Found cached auth_token in localStorage');
        return local;
    }

    // Fallback to Supabase session
    const { data } = await supabase.auth.getSession();
    const sessionToken = data.session?.access_token || null;

    if (sessionToken) {
        console.log('🔑 [API] Retrieved access_token from Supabase session');
    } else {
        console.warn('⚠️ [API] No auth token found in localStorage or Supabase session');
    }

    return sessionToken;
};

class HybridApiClient {
    private baseUrl: string;
    private options: ApiOptions;

    constructor(baseUrl: string = API_BASE_URL, options: ApiOptions = { useBackend: false }) {
        this.baseUrl = baseUrl;
        this.options = options;
    }

    /**
     * [MASTER PROMPT RULE]: Global Query Scope (The Bouncer)
     * Injects mandatory school_id and branch_id filters.
     */
    getScopedQuery(table: string, schoolId: string, branchId?: string | null) {
        if (!schoolId) {
            throw new Error("SecurityException: Mandatory Tenant ID (school_id) is missing.");
        }

        let query = supabase.from(table).select('*');

        // Automatic school isolation
        query = query.eq('school_id', schoolId);

        // Automatic branch isolation
        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        return query;
    }

    setOptions(options: ApiOptions) {
        this.options = { ...this.options, ...options };
    }

    private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        console.log(`🌐 [API Request] ${endpoint}`);
        const token = await getAuthToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn(`⚠️ [API] Sending request to ${endpoint} WITHOUT token!`);
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`❌ [API Error] ${endpoint}:`, error);
            throw new Error(error.message || 'API request failed');
        }

        return response.json();
    }

    // ============================================
    // DASHBOARD & ANALYTICS
    // ============================================

    async getDashboardStats(schoolId: string, branchId?: string): Promise<any> {
        if (!schoolId) return null;
        if (this.options.useBackend) {
            return this.fetch<any>(`/dashboard/stats${branchId && branchId !== 'all' ? `?branchId=${branchId}` : ''}`);
        }

        try {
            // Normalize branchId: 'all' or empty string should be null
            const normalizedBranchId = (branchId === 'all' || !branchId) ? null : branchId;

            // Use the Security Definer RPC for all counts to ensure robustness against RLS
            const { data, error } = await supabase.rpc('get_dashboard_stats', {
                p_school_id: schoolId,
                p_branch_id: normalizedBranchId
            });

            if (error) {
                console.error('RPC Error fetching dashboard stats:', error);
                throw error;
            }

            return {
                totalStudents: data.totalStudents || 0,
                studentTrend: data.studentTrend || 0,
                totalTeachers: data.totalTeachers || 0,
                teacherTrend: data.teacherTrend || 0,
                totalParents: data.totalParents || 0,
                parentTrend: data.parentTrend || 0,
                overdueFees: data.overdueFees || 0,
                unpublishedReports: data.unpublishedReports || 0
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }

    // ============================================
    // STUDENTS
    // ============================================

    async getStudents(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/students');
        }
        const { data, error } = await supabase.from('students').select('id, name, avatar_url, grade, section, status, school_generated_id').order('name');
        if (error) throw error;
        return data || [];
    }

    async getStudentById(id: string | number, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/students/${id}`);
        }
        const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async enrollStudent(enrollmentData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/students/enroll', {
                method: 'POST',
                body: JSON.stringify(enrollmentData),
            });
        }
        const { data, error } = await supabase.from('students').insert([enrollmentData]).select().single();
        if (error) throw error;
        return data;
    }

    async updateStudent(id: string | number, studentData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/students/${id}`, {
                method: 'PUT',
                body: JSON.stringify(studentData),
            });
        }
        const { data, error } = await supabase.from('students').update(studentData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteStudent(id: string | number, options: ApiOptions = {}): Promise<void> {
        if (options.useBackend ?? this.options.useBackend) {
            await this.fetch<any>(`/students/${id}`, { method: 'DELETE' });
            return;
        }
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
    }

    // ============================================
    // TEACHERS
    // ============================================

    async getTeachers(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/teachers');
        }
        const { data, error } = await supabase.from('teachers').select('id, name, avatar_url, email, status, school_generated_id').order('name');
        if (error) throw error;
        return data || [];
    }

    async createTeacher(teacherData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/teachers', {
                method: 'POST',
                body: JSON.stringify(teacherData),
            });
        }
        const { data, error } = await supabase.from('teachers').insert([teacherData]).select().single();
        if (error) throw error;
        return data;
    }

    async updateTeacher(id: string, teacherData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/teachers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(teacherData),
            });
        }
        const { data, error } = await supabase.from('teachers').update(teacherData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteTeacher(id: string, options: ApiOptions = {}): Promise<void> {
        if (options.useBackend ?? this.options.useBackend) {
            await this.fetch<void>(`/teachers/${id}`, { method: 'DELETE' });
            return;
        }
        const { error } = await supabase.from('teachers').delete().eq('id', id);
        if (error) throw error;
    }

    // ============================================
    // FEES
    // ============================================

    async getFees(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/fees');
        }
        const { data, error } = await supabase.from('student_fees').select('id, amount, paid_amount, due_date, status, student_id, students(name, grade, section)').order('due_date');
        if (error) throw error;
        return data || [];
    }

    async updateFeeStatus(feeId: string | number, status: string, amountPaid?: number, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/fees/${feeId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, amountPaid }),
            });
        }
        const { data, error } = await supabase.from('student_fees').update({ status, paid_amount: amountPaid }).eq('id', feeId).select().single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // CLASSES
    // ============================================

    async getClasses(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/classes');
        }
        const { data, error } = await supabase.from('classes').select('id, subject, grade, section, department').order('grade');
        if (error) throw error;
        return data || [];
    }

    // ============================================
    // PARENTS
    // ============================================

    async getParents(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/parents');
        }
        const { data, error } = await supabase.from('parents').select('id, name, email, phone, avatar_url, school_generated_id').order('name');
        if (error) throw error;
        return data || [];
    }

    async createParent(parentData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/parents', {
                method: 'POST',
                body: JSON.stringify(parentData),
            });
        }
        const { data, error } = await supabase.from('parents').insert([parentData]).select().single();
        if (error) throw error;
        return data;
    }

    async deleteParent(id: string, options: ApiOptions = {}): Promise<void> {
        if (options.useBackend ?? this.options.useBackend) {
            await this.fetch<void>(`/parents/${id}`, { method: 'DELETE' });
            return;
        }
        const { error } = await supabase.from('parents').delete().eq('id', id);
        if (error) throw error;
    }

    // ============================================
    // NOTICES
    // ============================================

    async getNotices(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/notices');
        }
        const { data, error } = await supabase.from('notices').select('id, title, content, timestamp, category, is_pinned, audience').order('timestamp', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createNotice(noticeData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/notices', {
                method: 'POST',
                body: JSON.stringify(noticeData),
            });
        }
        const { data, error } = await supabase.from('notices').insert([noticeData]).select().single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // ATTENDANCE
    // ============================================

    async saveAttendance(records: any[], options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/attendance', {
                method: 'POST',
                body: JSON.stringify({ records }),
            });
        }
        const { data, error } = await supabase.from('student_attendance').upsert(records, { onConflict: 'student_id,date' }).select();
        if (error) throw error;
        return data;
    }

    async getAttendance(classId: string, date: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/attendance?classId=${classId}&date=${date}`);
        }
        const { data, error } = await supabase.from('student_attendance').select('*').eq('class_id', classId).eq('date', date);
        if (error) throw error;
        return data || [];
    }

    async getAttendanceByStudent(studentId: string | number, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/attendance/student/${studentId}`);
        }
        const { data, error } = await supabase.from('student_attendance').select('*').eq('student_id', studentId);
        if (error) throw error;
        return data || [];
    }

    // ============================================
    // BUSES
    // ============================================

    async getBuses(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/buses');
        }
        const { data, error } = await supabase.from('transport_buses').select('*').order('name');
        if (error) throw error;
        return data || [];
    }

    async createBus(busData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/buses', {
                method: 'POST',
                body: JSON.stringify(busData),
            });
        }
        const { data, error } = await supabase.from('transport_buses').insert([busData]).select().single();
        if (error) throw error;
        return data;
    }

    async updateBus(id: string, busData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/buses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(busData),
            });
        }
        const { data, error } = await supabase.from('transport_buses').update(busData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteBus(id: string, options: ApiOptions = {}): Promise<void> {
        if (options.useBackend ?? this.options.useBackend) {
            await this.fetch<void>(`/buses/${id}`, { method: 'DELETE' });
            return;
        }
        const { error } = await supabase.from('transport_buses').delete().eq('id', id);
        if (error) throw error;
    }

    // ============================================
    // USERS & SCHOOLS
    // ============================================

    async getUsers(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/users');
        }
        const { data, error } = await supabase.from('profiles').select('*').order('full_name');
        if (error) throw error;
        return data || [];
    }

    async getUserById(id: string, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/users/${id}`);
        }
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createUser(userData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/users', {
                method: 'POST',
                body: JSON.stringify(userData),
            });
        }
        const { data, error } = await supabase.from('profiles').insert([userData]).select().single();
        if (error) throw error;
        return data;
    }

    async updateUser(id: string, userData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(userData),
            });
        }
        const { data, error } = await supabase.from('profiles').update(userData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async getSchools(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/schools');
        }
        const { data, error } = await supabase.from('schools').select('*');
        if (error) throw error;
        return data || [];
    }

    async getSchoolById(id: string, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/schools/${id}`);
        }
        const { data, error } = await supabase.from('schools').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createSchool(schoolData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/schools', {
                method: 'POST',
                body: JSON.stringify(schoolData),
            });
        }
        const { data, error } = await supabase.from('schools').insert([schoolData]).select().single();
        if (error) throw error;
        return data;
    }

    async updateSchool(id: string, schoolData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/schools/${id}`, {
                method: 'PUT',
                body: JSON.stringify(schoolData),
            });
        }
        const { data, error } = await supabase.from('schools').update(schoolData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async inviteUser(inviteData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/invite-user', {
                method: 'POST',
                body: JSON.stringify(inviteData),
            });
        }
        throw new Error('Invitations require backend mode');
    }

    // ============================================
    // HEALTH
    // ============================================

    async checkBackendHealth(): Promise<{ supabase: boolean; backend: boolean }> {
        let backendOk = false;
        try {
            const response = await fetch(`${this.baseUrl.replace('/api', '')}/`);
            backendOk = response.ok;
        } catch {
            backendOk = false;
        }
        return {
            supabase: isSupabaseConfigured,
            backend: backendOk
        };
    }
}

export const api = new HybridApiClient();
export default api;
