import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { DashboardType, School } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: DashboardType | null;
    currentSchool: School | null;
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

            if (event === 'SIGNED_IN' && session) {
                // Determine role from metadata or profile table
                let userRole = session.user.user_metadata?.role || session.user.user_metadata?.user_type;

                // Also fetch school association
                await fetchUserSchool(session.user.id);

                if (!userRole) {
                    // Fallback to fetching from profiles table (now users table in SaaS schema)
                    const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single();
                    if (profile) userRole = profile.role;
                }

                if (userRole) {
                    const dashboardRole = getDashboardTypeFromUserType(userRole);
                    setRole(dashboardRole);
                    sessionStorage.setItem('role', dashboardRole);
                    sessionStorage.setItem('user', JSON.stringify(session.user));
                }

                setSession(session);
                setUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                // SCOPED SESSION LOGIC: 
                // Only clear state if the session is truly gone from this tab's storage.
                // This prevents "Session Bleeding" where one tab logging out affects others.

                const { data: { session: existingSession } } = await supabase.auth.getSession();

                if (existingSession) {
                    console.log('🛡️ Ignoring global SIGNED_OUT event - Session still valid in this tab');
                    return; // EXIT: Do not clear state
                }

                // If we get here, the session is truly gone
                console.log('👋 Processing local SIGNED_OUT');
                setRole(null);
                setSession(null);
                setUser(null);
                setCurrentSchool(null);
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('role');
                sessionStorage.removeItem('school');
            } else if (session) {
                setSession(session);
                setUser(session.user);
            }

            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchUserSchool = async (userId: string) => {
        try {
            // Get user from JWT to check metadata first
            const { data: { user: authUser } } = await supabase.auth.getUser();

            // Triple-Source Detection + Fallback Cache
            let schoolId = authUser?.user_metadata?.school_id || authUser?.app_metadata?.school_id;

            if (!schoolId) {
                // Fallback to database
                const { data: userRecord } = await supabase.from('users').select('school_id').eq('id', userId).single();
                schoolId = userRecord?.school_id;
            }

            if (!schoolId) {
                // Fallback 2: Healing Logic (Look up school by admin email if still missing)
                if (authUser?.email) {
                    const { data: schoolData } = await supabase
                        .from('schools')
                        .select('id')
                        .eq('contact_email', authUser.email)
                        .single();
                    if (schoolData) schoolId = schoolData.id;
                }
            }

            // Fallback 3: Local Cache (Persistent across sessions/refreshes)
            if (!schoolId) {
                schoolId = localStorage.getItem('last_school_id');
            }

            if (schoolId) {
                // Cache for future fallback
                localStorage.setItem('last_school_id', schoolId);

                const { data: schoolData, error: fetchError } = await supabase.from('schools').select('*').eq('id', schoolId).single();

                if (fetchError) {
                    console.error("Failed to fetch school data for ID:", schoolId, fetchError);
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
            },
            app_metadata: {},
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

        console.log('✅ Auth state updated:', { dashboard, user: mockUser.email });
    };

    const signOut = async () => {
        // 1. OPTIMISTIC UPDATE: Clear local state IMMEDIATELY
        // This ensures the UI feels instant to the user.
        setRole(null);
        setSession(null);
        setUser(null);
        setCurrentSchool(null);
        setSessionExpiresAt(null);
        setIsSessionExpired(false);

        // 2. Clear all session storage
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('school');
        sessionStorage.removeItem('userProfile');
        sessionStorage.removeItem('sessionExpiresAt');
        sessionStorage.removeItem('lastOnlineCheck');

        // 3. Clear offline cache (now scoped)
        const { clearAllCachesOnLogout } = await import('../lib/cacheManager');
        await clearAllCachesOnLogout();

        console.log('✅ Auth state cleared locally');

        // 4. Trigger Supabase SignOut in Background (Fire & Forget)
        // We don't await this because network latency shouldn't block the UI.
        supabase.auth.signOut().then(() => {
            console.log('✅ Supabase session terminated on server');
        }).catch((err) => {
            console.warn('⚠️ Supabase signOut network error (ignored):', err);
        });

        // Return immediately so the UI can update
        return;


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
