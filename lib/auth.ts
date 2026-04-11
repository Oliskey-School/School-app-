import { api } from './api';
import { emailTemplates } from './emailTemplates';
import bcrypt from 'bcryptjs';

/**
 * Generates a username from a full name
 * Example: "Adebayo Adewale" -> "adebayo.adewale" or "aadewale"
 */
export const generateUsername = (fullName: string, userType: string): string => {
  const cleaned = fullName.toLowerCase().trim().replace(/\s+/g, '.');
  // Optionally add user type prefix for uniqueness
  return `${userType.charAt(0).toLowerCase()}${cleaned}`;
};

/**
 * Generates a password from surname
 * Example: "Adewale" -> "adewale1234"
 */
export const generatePassword = (surname: string): string => {
  const cleanSurname = surname.toLowerCase().trim();
  const base = cleanSurname.length > 0 ? cleanSurname : 'user';
  const password = `${base}123456`;
  if (password.length < 8) {
    return `${password}78`;
  }
  return password;
};

/**
 * Creates a login account for a user using the custom backend
 */
export const createUserAccount = async (
  fullName: string,
  userType: 'Student' | 'Teacher' | 'Parent' | 'Admin' | 'Principal' | 'Counselor',
  email: string,
  schoolId: string,
  userId?: number,
  branchId?: string,
  avatarUrl?: string
): Promise<{ username: string; password: string; error?: string; userId?: string; schoolGeneratedId?: string }> => {
  try {
    const nameParts = fullName.trim().split(/\s+/);
    const surname = nameParts[nameParts.length - 1];
    const username = generateUsername(fullName, userType);
    const password = generatePassword(surname);

    const data = await api.post<any>('/auth/create-user', {
      email,
      password,
      username,
      full_name: fullName,
      role: userType,
      school_id: schoolId,
      branch_id: branchId,
      avatar_url: avatarUrl
    });

    return { 
      username: data.school_generated_id || username, 
      password: data.initial_password || password, 
      userId: data.id,
      schoolGeneratedId: data.school_generated_id
    };
  } catch (err: any) {
    console.error('Error in createUserAccount:', err);
    return { username: '', password: '', error: err.message };
  }
};

/**
 * Check whether an email exists using the backend API
 */
export const checkEmailExists = async (email: string): Promise<{
  inUsers: boolean;
  userRow?: any | null;
  inAuthAccounts: boolean;
  authAccountRow?: any | null;
  error?: string | null;
}> => {
  try {
    const data = await api.get<any>(`/auth/check-email?email=${encodeURIComponent(email)}`);

    return {
      inUsers: data.exists,
      userRow: data.user,
      inAuthAccounts: data.exists,
      authAccountRow: data.user,
      error: null
    };
  } catch (err: any) {
    return { inUsers: false, userRow: null, inAuthAccounts: false, authAccountRow: null, error: err.message };
  }
};

/**
 * Authenticates a user with email/username and password using the custom backend
 */
export const authenticateUser = async (
  username: string,
  password: string
): Promise<{
  success: boolean;
  userType?: 'Student' | 'Teacher' | 'Parent' | 'Admin' | 'Principal' | 'Counselor';
  userId?: string;
  email?: string;
  error?: string;
  schoolGeneratedId?: string;
  token?: string;
  refreshToken?: string;
  userData?: any;
  requiresVerification?: boolean;
}> => {
  try {
    const data = await api.login({ email: username, password });

    // Check if email verification is required
    if (data.requiresVerification) {
      return {
        success: false,
        requiresVerification: true,
        userId: data.userId,
        email: data.email,
        error: data.message || 'Please verify your email before logging in'
      };
    }

    const { user, token, refreshToken } = data;

    return {
      success: true,
      userType: user.role,
      userId: user.id,
      email: user.email,
      token: token,
      refreshToken: refreshToken,
      userData: user,
      schoolGeneratedId: user.school_generated_id
    };
  } catch (err: any) {
    console.error('Auth Error:', err);
    return { success: false, error: err.message || 'Connection failed. Please check if the backend is running.' };
  }
};

/**
 * Checks if a username already exists
 */
export const checkUsernameExists = async (username: string): Promise<boolean> => {
  try {
    const data = await api.get<any>(`/auth/check-username?username=${encodeURIComponent(username)}`);
    return data.exists;
  } catch {
    return false;
  }
};

/**
 * Sign out the current user
 */
export const signOutUser = async (): Promise<{ success: boolean; error?: string }> => {
  // Logic is handled in AuthContext mostly, but we can have a helper here
  return { success: true };
};

/**
 * Sends a verification email to the user
 */
export const sendVerificationEmail = async (name: string, email: string, schoolName: string = 'School App'): Promise<boolean> => {
    try {
        const { api } = await import('./api');
        await api.resendVerification(email, name, schoolName);
        return true;
    } catch (err) {
        console.error('Error sending verification email:', err);
        return false;
    }
};
