import React, { createContext, useContext, useEffect, useState } from 'react';
import { DashboardType, School } from '../types';
import { DEMO_SCHOOL_ID, DEMO_BRANCH_ID } from '../lib/mockAuth';
import { api } from '../lib/api';
import { queryClient } from '../lib/react-query';

interface AuthContextType {
    session: any | null;
    user: any | null;
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
    signInWithGoogle: (email?: string, name?: string) => Promise<{ success: boolean } | void>;
    userProfile: any | null;
    refreshUser: () => Promise<void>;
    refreshCurrentSchool: () => Promise<void>;
    isAuthenticated: boolean;
    switchDashboardRole: (role: DashboardType) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [session, setSession] = useState<any | null>(null);
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
        return DashboardType.Admin;
    };

    const initializeAuth = async () => {
        const token = localStorage.getItem('auth_token');

        if (!token && !isDemo) {
            localStorage.removeItem('cached_user_profile');
            React.startTransition(() => {
                setUser(null);
                setRole(null);
                setLoading(false);
            });
            return;
        }

        // 0. Quick check for cached user to speed up initial render
        const cachedUser = localStorage.getItem('cached_user_profile');
        if (cachedUser) {
            try {
                const userData = JSON.parse(cachedUser);
                React.startTransition(() => {
                    setUser(userData);

                    // Priority: Session (tab-specific) > Default role
                    const savedRole = sessionStorage.getItem('active_dashboard_role') as DashboardType;
                    if (savedRole) {
                        setRole(savedRole);
                    } else {
                        setRole(getDashboardTypeFromUserType(userData.role));
                    }

                    if (userData.school) {
                        setCurrentSchool(userData.school);
                        setCurrentBranchId(userData.branch_id || userData.school.branch_id);
                    }
                    // Only set loading(false) early for demo accounts
                    if (isDemo || String(userData.id).startsWith('d3300')) {
                        setLoading(false);
                    }
                });
                console.log("⚡ [Auth] Optimistic load from cache...");
            } catch (e) {
                console.warn("Failed to parse cached user");
            }
        }

        if (!token) {
            React.startTransition(() => {
                setLoading(false);
            });
            return;
        }

        try {
            // 2. Fetch current user from custom backend
            const userData = await api.getMe();

            if (userData) {
                // Normalize ID
                if (!userData.id && userData.userId) {
                    userData.id = userData.userId;
                }

                // Cache for next time
                localStorage.setItem('cached_user_profile', JSON.stringify(userData));

                React.startTransition(() => {
                    setUser(userData);

                    // Priority: Session (tab-specific) > Default role
                    const savedRole = sessionStorage.getItem('active_dashboard_role') as DashboardType;
                    const dashboardRole = savedRole || getDashboardTypeFromUserType(userData.role);
                    setRole(dashboardRole);
                    if (savedRole) {
                        sessionStorage.setItem('active_dashboard_role', savedRole);
                    }

                    if (userData.school) {
                        setCurrentSchool(userData.school);
                        setCurrentBranchId(userData.branch_id || userData.school.branch_id);
                    }

                    const isDemoAccount = !!(userData.is_demo || userData.isDemo || (userData.id && String(userData.id).startsWith('d3300')));
                    setIsDemo(isDemoAccount);

                    if (isDemoAccount) {
                        sessionStorage.setItem('is_demo_mode', 'true');
                    } else {
                        sessionStorage.removeItem('is_demo_mode');
                    }

                    fetchMemberships(userData.id);
                    setSession({ access_token: token, user: userData });
                    setLoading(false);
                });
            } else {
                signOut();
            }
        } catch (err: any) {
            const isAuthError = err.message?.includes('401') ||
                err.message?.includes('No token provided') ||
                err.message?.includes('Invalid credentials');

            if (!isAuthError) {
                console.error("Auth initialization failed:", err);
            }

            signOut();
        } finally {
            React.startTransition(() => {
                setLoading(false);
            });
        }
    };

    const fetchMemberships = async (userId: string | null | undefined) => {
        if (!userId) return;

        const userIdStr = String(userId);
        // Skip for demo accounts to avoid 404s
        if (userIdStr.startsWith('d3300') || sessionStorage.getItem('is_demo_mode') === 'true') {
            setMemberships([{
                school_id: DEMO_SCHOOL_ID,
                role: role || 'admin',
                is_active: true,
                school: { name: 'Demo School', id: DEMO_SCHOOL_ID }
            }]);
            return;
        }

        try {
            const { api } = await import('../lib/api');
            const data = await api.getMemberships(userIdStr);
            setMemberships(data || []);
        } catch (err) {
            console.error("Error fetching memberships:", err);
        }
    };

    useEffect(() => {
        initializeAuth();
    }, []);

    const signIn = async (dashboard: DashboardType, userData: any) => {
        // Clear any old state or demo remnants first
        localStorage.removeItem('cached_user_profile');
        sessionStorage.removeItem('is_demo_mode');

        if (userData.token) {
            localStorage.setItem('auth_token', userData.token);
        }
        if (userData.refreshToken) {
            localStorage.setItem('auth_refresh_token', userData.refreshToken);
        }

        // Resiliently extract user object and demo status
        let userObj = userData.user || { ...userData };

        // Normalize ID (ensure .id exists if .userId was provided)
        if (!userObj.id && userObj.userId) {
            userObj.id = userObj.userId;
        }

        const isDemoAccount = !!(userObj.is_demo || userData.isDemo || userObj.isDemo || (userObj.id && String(userObj.id).startsWith('d3300')));

        React.startTransition(() => {
            setUser(userObj);
            setRole(dashboard);
            sessionStorage.setItem('active_dashboard_role', dashboard);
            setIsDemo(isDemoAccount);

            if (isDemoAccount) {
                sessionStorage.setItem('is_demo_mode', 'true');
                if (userData.school?.id) {
                    sessionStorage.setItem('demo_school_id', userData.school.id);
                }
            } else {
                sessionStorage.removeItem('is_demo_mode');
                sessionStorage.removeItem('demo_school_id');
            }

            if (userData.school) {
                setCurrentSchool(userData.school);
                setCurrentBranchId(userData.branch_id || userData.school?.branch_id);
                // Also update userObj with school info for caching
                userObj.school = userData.school;
            }

            // Cache the enriched user profile for instant reload
            localStorage.setItem('cached_user_profile', JSON.stringify(userObj));

            setSession({ access_token: userData.token, user: userObj });

            // Use either id or userId
            const userId = userObj.id || userObj.userId;
            if (userId) {
                fetchMemberships(userId);
            }

            setLoading(false);
        });
    };

    const signOut = async () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('last_school_id');
        localStorage.removeItem('cached_user_profile');
        sessionStorage.removeItem('is_demo_mode');
        sessionStorage.removeItem('school');
        sessionStorage.removeItem('demo_school_id');
        sessionStorage.removeItem('active_dashboard_role');

        React.startTransition(() => {
            setUser(null);
            setRole(null);
            setSession(null);
            setCurrentSchool(null);
            setCurrentBranchId(null);
            setIsDemo(false);
            setMemberships([]);
            setLoading(false);
            // Clear React Query cache to prevent data leakage between users
            queryClient.clear();
        });

        // Clear everything - App.tsx will automatically show Login/Signup because user/role is null
        // No more window.location.href = '/login' to avoid full page reloads
    };

    const switchSchool = async (schoolId: string) => {
        setLoading(true);
        try {
            const { api } = await import('../lib/api');
            const result = await api.switchSchool(user.id, schoolId);

            if (result.token) {
                localStorage.setItem('auth_token', result.token);
                // No more window.location.reload(); to avoid full page reloads
                // Instead, we'll refresh the user profile to get the new school context
                await initializeAuth();
            }
        } catch (err) {
            console.error("Error switching school:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const switchDemoRole = async (roleKey: string) => {
        setLoading(true);
        try {
            // Instant Backend fetch - bypassing cached mock logic
            const { token, refreshToken, user: userData } = await api.demoLogin(roleKey);

            if (token && userData) {
                // Determine dashboard type based on true DB role
                let dashType = DashboardType.Admin;
                const userRole = (userData.role || '').toLowerCase();

                if (userRole === 'teacher') dashType = DashboardType.Teacher;
                else if (userRole === 'student') dashType = DashboardType.Student;
                else if (userRole === 'parent') dashType = DashboardType.Parent;

                api.clearCache();
                localStorage.removeItem('cached_user_profile');
                sessionStorage.removeItem('demo_role_token');

                await signIn(dashType, { ...userData, token, refreshToken });
            }
        } catch (err: any) {
            console.error("Demo Database Login failed:", err);
            setLoading(false);
        }
    };

    const signInWithGoogle = async (email?: string, name?: string) => {
        if (!email) {
            throw new Error('Email is required for Google Sign In');
        }

        setLoading(true);
        try {
            const { api } = await import('../lib/api');
            const { token, refreshToken, user: userData } = await api.googleLogin(email, name || 'Google User');

            if (token && userData) {
                // Determine dashboard type based on role
                let dashType = DashboardType.Admin;
                const userRole = (userData.role || '').toLowerCase();

                if (userRole === 'teacher') dashType = DashboardType.Teacher;
                else if (userRole === 'student') dashType = DashboardType.Student;
                else if (userRole === 'parent') dashType = DashboardType.Parent;

                await signIn(dashType, { ...userData, token, refreshToken });
                return { success: true };
            }
            throw new Error('Invalid response from Google Login');
        } catch (err: any) {
            console.error("Google Auth Error:", err);
            setLoading(false);
            throw err;
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
        signInWithGoogle,
        userProfile: user,
        refreshUser: initializeAuth,
        refreshCurrentSchool: async () => {
            if (!currentSchool?.id) return;
            try {
                const updatedSchool = await api.getSchoolById(currentSchool.id);
                if (updatedSchool) {
                    setCurrentSchool(updatedSchool);
                    // Also update user.school if it exists to maintain consistency
                    if (user && user.school) {
                        setUser({ ...user, school: updatedSchool });
                        localStorage.setItem('cached_user_profile', JSON.stringify({ ...user, school: updatedSchool }));
                    }
                }
            } catch (err) {
                console.error("Error refreshing school:", err);
            }
        },
        isAuthenticated: !!user,
        switchDashboardRole: (newRole: DashboardType) => {
            React.startTransition(() => {
                setRole(newRole);
                sessionStorage.setItem('active_dashboard_role', newRole);
            });
        }
    }), [session, user, role, currentSchool, currentBranchId, loading, isDemo, memberships, initializeAuth]);

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
