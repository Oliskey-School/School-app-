-- School App Full Backup
SET session_replication_role = 'replica';

-- CORE TABLES SCHEMA
CREATE TABLE IF NOT EXISTS public.schools (id uuid PRIMARY KEY, name text, school_type text, is_active boolean, created_at timestamptz, code text, slug text, logo_url text, subscription_status text, primary_color text, secondary_color text, motto text, is_premium boolean, plan_type text, user_count integer, address text, contact_email text, updated_at timestamptz, email text, phone text, state text, registration_number text, short_code text, is_demo_mode boolean, owner_id uuid, curricula_config jsonb, curriculum_type text, lga text, infrastructure_config jsonb, onboarding_step integer, is_onboarded boolean, settings jsonb, trial_ends_at timestamptz);
CREATE TABLE IF NOT EXISTS public.branches (id uuid PRIMARY KEY, school_id uuid, name text, address text, phone text, is_main boolean, created_at timestamptz, curriculum_type text, location text, updated_at timestamptz, code text, short_code text);
CREATE TABLE IF NOT EXISTS public.classes (id uuid PRIMARY KEY, name text, level text, created_at timestamptz, school_id uuid, section text, branch_id uuid, grade integer, department text, updated_at timestamptz, level_category text);
CREATE TABLE IF NOT EXISTS public.profiles (id uuid PRIMARY KEY, full_name text, phone text, avatar_url text, created_at timestamptz, updated_at timestamptz, school_id uuid, role text, email text, username text, is_active boolean, school_generated_id text, branch_id uuid);
CREATE TABLE IF NOT EXISTS public.students (id uuid PRIMARY KEY, school_id uuid, user_id uuid, name text, email text, class_id uuid, enrollment_number text, created_at timestamptz, branch_id uuid, grade integer, updated_at timestamptz, admission_number text, current_class_id uuid, school_generated_id text, avatar_url text, birthday date, section text, attendance_status text, first_name text, last_name text, date_of_birth date, gender text, birth_certificate text, previous_report text, medical_records text, passport_photo text, department text, address text, status text, parent_id uuid, dob date, xp integer, level integer, badges jsonb, curriculum text);
CREATE TABLE IF NOT EXISTS public.subjects (id uuid PRIMARY KEY, school_id uuid, name text, code text, is_active boolean, created_at timestamptz, category text, grade_level_category text, is_core boolean, updated_at timestamptz, curriculum_id uuid, curriculum_source_url text, last_synced_at timestamptz, version_tag text);
CREATE TABLE IF NOT EXISTS public.users (id uuid PRIMARY KEY, school_id uuid, email text, full_name text, role text, created_at timestamptz, avatar_url text, name text, branch_id uuid, staff_id text, custom_id text, updated_at timestamptz, is_active boolean, password_hash text, email_verified boolean, school_generated_id text);
CREATE TABLE IF NOT EXISTS public.student_attendance (id uuid PRIMARY KEY, school_id uuid, student_id uuid, class_id uuid, date date, status text, marked_by uuid, remarks text, created_at timestamptz, updated_at timestamptz, branch_id uuid);
CREATE TABLE IF NOT EXISTS public.notifications (id uuid PRIMARY KEY, school_id uuid, user_id uuid, title text, message text, is_read boolean, created_at timestamptz, audience jsonb, category text, branch_id uuid);
CREATE TABLE IF NOT EXISTS public.assignments (id uuid PRIMARY KEY, school_id uuid, academic_year_id uuid, term_id uuid, class_section_id uuid, subject_id uuid, title text, content_summary text, attachment_url text, due_at timestamptz, created_by uuid, created_at timestamptz, updated_at timestamptz, class_id uuid, teacher_id uuid, max_score text, status text, description text, due_date timestamp, branch_id uuid, class_name text, subject text, total_students integer, submissions_count integer, grade text);
CREATE TABLE IF NOT EXISTS public.student_fees (id uuid PRIMARY KEY, student_id uuid, school_id uuid, title text, amount numeric, paid_amount numeric, status text, due_date date, created_at timestamptz, description text, branch_id uuid, curriculum_type text, updated_at timestamptz);
CREATE TABLE IF NOT EXISTS public.parent_children (id uuid PRIMARY KEY, parent_id uuid, student_id uuid, school_id uuid, updated_at timestamptz, branch_id uuid);
CREATE TABLE IF NOT EXISTS public.curriculum_levels (id uuid PRIMARY KEY, standard_id uuid, level_code text, level_name text, age_range text, sequence_order integer, metadata jsonb, created_at timestamptz);
CREATE TABLE IF NOT EXISTS public.curriculum_subjects (id uuid PRIMARY KEY, standard_id uuid, level_id uuid, name text, code text, category text, is_mandatory boolean, description text, metadata jsonb, created_at timestamptz);

-- DATA INSERTION
INSERT INTO public.schools (id, name, school_type, is_active, created_at, code, slug, subscription_status, onboarding_step, is_onboarded) VALUES
('042f973b-8d09-4964-9073-eb6274dbb9ad', 'Test Live School 1773316439613', 'both', true, '2026-03-12 11:54:02.395097+00', 'TLS9613', 'test-live-school-1773316439613-mmnetmok', 'trial', 5, true),
('d0ff3e95-9b4c-4c12-989c-e5640d3cacd1', 'Oliskeylee school', 'both', true, '2026-01-24 23:08:06.643836+00', 'OLISKEY', 'oliskey-demo', 'active', 1, false) ON CONFLICT DO NOTHING;

INSERT INTO public.branches (id, school_id, name, is_main) VALUES
('29d04f13-b660-451d-ac88-dcd499acc382', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', 'Lekki phase 1 ', false),
('7601cbea-e1ba-49d6-b59b-412a584cb94f', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', 'Main Branch of Lekki ', true) ON CONFLICT DO NOTHING;

INSERT INTO public.classes (id, name, level, school_id, branch_id, grade) VALUES
('e9c147c2-b48b-40e6-bb0b-fdb9ee7e9875', 'SSS 1', 'SSS', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', '7601cbea-e1ba-49d6-b59b-412a584cb94f', 10) ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, full_name, school_id, role, email, is_active) VALUES
('014811ea-281f-484e-b039-e37beb8d92b2', 'System Admin', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', 'admin', 'user@school.com', true) ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, school_id, email, full_name, role, is_active) VALUES
('014811ea-281f-484e-b039-e37beb8d92b2', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', 'user@school.com', 'System Admin', 'admin', true) ON CONFLICT DO NOTHING;

SET session_replication_role = 'origin';
