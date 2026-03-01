import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';

/**
 * EXACT SCHEMA INTERFACE (based on Supabase MCP inspection)
 */
export interface UserProfile {
    id: string; // uuid
    full_name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string | null; // e.g., 'Student', 'Teacher', 'Parent', 'Admin'
    school_id: string; // uuid
    branch_id: string | null; // uuid
    school_generated_id: string | null;
    username: string | null;
    is_active: boolean | null;
    created_at: string;
    updated_at: string;
}

interface ProfileContextType {
    profile: UserProfile | null;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { user: authUser } = useAuth();

    /**
     * FETCH PROFILE DATA
     * Uses the exact schema discovered via MCP
     */
    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error.message);
                setProfile(null);
            } else {
                setProfile(data as UserProfile);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setProfile(null);
        }
    }, []);

    /**
     * INITIALIZE SESSION & AUTH LISTENERS
     * This handles hard refreshes by checking the session immediately
     */
    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            setIsLoading(true);

            // 1. Recover existing session (crucial for refresh)
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }

            if (mounted) setIsLoading(false);
        };

        initializeAuth();

        // 2. Listen for auth changes (sign in, sign out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    await fetchProfile(session.user.id);
                }
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
            }

            if (mounted) setIsLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    /**
     * SYNC WITH AUTH CONTEXT
     * This handles "Quick Login" or mock logins where a session is manually set
     */
    useEffect(() => {
        if (authUser && !profile) {
            console.log('🔄 [Profile] Syncing with AuthContext User:', authUser.id);
            fetchProfile(authUser.id);
        } else if (!authUser && profile) {
            setProfile(null);
        }
    }, [authUser, fetchProfile, profile]);

    const refreshProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!profile?.id) return { error: 'No profile loaded' };

        const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', profile.id)
            .select()
            .single();

        if (!error && data) {
            setProfile(data as UserProfile);
        }
        return { error };
    };

    return (
        <ProfileContext.Provider value={{ profile, isLoading, refreshProfile, updateProfile }}>
            {/* 
                STRICT LOADING ENFORCEMENT
                Prevents children (the app) from rendering with stale/dummy data 
                until the profile is actually verified or determined to be null.
            */}
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9fafb' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #4f46e5', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                        <p style={{ color: '#4b5563', fontFamily: 'sans-serif' }}>Loading secure profile...</p>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            ) : (
                children
            )}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};
