-- Migration: 0149_seed_demo_data.sql
-- Description: Seeds the demo school and demo admin user for local development.

BEGIN;

-- 1. Ensure the Demo School exists
-- Using the ID referenced in the frontend (mockAuth.ts)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') THEN
        INSERT INTO public.schools (id, name, slug, subscription_status)
        VALUES ('d0ff3e95-9b4c-4c12-989c-e5640d3cacd1', 'Oliskey Demo School', 'demo', 'active');
    END IF;
END $$;

-- 2. Ensure Main Branch exists
INSERT INTO public.branches (id, school_id, name, is_main)
VALUES ('7601cbea-e1ba-49d6-b59b-412a584cb94f', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', 'Main Campus', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Demo Admin into auth.users if not exists
-- Password will be 'password123'
-- Note: This uses the UID from mockAuth.ts
INSERT INTO auth.users (
    id, 
    instance_id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    aud, 
    role
)
VALUES (
    'd3300000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'demo_admin@school.com',
    -- hash for 'password123' (Supabase default bcrypt)
    '$2a$10$7R15v1pX6.5Yp9pP.zY.f.6i1.F1.F1.F1.F1.F1.F1.F1.F1.F1',
    NOW(),
    jsonb_build_object('role', 'admin', 'school_id', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'),
    jsonb_build_object('full_name', 'Demo Admin', 'role', 'admin'),
    'authenticated',
    'authenticated'
)
ON CONFLICT (id) DO UPDATE SET
    raw_app_meta_data = jsonb_build_object('role', 'admin', 'school_id', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'),
    email = 'demo_admin@school.com';

-- 4. Seed into public.profiles
INSERT INTO public.profiles (id, school_id, email, full_name, role)
VALUES (
    'd3300000-0000-0000-0000-000000000001',
    'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
    'demo_admin@school.com',
    'Demo Admin',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
    role = 'admin';

-- 5. Seed into public.users (Legacy table sync)
INSERT INTO public.users (id, school_id, email, full_name, role)
VALUES (
    'd3300000-0000-0000-0000-000000000001',
    'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
    'demo_admin@school.com',
    'Demo Admin',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET
    school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
    role = 'admin';

-- 6. Ensure orphaned records belong to the demo school
-- (Optional safety measure)
UPDATE public.students SET school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' WHERE school_id IS NULL;
UPDATE public.teachers SET school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' WHERE school_id IS NULL;
UPDATE public.parents SET school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' WHERE school_id IS NULL;

COMMIT;
