-- ============================================
-- MIGRATION: Create Profiles Table with Auth Sync
-- Purpose: Unified user profiles linked to Supabase Auth
-- ============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  
  -- Links to existing role-specific tables
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  parent_id INTEGER REFERENCES parents(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Add user_id column to existing tables if not exists (for future auth sync)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='students' AND column_name='auth_user_id') THEN
    ALTER TABLE students ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='teachers' AND column_name='auth_user_id') THEN
    ALTER TABLE teachers ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='parents' AND column_name='auth_user_id') THEN
    ALTER TABLE parents ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Function to auto-create profile when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from metadata (set during signup)
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    user_role
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to run on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;

COMMENT ON TABLE profiles IS 'Unified user profiles synced with Supabase Auth';
COMMENT ON COLUMN profiles.role IS 'User role: student, teacher, parent, or admin';
COMMENT ON COLUMN profiles.student_id IS 'Link to students table for student users';
COMMENT ON COLUMN profiles.teacher_id IS 'Link to teachers table for teacher users';
COMMENT ON COLUMN profiles.parent_id IS 'Link to parents table for parent users';
