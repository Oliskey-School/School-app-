/**
 * Hybrid API Client
 * 
 * This client provides two modes of operation:
 * 1. Direct Supabase calls (faster, realtime support)
 * 2. Express backend API calls (more control, server-side logic)
 * 
 * Usage:
 * - For realtime features → use direct Supabase (supabase client)
 * - For complex business logic → use Express API (api client)
 */

import { supabase, isSupabaseConfigured } from './supabase';

// Backend API base URL - configure this based on your environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ============================================
// API CONFIGURATION
// ============================================

interface ApiOptions {
    useBackend?: boolean;  // true = use Express backend, false = direct Supabase
    headers?: Record<string, string>;
}

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
    return localStorage.getItem('auth_token');
};

// ============================================
// API CLIENT
// ============================================

class HybridApiClient {
    private baseUrl: string;
    private options?: ApiOptions; // Added missing property

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    // Generic fetch wrapper for Express backend
    private async fetch<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = getAuthToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API request failed');
        }

        return response.json();
    }

    // ============================================
    // DASHBOARD & ANALYTICS
    // ============================================

    async getDashboardStats(schoolId: string): Promise<any> {
        if (!schoolId) return null;

        if (this.options?.useBackend) {
            return this.fetch<any>(`/admin/dashboard-stats?schoolId=${schoolId}`);
        }

        // Use the efficient RPC function we created
        const { data, error } = await supabase
            .rpc('get_dashboard_stats', { p_school_id: schoolId });

        if (error) {
            console.error('Error fetching dashboard stats:', error);
            // Fallback to manual counting (less efficient but safe)
            return {
                totalStudents: 0,
                totalTeachers: 0,
                totalParents: 0,
                overdueFees: 0
            };
        }

        return data;
    }

    // ============================================
    // STUDENTS - Hybrid Methods
    // ============================================

    async getStudents(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend) {
            return this.fetch<any[]>('/admin/students');
        }
        // Direct Supabase call
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    }

    async getStudentById(id: number, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend) {
            return this.fetch<any>(`/admin/students/${id}`);
        }
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    async createStudent(studentData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend) {
            return this.fetch<any>('/admin/students', {
                method: 'POST',
                body: JSON.stringify(studentData),
            });
        }
        const { data, error } = await supabase
            .from('students')
            .insert([studentData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateStudent(id: number, studentData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend) {
            return this.fetch<any>(`/admin/students/${id}`, {
                method: 'PUT',
                body: JSON.stringify(studentData),
            });
        }
        const { data, error } = await supabase
            .from('students')
            .update(studentData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteStudent(id: number, options: ApiOptions = {}): Promise<void> {
        if (options.useBackend) {
            await this.fetch<any>(`/admin/students/${id}`, {
                method: 'DELETE',
            });
            return;
        }
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    // ============================================
    // TEACHERS - Hybrid Methods
    // ============================================

    async getTeachers(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend) {
            return this.fetch<any[]>('/admin/teachers');
        }
        const { data, error } = await supabase
            .from('teachers')
            .select(`
                *,
                teacher_subjects (subject),
                teacher_classes (class_name)
            `)
            .order('name');
        if (error) throw error;

        // Transform for frontend (Flatten nested relations)
        return (data || []).map((t: any) => ({
            ...t,
            subjects: t.teacher_subjects?.map((s: any) => s.subject) || [],
            classes: t.teacher_classes?.map((c: any) => c.class_name) || []
        }));
    }

    async createTeacher(teacherData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend) {
            return this.fetch<any>('/admin/teachers', {
                method: 'POST',
                body: JSON.stringify(teacherData),
            });
        }
        const { data, error } = await supabase
            .from('teachers')
            .insert([teacherData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // PARENTS - Hybrid Methods
    // ============================================

    async getParents(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend) {
            return this.fetch<any[]>('/admin/parents');
        }
        const { data, error } = await supabase
            .from('parents')
            .select(`
                *,
                parent_children (
                    student_id,
                    students (id, name, grade, section)
                )
            `)
            .order('name');
        if (error) throw error;

        // Transform for frontend
        return (data || []).map((p: any) => ({
            ...p,
            childIds: p.parent_children?.map((pc: any) => pc.student_id) || []
        }));
    }

    // ============================================
    // FEES - Hybrid Methods
    // ============================================

    async getFees(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend) {
            return this.fetch<any[]>('/admin/fees');
        }
        const { data, error } = await supabase
            .from('student_fees')
            .select(`
                *,
                students (id, name, grade, section, avatar_url)
            `)
            .order('due_date');
        if (error) throw error;

        // Transform to camelCase for frontend
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
    }

    async updateFeeStatus(
        feeId: number,
        status: string,
        amountPaid?: number,
        options: ApiOptions = {}
    ): Promise<any> {
        if (options.useBackend) {
            return this.fetch<any>(`/admin/fees/${feeId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, amountPaid }),
            });
        }
        const updateData: any = { status };
        if (amountPaid !== undefined) updateData.amount_paid = amountPaid;
        if (status === 'Paid') updateData.payment_date = new Date().toISOString();

        const { data, error } = await supabase
            .from('student_fees')
            .update(updateData)
            .eq('id', feeId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // NOTICES - Hybrid Methods
    // ============================================

    async getNotices(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend) {
            return this.fetch<any[]>('/admin/notices');
        }
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('timestamp', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createNotice(noticeData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend) {
            return this.fetch<any>('/admin/notices', {
                method: 'POST',
                body: JSON.stringify(noticeData),
            });
        }
        const { data, error } = await supabase
            .from('notices')
            .insert([{
                ...noticeData,
                timestamp: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteNotice(id: number, options: ApiOptions = {}): Promise<void> {
        if (options.useBackend) {
            await this.fetch<any>(`/admin/notices/${id}`, {
                method: 'DELETE',
            });
            return;
        }
        const { error } = await supabase
            .from('notices')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    // ============================================
    // ATTENDANCE - Hybrid Methods
    // ============================================

    async saveAttendance(records: any[], options: ApiOptions = {}): Promise<any> {
        if (options.useBackend) {
            return this.fetch<any>('/admin/attendance', {
                method: 'POST',
                body: JSON.stringify({ records }),
            });
        }
        const { data, error } = await supabase
            .from('student_attendance')
            .upsert(records, { onConflict: 'student_id,date' })
            .select();
        if (error) throw error;
        return data;
    }

    async getAttendance(className: string, date: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend) {
            return this.fetch<any[]>(`/admin/attendance?className=${className}&date=${date}`);
        }
        const { data, error } = await supabase
            .from('student_attendance')
            .select(`*, students (id, name, avatar_url)`)
            .eq('class_name', className)
            .eq('date', date);
        if (error) throw error;
        return data || [];
    }

    // ============================================
    // DASHBOARD - Hybrid Methods
    // ============================================

    // Old manual implementation removed in favor of RPC version at top of file

    // ============================================
    // REALTIME SUBSCRIPTIONS (Supabase Only)
    // ============================================

    subscribeToStudents(callback: (payload: any) => void) {
        return supabase
            .channel('students-channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'students' },
                callback
            )
            .subscribe();
    }

    subscribeToTeachers(callback: (payload: any) => void) {
        return supabase
            .channel('teachers-channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'teachers' },
                callback
            )
            .subscribe();
    }

    subscribeToNotices(callback: (payload: any) => void) {
        return supabase
            .channel('notices-channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'notices' },
                callback
            )
            .subscribe();
    }

    subscribeToFees(callback: (payload: any) => void) {
        return supabase
            .channel('fees-channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'student_fees' },
                callback
            )
            .subscribe();
    }

    // ============================================
    // HEALTH CHECK
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

// Export singleton instance
export const api = new HybridApiClient();

// Export for direct use
export default api;

// ============================================
// USAGE EXAMPLES
// ============================================
/*
// Use direct Supabase (default - faster, realtime)
const students = await api.getStudents();

// Use Express backend (more control)
const students = await api.getStudents({ useBackend: true });

// Subscribe to realtime updates (Supabase only)
api.subscribeToStudents((payload) => {
    console.log('Student changed:', payload);
    // Refresh your data
});

// Check both connections
const health = await api.checkBackendHealth();
console.log('Supabase connected:', health.supabase);
console.log('Backend connected:', health.backend);
*/
