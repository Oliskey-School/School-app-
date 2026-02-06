import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { DashboardType, School } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: DashboardType | null;
    currentSchool: School | null;
    currentBranchId: string | null;
    loading: boolean;
    sessionExpiresAt: number | null;
    isSessionExpired: boolean;
    signIn: (dashboard: DashboardType, user: any) => Promise<void>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<boolean>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_OFFLINE_SESSION_HOURS = 24;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<DashboardType | null>(null);
    const [currentSchool, setCurrentSchool] = useState<School | null>(null);
    const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [lastOnlineCheck, setLastOnlineCheck] = useState<number>(Date.now());

    useEffect(() => {
        // 1. Try to restore session from sessionStorage (Tab Specific)
        const restoreSession = () => {
            const storedUser = sessionStorage.getItem('user');
            const storedRole = sessionStorage.getItem('role');
            const storedSchool = sessionStorage.getItem('school');

            if (storedUser && storedRole) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setRole(storedRole as DashboardType);
                    if (storedSchool) {
                        setCurrentSchool(JSON.parse(storedSchool));
                    }
                    setLoading(false);
                    return true; // Successfully restored
                } catch (e) {
                    console.error('Failed to parse stored session');
                }
            }
            return false;
        };

        const sessionRestored = restoreSession();

        // 2. Initialize Supabase (only if not restored or to keep sync if needed)
        const initSupabase = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    throw error;
                }

                if (!sessionRestored && session) {
                    setSession(session);
                    setUser(session.user);
                    if (session.user.user_metadata?.user_type) {
                        setRole(session.user.user_metadata.user_type as DashboardType);
                    }
                    // Fetch School for this user
                    fetchUserSchool(session.user.id);
                }
            } catch (error) {
                console.error('Supabase initialization failed:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!sessionRestored) {
            initSupabase();
        }

        // 3. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`🔐 Auth Event: ${event}`);

            if (session) {
                // Determine role and school from app_metadata (Synced by Ironclad Engine)
                const metadata = session.user.app_metadata || {};
                const userRole = metadata.role || session.user.user_metadata?.role;
                const schoolId = metadata.school_id;
                const branchId = metadata.branch_id;

                if (userRole) {
                    const dashboardRole = getDashboardTypeFromUserType(userRole);
                    setRole(dashboardRole);
                    sessionStorage.setItem('role', dashboardRole);
                }

                if (schoolId) {
                    fetchUserSchool(session.user.id, schoolId);
                }

                if (branchId) {
                    setCurrentBranchId(branchId);
                }

                setSession(session);
                setUser(session.user);
                sessionStorage.setItem('user', JSON.stringify(session.user));
            }

            if (event === 'SIGNED_OUT') {
                console.log('👋 Processing local SIGNED_OUT');
                setRole(null);
                setSession(null);
                setUser(null);
                setCurrentSchool(null);
                setCurrentBranchId(null);

                // Nuclear clear of all sensitive data
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('role');
                sessionStorage.removeItem('school');
                sessionStorage.removeItem('sessionExpiresAt');
                localStorage.removeItem('auth_token');
            }

            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchUserSchool = async (userId: string, providedSchoolId?: string) => {
        try {
            // Priority 1: Provided via JWT / App Metadata
            let schoolId = providedSchoolId;

            if (!schoolId) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                schoolId = authUser?.app_metadata?.school_id || authUser?.user_metadata?.school_id;
            }

            // Priority 2: Local Cache
            if (!schoolId) {
                schoolId = localStorage.getItem('last_school_id');
            }

            if (schoolId) {
                localStorage.setItem('last_school_id', schoolId);

                // We still fetch the School details (UI Branding)
                const { data: schoolData, error: fetchError } = await supabase
                    .from('schools')
                    .select('*')
                    .eq('id', schoolId)
                    .single();

                if (fetchError) {
                    console.error("Failed to fetch school details:", fetchError);
                    return;
                }

                if (schoolData) {
                    const mappedSchool: School = {
                        id: schoolData.id,
                        name: schoolData.name,
                        slug: schoolData.slug,
                        logoUrl: schoolData.logo_url,
                        website: schoolData.website,
                        address: schoolData.address,
                        contactEmail: schoolData.contact_email,
                        subscriptionStatus: schoolData.subscription_status,
                        createdAt: schoolData.created_at,
                        primaryColor: schoolData.primary_color,
                        secondaryColor: schoolData.secondary_color
                    };
                    setCurrentSchool(mappedSchool);
                    sessionStorage.setItem('school', JSON.stringify(mappedSchool));
                }
            }
        } catch (err) {
            console.error("Error fetching user school:", err);
        }
    };

    const getDashboardTypeFromUserType = (userType: string): DashboardType => {
        const lower = userType.toLowerCase();
        if (lower === 'superadmin') return DashboardType.SuperAdmin;
        if (lower === 'admin') return DashboardType.Admin;
        if (lower === 'teacher') return DashboardType.Teacher;
        if (lower === 'parent') return DashboardType.Parent;
        if (lower === 'student') return DashboardType.Student;
        if (lower === 'proprietor') return DashboardType.Proprietor;
        if (lower === 'inspector') return DashboardType.Inspector;
        if (lower === 'examofficer') return DashboardType.ExamOfficer;
        if (lower === 'complianceofficer') return DashboardType.ComplianceOfficer;
        if (lower === 'counselor') return DashboardType.Counselor;
        return DashboardType.Student;
    };

    const signIn = async (dashboard: DashboardType, userData: any) => {
        // This method is called by the Login component AFTER successful Supabase auth
        // or for "Mock" logins.

        // Create a minimal user object for state
        const mockUser = {
            id: userData.userId,
            email: userData.email,
            user_metadata: {
                role: userData.userType?.toLowerCase(),
                full_name: userData.email?.split('@')[0],
                is_demo: userData.isDemo, // Persist demo flag
                custom_id: userData.schoolGeneratedId, // Include custom ID in user_metadata
            },
            app_metadata: {
                custom_id: userData.schoolGeneratedId, // Include custom ID in app_metadata
            },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
        } as unknown as User;


        // Set the user and role state
        setUser(mockUser);
        setRole(dashboard);

        // Fetch (or Mock) School for this user if provided
        if (userData.school) {
            setCurrentSchool(userData.school);
            sessionStorage.setItem('school', JSON.stringify(userData.school));
        }

        // Persist to sessionStorage for tab isolation
        sessionStorage.setItem('user', JSON.stringify(mockUser));
        sessionStorage.setItem('role', dashboard);

        // [NEW] Persist Backend Token for API calls
        if (userData.token) {
            localStorage.setItem('auth_token', userData.token);
        }

        console.log('✅ Auth state updated:', { dashboard, user: mockUser.email, tokenSaved: !!userData.token });
    };

    const signOut = async () => {
        console.log('🔄 Starting sign out process (tab-specific)...');

        // 1. CLEAR STATE IMMEDIATELY (Atomic & Synchronous)
        setRole(null);
        setUser(null);
        setSession(null);
        setCurrentSchool(null);
        setCurrentBranchId(null);
        setSessionExpiresAt(null);
        setIsSessionExpired(false);
        setLoading(false);

        // 2. Clear THIS TAB'S session storage only (not localStorage to keep other tabs active)
        sessionStorage.clear();
        console.log('✅ Tab-specific storage cleared (other tabs unaffected)');

        // 3. Clear offline cache for this tab (non-blocking)
        try {
            const { clearAllCachesOnLogout } = await import('../lib/cacheManager');
            clearAllCachesOnLogout().catch(e => console.warn('Cache clear background error:', e));
        } catch (e) {
            console.warn('Cache manager import failed:', e);
        }

        // NOTE: We do NOT call supabase.auth.signOut() to avoid logging out other tabs
        // Each tab maintains its own session in sessionStorage

        console.log('👋 Tab-specific logout complete - other tabs remain active');
    };



    /**
     * Refresh session token
     */
    const refreshSession = async (): Promise<boolean> => {
        try {
            console.log('🔄 Refreshing session token...');

            const { data, error } = await supabase.auth.refreshSession();

            if (error) {
                console.error('❌ Session refresh failed:', error);
                setIsSessionExpired(true);
                return false;
            }

            if (data.session) {
                setSession(data.session);
                setUser(data.session.user);

                // Update expiry time
                const expiresAt = Date.now() + (MAX_OFFLINE_SESSION_HOURS * 60 * 60 * 1000);
                setSessionExpiresAt(expiresAt);
                sessionStorage.setItem('sessionExpiresAt', expiresAt.toString());

                setLastOnlineCheck(Date.now());
                sessionStorage.setItem('lastOnlineCheck', Date.now().toString());

                setIsSessionExpired(false);

                console.log('✅ Session refreshed successfully');
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Session refresh error:', error);
            return false;
        }
    };

    // Session expiry check
    useEffect(() => {
        const checkSessionExpiry = () => {
            const storedExpiry = sessionStorage.getItem('sessionExpiresAt');
            const storedLastCheck = sessionStorage.getItem('lastOnlineCheck');

            if (storedExpiry) {
                const expiryTime = parseInt(storedExpiry, 10);
                const now = Date.now();

                if (now > expiryTime) {
                    console.warn('⚠️ Session expired while offline');
                    setIsSessionExpired(true);
                } else {
                    setSessionExpiresAt(expiryTime);
                }
            }

            if (storedLastCheck) {
                setLastOnlineCheck(parseInt(storedLastCheck, 10));
            }
        };

        checkSessionExpiry();

        // Check every 5 minutes
        const interval = setInterval(checkSessionExpiry, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    // Auto-refresh on reconnect
    useEffect(() => {
        const handleOnline = async () => {
            if (session && user) {
                console.log('🌐 Back online - refreshing session');
                await refreshSession();
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [session, user]);

    return (
        <AuthContext.Provider value={{
            session,
            user,
            role,
            currentSchool,
            currentBranchId,
            loading,
            sessionExpiresAt,
            isSessionExpired,
            signIn,
            signOut,
            refreshSession
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
