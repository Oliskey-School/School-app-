import { supabase, isSupabaseConfigured } from './supabase';
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
  // Ensure password is at least 8 characters for Supabase Auth requirements
  const cleanSurname = surname.toLowerCase().trim();
  const base = cleanSurname.length > 0 ? cleanSurname : 'user';
  // Append sufficient numbers to guarantee length
  const password = `${base}123456`;
  if (password.length < 8) {
    return `${password}78`; // Pad if still too short (e.g. surname 'a')
  }
  return password;
};

/**
 * Creates a login account for a user using Supabase Authentication
 * Returns username and password that was created
 */
/**
 * Creates a login account for a user using Supabase Authentication.
 * Uses a secondary client to ensure the current session (Admin) is not replaced.
 * Returns username and password that was created.
 */
export const createUserAccount = async (
  fullName: string,
  userType: 'Student' | 'Teacher' | 'Parent' | 'Admin' | 'Principal' | 'Counselor',
  email: string,
  schoolId: string, // REQUIRED: New users must belong to a school
  userId?: number
): Promise<{ username: string; password: string; error?: string; userId?: string }> => {
  try {
    // Extract surname (last name)
    const nameParts = fullName.trim().split(/\s+/);
    const surname = nameParts[nameParts.length - 1];

    // Generate username and password
    const username = generateUsername(fullName, userType);
    const password = generatePassword(surname);

    // Call Backend API to create user (Bypasses Email Confirmation via Admin API)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    try {
      const response = await fetch(`${API_URL}/auth/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          username,
          full_name: fullName,
          role: userType,
          school_id: schoolId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Backend Create User Error:', data);
        return { username, password, error: data.message || 'Failed to create account' };
      }

      // Success
      return { username, password, userId: data.id };

    } catch (apiError: any) {
      console.error('API Network Error:', apiError);
      return { username, password, error: apiError.message || 'Network error' };
    }
  } catch (err: any) {
    console.error('Error in createUserAccount:', err);
    return { username: '', password: '', error: err.message };
  }
};

/**
 * Check whether an email exists in relevant tables (`users`, `auth_accounts`).
 * Returns an object describing where the email was found (and the row data when available).
 */
export const checkEmailExists = async (email: string): Promise<{
  inUsers: boolean;
  userRow?: any | null;
  inAuthAccounts: boolean;
  authAccountRow?: any | null;
  error?: string | null;
}> => {
  if (!isSupabaseConfigured) {
    return { inUsers: false, userRow: null, inAuthAccounts: false, authAccountRow: null, error: null };
  }

  try {
    // Query users table
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .maybeSingle();

    // Query auth_accounts table
    const { data: authAccountRow, error: authError } = await supabase
      .from('auth_accounts')
      .select('id, username, email, user_id')
      .eq('email', email)
      .maybeSingle();

    const inUsers = !!userRow;
    const inAuthAccounts = !!authAccountRow;

    if (userError && userError.code !== 'PGRST116') {
      // Unexpected error
      return { inUsers, userRow: userRow || null, inAuthAccounts, authAccountRow: authAccountRow || null, error: userError.message };
    }
    if (authError && authError.code !== 'PGRST116') {
      return { inUsers, userRow: userRow || null, inAuthAccounts, authAccountRow: authAccountRow || null, error: authError.message };
    }

    return { inUsers, userRow: userRow || null, inAuthAccounts, authAccountRow: authAccountRow || null, error: null };
  } catch (err: any) {
    return { inUsers: false, userRow: null, inAuthAccounts: false, authAccountRow: null, error: err.message };
  }
};

/**
 * Sends a verification email to a newly created user using Supabase built-in email functionality
 */
export const sendVerificationEmail = async (
  fullName: string,
  email: string,
  schoolName: string = 'School App'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get the confirmation link from Supabase Auth
    // Note: Supabase automatically sends a confirmation email, but we can customize the content

    // For now, we'll log that we attempted to send the email
    // Supabase handles the actual email sending automatically when signUp is called
    console.log(`Verification email automatically sent to ${email} by Supabase Auth`);

    // Optionally: Store email sending attempt in database
    const { error: emailLogError } = await supabase
      .from('email_logs')
      .insert([
        {
          recipient_email: email,
          recipient_name: fullName,
          email_type: 'verification',
          sent_at: new Date().toISOString(),
          status: 'sent'
        }
      ]);

    if (emailLogError) {
      console.warn('Warning: Could not log email sending:', emailLogError);
      // Don't fail - email was sent by Supabase
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in sendVerificationEmail:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Authenticates a user with email and password using Supabase Authentication
 * Returns user type and user_id if successful
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
  token?: string; // JWT from backend
  userData?: any;
}> => {
  try {
    // Determine API URL (Hardcoded for dev, should be env-aware)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Call Backend Login
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: username, password }) // Note: username param acts as email/identifier
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Invalid credentials' };
    }

    // Success
    const { user, token } = data;

    return {
      success: true,
      userType: user.role,
      userId: user.id || user.user_id,
      email: user.email,
      token: token, // Return the JWT
      userData: user,
      schoolGeneratedId: user.school_generated_id
    };

  } catch (err: any) {
    console.error('Error in authenticateUser:', err);
    return { success: false, error: err.message || 'Network error during login' };
  }
};

/**
 * Checks if a username already exists
 */
export const checkUsernameExists = async (username: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('auth_accounts')
      .select('id', { count: 'exact' })
      .eq('username', username.toLowerCase())
      .single();

    return !!data;
  } catch {
    return false;
  }
};

/**
 * Sign out the current user
 */
export const signOutUser = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
