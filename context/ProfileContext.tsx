import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAutoSync } from '../hooks/useAutoSync';
import { useAuth } from './AuthContext';

/**
 * EXACT SCHEMA INTERFACE (based on Supabase MCP inspection)
 */
export interface UserProfile {
    id: string; // uuid
    full_name: string;
    name?: string; // Alias for full_name
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    avatarUrl?: string | null; // Alias for avatar_url
    role: string | null; // e.g., 'Student', 'Teacher', 'Parent', 'Admin'
    school_id: string; // uuid
    schoolId?: string; // Alias for school_id
    branch_id: string | null; // uuid
    branchId?: string | null; // Alias for branch_id
    school_generated_id: string | null;
    username: string | null;
    is_active: boolean | null;
    user_id?: string; // Some backend responses use this
    userId?: string;
    created_at: string;
    updated_at: string;
}

interface ProfileContextType {
    profile: UserProfile | null;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { user: authUser, loading: authLoading, refreshUser } = useAuth();

    /**
     * INITIALIZE PROFILE FROM AUTH CONTEXT
     * This eliminates redundant network calls and the extra loading screen
     */
    useEffect(() => {
        if (authLoading) {
            setIsLoading(true);
            return;
        }

        if (authUser) {
            // Use authUser data directly to avoid another fetch
            const mappedProfile: UserProfile = {
                ...authUser,
                id: authUser.id || authUser.userId,
                full_name: authUser.full_name || authUser.name || authUser.email?.split('@')[0] || 'User',
                name: authUser.name || authUser.full_name,
                school_id: authUser.school_id || authUser.schoolId || (authUser.school?.id),
                schoolId: authUser.schoolId || authUser.school_id || (authUser.school?.id),
                branch_id: authUser.branch_id || authUser.branchId,
                branchId: authUser.branchId || authUser.branch_id,
                avatar_url: authUser.avatar_url || authUser.avatarUrl,
                avatarUrl: authUser.avatarUrl || authUser.avatar_url
            };
            setProfile(mappedProfile);
        } else {
            setProfile(null);
        }
        setIsLoading(false);
    }, [authUser, authLoading]);

    const refreshProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            await refreshUser();
        } finally {
            setIsLoading(false);
        }
    }, [refreshUser]);

    // Real-time synchronization for profile data
    useAutoSync(['users'], refreshProfile);

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!profile?.id) return { error: 'No profile loaded' };
        
        try {
            const { api } = await import('../lib/api');
            const role = profile.role?.toLowerCase();
            
            if (role === 'teacher' || role === 'admin') {
                await api.updateTeacher(profile.id, updates);
            } else {
                await api.updateStudent(profile.id, updates);
            }
            
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    return (
        <ProfileContext.Provider value={{ profile, isLoading, refreshProfile, updateProfile, setProfile }}>
            {/* Remove the blocking loading screen as AuthProvider handles it */}
            {children}
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
