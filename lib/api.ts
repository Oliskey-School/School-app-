import { InspectionTemplate } from '../types/inspector';

import { API_BASE_URL } from './config';

console.log(`📡 [API-TEST] Base URL: ${API_BASE_URL}`);

const getAuthToken = async (): Promise<string | null> => {
    // Priority 1: Check localStorage for our custom backend JWT
    const localToken = localStorage.getItem('auth_token');
    if (localToken) return localToken;
    return null;
};

/**
 * Express API Client
 * Pure Express/Prisma backend client.
 */
class ExpressApiClient {
    private baseUrl: string = API_BASE_URL;
    private cache = new Map<string, { data: any; timestamp: number }>();
    private CACHE_TTL = 30000; // 30 seconds
    private csrfToken: string | null = null;
    private inFlightRequests = new Map<string, Promise<any>>();

    private refreshPromise: Promise<any> | null = null;

    constructor() {}

    async getCsrfToken(): Promise<string | null> {
        if (this.csrfToken) return this.csrfToken;
        try {
            const response = await fetch(`${this.baseUrl}/auth/csrf-token`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                this.csrfToken = data.csrfToken;
                return this.csrfToken;
            }
        } catch (e) {
            console.error('Failed to fetch CSRF token', e);
        }
        return null;
    }

    clearCsrfToken(): void {
        this.csrfToken = null;
    }

    invalidateCache(): void {
        this.cache.clear();
        this.inFlightRequests.clear();
        this.clearCsrfToken();
    }

    /**
     * Core Fetch Engine with Request Deduplication
     */
    async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const method = options.method?.toUpperCase() || 'GET';
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

        // Lead DevSecOps: Deduplicate concurrent identical GET requests
        const isGet = method === 'GET';
        const requestKey = `${method}:${url}`;

        if (isGet && this.inFlightRequests.has(requestKey)) {
            return this.inFlightRequests.get(requestKey);
        }

        const fetchPromise = (async () => {
            try {
                const token = await getAuthToken();

                // Lead DevSecOps: Attach CSRF token for mutating requests
                const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
                
                if (isMutation && !this.csrfToken) {
                    await this.getCsrfToken();
                }

                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...(this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}),
                    ...((options.headers as any) || {}),
                };

                if (!token && !endpoint.includes('/auth/') && !endpoint.includes('/health')) {
                    console.warn(`🔒 [API-WARN] Missing token for protected endpoint: ${endpoint}`);
                }

                // Inject Branch ID if selected (Admin/Proprietor context)
                const selectedBranchId = localStorage.getItem('selected_branch_id');
                if (!headers['X-Branch-Id'] && selectedBranchId && selectedBranchId !== 'all' && selectedBranchId !== 'null' && selectedBranchId !== 'undefined') {
                    headers['X-Branch-Id'] = selectedBranchId;
                }

                // Auto-remove Content-Type for FormData
                if (options.body instanceof FormData) {
                    delete headers['Content-Type'];
                }

                // Diagnostic: Log full URL trying to be hit
                if (process.env.NODE_ENV !== 'production' || endpoint.includes('/students')) {
                    console.log(`🔌 [API-DEBUG] Fetching: ${url} | Method: ${method} | Headers:`, JSON.stringify(headers));
                }

                let response;
                try {
                    response = await fetch(url, { ...options, headers, credentials: 'include' });
                } catch (fetchErr: any) {
                    console.error(`💥 [API-FATAL] Network error hitting ${url}:`, fetchErr.message);
                    console.error(`   Check if the backend is running at ${this.baseUrl} and reachable.`);
                    throw fetchErr;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    
                    let error = { message: '' };
                    try {
                        if (errorText) {
                            const parsed = JSON.parse(errorText);
                            error.message = parsed.message || parsed.error || '';
                        }
                    } catch (e) {
                        console.warn(`[API] Could not parse error response as JSON from ${endpoint}`);
                    }

                    // Handle JWT Expiration
                    if (response.status === 401 && (error.message === 'jwt expired' || error.message.includes('expired'))) {
                        console.log(`[API] Token expired for ${endpoint}, attempting refresh...`);
                        try {
                            const refreshResult = await this.refreshToken();
                            if (refreshResult && refreshResult.token) {
                                console.log(`[API] Refresh successful, retrying ${endpoint}`);
                                // Retry with new token
                                const newHeaders = {
                                    ...headers,
                                    'Authorization': `Bearer ${refreshResult.token}`
                                };
                                return this.fetch<T>(endpoint, { ...options, headers: newHeaders });
                            }
                        } catch (refreshErr) {
                            console.error('[API] Secondary error during token refresh:', refreshErr);
                        }
                    }

                    console.error(`[API] Error Response from ${endpoint}:`, {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                    });

                    const errorMessage = error.message || `Error ${response.status}: ${response.statusText}`;
                    throw new Error(errorMessage);
                }

                // Handle empty responses (204 No Content, etc)
                const contentType = response.headers.get('content-type');
                if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
                    return {} as T;
                }

                return await response.json();
            } finally {
                if (isGet) this.inFlightRequests.delete(requestKey);
            }
        })();

        if (isGet) {
            this.inFlightRequests.set(requestKey, fetchPromise);
        }

        return fetchPromise;
    }

    async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, { method: 'GET', ...options });
    }

    async post<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
            ...options
        });
    }

    async put<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
            ...options
        });
    }

    async patch<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
            ...options
        });
    }

    async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, { method: 'DELETE', ...options });
    }

    // ============================================
    // AUTH & PROFILE
    // ============================================
    async getMe(): Promise<any> {
        return this.get('/auth/me');
    }

    async signup(data: any): Promise<any> {
        return this.post('/auth/signup', data);
    }


    async login(credentials: any): Promise<any> {
        this.clearCsrfToken();
        const result = await this.post<any>('/auth/login', credentials);
        if (result.token) localStorage.setItem('auth_token', result.token);
        return result;
    }

    async refreshToken(): Promise<any> {
        const refreshToken = localStorage.getItem('auth_refresh_token');
        const result = await this.post<any>('/auth/refresh', { refreshToken });
        if (result.token) localStorage.setItem('auth_token', result.token);
        return result;
    }

    async submitGameScore(data: any): Promise<any> {
        return this.post('/gamification/scores', data);
    }

    async getCurrentUser(): Promise<any> {
        return this.getMe();
    }

    async demoLogin(role: string): Promise<any> {
        this.clearCsrfToken();
        const result = await this.post<any>('/auth/demo/login', { role });
        if (result.token) localStorage.setItem('auth_token', result.token);
        return result;
    }

    async googleLogin(email: string, name: string): Promise<any> {
        this.clearCsrfToken();
        const result = await this.post<any>('/auth/google-login', { email, name });
        if (result.token) localStorage.setItem('auth_token', result.token);
        return result;
    }

    async forgotPassword(email: string): Promise<any> {
        return this.post('/auth/forgot-password', { email });
    }

    async resetPassword(data: any): Promise<any> {
        return this.post('/auth/reset-password', data);
    }

    async logout(): Promise<void> {
        try {
            await this.post('/auth/logout', {});
        } catch (e) {
            console.warn('Backend logout failed', e);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_refresh_token');
            sessionStorage.removeItem('is_demo_mode');
            this.invalidateCache();
        }
    }

    async getMemberships(userId: string): Promise<any[]> {
        return this.get(`/auth/memberships/${userId}`);
    }

    async switchSchool(userId: string, schoolId: string): Promise<any> {
        return this.post('/auth/switch-school', { userId, schoolId });
    }

    async updateProfile(id: string, data: any): Promise<any> {
        return this.updateUser(id, data);
    }

    async resendVerification(email: string, name?: string, schoolName?: string): Promise<any> {
        return this.post('/auth/resend-verification', { email, name, school_name: schoolName });
    }

    async verifyToken(token: string, type: string = 'signup'): Promise<any> {
        return this.post('/auth/verify-email', { token, code: type }); // Mapping type to code if needed, but verifyEmail expects token and code
    }

    async updateEmail(data: { userId: string; newEmail: string }): Promise<any> {
        console.log('🚀 [API] Calling updateEmail (POST) with data:', data);
        return this.post('/auth/update-email', data);
    }

    async updateUsername(data: { userId: string; newUsername: string }): Promise<any> {
        return this.post('/auth/update-username', data);
    }

    async updatePassword(data: { userId: string; currentPassword?: string; newPassword: string }): Promise<any> {
        return this.post('/auth/update-password', data);
    }

    // ============================================
    // VERSION MANAGEMENT
    // ============================================
    async getAppVersions(): Promise<any[]> {
        return this.get('/versions');
    }

    async setSchoolVersion(schoolId: string, version: string): Promise<any> {
        return this.post(`/versions/school/${schoolId}`, { version });
    }

    async registerAppVersion(version: string, description: string): Promise<any> {
        return this.post('/versions/register', { version, description });
    }

    async getUsers(schoolId?: string, branchId?: string, role?: string, term?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('school_id', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branch_id', branchId);
        if (role) queryParams.append('role', role);
        if (term) queryParams.append('term', term);
        return this.get(`/users?${queryParams.toString()}`);
    }

    async updateUser(userId: string, data: any): Promise<any> {
        return this.put(`/users/${userId}`, data);
    }

    async deleteUser(userId: string): Promise<any> {
        return this.delete(`/users/${userId}`);
    }

    async resetUserPassword(userId: string): Promise<any> {
        return this.post('/auth/admin/reset-password', { userId });
    }

    // ============================================
    // DASHBOARD & STATS
    // ============================================
    async getDashboardStats(schoolId?: string, branchId?: string): Promise<any> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        try {
            const result = await this.get<any>(`/dashboard/stats${query}`);
            return {
                totalStudents: Number(result.totalStudents ?? result.total_students) || 0,
                totalTeachers: Number(result.totalTeachers ?? result.total_teachers) || 0,
                totalParents: Number(result.totalParents ?? result.total_parents) || 0,
                totalClasses: Number(result.totalClasses ?? result.total_classes) || 0,
                studentTrend: Number(result.studentTrend ?? result.student_trend) || 0,
                teacherTrend: Number(result.teacherTrend ?? result.teacher_trend) || 0,
                parentTrend: Number(result.parentTrend ?? result.parent_trend) || 0,
                classTrend: Number(result.classTrend ?? result.class_trend) || 0,
                overdueFees: Number(result.overdueFees ?? result.overdue_fees) || 0,
                unpublishedReports: Number(result.unpublishedReports ?? result.unpublished_reports) || 0,
                pendingApprovalsCount: Number(result.pendingApprovals ?? result.pending_approvals) || 0,
                attendancePercentage: Number(result.attendanceRate ?? result.attendance_rate) || 0,
                totalAcademicLevels: Number(result.totalAcademicLevels ?? result.total_academic_levels) || 0,
                timetablePreview: result.timetablePreview ?? [],
                recentActivity: result.recentActivity ?? [],
                latestHealthLog: result.latestHealthLog ?? null,
                enrollmentData: result.enrollmentData || result.enrollment || [],
                performance: result.performance || [],
                fees: result.fees || { paid: 0, overdue: 0, unpaid: 0, total: 0 },
                workload: result.workload || [],
                attendance: result.attendance || [],
            };
        } catch (err) {
            console.error('[API] getDashboardStats error:', err);
            return {
                totalStudents: 0, totalTeachers: 0, totalParents: 0, totalClasses: 0, totalAcademicLevels: 0,
                studentTrend: 0, teacherTrend: 0, parentTrend: 0, classTrend: 0,
                overdueFees: 0, unpublishedReports: 0, pendingApprovalsCount: 0,
                attendancePercentage: 0, timetablePreview: [], recentActivity: [],
                latestHealthLog: null, enrollmentData: [], performance: [],
                fees: { paid: 0, overdue: 0, unpaid: 0, total: 0 }, workload: [], attendance: [],
            };
        }
    }

    async getSchools(): Promise<any[]> {
        return this.get('/schools');
    }

    async getSchoolProfileData(schoolId: string): Promise<any> {
        return this.get(`/schools/${schoolId}/profile-data`);
    }

    async getSchoolsEnhanced(): Promise<any[]> {
        return this.get('/schools/enhanced');
    }

    async getTeacherDashboardStats(teacherIdOrFilters: string | any, schoolId?: string, branchId?: string | null): Promise<any> {
        let actualTeacherId = typeof teacherIdOrFilters === 'string' ? teacherIdOrFilters : teacherIdOrFilters.teacherId;
        let actualSchoolId = typeof teacherIdOrFilters === 'string' ? schoolId : teacherIdOrFilters.schoolId;
        let actualBranchId = typeof teacherIdOrFilters === 'string' ? branchId : teacherIdOrFilters.branchId;

        const url = `/dashboard/stats?teacherId=${actualTeacherId}&schoolId=${actualSchoolId}${actualBranchId && actualBranchId !== 'all' ? `&branchId=${actualBranchId}` : ''}`;
        try {
            const result = await this.get<any>(url);
            return {
                totalStudents: Number(result.totalStudents ?? result.total_students) || 0,
                totalClasses: Number(result.totalClasses ?? result.total_classes) || 0,
                attendanceRate: Number(result.attendanceRate ?? result.attendance_rate) || 0,
                avgStudentScore: Number(result.avgStudentScore ?? result.avg_student_score) || 0
            };
        } catch (err) {
            return { totalStudents: 0, totalClasses: 0, attendanceRate: 0, avgStudentScore: 0 };
        }
    }

    // ============================================
    // SCHOOLS & BRANCHES
    // ============================================
    async getBranches(schoolId: string): Promise<any[]> {
        try {
            return await this.get(`/branches?schoolId=${schoolId}`);
        } catch (err) {
            console.warn('[API] getBranches failed:', err);
            return [];
        }
    }

    async createBranch(schoolId: string, data: any): Promise<any> {
        return this.post('/branches', { ...data, school_id: schoolId });
    }

    async updateBranch(branchId: string, data: any): Promise<any> {
        return this.put(`/branches/${branchId}`, data);
    }

    async deleteBranch(id: string): Promise<void> {
        await this.delete(`/branches/${id}`);
    }

    async getSchoolInfo(schoolId: string): Promise<any> {
        return this.get(`/schools/${schoolId}`);
    }

    async getSchool(schoolId: string): Promise<any> {
        return this.getSchoolInfo(schoolId);
    }

    async getUserCount(schoolId: string, filters: { role?: string; neqRole?: string } = {}): Promise<number> {
        // Since we don't have a specific count endpoint, we fetch users and count
        const users = await this.getUsers(schoolId);
        let filtered = users;
        if (filters.role) filtered = filtered.filter(u => u.role === filters.role);
        if (filters.neqRole) filtered = filtered.filter(u => u.role !== filters.neqRole);
        return filtered.length;
    }

    async updateSchoolInfo(schoolId: string, data: any): Promise<any> {
        return this.put(`/schools/${schoolId}`, data);
    }

    async updateSchoolSubscription(schoolId: string, data: any): Promise<any> {
        return this.post(`/schools/${schoolId}/subscription`, data);
    }

    // ============================================
    // STUDENTS
    // ============================================
    async getStudents(schoolIdOrFilters?: string | { classId?: string; grade?: number; section?: string; schoolId?: string; branchId?: string; parent_id?: string }, branchId?: string, ...args: any[]): Promise<any[]> {
        const queryParams = new URLSearchParams();
        let filters: any = {};

        if (typeof schoolIdOrFilters === 'string') {
            if (schoolIdOrFilters) queryParams.append('schoolId', schoolIdOrFilters);
            if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
            filters = args[0] || {};
        } else {
            filters = schoolIdOrFilters || {};
            if (filters.schoolId) queryParams.append('schoolId', filters.schoolId);
            if (filters.branchId && filters.branchId !== 'all') queryParams.append('branchId', filters.branchId);
        }
        
        if (filters.classId) queryParams.append('classId', filters.classId);
        if (filters.grade) queryParams.append('grade', filters.grade.toString());
        if (filters.section) queryParams.append('section', filters.section);
        if (filters.parent_id) queryParams.append('parent_id', filters.parent_id);

        try {
            return await this.get(`/students?${queryParams.toString()}`);
        } catch (err) {
            console.warn('[API] getStudents failed:', err);
            return [];
        }
    }

    async getStudentById(id: string): Promise<any> {
        return this.get(`/students/${id}`);
    }

    async getStudentProfile(id: string): Promise<any> {
        return this.getStudentById(id);
    }

    async getStudent(id: string): Promise<any> {
        return this.getSubstituteStudent(id);
    }

    async getSubstituteStudent(id: string): Promise<any> {
        return this.getStudentById(id);
    }

    async createStudent(data: any): Promise<any> {
        return this.post('/students', data);
    }

    async generateStudentQRCode(studentId: string | number): Promise<string> {
        const result = await this.post<{ qrCode: string }>(`/students/${studentId}/qr-code`, {});
        return result.qrCode;
    }

    async updateStudent(id: string, data: any, ...args: any[]): Promise<any> {
        return this.put(`/students/${id}`, data);
    }

    async deleteStudent(id: string): Promise<void> {
        await this.delete(`/students/${id}`);
    }

    async enrollStudent(data: any): Promise<any> {
        return this.post('/students/enroll', data);
    }

    async approveStudent(id: string, branchId?: string): Promise<any> {
        return this.post(`/students/${id}/approve`, { branchId });
    }

    async getPendingStudentApprovals(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        return this.get(`/students/pending-approvals?${queryParams.toString()}`);
    }

    async bulkUpdateStudentStatus(ids: string[], status: string, branchId?: string): Promise<any> {
        return this.post('/students/bulk-status-update', { ids, status, branchId });
    }

    async getMyDocuments(): Promise<any[]> {
        return this.get('/students/me/documents');
    }

    async addMyDocument(data: any): Promise<any> {
        return this.post('/students/me/documents', data);
    }

    async getStudentsByClass(arg1: any, arg2?: any, arg3?: any, arg4?: any): Promise<any[]> {
        let grade: any, section: any, schoolId: any, branchId: any;
        
        if (typeof arg1 === 'number' || (typeof arg1 === 'string' && !isNaN(parseInt(arg1)) && arg1.length < 5)) {
            // Probably (grade, section, schoolId, branchId)
            grade = arg1;
            section = arg2;
            schoolId = arg3;
            branchId = arg4;
        } else {
            // Probably (schoolId, grade, section, branchId)
            schoolId = arg1;
            grade = arg2;
            section = arg3;
            branchId = arg4;
        }

        const queryParams = new URLSearchParams();
        if (grade) queryParams.append('grade', String(grade));
        if (section) queryParams.append('section', String(section));
        if (schoolId) queryParams.append('schoolId', String(schoolId));
        if (branchId && branchId !== 'all') queryParams.append('branchId', String(branchId));
        
        const data = await this.get<any[]>(`/students/by-class?${queryParams.toString()}`);
        return (data || []).map(student => ({
            ...student,
            name: student.name || student.full_name || 'Unknown Student'
        }));
    }

    async getStudentsByClassId(classId: string): Promise<any[]> {
        const data = await this.get<any[]>(`/students/class/${classId}`);
        return (data || []).map(student => ({
            ...student,
            name: student.name || student.full_name || 'Unknown Student'
        }));
    }

    async getStudentByEmail(email: string): Promise<any> {
        return this.get(`/students/email/${email}`);
    }

    async getMyDashboardOverview(): Promise<any> {
        return this.get('/students/me/dashboard');
    }

    async getMyStudentProfile(): Promise<any> {
        return this.get('/students/me');
    }

    async getStudentPerformance(): Promise<any[]> {
        try {
            return await this.get(`/students/me/performance`);
        } catch (err) {
            return [];
        }
    }

    async syncStudentClasses(studentId: string, classIds: string[]): Promise<any> {
        console.log('🔄 [API] Syncing student classes (batch):', { studentId, classIds });
        // Use batch call supported by updated backend controller
        return this.post(`/students/${studentId}/assign-class`, { classIds });
    }

    async linkStudentToClasses(studentId: string, classIds: string[]): Promise<any> {
        return this.syncStudentClasses(studentId, classIds);
    }

    async getSubjects(schoolId: string, branchId?: string, grade?: number): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        if (grade) queryParams.append('grade', grade.toString());
        return this.get(`/subjects?${queryParams.toString()}`);
    }

    async getMySubjects(): Promise<any[]> {
        return this.get('/students/me/subjects');
    }

    // ============================================
    // TEACHERS
    // ============================================
    async getTeachers(schoolId?: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            return await this.get(`/teachers?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async getTeacherById(id: string): Promise<any> {
        return this.get(`/teachers/${id}`);
    }

    async getMyTeacherProfile(): Promise<any> {
        return this.get('/teachers/me');
    }

    async getMyQuizResults(): Promise<any[]> {
        try {
            return await this.get('/students/me/quiz-results');
        } catch (err) {
            return [];
        }
    }

    async getQuizSubmission(quizId: string): Promise<any> {
        return this.get(`/quizzes/me/submissions/${quizId}`);
    }


    async getMyPerformance(): Promise<any> {
        return this.get('/students/me/performance');
    }

    async getGrades(studentIds: (string | number)[], subject: string, term: string, schoolId?: string, branchId?: string, ...args: any[]): Promise<any[]> {
        return this.post('/academic/grades', {
            studentIds,
            subject,
            term,
            schoolId,
            branchId
        });
    }

    async saveGrade(data: any, schoolId?: string, branchId?: string, ...args: any[]): Promise<any> {
        return this.post('/academic/grades/save', { ...data, schoolId, branchId });
    }

    async getStudentReportStats(studentId: string): Promise<any> {
        try {
            const report = await this.get(`/academic/report-card-details?studentId=${studentId}&term=First Term&session=2024/2025`);
            if (!report) return { avgScore: 0, attendancePct: 100, performance: [] };
            
            const records = (report as any).academic_records || [];
            const avgScore = records.length > 0 
                ? records.reduce((acc: number, r: any) => acc + (r.total || 0), 0) / records.length 
                : 0;
                
            return {
                avgScore: Math.round(avgScore),
                attendancePct: 100, // Mock for now
                performance: records.map((r: any) => ({
                    subject: r.subject,
                    score: r.total
                }))
            };
        } catch (err) {
            return { avgScore: 0, attendancePct: 100, performance: [] };
        }
    }

    async getAcademicPerformance(filters: any = {}): Promise<any[]> {
        const queryParams = new URLSearchParams(filters);
        return this.get(`/academic/performance?${queryParams.toString()}`);
    }

    async getMyFees(): Promise<any[]> {
        return this.get('/students/me/fees');
    }

    async getMyAchievements(): Promise<any[]> {
        return this.get('/students/me/achievements');
    }

    async getMyStudentStats(): Promise<any> {
        try {
            return await this.get('/students/me/stats');
        } catch {
            return { attendanceRate: 0, assignmentsSubmitted: 0, averageScore: 0, studyHours: 0, achievements: 0 };
        }
    }

    async getMyAttendance(): Promise<any[]> {
        return this.get('/students/me/attendance');
    }

    async getMyReportCards(): Promise<any[]> {
        return this.get('/students/me/report-cards');
    }

    async getExtracurriculars(schoolId?: string): Promise<any[]> {
        return this.get(`/activities${schoolId ? `?school_id=${schoolId}` : ''}`);
    }

    async getMySubmissions(): Promise<any[]> {
        return this.get('/students/me/submissions');
    }

    async getTimetable(branchId?: string, className?: string, teacherId?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId);
        if (className) params.append('className', className);
        if (teacherId) params.append('teacherId', teacherId);
        
        const qs = params.toString();
        return this.get(`/timetables${qs ? `?${qs}` : ''}`);
    }

    async getMyExtracurriculars(): Promise<any[]> {
        return this.get('/students/me/activities');
    }

    async getExtracurricularEvents(schoolId: string): Promise<any[]> {
        return this.get(`/activities/events?school_id=${schoolId}`);
    }

    async joinExtracurricular(activityId: string): Promise<any> {
        return this.post(`/activities/${activityId}/join`, {});
    }

    async leaveExtracurricular(activityId: string): Promise<any> {
        return this.post(`/activities/${activityId}/leave`, {});
    }

    async getLeaderboard(type: string = 'global'): Promise<any[]> {
        try {
            return await this.get(`/gamification/scores/leaderboard/${type}`);
        } catch (err) {
            return [];
        }
    }

    async createTeacher(data: any): Promise<any> {
        return this.post('/teachers', data);
    }

    async updateTeacher(id: string, data: any): Promise<any> {
        return this.put(`/teachers/${id}`, data);
    }

    async deleteTeacher(id: string): Promise<any> {
        return this.delete(`/teachers/${id}`);
    }

    async getTeacherClasses(teacherId: string): Promise<any[]> {
        return this.get(`/teachers/${teacherId}/classes`);
    }

    async getTeacherAttendance(schoolId: string, filters: { branchId?: string; date?: string; status?: string; teacher_id?: string; startDate?: string; endDate?: string } = {}): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (filters.branchId && filters.branchId !== 'all') queryParams.append('branchId', filters.branchId);
        if (filters.date) queryParams.append('date', filters.date);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.teacher_id) queryParams.append('teacher_id', filters.teacher_id);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);

        try {
            return await this.get(`/teachers/attendance?${queryParams.toString()}`);
        } catch (err) {
            console.error('[API] getTeacherAttendance error:', err);
            return [];
        }
    }

    async getTeacherAttendanceHistory(limit: number = 30): Promise<any[]> {
        try {
            return await this.get(`/teachers/me/attendance?limit=${limit}`);
        } catch (err) {
            return [];
        }
    }

    async submitMyAttendance(data?: any): Promise<any> {
        return this.post('/teachers/me/attendance', data || {});
    }

    async submitTeacherAttendance(data?: any): Promise<any> {
        return this.submitMyAttendance(data);
    }


    async getTeacherAttendanceApprovals(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        return this.get(`/teachers/attendance-approvals?${queryParams.toString()}`);
    }

    async approveTeacherAttendance(attendanceId: string, status: string): Promise<any> {
        return this.put(`/teachers/attendance/${attendanceId}/approve`, { status });
    }


    async bulkFetchAttendance(studentIds: string[], startDate?: string, endDate?: string, branchId?: string): Promise<any[]> {
        return this.post('/attendance/bulk-fetch', { studentIds, startDate, endDate, branchId });
    }

    // getTimetable moved to core section above

    async getMaintenanceTickets(branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        return this.get(`/maintenance?${queryParams.toString()}`);
    }

    async createMaintenanceTicket(data: any): Promise<any> {
        return this.post('/maintenance', data);
    }


    async getTeacherReportCards(teacherId: string, schoolId: string): Promise<any[]> {
        return this.get(`/teachers/${teacherId}/report-cards?schoolId=${schoolId}`);
    }

    async getTeacherBadges(teacherId: string): Promise<any[]> {
        return this.get(`/teachers/${teacherId}/badges`);
    }

    async getTeacherCertificates(teacherId: string): Promise<any[]> {
        return this.get(`/teachers/${teacherId}/certificates`);
    }

    async getTeacherPaymentTransactions(teacherId: string): Promise<any[]> {
        return this.get(`/teachers/${teacherId}/payments`);
    }

    async getMentoringData(teacherId: string): Promise<any> {
        return this.get(`/teachers/${teacherId}/mentoring`);
    }

    async requestMentor(teacherId: string, data: any): Promise<any> {
        return this.post(`/teachers/${teacherId}/mentoring/request`, data);
    }

    async getTeacherPerformance(schoolId: string, teacherId: string): Promise<any> {
        return this.get(`/teachers/${teacherId}/performance`);
    }

    async getTeacherEvaluation(schoolId: string, teacherId: string): Promise<any> {
        return this.get(`/teachers/${teacherId}/evaluation`);
    }

    async submitTeacherEvaluation(teacherId: string, schoolId: string, data: any): Promise<any> {
        return this.post(`/teachers/${teacherId}/evaluation`, data);
    }

    async getTeacherSalaryProfile(teacherId: string): Promise<any> {
        return this.get(`/teachers/${teacherId}/salary-profile`);
    }

    async saveTeacherAttendance(schoolId: string, records: any[]) {
        return this.post('/teachers/attendance', { schoolId, records });
    }

    async getTeacherWorkload(teacherId: string): Promise<any> {
        return this.get(`/teachers/${teacherId}/workload`);
    }

    async getAppointments(filters: any = {}): Promise<any[]> {
        const queryParams = new URLSearchParams(filters);
        try {
            return await this.get(`/counseling?${queryParams.toString()}`);
        } catch (err) {
            console.error('[API] getAppointments error:', err);
            return [];
        }
    }

    async getTeacherAppointments(): Promise<any[]> {
        try {
            return await this.get('/teachers/me/appointments');
        } catch (err) {
            console.error('[API] getTeacherAppointments error:', err);
            return [];
        }
    }

    async updateAppointmentStatus(id: string, status: string): Promise<any> {
        return this.put(`/teachers/appointments/${id}/status`, { status });
    }

    async updateCounselingAppointmentStatus(id: string, status: string): Promise<any> {
        return this.patch(`/counseling/${id}/status`, { status });
    }

    // ============================================
    // CLASSES
    // ============================================
    async getClasses(schoolId?: string, branchId?: string, includeAll: boolean = false): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        if (includeAll) queryParams.append('includeAll', 'true');
        
        try {
            return await this.get(`/classes?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async createClass(data: any): Promise<any> {
        return this.post('/classes', data);
    }

    async updateClass(id: string, data: any): Promise<any> {
        return this.put(`/classes/${id}`, data);
    }

    async deleteClass(id: string): Promise<any> {
        return this.delete(`/classes/${id}`);
    }

    async getClassById(id: string): Promise<any> {
        return this.get(`/classes/${id}`);
    }

    async initializeStandardClasses(schoolId: string, classes: any[], branchId?: string | null): Promise<any> {
        return this.post('/classes/initialize', { schoolId, classes, branch_id: branchId });
    }

    async getPlans(): Promise<any[]> {
        return this.get('/plans');
    }

    async getPlanStatus(schoolId: string): Promise<any> {
        return this.get(`/plans/status?schoolId=${schoolId}`);
    }

    // ============================================
    // SCHOOLS & INFRASTRUCTURE
    // ============================================
    async getParents(schoolId?: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            return await this.get(`/parents?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async getParentById(id: string): Promise<any> {
        return this.get(`/parents/${id}`);
    }

    async createParent(data: any): Promise<any> {
        return this.post('/parents', data);
    }

    async updateParent(id: string, data: any): Promise<any> {
        return this.put(`/parents/${id}`, data);
    }

    async deleteParent(id: string): Promise<void> {
        await this.delete(`/parents/${id}`);
    }

    async getMyParentProfile(): Promise<any> {
        return this.get('/parents/me');
    }

    async getMyChildren(): Promise<any[]> {
        return this.get('/parents/me/children');
    }

    async getParentsByClass(classId: string): Promise<any[]> {
        return this.get(`/parents/by-class/${classId}`);
    }

    async linkParentToChild(parentId: string, studentId: string, schoolId: string): Promise<any> {
        return this.post('/parents/link-child', { parentId, studentId, schoolId });
    }

    async linkParentToChildUnique(parentId: string, studentId: string, schoolId: string): Promise<any> {
        // Fallback to standard link-child since the unique endpoint is 404ing
        return this.linkParentToChild(parentId, studentId, schoolId);
    }

    async linkStudentToParent(parentId: string, studentIdOrCode: string, relationshipOrSchoolId: string, schoolId?: string): Promise<any> {
        return this.post('/parents/link-child', { 
            parentId, 
            studentId: studentIdOrCode, 
            relationship: relationshipOrSchoolId,
            schoolId: schoolId || (typeof relationshipOrSchoolId === 'string' && relationshipOrSchoolId.length > 20 ? relationshipOrSchoolId : undefined)
        });
    }

    async unlinkStudentFromParent(parentId: string, studentId: string): Promise<any> {
        return this.post('/parents/unlink-child', { parentId, studentId });
    }

    async getChildrenForParent(parentId: string): Promise<any[]> {
        return this.get(`/parents/${parentId}/children`);
    }

    async getChildOverview(studentId: string): Promise<any> {
        try {
            return await this.get(`/parents/me/children/${studentId}/overview`);
        } catch (error) {
            console.error(`[API] Failed to fetch child overview for ${studentId}:`, error);
            throw error;
        }
    }

    async createAppointment(data: any): Promise<any> {
        return this.post('/parents/appointments', data);
    }

    async getParentTodayUpdate(parentId: string, studentId?: string): Promise<any> {
        try {
            const qs = studentId ? `?studentId=${studentId}` : '';
            return await this.get(`/parents/me/today-update${qs}`);
        } catch {
            return {};
        }
    }

    async getComplaints(): Promise<any[]> {
        try {
            return await this.get('/parents/complaints');
        } catch {
            return [];
        }
    }

    async createComplaint(data: any): Promise<any> {
        return this.post('/parents/complaints', data);
    }

    async getTeacherAvailability(teacherId: string, date: string): Promise<any[]> {
        try {
            return await this.get(`/parents/teachers/${teacherId}/availability?date=${date}`);
        } catch {
            // Fallback for demo if needed
            return [];
        }
    }

    async getParentNotifications(parentId?: string): Promise<any[]> {
        try {
            return await this.get('/notifications/me');
        } catch {
            return [];
        }
    }

    async getParentPTAMeetings(schoolId?: string): Promise<any[]> {
        try {
            const qs = schoolId ? `?schoolId=${schoolId}` : '';
            return await this.get(`/pta/meetings${qs}`);
        } catch {
            return [];
        }
    }

    async getMyVolunteerSignups(): Promise<any[]> {
        try {
            return await this.get('/volunteering/me');
        } catch {
            return [];
        }
    }

    async getVolunteeringOpportunities(schoolId?: string): Promise<any[]> {
        try {
            const qs = schoolId ? `?schoolId=${schoolId}` : '';
            return await this.get(`/volunteering${qs}`);
        } catch {
            return [];
        }
    }

    async volunteerSignup(opportunityId: string, data?: any): Promise<any> {
        return this.post(`/volunteering/${opportunityId}/signup`, data || {});
    }

    // ============================================
    // NOTIFICATIONS & NOTICES
    // ============================================
    async getNotifications(filters: { schoolId: string, branchId?: string }): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (filters.schoolId) queryParams.append('schoolId', filters.schoolId);
        if (filters.branchId && filters.branchId !== 'all') queryParams.append('branchId', filters.branchId);
        try {
            return await this.get(`/notifications?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async getMyNotifications(schoolId?: string): Promise<any[]> {
        try {
            return await this.get('/notifications/me');
        } catch (err) {
            return [];
        }
    }

    async createNotification(data: any): Promise<any> {
        return this.post('/notifications', data);
    }

    async sendNotification(data: { userId: string | number; title: string; body: string; urgency?: string; channel?: string }): Promise<any> {
        return this.post('/notifications/send', data);
    }

    async markNotificationsRead(ids: (string | number)[]): Promise<any> {
        return this.put('/notifications/mark-read', { ids });
    }

    async updateNotification(id: string | number, data: any): Promise<any> {
        return this.put(`/notifications/${id}`, data);
    }

    async savePushToken(token: string): Promise<any> {
        return this.post('/notifications/push-token', { token });
    }

    async deleteNotification(id: string | number): Promise<void> {
        await this.delete(`/notifications/${id}`);
    }

    async getNotices(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            return await this.get(`/notices?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async createNotice(data: any): Promise<any> {
        return this.post('/notices', data);
    }

    async updateNotice(id: string, data: any): Promise<any> {
        return this.put(`/notices/${id}`, data);
    }

    async deleteNotice(id: string): Promise<void> {
        return this.delete(`/notices/${id}`);
    }

    async createAuditLog(data: any): Promise<any> {
        return this.post('/audit-logs', data);
    }

    async getParentsByStudentId(studentId: string | number): Promise<any[]> {
        try {
            return await this.get<any[]>(`/students/${studentId}/parents`);
        } catch (error) {
            console.error('Error fetching parents for student:', error);
            return [];
        }
    }

    async getStudentsByIds(ids: (string | number)[]): Promise<any[]> {
        if (!ids || ids.length === 0) return [];
        try {
            return await this.get<any[]>(`/students?ids=${ids.join(',')}`);
        } catch (error) {
            console.error('Error fetching students by IDs:', error);
            return [];
        }
    }

    async getBusDetails(schoolId: string): Promise<any> {
        try {
            return await this.get(`/buses?school_id=${schoolId}`);
        } catch (error) {
            console.error('Error fetching bus details:', error);
            return null;
        }
    }

    async getStudentBus(studentId: string): Promise<any> {
        try {
            return await this.get(`/buses/student/${studentId}`);
        } catch (error) {
            console.error(`Error fetching bus for student ${studentId}:`, error);
            return null;
        }
    }

    // ============================================
    // FINANCE
    // ============================================
    async getFees(schoolIdOrFilters?: string | { studentId?: string | number; schoolId?: string; branchId?: string }, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        let filters: any = {};

        if (typeof schoolIdOrFilters === 'string') {
            if (schoolIdOrFilters) queryParams.append('schoolId', schoolIdOrFilters);
            if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        } else {
            filters = schoolIdOrFilters || {};
            if (filters.schoolId) queryParams.append('schoolId', filters.schoolId);
            if (filters.branchId && filters.branchId !== 'all') queryParams.append('branchId', filters.branchId);
            if (filters.studentId) queryParams.append('studentId', filters.studentId.toString());
        }

        try {
            return await this.get(`/fees?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async createFee(dataOrSchoolId: any, branchIdOrData?: any, data?: any): Promise<any> {
        if (typeof dataOrSchoolId === 'string') {
            const payload = data || (typeof branchIdOrData === 'object' ? branchIdOrData : {});
            return this.post('/fees', { 
                ...payload, 
                schoolId: dataOrSchoolId, 
                branchId: typeof branchIdOrData === 'string' ? branchIdOrData : undefined 
            });
        }
        return this.post('/fees', dataOrSchoolId);
    }

    async updateFee(id: string, data: any): Promise<any> {
        return this.put(`/fees/${id}`, data);
    }

    async deleteFee(id: string): Promise<void> {
        await this.delete(`/fees/${id}`);
    }

    async updateFeeStatus(id: string, status: string): Promise<any> {
        return this.put(`/fees/${id}/status`, { status });
    }

    async recordPayment(schoolIdOrData: any, branchId?: string, paymentData?: any): Promise<any> {
        let body: any;
        if (paymentData !== undefined) {
            // 3-arg form: recordPayment(schoolId, branchId, data)
            body = { ...paymentData, schoolId: schoolIdOrData, branchId };
        } else {
            // 1-arg form: recordPayment(data)
            body = schoolIdOrData;
        }
        return this.post('/fees/record-payment', body);
    }

    async getPaymentHistory(schoolIdOrFilters?: string | { studentId?: string | number; schoolId?: string; branchId?: string }, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        let filters: any = {};

        if (typeof schoolIdOrFilters === 'string') {
            if (schoolIdOrFilters) queryParams.append('schoolId', schoolIdOrFilters);
            if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        } else {
            filters = schoolIdOrFilters || {};
            if (filters.schoolId) queryParams.append('schoolId', filters.schoolId);
            if (filters.branchId && filters.branchId !== 'all') queryParams.append('branchId', filters.branchId);
            if (filters.studentId) queryParams.append('studentId', filters.studentId.toString());
        }

        try {
            return await this.get(`/fees/payment-history?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async deletePayment(id: string): Promise<void> {
        await this.delete(`/fees/payments/${id}`);
    }

    async getStudentFees(studentId: string): Promise<any[]> {
        try {
            const response = await this.post<any>('/fees/bulk-fetch', { studentIds: [studentId] });
            return response.data || response || [];
        } catch (err) {
            console.error('[API] getStudentFees error:', err);
            return [];
        }
    }

    async assignFeeToStudent(data: any): Promise<any> {
        return this.post('/fees/assign', data);
    }

    async getPayslips(teacherId: string): Promise<any[]> {
        return this.get(`/payroll/payslips/${teacherId}`);
    }

    async getTeacherPayslips(teacherId: string): Promise<any[]> {
        return this.getPayslips(teacherId);
    }

    async generatePayslip(data: any): Promise<any> {
        return this.post('/payroll/generate-payslip', data);
    }

    async approvePayslip(id: string): Promise<any> {
        return this.put(`/payroll/approve/${id}`, {});
    }

    async getTeacherSalary(teacherId: string): Promise<any> {
        return this.get(`/payroll/salary/${teacherId}`);
    }

    async getPayrollData(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        return this.get(`/payroll?${queryParams.toString()}`);
    }

    async getBudgets(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        return this.get(`/payroll/budgets?${queryParams.toString()}`);
    }

    // ============================================
    // ACADEMICS & CURRICULUM
    // ============================================
    async getAcademicTerms(schoolId: string): Promise<any[]> {
        return this.get(`/academic/terms?schoolId=${schoolId}`);
    }

    async getReportCard(studentId: string | number, term: string, session: string, branchId?: string | null): Promise<any> {
        return this.get(`/academic/get-report?studentId=${studentId}&term=${term}&session=${session}${branchId ? `&branchId=${branchId}` : ''}`);
    }

    async getReportCardDetails(studentId: string | number, term: string, session: string, branchId?: string | null): Promise<any> {
        return this.getReportCard(studentId, term, session, branchId);
    }

    async upsertReportCard(studentId: string, data: any, schoolId?: string, branchId?: string | null): Promise<any> {
        return this.post('/academic/upsert-report-card', { studentId, schoolId, branchId, ...data });
    }

    async getStudentReportCards(studentId: string): Promise<any[]> {
        return this.get(`/students/${studentId}/report-cards`);
    }

    async getReportCards(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        return this.get(`/report-cards?${queryParams.toString()}`);
    }

    // Virtual Class
    async getVirtualClassSessions(schoolId: string, branchId?: string, teacherId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        if (teacherId) queryParams.append('teacherId', teacherId);
        return await this.get(`/virtual-classes?${queryParams.toString()}`);
    }

    async createVirtualClassSession(data: any): Promise<any> {
        return await this.post('/virtual-classes', data);
    }

    async recordVirtualAttendance(sessionId: string, studentId: string): Promise<any> {
        return await this.post('/virtual-classes/attendance', { sessionId, studentId });
    }

    // Quizzes
    async getQuizzes(schoolId?: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            return await this.get(`/quizzes?${queryParams.toString()}`);
        } catch {
            return [];
        }
    }

    async createQuiz(data: any): Promise<any> {
        return this.post('/quizzes', data);
    }

    async updateQuiz(id: string, data: any): Promise<any> {
        return this.put(`/quizzes/${id}`, data);
    }

    async getQuiz(quizId: string): Promise<any> {
        return this.get(`/quizzes/${quizId}`);
    }

    async getQuizQuestions(quizId: string): Promise<any[]> {
        const quiz = await this.getQuiz(quizId);
        return quiz?.questions || [];
    }

    async getQuizDetails(quizId: string): Promise<any> {
        return this.getQuiz(quizId);
    }

    async createQuizWithQuestions(data: any): Promise<any> {
        return this.post('/quizzes/upload', data);
    }

    async updateQuizStatus(quizId: string, data: { status?: string, is_published?: boolean }): Promise<any> {
        return this.put(`/quizzes/${quizId}/status`, data);
    }

    async deleteQuiz(quizId: string): Promise<void> {
        await this.delete(`/quizzes/${quizId}`);
    }

    async submitQuizResult(data: any): Promise<any> {
        return this.post('/quizzes/submit', data);
    }

    async publishReportCards(schoolId: string, term: string, session: string): Promise<any> {
        return this.post('/report-cards/publish', { schoolId, term, session });
    }

    async updateReportCardStatus(reportCardId: string | number, status: string): Promise<any> {
        return this.put(`/report-cards/${reportCardId}/status`, { status });
    }

    async getStudentAcademicRecords(studentId: string): Promise<any[]> {
        return this.get(`/students/${studentId}/academic-records`);
    }


    // ============================================
    // GENERATED RESOURCES & AI
    // ============================================
    async getGeneratedResources(schoolId: string): Promise<any[]> {
        return this.get(`/academic/generated-resources?schoolId=${schoolId}`);
    }

    async getResources(schoolId?: string): Promise<any[]> {
        return this.getGeneratedResources(schoolId || '');
    }

    async saveGeneratedResource(schoolId: string, data: any): Promise<any> {
        return this.post(`/academic/generated-resources?schoolId=${schoolId}`, data);
    }

    async getCBTExams(teacherId?: string): Promise<any[]> {
        const query = teacherId ? `?teacherId=${teacherId}` : '';
        return this.get(`/cbt/exams${query}`);
    }

    async getBehaviorNotesByStudent(studentId: string): Promise<any[]> {
        return this.get(`/students/${studentId}/behavior-notes`);
    }

    async getCurricula(schoolId?: string): Promise<any[]> {
        try {
            return await this.get('/academic/curricula' + (schoolId ? `?schoolId=${schoolId}` : ''));
        } catch (err) {
            return [];
        }
    }

    async getAcademicTracks(filters?: any): Promise<any[]> {
        const queryParams = new URLSearchParams(filters);
        try {
            const result = await this.get<any>(`/academic/tracks?${queryParams.toString()}`);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async getCurriculumTopics(subjectId: string, term: string): Promise<any[]> {
        try {
            return await this.get(`/academic/topics?subjectId=${subjectId}&term=${term}`);
        } catch (err) {
            return [];
        }
    }

    async syncCurriculumData(subjectId: string, source: string): Promise<any> {
        return this.post('/academic/sync', { subjectId, source });
    }

    // getSubjects moved to core section above

    async getClassSubjects(gradeOrId: number | string, section?: string): Promise<any[]> {
        if (typeof gradeOrId === 'string' && !section) {
            return this.get(`/classes/${gradeOrId}/subjects`);
        }
        return this.get(`/classes/by-grade/${gradeOrId}/${section}/subjects`);
    }

    async createSubject(data: any): Promise<any> {
        return this.post('/subjects', data);
    }

    async updateSubject(id: string, data: any): Promise<any> {
        return this.put(`/subjects/${id}`, data);
    }

    async deleteSubject(id: string): Promise<void> {
        await this.delete(`/subjects/${id}`);
    }


    // ============================================
    // ASSIGNMENTS
    // ============================================
    async getAssignments(schoolId?: string, filters: any = {}): Promise<any[]> {
        const queryParams = new URLSearchParams(schoolId ? { ...filters, schoolId } : filters);
        try {
            return await this.get(`/assignments?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async createAssignment(data: any): Promise<any> {
        return this.post('/assignments', data);
    }

    async updateAssignment(id: string, data: any): Promise<any> {
        return this.put(`/assignments/${id}`, data);
    }

    async deleteAssignment(id: string): Promise<void> {
        await this.delete(`/assignments/${id}`);
    }

    async getAssignmentSubmissions(assignmentId: string): Promise<any[]> {
        const data = await this.get<any[]>(`/assignments/${assignmentId}/submissions`);
        // Map backend full_name to frontend name if missing
        return (data || []).map(submission => ({
            ...submission,
            student: submission.student ? {
                ...submission.student,
                name: submission.student.name || submission.student.full_name || 'Unknown Student'
            } : null
        }));
    }

    async getSubmissions(assignmentId: string): Promise<any[]> {
        return this.getAssignmentSubmissions(assignmentId);
    }

    async gradeSubmission(submissionId: string, data: any): Promise<any> {
        return this.put(`/assignments/submissions/${submissionId}/grade`, data);
    }


    // ============================================
    // EXAMS
    // ============================================
    async getExams(schoolId?: string, branchId?: string, teacherId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        if (teacherId) queryParams.append('teacherId', teacherId);
        try {
            return await this.get(`/exams?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async createExam(schoolId: string, branchId: string | undefined, data: any): Promise<any> {
        return this.post('/exams', { ...data, schoolId, branchId });
    }

    async updateExam(id: string, schoolId: string, branchId: string | undefined, data: any): Promise<any> {
        return this.put(`/exams/${id}`, { ...data, schoolId, branchId });
    }

    async deleteExam(id: string, schoolId: string, branchId: string | null | undefined): Promise<void> {
        await this.delete(`/exams/${id}`, {
            headers: {
                'X-School-Id': schoolId,
                ...(branchId ? { 'X-Branch-Id': branchId } : {})
            }
        });
    }

    async getExamResults(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        return this.get(`/exams/results?${queryParams.toString()}`);
    }

    async getExam(id: string): Promise<any> {
        return this.get(`/exams/${id}`);
    }

    async getCurriculum(id: string): Promise<any> {
        return this.get(`/academic/curricula/${id}`);
    }

    async getStudentsBySubject(subjectId: string): Promise<any[]> {
        return this.get(`/students/subject/${subjectId}`);
    }

    async getStudentCurriculumTopics(subjectId: string, term?: string): Promise<any[]> {
        const queryParams = term ? `?term=${term}` : '';
        try {
            return await this.get(`/academic/curricula/${subjectId}/topics${queryParams}`);
        } catch (err) {
            return [];
        }
    }

    async getStudentSubjects(studentId: string | number): Promise<any[]> {
        return this.get(`/students/${studentId}/subjects`);
    }


    async upsertExamResults(data: any): Promise<any> {
        return this.post('/exams/results/upsert', data);
    }


    async getQuizSubmissions(quizId: string): Promise<any[]> {
        return this.get(`/quizzes/${quizId}/submissions`);
    }

    async getQuizResults(studentId: string | number): Promise<any[]> {
        try {
            return await this.get('/students/me/quiz-results');
        } catch (err) {
            return [];
        }
    }

    async getAssignment(id: string): Promise<any> {
        return this.get(`/assignments/${id}`);
    }


    async submitAssignment(assignmentId: string, data: any): Promise<any> {
        return this.post(`/assignments/${assignmentId}/submit`, data);
    }

    async getAssignmentSubmission(assignmentId: string): Promise<any> {
        return this.get(`/assignments/${assignmentId}/submission`);
    }

    async submitQuiz(quizId: string, payload: any): Promise<any> {
        // Ensure quiz_id is in payload as backend expects quizzes/submit
        return this.post('/quizzes/submit', { ...payload, quiz_id: quizId });
    }

    // ============================================
    // ATTENDANCE
    // ============================================
    async getAttendanceByClass(classId: string, date: string): Promise<any[]> {
        return this.get(`/attendance?classId=${classId}&date=${date}`);
    }

    async getAttendance(classId: string, date: string): Promise<any[]> {
        return this.getAttendanceByClass(classId, date);
    }


    async getAttendanceByDate(schoolId: string, date: string): Promise<any[]> {
        return this.get(`/attendance?schoolId=${schoolId}&date=${date}`);
    }

    async saveAttendance(data: any): Promise<any> {
        return this.post('/attendance', { records: data });
    }

    async getStudentAttendance(studentId: string): Promise<any[]> {
        try {
            return await this.get(`/attendance/student/${studentId}`);
        } catch (err) {
            return [];
        }
    }

    async getAttendanceByStudent(studentId: string): Promise<any[]> {
        return this.getStudentAttendance(studentId);
    }

    async scanQRCodeForAttendance(qrCode: string, location?: string): Promise<any> {
        return this.post('/attendance/scan-qr', { qrCode, location });
    }

    async bulkMarkAttendance(classId: string, date: string, attendanceData: any[]): Promise<any> {
        return this.post('/attendance/bulk', { classId, date, attendanceData });
    }

    async getDropoutAlerts(options: any = {}): Promise<any[]> {
        const queryParams = new URLSearchParams(options);
        try {
            return await this.get(`/attendance/dropout-alerts?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async resolveDropoutAlert(alertId: string, notes: string): Promise<any> {
        return this.put(`/attendance/dropout-alerts/${alertId}/resolve`, { notes });
    }

    // ============================================
    // TIMETABLE
    // ============================================
    // getTimetable moved to core section above

    async createTimetable(data: any): Promise<any> {
        return this.post('/timetables', data);
    }

    async updateTimetable(id: string, data: any): Promise<any> {
        return this.put(`/timetables/${id}`, data);
    }

    async deleteTimetable(id: string): Promise<any> {
        return this.delete(`/timetables/${id}`);
    }

    async deleteTimetableByClass(classId: string): Promise<any> {
        return this.delete(`/timetables/class/${classId}`);
    }

    async checkTimetableConflict(data: { teacherId: string, day: string, startTime: string, endTime: string, excludeClassId?: string }): Promise<any> {
        return this.post('/timetables/check-conflict', data);
    }

    // ============================================
    // LESSON PLANS & NOTES
    // ============================================
    async getLessonPlans(filters: any): Promise<any[]> {
        const queryParams = new URLSearchParams(filters);
        return this.get(`/lesson-plans?${queryParams.toString()}`);
    }

    async createLessonPlan(data: any): Promise<any> {
        return this.post('/lesson-plans', data);
    }

    async updateLessonPlan(id: string, data: any): Promise<any> {
        return this.put(`/lesson-plans/${id}`, data);
    }

    async deleteLessonPlan(id: string): Promise<void> {
        await this.delete(`/lesson-plans/${id}`);
    }

    async getLessonNotes(classId: string, schoolId: string): Promise<any[]> {
        return this.get(`/lesson-plans?classId=${classId}&schoolId=${schoolId}`);
    }

    // ============================================
    // TRANSPORT
    // ============================================
    async getTransportRoutes(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            return await this.get(`/transport/routes?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async createTransportRoute(data: any): Promise<any> {
        return this.post('/transport/routes', data);
    }

    async updateTransportRoute(id: string, data: any): Promise<any> {
        return this.put(`/transport/routes/${id}`, data);
    }

    async deleteTransportRoute(id: string): Promise<void> {
        await this.delete(`/transport/routes/${id}`);
    }

    // Bus Management
    async getBuses(schoolId?: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        try {
            return await this.get(`/buses${query}`);
        } catch (err) {
            return [];
        }
    }

    async createBus(data: any): Promise<any> {
        return this.post('/buses', data);
    }

    async updateBus(id: string, data: any): Promise<any> {
        return this.put(`/buses/${id}`, data);
    }

    async deleteBus(id: string): Promise<void> {
        await this.delete(`/buses/${id}`);
    }

    // Stops & Assignments
    async getTransportStops(routeId?: string): Promise<any[]> {
        const url = routeId ? `/transport/stops?routeId=${routeId}` : '/transport/stops';
        try {
            const result = await this.get<any>(url);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async createTransportStop(data: any): Promise<any> {
        return this.post('/transport/stops', data);
    }

    async deleteTransportStop(id: string): Promise<void> {
        await this.delete(`/transport/stops/${id}`);
    }
    async getAssets(): Promise<any[]> {
        try {
            const result = await this.get<any>('/infrastructure/assets');
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async createAsset(data: any): Promise<any> {
        return this.post('/infrastructure/assets', data);
    }

    async updateAsset(id: string, data: any): Promise<any> {
        return this.put(`/infrastructure/assets/${id}`, data);
    }

    async deleteAsset(id: string): Promise<any> {
        return this.delete(`/infrastructure/assets/${id}`);
    }

    // Equipment Aliases (Same as Assets)
    async getEquipment(schoolId?: string): Promise<any[]> {
        return this.getAssets();
    }

    async createEquipment(data: any): Promise<any> {
        return this.createAsset(data);
    }

    async updateEquipment(id: string, data: any): Promise<any> {
        return this.updateAsset(id, data);
    }

    async deleteEquipment(id: string): Promise<any> {
        return this.deleteAsset(id);
    }

    async getFacilities(): Promise<any[]> {
        try {
            const result = await this.get<any>('/infrastructure/facilities');
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async createFacility(data: any): Promise<any> {
        return this.post('/infrastructure/facilities', data);
    }

    async updateFacility(id: string, data: any): Promise<any> {
        return this.put(`/infrastructure/facilities/${id}`, data);
    }

    async deleteFacility(id: string): Promise<any> {
        return this.delete(`/infrastructure/facilities/${id}`);
    }

    async getVisitorLogs(): Promise<any[]> {
        const result = await this.get<any>('/infrastructure/visitor-logs');
        return result.data || result || [];
    }

    async createVisitorLog(data: any): Promise<any> {
        return this.post('/infrastructure/visitor-logs', data);
    }

    async updateVisitorLog(id: string, data: any): Promise<any> {
        return this.put(`/infrastructure/visitor-logs/${id}`, data);
    }

    async deleteVisitorLog(id: string): Promise<any> {
        return this.delete(`/infrastructure/visitor-logs/${id}`);
    }

    async getSchoolDocuments(schoolId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('school_id', schoolId);
        try {
            const result = await this.get<any>(`/infrastructure/documents?${queryParams.toString()}`);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async getTransportAssignments(schoolId?: string): Promise<any[]> {
        const url = schoolId ? `/transport/assignments?schoolId=${schoolId}` : '/transport/assignments';
        try {
            const result = await this.get<any>(url);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async createTransportAssignment(data: any): Promise<any> {
        return this.post('/transport/assignments', data);
    }

    async deleteTransportAssignment(id: string): Promise<void> {
        await this.delete(`/transport/assignments/${id}`);
    }

    // ============================================
    // HOSTELS
    // ============================================
    async getHostels(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            const result = await this.get<any>(`/hostels?${queryParams.toString()}`);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async createHostel(data: any): Promise<any> {
        return this.post('/hostels', data);
    }

    async updateHostel(id: string, data: any): Promise<any> {
        return this.put(`/hostels/${id}`, data);
    }

    async getPhotos(schoolId: string): Promise<any[]> {
        try {
            const result = await this.get<any>(`/schools/${schoolId}/photos`);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async getSchoolPolicies(schoolId: string): Promise<any[]> {
        try {
            const result = await this.get<any>(`/schools/${schoolId}/policies`);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async deleteHostel(id: string): Promise<any> {
        return this.delete(`/hostels/${id}`);
    }

    // ============================================
    // COMPLAINTS
    // ============================================
    async getAdminComplaints(schoolId: string): Promise<any[]> {
        try {
            return await this.get(`/complaints?schoolId=${schoolId}`);
        } catch (err) {
            return [];
        }
    }

    // ============================================
    // LEARNING RESOURCES
    // ============================================
    async getLearningResources(schoolId?: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        
        try {
            const result = await this.get<any>(`/resources?${queryParams.toString()}`);
            return result.data || result || [];
        } catch (err) {
            // Fallback for parent dashboard if /resources fails
            return this.fetch('/academic-policies/learning-resources');
        }
    }


    async createLearningResource(data: any): Promise<any> {
        return this.post('/resources', data);
    }

    async deleteLearningResource(id: string): Promise<void> {
        await this.delete(`/resources/${id}`);
    }

    async getSharedResources(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}&shared=true` : '?shared=true';
        return this.get(`/resources${query}`);
    }

    async getResourceById(id: string): Promise<any> {
        return this.get(`/resources/${id}`);
    }

    async getRelatedResources(id: string): Promise<any[]> {
        return this.get(`/resources/${id}/related`);
    }

    async createResource(data: any): Promise<any> {
        return this.post('/resources', data);
    }


    async getNotificationSettings(): Promise<any> {
        return this.get('/notifications/settings');
    }

    async updateNotificationSettings(settings: any): Promise<any> {
        return this.put('/notifications/settings', settings);
    }

    async getLoginHistory(): Promise<any[]> {
        try {
            const result = await this.get<any>('/auth/login-history');
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async getHostelRooms(hostelId?: string): Promise<any[]> {
        const url = hostelId ? `/hostels/rooms?hostelId=${hostelId}` : '/hostels/rooms';
        try {
            const result = await this.get<any>(url);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async createHostelRoom(data: any): Promise<any> {
        return this.post('/hostels/rooms', data);
    }

    async deleteHostelRoom(id: string): Promise<any> {
        return this.delete(`/hostels/rooms/${id}`);
    }

    async getHostelAllocations(schoolId?: string): Promise<any[]> {
        const url = schoolId ? `/hostels/allocations?schoolId=${schoolId}` : '/hostels/allocations';
        try {
            const result = await this.get<any>(url);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async createHostelAllocation(data: any): Promise<any> {
        return this.post('/hostels/allocations', data);
    }

    async deleteHostelAllocation(id: string): Promise<any> {
        return this.delete(`/hostels/allocations/${id}`);
    }

    async getHostelVisitorLogs(schoolId?: string): Promise<any[]> {
        const url = schoolId ? `/hostels/visitors?schoolId=${schoolId}` : '/hostels/visitors';
        try {
            const result = await this.get<any>(url);
            return result.data || result || [];
        } catch (err) {
            return [];
        }
    }

    async createHostelVisitorLog(data: any): Promise<any> {
        return this.post('/hostels/visitor-logs', data);
    }

    async deleteHostelVisitorLog(id: string): Promise<any> {
        return this.delete(`/hostels/visitor-logs/${id}`);
    }

    // Health logs moved to Health & Safety section below


    // ============================================
    // CHAT & MESSAGING
    // ============================================
    async getChatContacts(schoolId: string, studentId?: string): Promise<any> {
        return this.get(`/chat/contacts?schoolId=${schoolId}${studentId ? `&studentId=${studentId}` : ''}`);
    }

    async getChatRooms(): Promise<any[]> {
        return this.get('/chat/rooms');
    }

    async getConversations(userId?: string, schoolId?: string, branchId?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (schoolId) params.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') params.append('branchId', branchId);
        
        const qs = params.toString();
        return this.get(`/conversations${qs ? `?${qs}` : ''}`);
    }

    async getForumData(): Promise<any> {
        return this.get('/forum/data');
    }

    async getChatRoomMessages(roomId: string | number): Promise<any[]> {
        return this.get(`/chat/rooms/${roomId}/messages`);
    }

    async getMessages(roomId: string | number): Promise<any[]> {
        return this.getChatRoomMessages(roomId);
    }

    async sendChatMessage(roomId: string, content: string, type: string = 'text'): Promise<any> {
        return this.post(`/chat/rooms/${roomId}/messages`, { content, type });
    }

    async getOrCreateDirectChat(targetUserId: string, schoolId: string): Promise<any> {
        return this.post('/chat/direct', { targetUserId, schoolId });
    }

    async sendMessage(data: any): Promise<any> {
        const roomId = data.conversation_id || data.roomId;
        const payload = {
            content: data.content,
            type: data.type || 'text',
            mediaUrl: data.media_url || data.mediaUrl
        };
        return this.post(`/chat/rooms/${roomId}/messages`, payload);
    }

    // ============================================
    // EVENTS & CALENDAR
    // ============================================
    async getEvents(schoolId?: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            return await this.get(`/calendar?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async createEvent(data: any): Promise<any> {
        return this.post('/calendar', data);
    }

    async updateEvent(id: string, data: any): Promise<any> {
        return this.put(`/calendar/${id}`, data);
    }

    async rsvpToEvent(eventId: string, status: string): Promise<any> {
        return this.post('/calendar/rsvp', { eventId, status });
    }

    // getCalendarEvents is an alias for getEvents for backward compatibility
    async getCalendarEvents(schoolId?: string, branchId?: string): Promise<any[]> {
        return this.getEvents(schoolId, branchId);
    }

    async getPDCalendarEvents(): Promise<any[]> {
        return this.get('/calendar?category=ProfessionalDevelopment');
    }

    async getTeacherRecognitions(): Promise<any[]> {
        return this.get('/teachers/me/recognitions');
    }

    async getMyStudentsWithCredentials(): Promise<any[]> {
        return this.get('/teachers/me/students');
    }

    async getSubstituteRequests(teacherId?: string): Promise<any[]> {
        const query = teacherId ? `?teacherId=${teacherId}` : '';
        return this.get(`/teachers/me/substitutes${query}`);
    }

    // ============================================
    // FORUM & COMMUNITY
    // ============================================
    async getForumTopics(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        return this.get(`/forum/topics?${queryParams.toString()}`);
    }

    async createForumTopic(data: any): Promise<any> {
        return this.post('/forum/topics', data);
    }

    async getForumPosts(topicId: string): Promise<any[]> {
        return this.get(`/forum/topics/${topicId}/posts`);
    }

    async createForumPost(data: any): Promise<any> {
        return this.post('/forum/posts', data);
    }

    async getCommunityResources(...args: any[]): Promise<any[]> {
        return [];
    }

    async getDonationCampaigns(...args: any[]): Promise<any[]> {
        return [];
    }

    async getTopDonors(...args: any[]): Promise<any[]> {
        return [];
    }

    async processDonation(...args: any[]): Promise<any> {
        return {};
    }

    // ============================================
    // GALLERY & MEDIA
    // ============================================
    async getGalleryPhotos(): Promise<any[]> {
        try {
            return await this.get('/gallery');
        } catch (err) {
            return [];
        }
    }

    async addGalleryPhoto(data: any): Promise<any> {
        return this.post('/gallery', data);
    }

    async uploadFile(fileOrBucket: File | string, pathOrFile?: string | File, file?: File): Promise<{ publicUrl: string } | { url: string }> {
        const formData = new FormData();
        if (fileOrBucket instanceof File) {
            formData.append('file', fileOrBucket);
            formData.append('category', 'general');
            return this.post('/media/upload', formData);
        } else {
            const actualFile = file || (pathOrFile instanceof File ? pathOrFile : null);
            if (actualFile) {
                formData.append('bucket', fileOrBucket);
                if (typeof pathOrFile === 'string') formData.append('path', pathOrFile);
                formData.append('file', actualFile);
            }
            const result = await this.post<{ publicUrl: string }>('/media/upload', formData);
            return result;
        }
    }

    // ============================================
    // GAMES & EDUCATIONAL
    // ============================================
    async getGames(): Promise<any[]> {
        try {
            return await this.get('/games');
        } catch (err) {
            return [];
        }
    }

    // ============================================
    // BEHAVIOR & DISCIPLINE
    // ============================================
    async getBehaviorNotesBySchool(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            return await this.get(`/behavior/notes?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async getBehaviorNotes(idOrSchoolId: string, branchId?: string): Promise<any[]> {
        // Simple heuristic: if branchId is provided, it's school-level. 
        // If only one arg and it looks like a schoolId (longer or specifically from school context), use school.
        // Actually, let's just use the specific ones in services and keep an alias here.
        if (branchId) return this.getBehaviorNotesBySchool(idOrSchoolId, branchId);
        return this.getBehaviorNotesByStudent(idOrSchoolId);
    }

    async createBehaviorNote(data: any): Promise<any> {
        return this.post('/behavior/notes', data);
    }

    async deleteBehaviorNote(id: string): Promise<void> {
        await this.delete(`/behavior/notes/${id}`);
    }

    // ============================================
    // AUDIT LOGS
    // ============================================
    async getAuditLogs(schoolId?: string, limit: number = 50, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ limit: limit.toString() });
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            return await this.get(`/audit/logs?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    // ============================================
    // LEAVE MANAGEMENT
    // ============================================
    async getLeaveRequests(schoolId: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams({ schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        try {
            return await this.get(`/teachers/leave-requests?${queryParams.toString()}`);
        } catch (err) {
            return [];
        }
    }

    async getLeaveTypes(schoolId: string): Promise<any[]> {
        return this.get(`/teachers/leave-types?schoolId=${schoolId}`);
    }

    async createLeaveRequest(data: any): Promise<any> {
        return this.post('/teachers/leave-requests', data);
    }

    async approveLeaveRequest(id: string, status: string): Promise<any> {
        return this.put(`/teachers/leave-requests/${id}`, { status });
    }

    // ============================================
    // VIRTUAL CLASSES
    // ============================================
    async getVirtualClasses(schoolId: string): Promise<any[]> {
        try {
            return await this.get(`/virtual-classes?schoolId=${schoolId}`);
        } catch (err) {
            return [];
        }
    }

    async createVirtualClass(data: any): Promise<any> {
        return this.post('/virtual-classes', data);
    }

    // EMERGENCY & SAFETY moved to HEALTH & SAFETY section at the end of the file

    // ============================================
    // SCHOOL SETTINGS & POLICIES
    // ============================================
    // getSchoolPolicies is already implemented above (line 1341)

    async getAcademicSettings(schoolId: string): Promise<any> {
        try {
            return await this.get(`/schools/${schoolId}/academic-settings`);
        } catch (err) {
            return {};
        }
    }

    async updateAcademicSettings(schoolId: string, data: any): Promise<any> {
        return this.put(`/schools/${schoolId}/academic-settings`, data);
    }

    async updateSchool(schoolId: string, data: any): Promise<any> {
        return this.put(`/schools/${schoolId}`, data);
    }

    async getSchoolById(schoolId: string): Promise<any> {
        return this.get(`/schools/${schoolId}`);
    }

    // ============================================
    // SCHOLARSHIPS
    // ============================================
    async getScholarships(schoolId: string): Promise<any[]> {
        try {
            return await this.get(`/scholarships?schoolId=${schoolId}`);
        } catch (err) {
            return [];
        }
    }

    async createScholarship(data: any): Promise<any> {
        return this.post('/scholarships', data);
    }

    // ============================================
    // SAVINGS PLANS
    // ============================================
    async getSavingsPlans(): Promise<any[]> {
        return this.get('/parents/savings/plans');
    }

    async createSavingsPlan(data: any): Promise<any> {
        return this.post('/parents/savings/plans', data);
    }

    async depositToSavingsPlan(planId: string, amount: number): Promise<any> {
        return this.post('/parents/savings/plans/deposit', { planId, amount });
    }

    // ============================================
    // SUPPORT
    // ============================================
    async createSupportTicket(ticketData: any): Promise<any> {
        return this.post('/support/tickets', ticketData);
    }

    // ============================================
    // PD (PROFESSIONAL DEVELOPMENT)
    // ============================================
    async getPDCourses(schoolId: string): Promise<any[]> {
        try {
            return await this.get(`/pd/courses?schoolId=${schoolId}`);
        } catch (err) {
            return [];
        }
    }

    async getPDResources(): Promise<any[]> {
        return this.get('/pd/courses');
    }

    async getCourses(...args: any[]): Promise<any[]> {
        return this.get('/pd/courses');
    }

    async getMyPDCourses(): Promise<any[]> {
        return this.get('/pd/courses/me');
    }

    async getCourseById(id: string): Promise<any> {
        return this.get(`/pd/courses/${id}`);
    }

    async enrollInCourse(courseId: string): Promise<any> {
        return this.post(`/pd/courses/${courseId}/enroll`, {});
    }

    async updateCourseProgress(courseId: string, data: any): Promise<any> {
        return this.put(`/pd/courses/${courseId}/progress`, data);
    }

    // ============================================
    // MEDIA & UPLOAD
    // ============================================
    async uploadFileWithCategory(file: File, category: string = 'general'): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        return this.post('/media/upload', formData);
    }

    async uploadAvatar(file: File): Promise<{ url: string }> {
        return this.uploadFileWithCategory(file, 'avatar');
    }

    // ============================================
    // INSPECTOR DASHBOARD
    // ============================================
    async getInspectionTemplate(type: string): Promise<InspectionTemplate> {
        return this.get<InspectionTemplate>(`/inspections/templates/${type}`);
    }

    async submitInspectionFull(payload: any): Promise<any> {
        return this.post<any>('/inspections/submit', payload);
    }

    async getInspections(schoolId: string): Promise<any[]> {
        return this.get(`/inspections/school/${schoolId}`);
    }

    async getInspectionById(id: string): Promise<any> {
        return this.get(`/inspections/${id}`);
    }

    async createInspection(data: any): Promise<any> {
        return this.post('/inspections/submit', data);
    }

    async updateInspection(id: string, data: any): Promise<any> {
        return this.put(`/inspections/${id}`, data);
    }

    async submitInspectionResponses(id: string, responses: any): Promise<any> {
        return this.post(`/inspections/${id}/responses`, responses);
    }

    async getInspectorById(id: string): Promise<any> {
        return this.get(`/inspections/inspectors/${id}`);
    }

    async getInspectionsByInspectorId(inspectorId: string): Promise<any[]> {
        return this.get(`/inspections/inspector/${inspectorId}`);
    }

    // ============================================
    // CONFERENCES & COUNSELING
    // ============================================
    async getConferences(filters: any = {}): Promise<any[]> {
        const queryParams = new URLSearchParams(filters);
        return this.get(`/conferences?${queryParams.toString()}`);
    }

    async scheduleConference(data: any): Promise<any> {
        return this.post('/conferences', data);
    }

    async updateConferenceStatus(id: string, status: string, notes?: string): Promise<any> {
        return this.patch(`/conferences/${id}/status`, { status, teacher_notes: notes });
    }

    async setTeacherAvailability(teacherId: string, schoolId: string, slots: any[]): Promise<any> {
        return this.post(`/conferences/teachers/${teacherId}/availability`, { school_id: schoolId, slots });
    }

    async getCounselingAppointments(filters: any = {}): Promise<any[]> {
        const queryParams = new URLSearchParams(filters);
        return this.get(`/counseling?${queryParams.toString()}`);
    }

    async bookCounseling(data: any): Promise<any> {
        return this.post('/counseling', data);
    }

    async updateCounselingStatus(id: string, status: string, confirmedDate?: string): Promise<any> {
        return this.patch(`/counseling/${id}/status`, { status, confirmed_date: confirmedDate });
    }

    // ============================================
    // UTILS
    // ============================================
    clearCache(): void {
        this.cache.clear();
    }

    async checkBackendHealth(): Promise<{ backend: boolean }> {
        try {
            const resp = await fetch(`${this.baseUrl}/health`);
            return { backend: resp.ok };
        } catch {
            return { backend: false };
        }
    }

    // ================= ==========================
    // STUDENT PORTAL (Methods moved to appropriate sections above)
    // ============================================



    // ============================================
    // ADMIN / CONTENT MANAGEMENT
    // ============================================
    async getPolicies(): Promise<any[]> {
        const result = await this.get<any>('/academic-policies/policies');
        return result.data || [];
    }

    async createPolicy(data: any): Promise<any> {
        return this.post('/academic-policies/policies', data);
    }

    async deletePolicy(id: string): Promise<any> {
        return this.delete(`/academic-policies/policies/${id}`);
    }

    async getPermissionSlips(schoolId?: string): Promise<any[]> {
        const result = await this.get<any>(`/academic-policies/permission-slips${schoolId ? `?schoolId=${schoolId}` : ''}`);
        return result.data || [];
    }

    async createPermissionSlip(data: any): Promise<any> {
        return this.post('/academic-policies/permission-slips', data);
    }

    async updatePermissionSlip(id: string, data: any): Promise<any> {
        return this.patch(`/academic-policies/permission-slips/${id}`, data);
    }

    async updatePermissionSlipStatus(id: string, status: string): Promise<any> {
        return this.patch(`/academic-policies/permission-slips/${id}/status`, { status });
    }



    async bulkCreatePermissionSlips(slips: any[]): Promise<any> {
        return this.post('/academic-policies/permission-slips/bulk', { slips });
    }

    async deletePermissionSlip(id: string): Promise<any> {
        return this.delete(`/academic-policies/permission-slips/${id}`);
    }


    async getMentalHealthResources(schoolId: string): Promise<any[]> {
        try {
            return await this.get(`/community/mental-health?schoolId=${schoolId}`);
        } catch (err) {
            return [];
        }
    }

    async getCrisisHelplines(schoolId: string): Promise<any[]> {
        try {
            return await this.get(`/community/helplines?schoolId=${schoolId}`);
        } catch (err) {
            return [];
        }
    }

    async incrementResourceViewCount(resourceId: string): Promise<any> {
        return this.post(`/community/mental-health/${resourceId}/view`, {});
    }

    async globalSearch(term: string, schoolId: string, branchId?: string): Promise<any> {
        const queryParams = new URLSearchParams({ term, schoolId });
        if (branchId && branchId !== 'all') queryParams.append('branchId', branchId);
        return this.get(`/dashboard/search?${queryParams.toString()}`);
    }

    async createVolunteeringOpportunity(data: any): Promise<any> {
        return this.post('/community/volunteering', data);
    }

    async deleteVolunteeringOpportunity(id: string): Promise<any> {
        return this.delete(`/community/volunteering/opportunities/${id}`);
    }


    async createDocument(data: any): Promise<any> {
        return this.post('/infrastructure/documents', data);
    }

    async createSchoolDocument(data: any): Promise<any> {
        return this.createDocument(data);
    }

    async getPTAMeetings(): Promise<any[]> {
        const result = await this.get<any>('/community/pta-meetings');
        return result.data || [];
    }

    async createPTAMeeting(data: any): Promise<any> {
        return this.post('/community/pta-meetings', data);
    }

    async deletePTAMeeting(id: string): Promise<any> {
        return this.delete(`/community/pta-meetings/${id}`);
    }

    // ============================================
    // PILOT ONBOARDING
    // ============================================

    async getPilotOnboarding(): Promise<any> {
        return this.get('/schools/pilot-onboarding');
    }

    async savePilotProgress(payload: {
        name?: string;
        lga?: string;
        curriculum_type?: string;
        infrastructure_config?: { facilities: string[] };
        onboarding_step?: number;
        is_onboarded?: boolean;
    }): Promise<any> {
        return this.put('/schools/pilot-onboarding', payload);
    }

    // ============================================
    // EMERGENCY BROADCAST
    // ============================================

    async sendEmergencyBroadcast(payload: {
        title: string;
        message: string;
        urgency: 'high' | 'emergency';
        targetAudience: string[];
    }): Promise<any> {
        return this.post('/emergency/broadcast', payload);
    }

    async getEmergencyHistory(limit = 20): Promise<any[]> {
        return this.get(`/emergency/history?limit=${limit}`);
    }

    // ============================================
    // BACKUP & RESTORE
    // ============================================
    async getBackups(): Promise<any[]> {
        const result = await this.get<any>('/infrastructure/backups');
        return result.data || result || [];
    }

    async createBackup(): Promise<any> {
        return this.post('/infrastructure/backups', {});
    }

    async restoreBackup(id: string): Promise<any> {
        return this.post(`/infrastructure/backups/${id}/restore`, {});
    }

    async deleteBackup(id: string): Promise<any> {
        return this.delete(`/infrastructure/backups/${id}`);
    }

    // ============================================
    // SAVED REPORTS
    // ============================================
    async getSavedReports(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/reports/saved${query}`);
    }

    async createSavedReport(data: any, schoolId?: string): Promise<any> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.post(`/admin-hub/reports/saved${query}`, data);
    }

    async deleteSavedReport(id: string, schoolId?: string): Promise<any> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.delete(`/admin-hub/reports/saved/${id}${query}`);
    }

    // ============================================
    // SESSIONS
    // ============================================
    async getSessions(): Promise<any[]> {
        return this.get('/admin-hub/sessions');
    }

    async revokeSession(sessionId: string): Promise<any> {
        return this.delete(`/admin-hub/sessions/${sessionId}`);
    }

    async revokeAllSessions(): Promise<any> {
        return this.delete('/admin-hub/sessions/revoke/all');
    }

    // ============================================
    // DATA PRIVACY (NDPR)
    // ============================================
    async getDataRequests(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/data-requests${query}`);
    }

    async createDataRequest(data: any, schoolId?: string, branchId?: string): Promise<any> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId) queryParams.append('branchId', branchId);
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return this.post(`/admin-hub/data-requests${query}`, data);
    }

    async updateDataRequestStatus(id: string, status: string): Promise<any> {
        return this.patch(`/admin-hub/data-requests/${id}`, { status });
    }

    // ============================================
    // INVOICES
    // ============================================
    async getInvoices(schoolId?: string, branchId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId) queryParams.append('branchId', branchId);
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return this.get(`/admin-hub/invoices${query}`);
    }

    async createInvoice(data: any, schoolId?: string, branchId?: string): Promise<any> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId) queryParams.append('branchId', branchId);
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return this.post(`/admin-hub/invoices${query}`, data);
    }

    async updateInvoiceStatus(id: string, status: string): Promise<any> {
        return this.patch(`/admin-hub/invoices/${id}`, { status });
    }

    // ============================================
    // CONFIG & ANALYTICS
    // ============================================
    async getLateArrivalConfig(schoolId?: string): Promise<any> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/config${query}`);
    }

    async updateLateArrivalConfig(data: any, schoolId?: string): Promise<any> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.patch(`/admin-hub/config${query}`, data);
    }

    async getEnrollmentTrends(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/analytics/enrollment-trends${query}`);
    }

    // ============================================
    // PARENTAL CONSENT
    // ============================================
    async getConsents(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/consents${query}`);
    }

    async updateConsentStatus(id: string, status: string): Promise<any> {
        return this.patch(`/admin-hub/consents/${id}`, { status });
    }

    // ============================================
    // NOTIFICATION SETTINGS (ADMIN)
    // ============================================
    async getAdminNotificationSettings(): Promise<any> {
        return this.get('/admin-hub/notifications/settings');
    }

    async updateAdminNotificationSettings(data: any): Promise<any> {
        return this.patch('/admin-hub/notifications/settings', data);
    }

    // ============================================
    // KANBAN BOARD
    // ============================================
    async getKanbanBoard(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/kanban${query}`);
    }

    async createKanbanTask(data: any): Promise<any> {
        return this.post('/admin-hub/kanban/tasks', data);
    }

    async moveKanbanTask(taskId: string, targetColumnId: string): Promise<any> {
        return this.patch(`/admin-hub/kanban/tasks/${taskId}`, { targetColumnId });
    }

    async deleteKanbanTask(taskId: string): Promise<any> {
        return this.delete(`/admin-hub/kanban/tasks/${taskId}`);
    }

    // ============================================
    // HEALTH & SAFETY
    // ============================================
    async getHealthLogs(schoolId?: string, studentId?: string): Promise<any[]> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (studentId) queryParams.append('studentId', studentId);
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return this.get(`/admin-hub/health-logs${query}`);
    }

    async createHealthLog(data: any, schoolId?: string): Promise<any> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.post(`/admin-hub/health-logs${query}`, data);
    }

    async getEmergencyAlerts(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/safety/alerts${query}`);
    }

    async createEmergencyAlert(data: any, schoolId?: string): Promise<any> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.post(`/admin-hub/safety/alerts${query}`, data);
    }

    async getHealthIncidents(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/safety/incidents${query}`);
    }

    async createHealthIncident(data: any, schoolId?: string): Promise<any> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.post(`/admin-hub/safety/incidents${query}`, data);
    }

    async getEmergencyDrills(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/safety/drills${query}`);
    }

    async createEmergencyDrill(data: any, schoolId?: string): Promise<any> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.post(`/admin-hub/safety/drills${query}`, data);
    }

    async getSafeguardingPolicies(schoolId?: string): Promise<any[]> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.get(`/admin-hub/safety/policies${query}`);
    }

    async createSafeguardingPolicy(data: any, schoolId?: string): Promise<any> {
        const query = schoolId ? `?schoolId=${schoolId}` : '';
        return this.post(`/admin-hub/safety/policies${query}`, data);
    }

    async updateHealthLog(id: string, data: any): Promise<any> {
        return this.patch(`/admin-hub/health-logs/${id}`, data);
    }

    async updateEmergencyAlert(id: string, data: any): Promise<any> {
        return this.patch(`/admin-hub/safety/alerts/${id}`, data);
    }

    async updateHealthIncident(id: string, data: any): Promise<any> {
        return this.patch(`/admin-hub/safety/incidents/${id}`, data);
    }

    async updateSafeguardingPolicy(id: string, data: any): Promise<any> {
        return this.patch(`/admin-hub/safety/policies/${id}`, data);
    }

    // ============================================
    // GOVERNANCE & COMPLIANCE
    // ============================================
    async getGovernanceStats(schoolId: string): Promise<any> {
        return this.get(`/admin-hub/governance/stats?schoolId=${schoolId}`);
    }

    async getComplianceMetrics(schoolId: string): Promise<any> {
        return this.get(`/admin-hub/governance/compliance-metrics?schoolId=${schoolId}`);
    }

    async getValidationAuditCount(schoolId: string): Promise<any> {
        return this.get(`/admin-hub/governance/audit-count?schoolId=${schoolId}`);
    }

    get functions() {
        return {
            invoke: async (functionName: string, options?: { body: any, headers?: any }): Promise<{ data: any; error: any }> => {
                try {
                    const data = await this.post(`/functions/${functionName}`, options?.body || {});
                    return { data, error: null };
                } catch (error: any) {
                    return { data: null, error };
                }
            }
        };
    }

    get auth() {
        return {
            signUp: async (data: any) => {
                try {
                    const res = await this.post('/auth/signup', data);
                    return { data: res, error: null };
                } catch (error: any) {
                    return { data: null, error };
                }
            },
            signInWithPassword: async (data: any) => {
                try {
                    const res = await this.login(data);
                    return { data: res, error: null };
                } catch (error: any) {
                    return { data: null, error };
                }
            },
            signOut: async () => {
                await this.logout();
                return { error: null };
            },
            getUser: async () => {
                try {
                    const user = await this.getMe();
                    return { data: { user }, error: null };
                } catch (error: any) {
                    return { data: { user: null }, error };
                }
            }
        };
    }

    async rpc(name: string, params: any = {}) {
        try {
            const data = await this.post(`/rpc/${name}`, params);
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    }

    // ============================================
    // ANALYTICS
    // ============================================
    async getAcademicAnalytics(schoolId: string, branchId?: string, term?: string, classId?: string | number): Promise<any> {
        const queryParams = new URLSearchParams();
        if (schoolId) queryParams.append('schoolId', schoolId);
        if (branchId) queryParams.append('branchId', branchId);
        if (term) queryParams.append('term', term);
        if (classId) queryParams.append('classId', String(classId));
        return this.get(`/academic/analytics?${queryParams.toString()}`);
    }

    async getSaaSAnalyticsOverview(): Promise<any> {
        return this.get('/saas-analytics/overview');
    }

    async getSaaSAnalyticsCharts(): Promise<any> {
        return this.get('/saas-analytics/charts');
    }

    /**
     * REST-backed Compatibility Shim for Supabase-style query builder
     */
    from(table: string) {
        const endpoint = `/${table.replace(/_/g, '-')}`;
        const queryParams = new URLSearchParams();
        
        const builder = {
            select: (columns: string = '*') => {
                if (columns !== '*') queryParams.append('columns', columns);
                return builder;
            },
            eq: (column: string, value: any) => {
                queryParams.append(column, String(value));
                return builder;
            },
            ilike: (column: string, pattern: string) => {
                queryParams.append(column, `ilike:${pattern}`);
                return builder;
            },
            not: (column: string, op: string, value: any) => {
                queryParams.append(column, `not:${op}:${value}`);
                return builder;
            },
            or: (pattern: string) => {
                queryParams.append('or', pattern);
                return builder;
            },
            order: (column: string, { ascending = true } = {}) => {
                queryParams.append('order', `${column}:${ascending ? 'asc' : 'desc'}`);
                return builder;
            },
            limit: (count: number) => {
                queryParams.append('limit', String(count));
                return builder;
            },
            single: () => {
                queryParams.append('single', 'true');
                return builder;
            },
            maybeSingle: () => {
                queryParams.append('single', 'true');
                queryParams.append('maybe', 'true');
                return builder;
            },
            
            // Execution Methods
            then: async (onfulfilled?: (value: { data: any; error: any }) => any) => {
                try {
                    const url = `${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
                    const data = await this.get(url);
                    const result = { data, error: null };
                    return onfulfilled ? onfulfilled(result) : result;
                } catch (error: any) {
                    const result = { data: null, error };
                    return onfulfilled ? onfulfilled(result) : result;
                }
            },

            // Mutations
            insert: async (data: any) => {
                try {
                    const res = await this.post(endpoint, data);
                    return { data: res, error: null };
                } catch (error: any) {
                    return { data: null, error };
                }
            },
            update: async (data: any) => {
                try {
                    // Update usually requires filters in the chain. 
                    // For simplicity, we assume .eq('id', ...) was called and extracted to queryParams
                    const id = queryParams.get('id');
                    const url = id ? `${endpoint}/${id}` : endpoint;
                    const res = await this.put(url, data);
                    return { data: res, error: null };
                } catch (error: any) {
                    return { data: null, error };
                }
            },
            upsert: async (data: any) => {
                try {
                    const res = await this.post(`${endpoint}/upsert`, data);
                    return { data: res, error: null };
                } catch (error: any) {
                    return { data: null, error };
                }
            },
            delete: async () => {
                try {
                    const id = queryParams.get('id');
                    const url = id ? `${endpoint}/${id}` : endpoint;
                    const res = await this.delete(url);
                    return { data: res, error: null };
                } catch (error: any) {
                    return { data: null, error };
                }
            }
        };

        return builder as any;
    }

    // ============================================
    // SYNC ENGINE COMPATIBILITY ALIASES
    // ============================================

    async recordStudentPayment(data: any): Promise<any> {
        return this.recordPayment(data);
    }

    async createLessonNote(data: any): Promise<any> {
        return this.createLessonPlan(data);
    }
}

// Export the client as both named and default exports for full compatibility
export const api = new ExpressApiClient();
export const HybridApiClient = ExpressApiClient;
export default api;