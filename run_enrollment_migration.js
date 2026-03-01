const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🚀 Running student_enrollments migration script...');

    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value.length > 0) envVars[key.trim()] = value.join('=').trim();
    });

    const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['SUPABASE_SERVICE_KEY']);

    const sql = `
-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, class_id)
);

-- 2. RLS
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- 3. Delete existing policy if it exists to avoid errors on retry
DROP POLICY IF EXISTS "School Isolation: Student Enrollments" ON public.student_enrollments;

-- 4. Create Policy
CREATE POLICY "School Isolation: Student Enrollments"
ON public.student_enrollments
FOR ALL
TO authenticated
USING (
  school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid
)
WITH CHECK (
  school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid
);

-- 5. Data Migration
INSERT INTO public.student_enrollments (student_id, class_id, school_id, branch_id, is_primary)
SELECT 
    id as student_id,
    class_id,
    school_id,
    branch_id,
    true as is_primary
FROM public.students
WHERE class_id IS NOT NULL
ON CONFLICT (student_id, class_id) DO NOTHING;
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error('❌ Migration Error:', error.message);
        process.exit(1);
    } else {
        console.log('✅ Migration Successful!');
        process.exit(0);
    }
}

runMigration();
