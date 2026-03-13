import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { DashboardType, School } from '../types';
import { DEMO_ACCOUNTS, DEMO_SCHOOL_ID, DEMO_BRANCH_ID } from '../lib/mockAuth';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: DashboardType | null;
    currentSchool: School | null;
    currentBranchId: string | null;
    loading: boolean;
    isDemo: boolean;
    memberships: any[];
    signIn: (dashboard: DashboardType, user: any) => Promise<void>;
    signOut: () => Promise<void>;
    switchSchool: (schoolId: string) => Promise<void>;
    switchDemoRole: (roleKey: string) => Promise<void>;
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
    const [memberships, setMemberships] = useState<any[]>([]);
    const [isDemo, setIsDemo] = useState(() => sessionStorage.getItem('is_demo_mode') === 'true');

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
        return DashboardType.Admin; // Default to Admin for safe fallback
    };

    const fetchUserSchool = async (userId: string, providedSchoolId?: string) => {
        try {
            let schoolId = providedSchoolId;
            if (!schoolId) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                schoolId = authUser?.app_metadata?.school_id || authUser?.user_metadata?.school_id;
            }
            if (!schoolId) {
                schoolId = localStorage.getItem('last_school_id');
            }
            if (schoolId) {
                localStorage.setItem('last_school_id', schoolId);
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
                        motto: schoolData.motto,
                        website: schoolData.website,
                        address: schoolData.address,
                        state: schoolData.state,
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

    const fetchMemberships = async (userId: string) => {
        if (!userId || userId.startsWith('d33000')) {
            setMemberships([]);
            return;
        }
        try {
            const { api } = await import('../lib/api');
            const data = await api.getMemberships(userId);
            setMemberships(data || []);
        } catch (err) {
            console.error("Error fetching memberships:", err);
        }
    };

    const switchSchool = async (schoolId: string) => {
        if (!user) return;
        setLoading(true);
        try {
            const { api } = await import('../lib/api');
            const result = await api.switchSchool(user.id, schoolId);

            if (result.token) {
                localStorage.setItem('auth_token', result.token);
                await supabase.auth.setSession({
                    access_token: result.token,
                    refresh_token: session?.refresh_token || result.token
                });

                const dashboardRole = getDashboardTypeFromUserType(result.user.role);
                setRole(dashboardRole);
                fetchUserSchool(user.id, schoolId);
                window.location.reload();
            }
        } catch (err) {
            console.error("Error switching school:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`🔐 Auth Event: ${event}`);

            // If we have a null session but we haven't explicitly logged out, 
            // protect the localStorage token and try to rehydrate Supabase.
            // This happens when opening new tabs because Supabase uses a tab-specific storage key.
            if (!session && event !== 'SIGNED_OUT') {
                console.log('🛡️ [Auth] Ignoring null session (Not an explicit SIGNED_OUT event)');
                
                // Attempt to rehydrate the missing Supabase session using the localStorage tokens
                const localToken = localStorage.getItem('auth_token');
                const localRefreshToken = localStorage.getItem('auth_refresh_token');
                if (localToken) {
                    console.log('🛡️ [Auth] Attempting to rehydrate Supabase session from localStorage');
                    try {
                        const { data: sessionData, error } = await supabase.auth.setSession({
                            access_token: localToken,
                            refresh_token: localRefreshToken || localToken
                        });

                        if (error) {
                            // If 403 Forbidden, the token is explicitly rejected by the server
                            if ((error as any).status === 403 || error.message.includes('403') || error.message.includes('Forbidden')) {
                                console.error('🚫 [Auth] Session token rejected (403). Clearing session.');
                                localStorage.removeItem('auth_token');
                                localStorage.removeItem('auth_refresh_token');
                                await supabase.auth.signOut();
                                setLoading(false);
                                return;
                            }
                            throw error;
                        }
                        
                        // Successfully set session. The SIGNED_IN event will be fired 
                        // and handled by another execution of this listener.
                        return;
                    } catch (e) {
                        console.warn('Supabase session rehydration failed:', e);
                        // For non-fatal errors, we just wipe the token so user can re-login
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('auth_refresh_token');
                    }

                }
                
                setLoading(false);
                return;
            }

            if (session) {
                // Keep localStorage in sync with the latest valid tokens (handles token refreshes)
                localStorage.setItem('auth_token', session.access_token);
                if (session.refresh_token) {
                    localStorage.setItem('auth_refresh_token', session.refresh_token);
                }


                // Determine if this is a demo user from metadata or email domain used for tests
                const isDemoUser = session.user.user_metadata?.is_demo ||
                    session.user.app_metadata?.is_demo ||
                    session.user.email?.endsWith('@demo.com') ||
                    session.user.email?.endsWith('@school.com') ||
                    session.user.app_metadata?.school_id === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

                setIsDemo(isDemoUser);
                if (isDemoUser) {
                    sessionStorage.setItem('is_demo_mode', 'true');
                } else {
                    sessionStorage.removeItem('is_demo_mode');
                }

                const metadata = session.user.app_metadata || {};
                const userRole = metadata.role || session.user.user_metadata?.role;
                let schoolId = metadata.school_id;
                let branchId = metadata.active_branch_id || metadata.branch_id;

                // [CRITICAL OVERRIDE] Enforce identical Demo School and Branch context
                if (isDemoUser) {
                    schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
                    branchId = '7601cbea-e1ba-49d6-b59b-412a584cb94f';
                    
                    // Inject Oliskey specific metadata for ID formatters
                    if (session.user.user_metadata) {
                        session.user.user_metadata.school_code = 'OLISKEY';
                        session.user.user_metadata.branch_code = 'MAIN';
                    }
                }

                if (userRole) {
                    const dashboardRole = getDashboardTypeFromUserType(userRole);
                    setRole(dashboardRole);
                }

                if (schoolId) {
                    fetchUserSchool(session.user.id, schoolId);
                }

                if (branchId) {
                    setCurrentBranchId(branchId);
                } else if (!isDemoUser && metadata.active_branch_id === null) {
                    setCurrentBranchId(null);
                }

                setSession(session);
                setUser(session.user);
                fetchMemberships(session.user.id);
            } else {
                // [SECURITY] Explicitly clear all state and storage on logout or session expiry
                setRole(null);
                setSession(null);
                setUser(null);
                setCurrentSchool(null);
                setCurrentBranchId(null);
                setIsDemo(false);
                setMemberships([]);

                // Rigorous cleanup of all possible auth keys to prevent ghost sessions
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_refresh_token');

                localStorage.removeItem('user_role');
                localStorage.removeItem('last_school_id');
                sessionStorage.removeItem('is_demo_mode');
                sessionStorage.removeItem('school');

                // Clear any supabase-specific persistence manually if listener fails
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.includes('supabase.auth.token')) {
                        localStorage.removeItem(key);
                    }
                });
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (dashboard: DashboardType, userData: any) => {
        if (userData.isDemo) {
            console.log("🛡️ [Auth] Entering Demo Mode — preserving Supabase session for RLS");
        }

        const mockUser = {
            id: userData.userId,
            email: userData.email,
            user_metadata: {
                role: userData.userType?.toLowerCase(),
                full_name: userData.email?.split('@')[0],
                is_demo: userData.isDemo,
                school_generated_id: userData.schoolGeneratedId,
                custom_id: userData.schoolGeneratedId, // Keep for backward compatibility
                school_id: userData.school?.id,
                branch_id: userData.school?.branch_id,
                email_verified: userData.email_verified || false
            },
            app_metadata: {
                school_generated_id: userData.schoolGeneratedId,
                custom_id: userData.schoolGeneratedId,
                school_id: userData.school?.id,
                branch_id: userData.school?.branch_id
            },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
        } as unknown as User;

        setUser(mockUser);
        setRole(dashboard);
        setLoading(false);
        setIsDemo(!!userData.isDemo);
        if (userData.isDemo) {
            sessionStorage.setItem('is_demo_mode', 'true');
        } else {
            sessionStorage.removeItem('is_demo_mode');
        }

        if (userData.school) {
            setCurrentSchool(userData.school);
            if (userData.school.branch_id) {
                setCurrentBranchId(userData.school.branch_id);
            }
        }

        const effectiveToken = userData.token || null;

        if (effectiveToken) {
            localStorage.setItem('auth_token', effectiveToken);
            if (userData.refreshToken) {
                localStorage.setItem('auth_refresh_token', userData.refreshToken);
            }
            if (userData.token) {
                try {
                    await supabase.auth.setSession({
                        access_token: userData.token,
                        refresh_token: userData.refreshToken || userData.token
                    });

                } catch (err) {
                    console.error("Session Sync Error:", err);
                }
            }
        }
    };

    const signOut = async () => {
        if (isDemo) {
            setRole(null);
            setSession(null);
            setUser(null);
            setCurrentSchool(null);
            setCurrentBranchId(null);
            setIsDemo(false);
            setMemberships([]);
            sessionStorage.removeItem('is_demo_mode');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
        }
    };



    /**
     * Instantly switches the active demo role without going to the login page.
     * Signs in with the real Supabase credentials for the given demo role.
     * The onAuthStateChange listener handles state updates automatically.
     */
    const switchDemoRole = async (roleKey: string) => {
        const account = DEMO_ACCOUNTS[roleKey];
        if (!account) {
            console.warn(`[Demo] No demo account configured for role: ${roleKey}`);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: account.email,
                password: account.password,
            });
            if (error) throw error;
            // onAuthStateChange will fire and update role/user/school automatically
            // Force demo school context in case metadata is missing
            if (data.session) {
                setIsDemo(true);
                sessionStorage.setItem('is_demo_mode', 'true');
                setCurrentBranchId(DEMO_BRANCH_ID);
            }
        } catch (err: any) {
            console.error('[Demo] Role switch failed:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const value = React.useMemo(() => ({
        session,
        user,
        role,
        currentSchool,
        currentBranchId,
        loading,
        isDemo,
        memberships,
        signIn,
        signOut,
        switchSchool,
        switchDemoRole,
    }), [session, user, role, currentSchool, currentBranchId, loading, isDemo, memberships]);

    return (
        <AuthContext.Provider value={value}>
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
