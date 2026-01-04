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
            // CRITICAL FIX: IF we have a Role in this tab's sessionStorage, ignore external 'SIGNED_OUT'
            // This works because local signOut() clears sessionStorage BEFORE calling supabase.signOut().
            // So if we still have a role here, the signOut came from ANOTHER tab.
            const storedRole = sessionStorage.getItem('role');

            if (storedRole) {
                // We have a local active session in this tab.
                // If the event is effectively a logout (no session), ignore it to maintain isolation.
                if (!session) {
                    return;
                }
            }

            setSession(session);

            if (session) {
                setUser(session.user);
                // If metadata has role, trust it, otherwise keep storedRole
                if (session.user.user_metadata?.user_type) {
                    // Optionally update role if needed
                }
            } else if (!storedRole) {
                // Only clear state if we don't have a stored role
                setUser(null);
                setRole(null);
            }

            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const getDashboardTypeFromUserType = (userType: string): DashboardType => {
        switch (userType) {
            case 'Admin': return DashboardType.Admin;
            case 'Teacher': return DashboardType.Teacher;
            case 'Parent': return DashboardType.Parent;
            case 'Student': return DashboardType.Student;
            default: return DashboardType.Student;
        }
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
