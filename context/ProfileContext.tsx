import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatSchoolId } from '../utils/idFormatter';

interface UserProfile {
  id?: number | string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role?: string;
  supabaseId?: string;
  schoolId?: string;
  branchId?: string;
  schoolGeneratedId?: string;
  grade?: number;
  section?: string;
}

interface ProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  loadProfileFromDatabase: (userId?: string, email?: string) => Promise<void | UserProfile>;
  isLoading: boolean;
  setProfile: (profile: UserProfile) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile>({
    name: 'User',
    email: 'user@school.com',
    phone: '',
    avatarUrl: 'https://i.pravatar.cc/150?u=user',
    role: 'Parent',
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchAndSyncProfile = useCallback(async (email: string) => {
    try {
      console.log('🔄 Profile fetch for:', email);

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (userData) {
        let schoolId = userData.school_id;
        let sourceId = '';
        let phone = '';
        let roleAvatar = '';
        const role = userData.role || 'Parent';

        // school_id healing
        if (!schoolId || schoolId === '00000000-0000-0000-0000-000000000000') {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          schoolId = authUser?.user_metadata?.school_id || authUser?.app_metadata?.school_id;
          if (schoolId) await supabase.rpc('sync_user_metadata', { p_school_id: schoolId });
        }

        const roleLower = role.toLowerCase();
        const tableName = roleLower === 'teacher' ? 'teachers' : roleLower === 'parent' ? 'parents' : roleLower === 'student' ? 'students' : '';

        if (tableName) {
          const columns = roleLower === 'student' ? 'avatar_url, school_generated_id' : 'phone, avatar_url, school_generated_id';
          let { data: roleData } = await supabase.from(tableName as any).select(columns).eq('user_id', userData.id).maybeSingle();
          if (!roleData) {
            const { data: emailMatch } = await supabase.from(tableName as any).select(columns).ilike('email', email).maybeSingle();
            roleData = emailMatch;
          }

          if (roleData) {
            const r = roleData as any;
            phone = r.phone || '';
            roleAvatar = r.avatar_url || '';
            sourceId = r.school_generated_id || '';
          }
        }

        const freshProfile: UserProfile = {
          id: userData.id,
          name: userData.name || 'User',
          email: userData.email,
          phone: phone,
          avatarUrl: roleAvatar || userData.avatar_url || 'https://i.pravatar.cc/150?u=user',
          role: role,
          schoolId: schoolId,
          schoolGeneratedId: sourceId || (userData as any).school_generated_id || (userData as any).custom_id || '',
          branchId: (userData as any).branch_id
        };

        setProfileState(freshProfile);
        sessionStorage.setItem('userProfile', JSON.stringify(freshProfile));
        return freshProfile;
      }

      // Demo fallback
      if (email.toLowerCase() === 'user@school.com') {
        const demo: UserProfile = {
          name: 'Demo Parent',
          email: 'user@school.com',
          phone: '+234 801 234 5678',
          avatarUrl: 'https://i.pravatar.cc/150?u=parent',
          role: 'Parent',
          schoolId: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
          schoolGeneratedId: 'OLISKEY_PAR_0001'
        };
        setProfileState(demo);
        sessionStorage.setItem('userProfile', JSON.stringify(demo));
        return demo;
      }

    } catch (err) {
      console.error('Profile error:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await fetchAndSyncProfile(user.email);
      } else {
        const saved = sessionStorage.getItem('userProfile');
        if (saved) setProfileState(JSON.parse(saved));
      }
      setIsLoading(false);
    };
    init();
  }, [fetchAndSyncProfile]);

  const setProfile = useCallback((newProfile: UserProfile) => {
    setProfileState(newProfile);
    sessionStorage.setItem('userProfile', JSON.stringify(newProfile));
  }, []);

  const loadProfileFromDatabase = useCallback(async (userId?: string, email?: string) => {
    setIsLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const targetEmail = email || authUser?.email;
    let res = null;
    if (targetEmail) {
      res = await fetchAndSyncProfile(targetEmail);
    }
    setIsLoading(false);
    return res;
  }, [fetchAndSyncProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setIsLoading(true);
    try {
      const updated = { ...profile, ...updates };
      const targetId = updated.id || profile.id;

      if (!targetId || targetId === 'undefined') {
        throw new Error('User ID is undefined. Cannot update profile.');
      }

      // 1. Update global users table
      const { error: userError } = await supabase.from('users').update({
        name: updated.name,
        avatar_url: updated.avatarUrl,
        // email and school_id are usually fixed/not editable here
      }).eq('id', targetId);

      if (userError) throw userError;

      // 2. Update role-specific table for redundancy/consistency
      const roleLower = updated.role?.toLowerCase();
      const tableName = roleLower === 'teacher' ? 'teachers' :
        roleLower === 'parent' ? 'parents' :
          roleLower === 'student' ? 'students' : '';

      if (tableName) {
        // Prepare role-specific updates
        const roleUpdates: any = {
          name: updated.name,
          avatar_url: updated.avatarUrl,
          updated_at: new Date().toISOString()
        };

        // If it's a student, we might want to split names (though the table has name too)
        if (roleLower === 'student' && updated.name.includes(' ')) {
          const parts = updated.name.split(' ');
          roleUpdates.first_name = parts[0];
          roleUpdates.last_name = parts.slice(1).join(' ');
        }

        const { error: roleError } = await supabase
          .from(tableName as any)
          .update(roleUpdates)
          .eq('user_id', targetId);

        if (roleError) {
          console.warn(`Note: Role table update for ${tableName} failed:`, roleError.message);
          // We don't necessarily fail the whole operation if the main users update worked
        }
      }

      setProfileState(updated);
      sessionStorage.setItem('userProfile', JSON.stringify(updated));
    } catch (err) {
      console.error('Update error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.email) await fetchAndSyncProfile(authUser.email);
    setIsLoading(false);
  }, [fetchAndSyncProfile]);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, refreshProfile, loadProfileFromDatabase, isLoading, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
};
