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
  userType: 'Student' | 'Teacher' | 'Parent' | 'Admin' | 'Principal' | 'Counselor',
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

    // For MVP/Demo, we are storing plaintext to match the simple RPC login.
    // In production, uncomment the next line and update the RPC to check hashes.
    // const hashedPassword = await bcrypt.hash(password, 10);

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
        password: password, // Store plaintext for simple RPC login
        user_type: userType,
        user_id: userId,
        is_verified: true,
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
  userType?: 'Student' | 'Teacher' | 'Parent' | 'Admin' | 'Principal' | 'Counselor';
  userId?: string; // We return string for compatibility, though DB gives number
  email?: string;
  error?: string
}> => {
  try {
    // Call the database function to verify credentials
    // This bypasses Supabase Auth email verification requirement for a smoother UX
    const { data, error } = await supabase.rpc('authenticate_user', {
      username_input: username.toLowerCase(),
      password_input: password
    });

    if (error) {
      console.error('RPC Error:', error);
      return { success: false, error: 'Invalid credentials' };
    }

    // RPC returns an array (set of rows). If empty, no match.
    if (!data || data.length === 0) {
      return { success: false, error: 'Invalid credentials' };
    }

    const user = data[0];

    return {
      success: true,
      userType: user.role as any,
      userId: user.id.toString(), // Convert number to string for context compatibility
      email: user.email,
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
