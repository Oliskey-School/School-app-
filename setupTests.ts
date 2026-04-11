import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global API and Supabase mock
vi.mock('./lib/api', () => {
    const mockSupabase = {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                ilike: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                then: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
            insert: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }) })),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
            delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
            upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        channel: vi.fn(() => {
            const mockChannel = {
                on: vi.fn(() => mockChannel),
                subscribe: vi.fn(() => mockChannel),
            };
            return mockChannel;
        }),
        removeChannel: vi.fn(),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        functions: {
            invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
    };

    const mockApi = {
        getStudents: vi.fn().mockResolvedValue([]),
        getTeacherAnalytics: vi.fn().mockResolvedValue([]),
        getClasses: vi.fn().mockResolvedValue([]),
        fetchClasses: vi.fn().mockResolvedValue([]),
        getSubjects: vi.fn().mockResolvedValue([]),
        fetchSubjects: vi.fn().mockResolvedValue([]),
        initializeStandardClasses: vi.fn().mockResolvedValue(undefined),
        getSchoolSettings: vi.fn().mockResolvedValue({}),
        getBranches: vi.fn().mockResolvedValue([]),
        getDashboardStats: vi.fn().mockResolvedValue({}),
        getBuses: vi.fn().mockResolvedValue([]),
        createClass: vi.fn().mockResolvedValue({}),
        updateClass: vi.fn().mockResolvedValue({}),
        deleteClass: vi.fn().mockResolvedValue(undefined),
        fetchStudentsByClassId: vi.fn().mockResolvedValue([]),
        getTeacherDashboardStats: vi.fn().mockResolvedValue({}),
        getTeacherById: vi.fn().mockResolvedValue({ id: 't1', name: 'Test Teacher', school_id: 'school-123' }),
        getAssignments: vi.fn().mockResolvedValue([]),
    };

    return {
        api: mockApi,
        supabase: mockSupabase,
        default: mockApi,
        isSupabaseConfigured: false,
    };
});

// Mock MatchMedia (needed by many UI libraries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock indexedDB for happy-dom/jsdom
const indexedDBMock = {
    open: vi.fn().mockReturnValue({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
    }),
    deleteDatabase: vi.fn().mockReturnValue({
        onsuccess: null,
        onerror: null,
    }),
};

Object.defineProperty(window, 'indexedDB', {
    value: indexedDBMock,
});
