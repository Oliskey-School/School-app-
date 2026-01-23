import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { DashboardType } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: DashboardType | null;
    loading: boolean;
    signIn: (dashboard: DashboardType, user: any) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<DashboardType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Try to restore session from sessionStorage (Tab Specific)
        const restoreSession = () => {
            const storedUser = sessionStorage.getItem('user');
            const storedRole = sessionStorage.getItem('role');
            if (storedUser && storedRole) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setRole(storedRole as DashboardType);
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

                // Only override if we didn't restore a mock session 
                // OR if the supabase session is actually valid and different?
                // For now, priority: SessionStorage (Mock) > Supabase Session
                if (!sessionRestored && session) {
                    setSession(session);
                    setUser(session.user);
                    if (session.user.user_metadata?.user_type) {
                        setRole(session.user.user_metadata.user_type as DashboardType);
                    }
                }
            } catch (error) {
                console.error('Supabase initialization failed:', error);
                // Fallback to offline/modals if needed, or just allow app to load in "logged out" state
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

                if (!userRole) {
                    // Fallback to fetching from profiles table
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
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
                // CRITICAL FIX: IF we have a Role in this tab's sessionStorage, ignore external 'SIGNED_OUT'
                // This works because local signOut() clears sessionStorage BEFORE calling supabase.signOut().
                const storedRole = sessionStorage.getItem('role');
                if (storedRole) return;

                setRole(null);
                setSession(null);
                setUser(null);
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('role');
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
            },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
        } as unknown as User;

        // Set the user and role state
        setUser(mockUser);
        setRole(dashboard);

        // Persist to sessionStorage for tab isolation
        sessionStorage.setItem('user', JSON.stringify(mockUser));
        sessionStorage.setItem('role', dashboard);

        console.log('✅ Auth state updated:', { dashboard, user: mockUser.email });
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('Supabase signout failed', e);
        }

        setRole(null);
        setSession(null);
        setUser(null);

        // Clear session storage
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('role');
        // Clear profile storage as well if it's used elsewhere
        sessionStorage.removeItem('userProfile');
    };

    return (
        <AuthContext.Provider value={{ session, user, role, loading, signIn, signOut }}>
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
