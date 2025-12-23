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
  return `${surname.toLowerCase()}1234`;
};

/**
 * Creates a login account for a user using Supabase Authentication
 * Returns username and password that was created
 */
export const createUserAccount = async (
  fullName: string,
  userType: 'Student' | 'Teacher' | 'Parent' | 'Admin',
  email: string,
  userId?: number
): Promise<{ username: string; password: string; error?: string }> => {
  try {
    // Extract surname (last name)
    const nameParts = fullName.trim().split(/\s+/);
    const surname = nameParts[nameParts.length - 1];

    // Generate username and password
    const username = generateUsername(fullName, userType);
    const password = generatePassword(surname);

    // Hash the password before saving to auth_accounts (for production security)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create Supabase Auth user (with auto-confirm for development)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: 'http://localhost:5173',
        data: {
          full_name: fullName,
          user_type: userType,
          username: username,
        }
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return { username, password, error: authError.message };
    }

    // 2. Insert into auth_accounts table to store username mapping
    const { error: dbError } = await supabase
      .from('auth_accounts')
      .insert([{
        username: username,
        email: email,
        password: hashedPassword,
        user_type: userType,
        user_id: userId,
        is_verified: true,  // Auto-verify for development
        verification_sent_at: new Date().toISOString(),
        verification_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }]);

    if (dbError) {
      console.error('Error inserting into auth_accounts:', dbError);
      return { username, password, error: `Auth created but DB save failed: ${dbError.message}` };
    }

    return { username, password };
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
  userType?: 'Student' | 'Teacher' | 'Parent' | 'Admin';
  userId?: string;
  email?: string;
  error?: string
}> => {
  try {
    // First, try to find the email from our auth_accounts table using username
    const { data: authAccount, error: lookupError } = await supabase
      .from('auth_accounts')
      .select('email, user_type, is_verified, verification_sent_at, verification_expires_at')
      .eq('username', username.toLowerCase())
      .single();

    if (lookupError) {
      // PGRST116: The result contains 0 rows (User not found)
      // We handle this gracefully as "Invalid credentials"
      if (lookupError.code === 'PGRST116') {
        // Only log this if it's NOT a standard failure (optional, can be removed to be silent)
        // console.warn('Authentication attempt with non-existent username:', username);
        return { success: false, error: 'Invalid credentials' };
      }

      console.error('Database lookup error:', lookupError);
      return { success: false, error: 'Invalid credentials' };
    }

    if (!authAccount) {
      return { success: false, error: 'Invalid credentials' };
    }

    // If our DB shows the account as not yet verified, attempt a fresh check
    // with Supabase Auth after sign-in. However, to avoid letting unverified
    // users proceed, we will require that email verification is completed.

    // Attempt sign-in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authAccount.email,
      password: password.toLowerCase(),
    });

    if (error) {
      console.error('Authentication error:', error);
      // If sign-in failed and the account is marked as unverified, inform the user
      if (!authAccount.is_verified) {
        return { success: false, error: 'Email not verified. Please confirm your email before logging in. The account may be deactivated if not verified within 7 days.' };
      }
      return { success: false, error: 'Invalid credentials' };
    }

    if (!data.user) {
      return { success: false, error: 'Authentication failed' };
    }

    // Fetch the latest auth user info to check email verification status
    try {
      const { data: userInfo } = await supabase.auth.getUser();
      const user = (userInfo as any)?.user;
      const emailConfirmed = user && (user.email_confirmed_at || user.confirmed_at || user.email_verified || user.identities);

      if (!emailConfirmed && !authAccount.is_verified) {
        // sign out the session we just created
        try { await supabase.auth.signOut(); } catch (_) { }
        return { success: false, error: 'Email not verified. Please confirm your email before logging in. The account may be deactivated if not verified within 7 days.' };
      }

      // If email is confirmed and our auth_accounts wasn't up to date, update it
      if (emailConfirmed && !authAccount.is_verified) {
        try {
          await supabase.from('auth_accounts').update({ is_verified: true }).eq('username', username.toLowerCase());
        } catch (updateErr) {
          console.warn('Could not update auth_accounts verification status:', updateErr);
        }
      }
    } catch (e) {
      console.warn('Could not fetch user info after sign-in to validate email verification:', e);
    }

    return {
      success: true,
      userType: authAccount.user_type,
      userId: data.user.id,
      email: data.user.email,
    };
  } catch (err: any) {
    console.error('Error in authenticateUser:', err);
    return { success: false, error: err.message };
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
