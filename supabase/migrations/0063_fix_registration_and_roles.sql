-- =====================================================
-- FIX: STUDENT REGISTRATION & ROLE HANDSHAKE
-- Resolves: "Database error saving new user" (caused by view insert)
-- Resolves: Casing mismatches in role constraints
-- =====================================================

BEGIN;

-- 1. CONVERT auth_accounts FROM VIEW TO TABLE
-- (Required because lib/auth.ts tries to INSERT into it)
DROP VIEW IF EXISTS auth_accounts;

CREATE TABLE IF NOT EXISTS auth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    email TEXT,
    password TEXT, -- Plaintext for demo/quick login purposes
    user_type TEXT,
    role TEXT,
    school_id UUID,
    is_verified BOOLEAN DEFAULT false,
    verification_sent_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on auth_accounts
ALTER TABLE auth_accounts ENABLE ROW LEVEL SECURITY;

-- Policy for auth_accounts: Admins can manage, users can see self
CREATE POLICY "Admins can manage auth_accounts" ON auth_accounts
FOR ALL USING (
    (auth.jwt() ->> 'role' = 'admin') OR (auth.jwt() ->> 'role' = 'proprietor')
);

CREATE POLICY "Users can see own auth_account" ON auth_accounts
FOR SELECT USING (auth.uid() = user_id);

-- 2. RELAX ROLE CONSTRAINTS (Case-Insensitive)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IS NOT NULL AND lower(role) IN (
        'admin', 'teacher', 'parent', 'student', 'proprietor', 
        'inspector', 'examofficer', 'complianceofficer', 
        'superadmin', 'super_admin', 'bursar'
    ));

-- 3. REPAIR AUTH TRIGGER (handle_new_user)
-- Ensure it handles both 'role' and 'user_type' metadata and lowercases correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_school_id UUID;
BEGIN
  -- 1. Check for skip flag
  IF (new.raw_user_meta_data->>'skip_user_creation')::boolean = true THEN
    RETURN new;
  END IF;

  -- 2. Determine Role (Fallback: user_type -> role -> 'student')
  v_role := lower(COALESCE(
    new.raw_user_meta_data->>'role', 
    new.raw_user_meta_data->>'user_type', 
    'student'
  ));

  -- 3. Determine School ID
  v_school_id := (new.raw_user_meta_data->>'school_id')::uuid;

  -- 4. Create public.users record if we have a school_id
  IF v_school_id IS NOT NULL THEN
    INSERT INTO public.users (id, school_id, email, full_name, role)
    VALUES (
      new.id,
      v_school_id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', new.email),
      v_role
    )
    ON CONFLICT (id) DO UPDATE SET
      school_id = EXCLUDED.school_id,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
