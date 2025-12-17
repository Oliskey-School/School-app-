import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id?: number | string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role?: 'Student' | 'Teacher' | 'Parent' | 'Admin';
  supabaseId?: string;
}

interface ProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  loadProfileFromDatabase: (userId?: number | string, email?: string) => Promise<void>;
  isLoading: boolean;
  setProfile: (profile: UserProfile) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile>({
    name: 'Demo User',
    email: 'user@school.com',
    phone: '+234 801 234 5678',
    avatarUrl: 'https://i.pravatar.cc/150?u=user',
    role: 'Admin',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load profile from Supabase on mount (one time)
  useEffect(() => {
    const initProfile = async () => {
      setIsLoading(true);
      try {
        // Try to get the logged-in user from Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authData?.user?.email) {
          // Fetch user profile from users table by email
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email, avatar_url')
            .eq('email', authData.user.email)
            .single();

          if (!userError && userData) {
            const dbProfile: UserProfile = {
              id: userData.id,
              name: userData.name || 'Demo User',
              email: userData.email,
              phone: profile.phone, // Keep existing or fetch if added to DB
              avatarUrl: userData.avatar_url || 'https://i.pravatar.cc/150?u=user',
              role: profile.role,
            };
            setProfileState(dbProfile);
            return;
          }
        }

        // Fallback: load from localStorage if DB not available
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
          try {
            setProfileState(JSON.parse(savedProfile));
          } catch (e) {
            console.warn('Could not parse saved profile:', e);
          }
        }
      } catch (err) {
        console.warn('Error initializing profile from Supabase:', err);
        // Use default or localStorage
      } finally {
        setIsLoading(false);
      }
    };

    initProfile();
  }, []);

  const setProfile = useCallback((newProfile: UserProfile) => {
    setProfileState(newProfile);
    // Also cache in localStorage
    localStorage.setItem('userProfile', JSON.stringify(newProfile));
  }, []);

  const loadProfileFromDatabase = useCallback(async (userId?: number | string, email?: string) => {
    setIsLoading(true);
    try {
      let userData = null;
      let error = null;

      if (userId && !isNaN(Number(userId))) {
        const result = await supabase
          .from('users')
          .select('id, name, email, avatar_url, phone')
          .eq('id', Number(userId))
          .single();
        userData = result.data;
        error = result.error;
      } else if (email) {
        const result = await supabase
          .from('users')
          .select('id, name, email, avatar_url, phone')
          .eq('email', email)
          .single();
        userData = result.data;
        error = result.error;
      }

      if (!error && userData) {
        const dbProfile: UserProfile = {
          id: userData.id,
          name: userData.name || profile.name,
          email: userData.email,
          phone: userData.phone || profile.phone,
          avatarUrl: userData.avatar_url || profile.avatarUrl,
          role: profile.role,
        };
        setProfileState(dbProfile);
        localStorage.setItem('userProfile', JSON.stringify(dbProfile));
        return dbProfile;
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

      if (updated.id && !isNaN(Number(updated.id))) {
        const { error } = await supabase
          .from('users')
          .update({
            name: updated.name,
            email: updated.email,
            avatar_url: updated.avatarUrl,
            phone: updated.phone
          })
          .eq('id', Number(updated.id));

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
            avatar_url: updated.avatarUrl,
            phone: updated.phone
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
      localStorage.setItem('userProfile', JSON.stringify(updated));
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
      if (profile.id && !isNaN(Number(profile.id))) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, avatar_url, phone')
          .eq('id', Number(profile.id))
          .single();

        if (!error && data) {
          const refreshed: UserProfile = {
            id: data.id,
            name: data.name || profile.name,
            email: data.email,
            phone: data.phone || profile.phone,
            avatarUrl: data.avatar_url || profile.avatarUrl,
            role: profile.role,
          };
          setProfileState(refreshed);
          localStorage.setItem('userProfile', JSON.stringify(refreshed));
          return;
        }
      } else if (profile.email) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, avatar_url, phone')
          .eq('email', profile.email)
          .single();

        if (!error && data) {
          const refreshed: UserProfile = {
            id: data.id,
            name: data.name || profile.name,
            email: data.email,
            phone: profile.phone,
            avatarUrl: data.avatar_url || profile.avatarUrl,
            role: profile.role,
          };
          setProfileState(refreshed);
          localStorage.setItem('userProfile', JSON.stringify(refreshed));
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
