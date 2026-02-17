import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatSchoolId } from '../utils/idFormatter';

interface UserProfile {
  id?: number | string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role?: 'Student' | 'Teacher' | 'Parent' | 'Admin' | 'Proprietor' | 'Inspector' | 'Exam Officer' | 'Compliance Officer' | 'Super Admin' | 'Counselor' | string;
  supabaseId?: string;
  schoolId?: string;
  branchId?: string; // Added branchId
  schoolGeneratedId?: string;
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
    role: 'Student',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load profile from Supabase on mount (one time)
  useEffect(() => {
    const initProfile = async () => {
      setIsLoading(true);
      try {
        // Try to get the logged-in user from Supabase Auth
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.email) {
          // Fetch user profile from users table by email
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email, avatar_url, role, school_id, custom_id')
            .eq('email', authData.user.email)
            .single();

          // Handle permission denied errors for demo users
          if (userError) {
            if (userError.code === '42501' || userError?.message?.includes('permission denied')) {
              console.warn('⚠️ Permission denied - using demo user profile');
              const demoProfile: UserProfile = {
                id: 'demo-user-id',
                name: authData.user.email?.split('@')[0] || 'Demo User',
                email: authData.user.email,
                phone: '+234 801 234 5678',
                avatarUrl: 'https://i.pravatar.cc/150?u=demo',
                role: authData.user.user_metadata?.role || authData.user.app_metadata?.role || 'Admin',
                schoolId: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                schoolGeneratedId: formatSchoolId(authData.user.user_metadata?.school_generated_id || authData.user.app_metadata?.school_generated_id, authData.user.user_metadata?.role || 'Admin'),
              };
              setProfileState(demoProfile);
              setIsLoading(false);
              return;
            }
          }

          if (!userError && userData) {
            // ... (Existing successful user lookup logic) ...
            let schoolId: string | undefined = userData.school_id;

            // Fallback 1: Auth Metadata (Source of truth for session tenancy)
            if (!schoolId || schoolId === '00000000-0000-0000-0000-000000000000') {
              const { data: { user: authUser } } = await supabase.auth.getUser();
              schoolId = authUser?.user_metadata?.school_id || authUser?.app_metadata?.school_id;

              // Healing: If we found it in metadata but not DB, sync it!
              if (schoolId && (!userData.school_id || userData.school_id === '00000000-0000-0000-0000-000000000000')) {
                console.log('🔄 Auto-syncing school_id to DB...');
                await supabase.rpc('sync_user_metadata', { p_school_id: schoolId });
              }
            }

            // Fallback 2: Healing Logic (Look up school by admin email if still missing)
            if ((!schoolId || schoolId === '00000000-0000-0000-0000-000000000000') && ['Admin', 'Proprietor'].includes(userData.role)) {
              console.log('Attempting school_id healing via email...');
              const { data: schoolData } = await supabase
                .from('schools')
                .select('id')
                .eq('contact_email', userData.email)
                .single();
              if (schoolData) {
                schoolId = schoolData.id;
                await supabase.rpc('sync_user_metadata', { p_school_id: schoolId });
              }
            }

            // Fetch role-specific data (e.g., phone, avatar from teachers/parents/students table)
            let phone = '';
            let roleAvatar = '';
            let sourceId = ''; // Initialize sourceId

            if (['Teacher', 'Parent', 'Student'].includes(userData.role)) {
              const tableName = userData.role === 'Teacher' ? 'teachers' : userData.role === 'Parent' ? 'parents' : 'students';
              // Students table might not have phone in all schemas, but teachers/parents do
              const columns = userData.role === 'Student' ? 'avatar_url, school_generated_id' : 'phone, avatar_url, school_generated_id';

              const { data: roleData } = await supabase
                .from(tableName as any)
                .select(columns)
                .eq('user_id', userData.id)
                .maybeSingle();

              if (roleData) {
                const data = roleData as any;
                if (data.phone) phone = data.phone;
                if (data.avatar_url) roleAvatar = data.avatar_url;
                if ((data as any).school_generated_id) sourceId = (data as any).school_generated_id;
              }
            }

            const dbProfile: UserProfile = {
              id: userData.id,
              name: userData.name || 'Demo User',
              email: userData.email,
              phone: phone || profile.phone,
              // Prioritize role-specific avatar, then users table, then fallback
              avatarUrl: roleAvatar || userData.avatar_url || 'https://i.pravatar.cc/150?u=user',
              role: (userData.role as any) || profile.role,
              schoolId: schoolId,
              schoolGeneratedId: sourceId || (userData as any).school_generated_id || (userData as any).custom_id || authData.user.app_metadata?.school_generated_id || authData.user.user_metadata?.school_generated_id,
              branchId: (userData as any).branch_id // Ensure branch_id is captured if exists
            };
            setProfileState(dbProfile);
            return;
          } else {
            // FALLBACK: If user not found in 'users' table, try finding in role tables by email
            console.warn('User not found in public.users, attempting role-based fallback...');
            // Try Parent
            const { data: parentData } = await supabase.from('parents').select('school_generated_id, name, avatar_url, phone, id, user_id, school_id').eq('email', authData.user.email).maybeSingle();
            if (parentData) {
              setProfileState({
                id: parentData.user_id || authData.user.id,
                name: parentData.name,
                email: authData.user.email,
                phone: parentData.phone,
                avatarUrl: parentData.avatar_url,
                role: 'Parent',
                schoolId: parentData.school_id,
                schoolGeneratedId: parentData.school_generated_id
              });
              return;
            }
            // Try Teacher
            const { data: teacherData } = await supabase.from('teachers').select('school_generated_id, name, avatar_url, phone, id, user_id, school_id').eq('email', authData.user.email).maybeSingle();
            if (teacherData) {
              setProfileState({
                id: teacherData.user_id || authData.user.id,
                name: teacherData.name,
                email: authData.user.email,
                phone: teacherData.phone,
                avatarUrl: teacherData.avatar_url,
                role: 'Teacher',
                schoolId: teacherData.school_id,
                schoolGeneratedId: teacherData.school_generated_id
              });
              return;
            }
            // Try Student (unlikely to have email match but possible)
            const { data: studentData } = await supabase.from('students').select('school_generated_id, name, avatar_url, id, user_id, school_id').eq('email', authData.user.email).maybeSingle();
            if (studentData) {
              setProfileState({
                id: studentData.user_id || authData.user.id,
                name: studentData.name,
                email: authData.user.email,
                phone: '',
                avatarUrl: studentData.avatar_url,
                role: 'Student',
                schoolId: studentData.school_id,
                schoolGeneratedId: studentData.school_generated_id
              });
              return;
            }
          }
        }

        // Fallback: load from sessionStorage if DB not available
        const savedProfile = sessionStorage.getItem('userProfile');
        if (savedProfile) {
          try {
            setProfileState(JSON.parse(savedProfile));
          } catch (e) {
            console.warn('Could not parse saved profile:', e);
          }
        } else if (authData?.user?.email === 'user@school.com') {
          // Specific fallback for demo parent if not found in DB or Session
          setProfileState(prev => ({
            ...prev,
            email: 'user@school.com',
            role: 'Parent',
            schoolGeneratedId: 'OLISKEY_MAIN_PAR_0000',
            name: 'Demo Parent'
          }));
        }
      } catch (err) {
        console.warn('Error initializing profile from Supabase:', err);
        // Use default or sessionStorage
      } finally {
        setIsLoading(false);
      }
    };

    initProfile();
  }, []);

  const setProfile = useCallback((newProfile: UserProfile) => {
    setProfileState(newProfile);
    // Also cache in sessionStorage
    sessionStorage.setItem('userProfile', JSON.stringify(newProfile));
  }, []);

  const loadProfileFromDatabase = useCallback(async (userId?: string, email?: string) => {
    setIsLoading(true);
    try {
      let userData = null;
      let error = null;

      if (userId) {
        const result = await supabase
          .from('users')
          .select('id, name, email, avatar_url, role, school_id, custom_id')
          .eq('id', userId)
          .single();
        userData = result.data;
        error = result.error;
      } else if (email) {
        const result = await supabase
          .from('users')
          .select('id, name, email, avatar_url, role, school_id, custom_id')
          .eq('email', email)
          .single();
        userData = result.data;
        error = result.error;
      }

      if (!error && userData) {
        // Fetch role-specific data
        let phone = '';
        let roleAvatar = '';

        if (['Teacher', 'Parent', 'Student'].includes(userData.role)) {
          const tableName = userData.role === 'Teacher' ? 'teachers' : userData.role === 'Parent' ? 'parents' : 'students';
          const columns = userData.role === 'Student' ? 'avatar_url, school_generated_id' : 'phone, avatar_url, school_generated_id';

          const { data: roleData } = await supabase
            .from(tableName as any)
            .select(columns)
            .eq('user_id', userData.id)
            .maybeSingle();

          if (roleData) {
            const data = roleData as any;
            if (data.phone) phone = data.phone;
            if (data.avatar_url) roleAvatar = data.avatar_url;
            if ((data as any).school_generated_id) (userData as any).school_generated_id = (data as any).school_generated_id;
          }
        }

        const dbProfile: UserProfile = {
          id: userData.id,
          name: userData.name || profile.name,
          email: userData.email,
          phone: phone || profile.phone,
          avatarUrl: roleAvatar || userData.avatar_url || profile.avatarUrl,
          role: (userData.role as any) || profile.role,
          schoolId: userData.school_id,
          schoolGeneratedId: (userData as any).school_generated_id || (userData as any).custom_id,
          branchId: (userData as any).branch_id
        };
        setProfileState(dbProfile);
        sessionStorage.setItem('userProfile', JSON.stringify(dbProfile));
        return dbProfile;
      } else if (error && (error.code === '42501' || error?.message?.includes('permission denied'))) {
        // Permission denied - use demo profile
        console.warn('⚠️ Permission denied - using demo profile');
        const demoProfile: UserProfile = {
          id: 'demo-user-id',
          name: email?.split('@')[0] || profile.name,
          email: email || profile.email,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl,
          role: profile.role,
        };
        setProfileState(demoProfile);
        sessionStorage.setItem('userProfile', JSON.stringify(demoProfile));
        return demoProfile;
      } else {
        console.warn('Could not load profile from database:', error);
      }
    } catch (err) {
      console.error('Error loading profile from database:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setIsLoading(true);
    try {
      const updated = { ...profile, ...updates };

      // Save to Supabase `users` table (PRIMARY storage)
      let saveSuccess = false;

      if (updated.id) {
        const { error } = await supabase
          .from('users')
          .update({
            name: updated.name,
            email: updated.email,
            avatar_url: updated.avatarUrl
            // phone removed as it is not in users table
          })
          .eq('id', updated.id);

        if (error) {
          console.error('Error saving profile to Supabase:', error);
        } else {
          saveSuccess = true;
          console.log('Profile saved to Supabase successfully');
        }
      } else if (updated.email) {
        const { error } = await supabase
          .from('users')
          .update({
            name: updated.name,
            avatar_url: updated.avatarUrl
            // phone removed as it is not in users table
          })
          .eq('email', updated.email);

        if (error) {
          console.error('Error saving profile to Supabase:', error);
        } else {
          saveSuccess = true;
          console.log('Profile saved to Supabase successfully');
        }
      }

      if (!saveSuccess) {
        throw new Error('Failed to save profile to Supabase');
      }

      // Update local state and cache after successful save
      setProfileState(updated);
      sessionStorage.setItem('userProfile', JSON.stringify(updated));

      // ---------------------------------------------------------
      // SECONDARY UPDATE: Sync with Role-Specific Tables
      // ---------------------------------------------------------
      if (updated.role) {
        const userId = updated.id;
        const userEmail = updated.email;

        // Common fields for secondary tables
        const commonUpdates: any = {};
        if (updates.name) commonUpdates.name = updates.name;
        if (updates.avatarUrl) commonUpdates.avatar_url = updates.avatarUrl;

        // Phone is only for Teacher and Parent
        if (updates.phone && (updated.role === 'Teacher' || updated.role === 'Parent')) {
          commonUpdates.phone = updates.phone;
        }

        if (Object.keys(commonUpdates).length > 0) {
          let tableName = '';
          if (updated.role === 'Student') tableName = 'students';
          if (updated.role === 'Teacher') tableName = 'teachers';
          if (updated.role === 'Parent') tableName = 'parents';

          if (tableName) {
            let query = supabase.from(tableName).update(commonUpdates);

            // Match by user_id first, fallback to email
            if (userId) {
              query = query.eq('user_id', userId);
            } else if (userEmail) {
              // Students table might not have email column in some schemas, 
              // but Teachers/Parents do. 
              if (tableName !== 'students') {
                query = query.eq('email', userEmail);
              } else {
                // For students without ID, we can't reliably update purely by email 
                console.warn('Cannot update student record without valid user_id');
                return;
              }
            }

            const { error: roleError } = await query;
            if (roleError) {
              console.error(`Error syncing profile to ${tableName} table:`, roleError);
              // We don't throw here to avoid breaking the UI if specific table fails,
              // since primary user table succeeded.
            } else {
              console.log(`Synced profile to ${tableName} successfully`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch latest profile from Supabase
      if (profile.id) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, avatar_url, role, school_id, custom_id')
          .eq('id', profile.id)
          .single();

        if (!error && data) {
          let schoolId = data.school_id;

          // Fallback 1: Metadata
          if (!schoolId || schoolId === '00000000-0000-0000-0000-000000000000') {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            schoolId = authUser?.user_metadata?.school_id || authUser?.app_metadata?.school_id;
          }

          // Fallback 2: Healing Logic (Look up school by admin email if still missing)
          if ((!schoolId || schoolId === '00000000-0000-0000-0000-000000000000') && ['Admin', 'Proprietor'].includes(data.role)) {
            const { data: schoolData } = await supabase
              .from('schools')
              .select('id')
              .eq('contact_email', data.email)
              .single();
            if (schoolData) schoolId = schoolData.id;
          }

          // Force Sync if healed
          if (schoolId && schoolId !== data.school_id) {
            await supabase.rpc('sync_user_metadata', { p_school_id: schoolId });
          }

          // Fetch role-specific data
          let phone = '';
          let roleAvatar = '';

          if (['Teacher', 'Parent', 'Student'].includes(data.role)) {
            const tableName = data.role === 'Teacher' ? 'teachers' : data.role === 'Parent' ? 'parents' : 'students';
            const columns = data.role === 'Student' ? 'avatar_url, school_generated_id' : 'phone, avatar_url, school_generated_id';

            const { data: roleData } = await supabase
              .from(tableName as any)
              .select(columns)
              .eq('user_id', data.id)
              .maybeSingle();

            if (roleData) {
              const data = roleData as any;
              if (data.phone) phone = data.phone;
              if (data.avatar_url) roleAvatar = data.avatar_url;
              if ((data as any).school_generated_id) (data as any).school_generated_id = (data as any).school_generated_id;
            }
          }

          const refreshed: UserProfile = {
            id: data.id,
            name: data.name || profile.name,
            email: data.email,
            phone: phone || profile.phone,
            avatarUrl: roleAvatar || data.avatar_url || profile.avatarUrl,
            role: (data.role as any) || profile.role,
            schoolId: schoolId,
            schoolGeneratedId: (data as any).school_generated_id || (data as any).custom_id,
            branchId: (data as any).branch_id
          };
          setProfileState(refreshed);
          sessionStorage.setItem('userProfile', JSON.stringify(refreshed));
          return;
        }
      } else if (profile.email) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, avatar_url, role, school_id, custom_id')
          .eq('email', profile.email)
          .single();

        if (!error && data) {
          let schoolId = data.school_id;

          // Fallback 1: Metadata
          if (!schoolId || schoolId === '00000000-0000-0000-0000-000000000000') {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            schoolId = authUser?.user_metadata?.school_id || authUser?.app_metadata?.school_id;
          }

          // Fallback 2: Healing Logic (Look up school by admin email if still missing)
          if ((!schoolId || schoolId === '00000000-0000-0000-0000-000000000000') && ['Admin', 'Proprietor'].includes(data.role)) {
            const { data: schoolData } = await supabase
              .from('schools')
              .select('id')
              .eq('contact_email', data.email)
              .single();
            if (schoolData) schoolId = schoolData.id;
          }

          // Force Sync if healed
          if (schoolId && schoolId !== data.school_id) {
            await supabase.rpc('sync_user_metadata', { p_school_id: schoolId });
          }

          const refreshed: UserProfile = {
            id: data.id,
            name: data.name || profile.name,
            email: data.email,
            phone: profile.phone, // Phone not in users table
            avatarUrl: data.avatar_url || profile.avatarUrl,
            role: (data.role as any) || profile.role,
            schoolId: schoolId,
            schoolGeneratedId: (data as any).school_generated_id || (data as any).custom_id,
          };
          setProfileState(refreshed);
          sessionStorage.setItem('userProfile', JSON.stringify(refreshed));
          return;
        }
      }

      console.warn('Could not refresh profile from Supabase');
    } catch (err) {
      console.error('Error refreshing profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, refreshProfile, loadProfileFromDatabase, isLoading, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};
