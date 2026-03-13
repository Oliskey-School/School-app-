/**
 * Dashboard Demo Fallback Utility
 * Handles permission denied errors (403) for demo users across all dashboards
 */

export interface DemoProfile {
    id?: string;
    name: string;
    avatarUrl?: string;
    email?: string;
    [key: string]: any;
}

/**
 * Checks if an error is a permission denied error (403/42501)
 * Common when demo users don't have RLS policies configured
 */
export function isPermissionDeniedError(error: any): boolean {
    return error?.code === '42501' || error?.message?.includes('permission denied');
}

/**
 * Creates a demo profile for a specific user type
 */
export function createDemoProfile(userType: string, email?: string): DemoProfile {
    const profiles: Record<string, DemoProfile> = {
        student: {
            id: '3d6f7a8b-9c0d-4e1f-8a9b-0c1d2e3f4a5b',
            name: 'Demo Student',
            email: email || 'student@demo.com',
            grade: 'Grade 10',
            class: 'Class A',
            studentId: 'STU001',
            xp: 1500,
            level: 5,
            badges: ['🎓', '⭐', '🏆']
        },
        teacher: {
            id: '6f90901e-4119-457d-8d73-745b17831a30',
            name: 'Demo Teacher',
            email: email || 'teacher@demo.com',
            subjects: ['Mathematics', 'Science'],
            classes: ['Class 10A', 'Class 10B']
        },
        admin: {
            id: '1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6',
            name: 'Demo Admin',
            email: email || 'admin@demo.com',
            role: 'Administrator'
        },
        parent: {
            id: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
            name: 'Demo Parent',
            email: email || 'parent@demo.com',
            children: []
        },
        proprietor: {
            id: 'b1c2d3e4-f5a6-7b8c-9a0d-e1f2a3b4c5d6',
            name: 'Demo Proprietor',
            email: email || 'demo_proprietor@school.com',
            role: 'Proprietor'
        },
        inspector: {
            id: 'c1d2e3f4-a5b6-7c8d-9a0d-e1f2a3b4c5d6',
            name: 'Demo Inspector',
            email: email || 'demo_inspector@school.com',
            role: 'Inspector'
        },
        examofficer: {
            id: 'd1e2f3a4-b5c6-7d8e-9a0d-e1f2a3b4c5d6',
            name: 'Demo Exam Officer',
            email: email || 'demo_examofficer@school.com',
            role: 'Exam Officer'
        },
        complianceofficer: {
            id: 'e1f2a3b4-c5d6-7a8b-9c0d-e1f2a3b4c5d6',
            name: 'Demo Compliance Officer',
            email: email || 'demo_compliance@school.com',
            role: 'Compliance Officer'
        }
    };

    return profiles[userType.toLowerCase()] || {
        id: '00000000-0000-0000-0000-000000000000', // Default UUID
        name: `Demo ${userType}`,
        email: email || `${userType.toLowerCase()}@demo.com`
    };
}

/**
 * Handles permission errors with demo fallback
 * Returns: { success: boolean, data?: any, isDemo: boolean }
 */
export function handlePermissionError(error: any, userType: string, email?: string): {
    success: boolean;
    data?: DemoProfile;
    isDemo: boolean;
} {
    if (isPermissionDeniedError(error)) {
        console.warn(`⚠️ Permission denied for ${userType} - using demo profile`);
        return {
            success: true,
            data: createDemoProfile(userType, email),
            isDemo: true
        };
    }

    return {
        success: false,
        isDemo: false
    };
}

/**
 * Wraps a Supabase query with automatic permission error handling
 * Usage:
 * const result = await withDemoFallback(
 *   () => supabase.from('students').select('*').eq('email', email).maybeSingle(),
 *   'student',
 *   email
 * );
 */
export async function withDemoFallback<T = any>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    userType: string,
    email?: string
): Promise<{ data: T | DemoProfile | null; error: any; isDemo: boolean }> {
    const { data, error } = await queryFn();

    if (error && isPermissionDeniedError(error)) {
        console.warn(`⚠️ Permission denied for ${userType} - using demo profile`);
        return {
            data: createDemoProfile(userType, email) as any,
            error: null,
            isDemo: true
        };
    }

    return {
        data,
        error,
        isDemo: false
    };
}
