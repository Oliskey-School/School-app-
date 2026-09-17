import { apiCore } from './core';

/**
 * The only domain API calls reachable from the eager (pre-first-paint) import
 * graph: auth/session restore, branch + profile bootstrap, version check, and
 * the four mutations the offline sync engine replays. Bodies are copied
 * verbatim from lib/api.ts's corresponding methods and call the SAME shared
 * apiCore singleton, so behaviour and state are identical.
 *
 * Anything a lazy-loaded screen needs stays on `api` in lib/api.ts.
 */

export async function getMe(): Promise<any> {
    return apiCore.get('/auth/me');
}

export async function getMemberships(userId: string): Promise<any[]> {
    return apiCore.get(`/auth/memberships/${userId}`);
}

export async function switchSchool(userId: string, schoolId: string): Promise<any> {
    return apiCore.post('/auth/switch-school', { userId, schoolId });
}

export async function demoLogin(role: string): Promise<any> {
    apiCore.clearCsrfToken();
    // The backend deliberately never seeds a demo sandbox inline on a login
    // request (that used to make a cold login take seconds and let
    // concurrent first-time visitors stampede the DB) — instead it seeds in
    // the background at server startup and, if a login lands before that
    // finishes, throws a 503 with an explicit "try again in a few seconds"
    // message (see AuthService.generateDemoToken). fetch()'s error handling
    // discards the HTTP status and rethrows a plain Error with just the
    // message (see the `throw new Error(errorMessage)` in this class'
    // request handler), so this is matched by that exact, stable message
    // text rather than a status code. Without this retry, ANY visitor
    // arriving in that window — a real user right after a deploy/restart
    // just as much as this app's own CI, which seeds a genuinely fresh
    // database every run — got a bare "Demo login failed" with no
    // recovery, because the UI never retried at all.
    const maxAttempts = 6;
    const retryDelayMs = 3000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await apiCore.post<any>('/auth/demo/login', { role });
            if (result.token) sessionStorage.setItem('auth_token', result.token);
            if (result.refreshToken) sessionStorage.setItem('auth_refresh_token', result.refreshToken);
            return result;
        } catch (err: any) {
            const isWarmingUp = /warming up/i.test(err?.message || '');
            if (!isWarmingUp || attempt === maxAttempts) throw err;
            console.log(`[API] Demo sandbox still seeding, retrying demo login (attempt ${attempt}/${maxAttempts})...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
    }
}

export async function googleLogin(credential: string): Promise<any> {
    apiCore.clearCsrfToken();
    // The raw signed ID token is sent as-is — the backend verifies it against
    // Google directly. We never send a locally-decoded email/name, since that
    // would let anyone claim to be any user with a plain API call.
    const result = await apiCore.post<any>('/auth/google-login', { credential });
    if (result.token) sessionStorage.setItem('auth_token', result.token);
    if (result.refreshToken) sessionStorage.setItem('auth_refresh_token', result.refreshToken);
    return result;
}

export async function forgotPassword(email: string): Promise<any> {
    return apiCore.post('/auth/forgot-password', { email });
}

export async function resetPassword(data: any): Promise<any> {
    return apiCore.post('/auth/reset-password', data);
}

export async function getSchoolById(schoolId: string): Promise<any> {
    return apiCore.get(`/schools/${schoolId}`);
}

export async function getActiveBranchId(): Promise<{ school_generated_id: string; branch_id: string | null; is_main_admin?: boolean }> {
    // NOT under /auth â€” the client strips the branch header from /auth/* calls.
    return apiCore.get('/active-branch-id');
}

export async function getAuthorizedBranches(): Promise<any[]> {
    try {
        return await apiCore.get('/branches/authorized');
    } catch (err) {
        console.warn('[API] getAuthorizedBranches failed:', err);
        return [];
    }
}

export async function updateMyProfile(data: { full_name?: string; name?: string; phone?: string; avatar_url?: string; avatarUrl?: string; display_name?: string }): Promise<any> {
    return apiCore.put('/users/me/profile', data);
}

export async function updatePreferredLanguage(language: string): Promise<any> {
    return apiCore.put('/auth/language', { language });
}

export async function getAppVersions(): Promise<any[]> {
    return apiCore.get('/versions');
}

export async function aiChat(body: { messages: any[]; model?: string; temperature?: number; max_tokens?: number; response_format?: any }): Promise<{ text: string; model?: string; usage?: any; raw?: any }> {
    return apiCore.post('/ai/chat', body);
}

export async function login(credentials: any): Promise<any> {
    apiCore.clearCsrfToken();
    const result = await apiCore.post<any>('/auth/login', credentials);
    if (result.token) sessionStorage.setItem('auth_token', result.token);
    if (result.refreshToken) sessionStorage.setItem('auth_refresh_token', result.refreshToken);
    return result;
}

export async function resendVerification(email: string, name?: string, schoolName?: string): Promise<any> {
    return apiCore.post('/auth/resend-verification', { email, name, school_name: schoolName });
}

export async function saveAttendance(data: any): Promise<any> {
    return apiCore.post('/attendance', { records: data });
}

export async function saveGrade(data: any, schoolId?: string, branchId?: string, ...args: any[]): Promise<any> {
    // Backend route is PUT /academic/grade (the old POST /academic/grades/save 404'd,
    // which broke the teacher Grade Entry screen).
    return apiCore.put('/academic/grade', { ...data, schoolId, branchId });
}

export async function recordPayment(schoolIdOrData: any, branchId?: string, paymentData?: any): Promise<any> {
    let body: any;
    if (paymentData !== undefined) {
        // 3-arg form: recordPayment(schoolId, branchId, data)
        body = { ...paymentData, schoolId: schoolIdOrData, branchId };
    } else {
        // 1-arg form: recordPayment(data)
        body = schoolIdOrData;
    }
    return apiCore.post('/fees/record-payment', body);
}

export async function createLessonPlan(data: any, _options?: { useBackend?: boolean }): Promise<any> {
    return apiCore.post('/lesson-plans', data);
}

// Sync-engine compatibility aliases, identical to the ones on the full
// client — syncEngine.ts replays queued offline writes through these names.
export async function recordStudentPayment(data: any): Promise<any> {
    return recordPayment(data);
}

export async function createLessonNote(data: any): Promise<any> {
    return createLessonPlan(data);
}
