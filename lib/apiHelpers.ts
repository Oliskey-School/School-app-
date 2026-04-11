
/**
 * Check if the app is running in demo mode (no real session)
 */
export function isDemoMode(): boolean {
    return sessionStorage.getItem('is_demo_mode') === 'true';
}

/**
 * Get the auth token for backend API calls
 */
export function getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
}

/**
 * Helper to format class names consistently
 */
export function getFormattedClassName(grade: number | string, section: string | null): string {
    return `Grade ${grade}${section ? section : ''}`;
}

/**
 * Helper to get grade label
 */
export function getGrade(grade: number | string): string {
    return `Grade ${grade}`;
}

// Backend API base URL for fallback when RLS blocks demo queries
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Fetch data from the backend API (uses service role key, bypasses RLS)
 */
export async function backendFetch<T>(endpoint: string): Promise<T> {
    const isDemo = sessionStorage.getItem('is_demo_mode') === 'true';
    try {
        const token = getAuthToken() || 'demo-auth-token';
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status}`);
        }
        return response.json();
    } catch (err) {
        if (isDemo) {
            console.warn(`🛡️ [API Fallback] Backend fetch failed for ${endpoint}, using hardcoded mock.`);

            // Centralized Hardcoded Mock Data for Demo Mode
            if (endpoint.includes('/students')) {
                return [
                    { id: '1', name: 'Adebayo Oluchi', avatar_url: null, grade: 12, section: 'Science', status: 'Active', school_generated_id: 'STU-001', school_id: 'demo' },
                    { id: '2', name: 'Chidi Okechukwu', avatar_url: null, grade: 12, section: 'Arts', status: 'Active', school_generated_id: 'STU-002', school_id: 'demo' },
                    { id: '3', name: 'Zainab Musa', avatar_url: null, grade: 11, section: 'Science', status: 'Active', school_generated_id: 'STU-003', school_id: 'demo' },
                    { id: '4', name: 'Emeka Obi', avatar_url: null, grade: 9, section: 'A', status: 'Active', school_generated_id: 'STU-004', school_id: 'demo' },
                    { id: '5', name: 'Fatima Ibrahim', avatar_url: null, grade: 6, section: 'Blue', status: 'Active', school_generated_id: 'STU-005', school_id: 'demo' },
                    { id: '6', name: 'Ike Ogbonna', avatar_url: null, grade: 10, section: 'A', status: 'Active', school_generated_id: 'STU-006', school_id: 'demo' }
                ] as any;
            }
            if (endpoint.includes('/teachers')) {
                return [] as any;
            }
            if (endpoint.includes('/parents')) {
                return [
                    { id: '1', name: 'Robert Johnson', email: 'parent1@demo.com', phone: '08012345678', school_generated_id: 'PAR-001', parent_children: [] },
                    { id: '2', name: 'Alice Williams', email: 'alice@demo.com', phone: '08098765432', school_generated_id: 'PAR-002', parent_children: [] },
                    { id: '3', name: 'Balarabe Sani', email: 'balarabe@demo.com', phone: '07011223344', school_generated_id: 'PAR-003', parent_children: [] }
                ] as any;
            }
            if (endpoint.includes('/classes')) {
                return [
                    { id: '1', name: 'SSS 3 Science', grade: 12, section: 'Science', student_count: 25 },
                    { id: '2', name: 'SSS 3 Arts', grade: 12, section: 'Arts', student_count: 20 },
                    { id: '3', name: 'SSS 2', grade: 11, section: 'A', student_count: 30 },
                    { id: '4', name: 'SSS 1', grade: 10, section: 'A', student_count: 28 },
                    { id: '5', name: 'JSS 3', grade: 9, section: 'A', student_count: 35 },
                    { id: '6', name: 'JSS 2', grade: 8, section: 'A', student_count: 32 },
                    { id: '7', name: 'JSS 1', grade: 7, section: 'A', student_count: 30 }
                ] as any;
            }
            if (endpoint.includes('/dashboard/stats')) {
                return {
                    totalStudents: 1240,
                    totalTeachers: 86,
                    totalParents: 950,
                    totalClasses: 42,
                    totalActiveUsers: 85,
                    revenue: 12500000,
                    attendanceRate: 94.5
                } as any;
            }
            if (endpoint.includes('/branches')) {
                return [
                    {
                        id: '7601cbea-e1ba-49d6-b59b-412a584cb94f',
                        school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                        name: 'Main Campus (Demo)',
                        is_main: true,
                        curriculum_type: 'nigerian',
                        location: 'Lagos, Nigeria'
                    }
                ] as any;
            }
        }
        throw err;
    }
}
