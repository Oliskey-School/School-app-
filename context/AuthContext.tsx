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
    signIn: (dashboard: DashboardType, user: any) => Promise<void>;
    signOut: () => Promise<void>;
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

    useEffect(() => {
        setLoading(true);
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`🔐 Auth Event: ${event}`);

            if (session) {
                const metadata = session.user.app_metadata || {};
                const userRole = metadata.role || session.user.user_metadata?.role;
                const schoolId = metadata.school_id;
                const branchId = metadata.active_branch_id || metadata.branch_id;

                if (userRole) {
                    const dashboardRole = getDashboardTypeFromUserType(userRole);
                    setRole(dashboardRole);
                }

                if (schoolId) {
                    fetchUserSchool(session.user.id, schoolId);
                }
                
                if (branchId) {
                    setCurrentBranchId(branchId);
                } else if (metadata.active_branch_id === null) {
                    setCurrentBranchId(null);
                }

                setSession(session);
                setUser(session.user);
            } else {
                setRole(null);
                setSession(null);
                setUser(null);
                setCurrentSchool(null);
                setCurrentBranchId(null);
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
        }

        // [NEW] Persist Backend Token for API calls
        if (userData.token) {
            localStorage.setItem('auth_token', userData.token);
        }

        console.log('✅ Auth state updated:', { dashboard, user: mockUser.email, tokenSaved: !!userData.token });
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
        }
        // State will be cleared by onAuthStateChange listener
    };



    // Session expiry check is now handled automatically by Supabase client library
    // Auto-refresh on reconnect is also handled by the library

    const value = React.useMemo(() => ({
        session,
        user,
        role,
        currentSchool,
        currentBranchId,
        loading,
        signIn,
        signOut
    }), [session, user, role, currentSchool, currentBranchId, loading]);

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
