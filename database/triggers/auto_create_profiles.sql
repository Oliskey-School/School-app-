-- AUTO-CREATE PROFILES TRIGGER
-- Run this in Supabase SQL Editor
-- This ensures that when you create a user in the Dashboard, the Profile is automatically created!

BEGIN;

-- 1. Create the function to handle new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_role text;
  demo_school_id uuid;
BEGIN
  -- Default to student
  extracted_role := 'student';
  -- Use the Demo School ID we created earlier
  demo_school_id := '00000000-0000-0000-0000-000000000001';

  -- Auto-detect role from email (for demo purposes)
  IF new.email ILIKE '%admin%' THEN extracted_role := 'admin';
  ELSIF new.email ILIKE '%teacher%' THEN extracted_role := 'teacher';
  ELSIF new.email ILIKE '%parent%' THEN extracted_role := 'parent';
  ELSIF new.email ILIKE '%inspector%' THEN extracted_role := 'inspector';
  ELSIF new.email ILIKE '%proprietor%' THEN extracted_role := 'proprietor';
  END IF;

  -- Insert the profile
  INSERT INTO public.profiles (id, email, role, full_name, school_id, created_at)
  VALUES (
    new.id,
    new.email,
    extracted_role,
    'Demo ' || INITCAP(extracted_role), -- e.g. "Demo Teacher"
    demo_school_id,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;

SELECT '✅ Trigger created! Now creating users in Dashboard will auto-create profiles.' as status;
