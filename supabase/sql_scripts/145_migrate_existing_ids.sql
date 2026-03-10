-- Migration: Standardize Existing IDs across all tables
-- Description: Updates all existing profiles, teachers, students, and parents to follow the School_Branch_Role_Number format.

BEGIN;

-- 1. Create temporary function for role codes
CREATE OR REPLACE FUNCTION public.migrate_get_v_role_code(p_role TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE 
        WHEN lower(p_role) IN ('teacher', 'tch', 'staff') THEN 'TCH'
        WHEN lower(p_role) IN ('student', 'stu', 'std') THEN 'STU'
        WHEN lower(p_role) IN ('parent', 'par') THEN 'PAR'
        WHEN lower(p_role) IN ('admin', 'adm', 'school_admin') THEN 'ADM'
        WHEN lower(p_role) = 'superadmin' THEN 'SADM'
        WHEN lower(p_role) = 'proprietor' THEN 'PRO'
        WHEN lower(p_role) = 'inspector' THEN 'INS'
        WHEN lower(p_role) = 'examofficer' THEN 'EXM'
        WHEN lower(p_role) = 'complianceofficer' THEN 'CMP'
        WHEN lower(p_role) = 'counselor' THEN 'CNS'
        ELSE 'USR'
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. Update Profiles
WITH formatted_profiles AS (
    SELECT 
        p.id,
        COALESCE(s.short_code, s.code, 'SCH') as school_code,
        COALESCE(b.short_code, b.code, 'MAIN') as branch_code,
        public.migrate_get_v_role_code(p.role) as role_code,
        COALESCE(substring(p.school_generated_id from '(\d+)$'), '001') as raw_num
    FROM public.profiles p
    LEFT JOIN public.schools s ON p.school_id = s.id
    LEFT JOIN public.branches b ON p.branch_id = b.id
)
UPDATE public.profiles p
SET school_generated_id = fp.school_code || '_' || fp.branch_code || '_' || fp.role_code || '_' || lpad(fp.raw_num, 3, '0')
FROM formatted_profiles fp
WHERE p.id = fp.id
AND (p.school_generated_id IS NULL OR p.school_generated_id !~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_\d{3}$');

-- 3. Update Teachers
WITH formatted_teachers AS (
    SELECT 
        t.id,
        COALESCE(s.short_code, s.code, 'SCH') as school_code,
        COALESCE(b.short_code, b.code, 'MAIN') as branch_code,
        'TCH' as role_code,
        COALESCE(substring(t.school_generated_id from '(\d+)$'), '001') as raw_num
    FROM public.teachers t
    LEFT JOIN public.schools s ON t.school_id = s.id
    LEFT JOIN public.branches b ON t.branch_id = b.id
)
UPDATE public.teachers t
SET school_generated_id = ft.school_code || '_' || ft.branch_code || '_' || ft.role_code || '_' || lpad(ft.raw_num, 3, '0')
FROM formatted_teachers ft
WHERE t.id = ft.id
AND (t.school_generated_id IS NULL OR t.school_generated_id !~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_\d{3}$');

-- 4. Update Students
WITH formatted_students AS (
    SELECT 
        st.id,
        COALESCE(s.short_code, s.code, 'SCH') as school_code,
        COALESCE(b.short_code, b.code, 'MAIN') as branch_code,
        'STU' as role_code,
        COALESCE(substring(st.school_generated_id from '(\d+)$'), '001') as raw_num
    FROM public.students st
    LEFT JOIN public.schools s ON st.school_id = s.id
    LEFT JOIN public.branches b ON st.branch_id = b.id
)
UPDATE public.students st
SET school_generated_id = fst.school_code || '_' || fst.branch_code || '_' || fst.role_code || '_' || lpad(fst.raw_num, 3, '0')
FROM formatted_students fst
WHERE st.id = fst.id
AND (st.school_generated_id IS NULL OR st.school_generated_id !~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_\d{3}$');

-- 5. Update Parents
WITH formatted_parents AS (
    SELECT 
        pt.id,
        COALESCE(s.short_code, s.code, 'SCH') as school_code,
        COALESCE(b.short_code, b.code, 'MAIN') as branch_code,
        'PAR' as role_code,
        COALESCE(substring(pt.school_generated_id from '(\d+)$'), '001') as raw_num
    FROM public.parents pt
    LEFT JOIN public.schools s ON pt.school_id = s.id
    LEFT JOIN public.branches b ON pt.branch_id = b.id
)
UPDATE public.parents pt
SET school_generated_id = fpt.school_code || '_' || fpt.branch_code || '_' || fpt.role_code || '_' || lpad(fpt.raw_num, 3, '0')
FROM formatted_parents fpt
WHERE pt.id = fpt.id
AND (pt.school_generated_id IS NULL OR pt.school_generated_id !~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_\d{3}$');

-- Clean up
DROP FUNCTION public.migrate_get_v_role_code(TEXT);

COMMIT;
