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
                totalClasses: data.totalClasses || 0,
                classTrend: data.classTrend || 0,
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

    async getStudents(schoolId: string, branchId?: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/students${branchId && branchId !== 'all' ? `?branchId=${branchId}` : ''}`);
        }

        let query = supabase.from('students')
            .select('id, name, avatar_url, grade, section, status, school_generated_id')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.order('name');
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

    async getMyStudentProfile(options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/students/me');
        }
        // Direct Supabase fallback (client resolved)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('students')
            .select(`
                *,
                academic_performance (*),
                behavior_records (*),
                report_cards (*)
            `)
            .eq('user_id', user.id)
            .single();

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

    async linkGuardian(guardianData: { studentId: string, guardianName: string, guardianEmail: string, guardianPhone?: string, branchId?: string }, options: ApiOptions = {}): Promise<any> {
        // We always route this to the backend to bypass RLS policies during creation
        return this.fetch<any>('/students/link-guardian', {
            method: 'POST',
            body: JSON.stringify(guardianData),
        });
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

    async bulkUpdateStudentStatus(ids: string[], status: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/students/bulk-status', {
                method: 'PUT',
                body: JSON.stringify({ ids, status }),
            });
        }
        const { data, error } = await supabase.from('students').update({ status }).in('id', ids).select();
        if (error) throw error;
        return data || [];
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

    async getTeachers(schoolId: string, branchId?: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/teachers${branchId && branchId !== 'all' ? `?branchId=${branchId}` : ''}`);
        }

        let query = supabase.from('teachers')
            .select('id, name, avatar_url, email, status, school_generated_id')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.order('name');
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

    async bulkFetchFees(studentIds: string[], statusList?: string[], options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/fees/bulk-fetch', {
                method: 'POST',
                body: JSON.stringify({ studentIds, statusList }),
            });
        }
        let query = supabase.from('student_fees').select('*').in('student_id', studentIds);
        if (statusList && statusList.length > 0) {
            query = query.in('status', statusList);
        }
        const { data, error } = await query.order('due_date', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    // ============================================
    // TIMETABLE
    // ============================================

    async getTimetable(schoolId: string, className?: string, teacherId?: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/timetable?schoolId=${schoolId}${className ? `&className=${className}` : ''}${teacherId ? `&teacherId=${teacherId}` : ''}`);
        }
        let query = supabase.from('timetable').select('*').eq('school_id', schoolId);
        if (className) query = query.ilike('class_name', `%${className}%`);
        if (teacherId) query = query.eq('teacher_id', teacherId);
        const { data, error } = await query.order('start_time', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    // ============================================
    // STUDENT PERFORMANCE
    // ============================================

    async getStudentPerformance(studentId: string | number, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/students/me/performance');
        }
        const { data, error } = await supabase.from('academic_performance').select('*').eq('student_id', studentId);
        if (error) throw error;
        return data || [];
    }

    async getQuizResults(studentId: string | number, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/students/me/quiz-results');
        }
        const { data, error } = await supabase.from('quiz_submissions').select('*, quizzes(title, subject)').eq('student_id', studentId).order('submitted_at', { ascending: false });
        if (error) throw error;
        return data || [];
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

    async createClass(classData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/classes', {
                method: 'POST',
                body: JSON.stringify(classData),
            });
        }
        const { data, error } = await supabase.from('classes').insert([classData]).select().single();
        if (error) throw error;
        return data;
    }

    async updateClass(id: string, classData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/classes/${id}`, {
                method: 'PUT',
                body: JSON.stringify(classData),
            });
        }
        const { data, error } = await supabase.from('classes').update(classData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteClass(id: string, options: ApiOptions = {}): Promise<void> {
        if (options.useBackend ?? this.options.useBackend) {
            await this.fetch<void>(`/classes/${id}`, { method: 'DELETE' });
            return;
        }
        const { error } = await supabase.from('classes').delete().eq('id', id);
        if (error) throw error;
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

    async getParentById(id: string, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/parents/${id}`);
        }
        const { data, error } = await supabase.from('parents').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
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

    async getMyChildren(options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/parents/me/children');
        }
        // Direct Supabase fallback (complex join logic simplified for client)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: relations } = await supabase
            .from('student_parent_links')
            .select('student_user_id')
            .eq('parent_user_id', user.id);

        const studentUserIds = relations?.map(r => r.student_user_id) || [];

        const { data: students, error } = await supabase
            .from('students')
            .select(`
                *,
                academic_performance (*),
                behavior_records (*),
                report_cards (*)
            `)
            .in('user_id', studentUserIds);

        if (error) throw error;
        return students || [];
    }

    async createAppointment(appointmentData: any, options: ApiOptions = {}): Promise<any> {
        // Always route through backend for RLS compliance
        return this.fetch<any>('/parents/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData),
        });
    }

    async volunteerSignup(signupData: any, options: ApiOptions = {}): Promise<any> {
        // Always route through backend for RLS compliance
        return this.fetch<any>('/parents/volunteer-signup', {
            method: 'POST',
            body: JSON.stringify(signupData),
        });
    }

    async markNotificationRead(notificationId: string | number, options: ApiOptions = {}): Promise<any> {
        // Always route through backend for RLS compliance
        return this.fetch<any>(`/parents/notifications/${notificationId}/read`, {
            method: 'PUT',
        });
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

    async getAttendanceByDate(schoolId: string, date: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            // Updated to match backend query structure
            return this.fetch<any[]>(`/attendance?date=${date}&schoolId=${schoolId}`);
        }
        const { data, error } = await supabase.from('student_attendance').select('*').eq('school_id', schoolId).eq('date', date);
        if (error) throw error;
        return data || [];
    }

    async bulkFetchAttendance(studentIds: string[], options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/attendance/bulk-fetch', {
                method: 'POST',
                body: JSON.stringify({ studentIds }),
            });
        }
        const { data, error } = await supabase.from('student_attendance').select('student_id, status').in('student_id', studentIds);
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
    // ACADEMIC PERFORMANCE
    // ============================================

    async saveGrade(gradeData: any, options: ApiOptions = {}): Promise<any> {
        // Always route through backend - RLS blocks direct inserts
        return this.fetch<any>('/academic-performance/grade', {
            method: 'PUT',
            body: JSON.stringify(gradeData),
        });
    }

    async getGrades(studentIds: (string | number)[], subject: string, term: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>('/academic-performance/grades', {
                method: 'POST',
                body: JSON.stringify({ studentIds, subject, term }),
            });
        }
        const { data, error } = await supabase.from('academic_performance').select('student_id, score').eq('subject', subject).eq('term', term).in('student_id', studentIds);
        if (error) throw error;
        return data || [];
    }

    // ============================================
    // REPORT CARDS
    // ============================================

    async getReportCards(schoolId: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/report-cards?schoolId=${schoolId}`);
        }
        const { data, error } = await supabase
            .from('report_cards')
            .select('*')
            .eq('school_id', schoolId)
            .order('session', { ascending: false })
            .order('term', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async updateReportCardStatus(id: string | number, status: string, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/report-cards/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
        }
        const updateData: any = {
            status,
            // Keep is_published boolean in sync for backward compatibility
            is_published: status === 'Published',
        };
        if (status === 'Published') {
            updateData.published_at = new Date().toISOString();
        } else {
            updateData.published_at = null;
        }
        const { data, error } = await supabase.from('report_cards').update(updateData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // ASSIGNMENTS
    // ============================================

    async getAssignments(schoolId: string, classId?: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/assignments?schoolId=${schoolId}${classId ? `&classId=${classId}` : ''}`);
        }
        let query = supabase.from('assignments').select('*').eq('school_id', schoolId);
        if (classId) query = query.eq('class_id', classId);
        const { data, error } = await query.order('due_date', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createAssignment(assignmentData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/assignments', {
                method: 'POST',
                body: JSON.stringify(assignmentData),
            });
        }
        const { data, error } = await supabase.from('assignments').insert([assignmentData]).select().single();
        if (error) throw error;
        return data;
    }

    async getSubmissions(assignmentId: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/assignments/${assignmentId}/submissions`);
        }
        const { data, error } = await supabase.from('assignment_submissions').select('*, students(name, avatar_url)').eq('assignment_id', assignmentId);
        if (error) throw error;
        return data || [];
    }

    async gradeSubmission(submissionId: string, gradeData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/assignments/submissions/${submissionId}/grade`, {
                method: 'PUT',
                body: JSON.stringify(gradeData),
            });
        }
        const { data, error } = await supabase.from('assignment_submissions').update(gradeData).eq('id', submissionId).select().single();
        if (error) throw error;
        return data;
    }

    async submitAssignment(assignmentId: string | number, submissionData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/assignments/${assignmentId}/submissions`, {
                method: 'POST',
                body: JSON.stringify(submissionData),
            });
        }
        const { data, error } = await supabase.from('assignment_submissions').insert([{ ...submissionData, assignment_id: assignmentId }]).select().single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // EXAMS & CBT
    // ============================================

    async getExams(schoolId: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/exams?schoolId=${schoolId}`);
        }
        const { data, error } = await supabase.from('exams').select('*').eq('school_id', schoolId).order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createExam(examData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/exams', {
                method: 'POST',
                body: JSON.stringify(examData),
            });
        }
        const { data, error } = await supabase.from('exams').insert([examData]).select().single();
        if (error) throw error;
        return data;
    }

    async updateExam(id: string | number, examData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/exams/${id}`, {
                method: 'PUT',
                body: JSON.stringify(examData),
            });
        }
        const { data, error } = await supabase.from('exams').update(examData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteExam(id: string | number, options: ApiOptions = {}): Promise<void> {
        if (options.useBackend ?? this.options.useBackend) {
            await this.fetch<void>(`/exams/${id}`, { method: 'DELETE' });
            return;
        }
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if (error) throw error;
    }

    async getExamResults(examId: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/exams/${examId}/results`);
        }
        const { data, error } = await supabase.from('exam_results').select('*, students(name)').eq('exam_id', examId);
        if (error) throw error;
        return data || [];
    }

    // ============================================
    // RESOURCES
    // ============================================

    async createResource(resourceData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/resources', {
                method: 'POST',
                body: JSON.stringify(resourceData),
            });
        }
        const { data, error } = await supabase.from('resources').insert([resourceData]).select().single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // LESSON PLANS
    // ============================================

    async getLessonPlans(schoolId: string, teacherId?: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/lesson-plans?schoolId=${schoolId}${teacherId ? `&teacherId=${teacherId}` : ''}`);
        }
        let query = supabase.from('lesson_notes').select('*').eq('school_id', schoolId);
        if (teacherId) query = query.eq('teacher_id', teacherId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createLessonPlan(planData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/lesson-plans', {
                method: 'POST',
                body: JSON.stringify(planData),
            });
        }
        const { data, error } = await supabase.from('lesson_notes').insert([planData]).select().single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // GENERATED RESOURCES (AI)
    // ============================================

    async getGeneratedResources(teacherId: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/ai/generated-resources?teacherId=${teacherId}`);
        }
        const { data, error } = await supabase
            .from('generated_resources')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('updated_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async saveGeneratedResource(resourceData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/ai/generated-resources', {
                method: 'POST',
                body: JSON.stringify(resourceData),
            });
        }

        // Find existing to decide update or insert
        const { data: existing } = await supabase
            .from('generated_resources')
            .select('id')
            .eq('teacher_id', resourceData.teacher_id)
            .eq('subject', resourceData.subject)
            .eq('class_name', resourceData.class_name)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('generated_resources')
                .update({ ...resourceData, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('generated_resources')
                .insert([resourceData])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    }

    // ============================================
    // FORUM
    // ============================================

    async getForumTopics(schoolId: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/forum/topics?schoolId=${schoolId}`);
        }
        const { data, error } = await supabase.from('forum_topics').select('*').eq('school_id', schoolId).order('last_activity', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createForumTopic(topicData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/forum/topics', {
                method: 'POST',
                body: JSON.stringify(topicData),
            });
        }
        const { data, error } = await supabase.from('forum_topics').insert([topicData]).select().single();
        if (error) throw error;
        return data;
    }

    async getForumPosts(topicId: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/forum/topics/${topicId}/posts`);
        }
        const { data, error } = await supabase.from('forum_posts').select('*').eq('topic_id', topicId).order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async createForumPost(postData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/forum/posts', {
                method: 'POST',
                body: JSON.stringify(postData),
            });
        }
        const { data, error } = await supabase.from('forum_posts').insert([postData]).select().single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // TRANSACTIONS
    // ============================================

    async getTransactions(schoolId: string, feeId?: string, options: ApiOptions = {}): Promise<any[]> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any[]>(`/transactions?schoolId=${schoolId}${feeId ? `&feeId=${feeId}` : ''}`);
        }
        let query = supabase.from('transactions').select('*').eq('school_id', schoolId);
        if (feeId) query = query.eq('fee_id', feeId).eq('status', 'Success');
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createTransaction(transactionData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/transactions', {
                method: 'POST',
                body: JSON.stringify(transactionData),
            });
        }
        const { data, error } = await supabase.from('transactions').insert([transactionData]).select().single();
        if (error) throw error;
        return data;
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

    async updateSchoolStatusBulk(ids: string[], status: string, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/schools/bulk/status', {
                method: 'PUT',
                body: JSON.stringify({ ids, status }),
            });
        }
        // Direct DB fallback (will likely hit RLS, but included for Hybrid symmetry)
        const { data, error } = await supabase.from('schools').update({ status }).in('id', ids).select();
        if (error) throw error;
        return data;
    }

    async deleteSchoolsBulk(ids: string[], options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/schools/bulk', {
                method: 'DELETE',
                body: JSON.stringify({ ids }),
            });
        }
        const { data, error } = await supabase.from('schools').delete().in('id', ids).select();
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
    // NOTIFICATIONS
    // ============================================

    async createNotification(notificationData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/notifications', {
                method: 'POST',
                body: JSON.stringify(notificationData),
            });
        }
        const { data, error } = await supabase.from('notifications').insert([notificationData]).select().single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // QUIZZES & ASSIGNMENTS
    // ============================================

    async createQuizWithQuestions(payload: { quiz: any; questions: any[] }, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/quizzes/upload', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        }

        // Direct Supabase fallback
        const { quiz, questions } = payload;

        // Get school_id from auth if not provided
        let schoolId = quiz.school_id;
        if (!schoolId) {
            const { data: { user } } = await supabase.auth.getUser();
            schoolId = user?.user_metadata?.school_id || user?.app_metadata?.school_id;
        }

        // 1. Insert the quiz
        const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .insert({
                title: quiz.title,
                description: quiz.description,
                status: quiz.status || 'draft',
                class_id: quiz.class_id,
                subject_id: quiz.subject_id,
                duration_minutes: quiz.duration_minutes,
                total_marks: quiz.total_marks,
                teacher_id: quiz.teacher_id,
                school_id: schoolId,
                is_published: quiz.is_published || false,
                is_active: true,
            })
            .select()
            .single();

        if (quizError) throw quizError;

        // 2. Insert questions linked to the quiz via exam_id
        if (questions.length > 0) {
            const questionsToInsert = questions.map((q, index) => ({
                exam_id: quizData.id,
                question_text: q.question_text,
                question_type: q.question_type || 'multiple_choice',
                options: Array.isArray(q.options) ? q.options : [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
                correct_answer: q.correct_answer || q.correct_option,
                points: q.marks ? Math.round(q.marks) : 1,
            }));

            const { error: questionsError } = await supabase
                .from('cbt_questions')
                .insert(questionsToInsert);

            if (questionsError) throw questionsError;
        }

        return quizData;
    }

    async updateQuizStatus(id: string, isPublished: boolean, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/quizzes/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ is_published: isPublished }),
            });
        }
        // Direct Supabase fallback
        const { data, error } = await supabase
            .from('quizzes')
            .update({ is_published: isPublished, status: isPublished ? 'published' : 'draft' })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteQuiz(id: string, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>(`/quizzes/${id}`, {
                method: 'DELETE',
            });
        }
        // Direct Supabase fallback: delete questions first, then the quiz
        await supabase.from('cbt_questions').delete().eq('exam_id', id);
        const { error } = await supabase.from('quizzes').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    }

    async submitQuizResult(submissionData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/quizzes/submit', {
                method: 'POST',
                body: JSON.stringify(submissionData),
            });
        }
        // Map to cbt_submissions schema: exam_id, student_id, score, status, submitted_at
        const submission = {
            exam_id: submissionData.quiz_id || submissionData.exam_id,
            student_id: submissionData.student_id,
            score: submissionData.score,
            status: submissionData.status || 'completed',
            submitted_at: submissionData.submitted_at || new Date().toISOString(),
        };
        const { data, error } = await supabase.from('cbt_submissions').insert([submission]).select().single();
        if (error) throw error;
        return data;
    }

    async createAnonymousReport(reportData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/student-reports/anonymous', {
                method: 'POST',
                body: JSON.stringify(reportData),
            });
        }
        const { data, error } = await supabase.from('anonymous_reports').insert([reportData]).select().single();
        if (error) throw error;
        return data;
    }

    async createDiscreetRequest(requestData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/student-reports/discreet', {
                method: 'POST',
                body: JSON.stringify(requestData),
            });
        }
        const { data, error } = await supabase.from('menstrual_support_requests').insert([requestData]).select().single();
        if (error) throw error;
        return data;
    }

    // ============================================
    // VIRTUAL CLASSES
    // ============================================

    async createVirtualClassSession(sessionData: any, options: ApiOptions = {}): Promise<any> {
        if (options.useBackend ?? this.options.useBackend) {
            return this.fetch<any>('/virtual-classes', {
                method: 'POST',
                body: JSON.stringify(sessionData),
            });
        }
        const { data, error } = await supabase.from('virtual_class_sessions').insert([sessionData]).select().single();
        if (error) throw error;
        return data;
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
