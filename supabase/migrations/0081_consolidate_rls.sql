-- Migration: Consolidate RLS Policies to remove "Multiple Permissive Policies" warnings
-- Optimizing: academic_performance, academic_years, achievements, announcements, quiz_questions

-- ==============================================================================
-- 1. ACADEMIC PERFORMANCE (Grades)
-- ==============================================================================
DROP POLICY IF EXISTS "grades_admin_all" ON public.academic_performance;
DROP POLICY IF EXISTS "grades_teacher_manage" ON public.academic_performance;
DROP POLICY IF EXISTS "grades_parent_read_linked" ON public.academic_performance;
DROP POLICY IF EXISTS "grades_student_read_own" ON public.academic_performance;
DROP POLICY IF EXISTS "academic_performance_read" ON public.academic_performance;
DROP POLICY IF EXISTS "academic_performance_write" ON public.academic_performance;

-- Unified Read Policy
CREATE POLICY "academic_performance_read" ON public.academic_performance
FOR SELECT USING (
    is_school_admin(school_id)
    OR
    EXISTS ( -- Teacher
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.user_id = auth.uid() 
        AND sm.school_id = academic_performance.school_id 
        AND sm.base_role = 'teacher' 
        AND sm.is_active = true
    )
    OR
    EXISTS ( -- Student Owner
        SELECT 1 FROM public.students s
        WHERE s.id = academic_performance.student_id
        AND s.user_id = auth.uid()
    )
    OR
    EXISTS ( -- Parent Linked
        SELECT 1 FROM public.students s
        JOIN public.student_parent_links spl ON spl.student_user_id = s.user_id
        WHERE s.id = academic_performance.student_id 
        AND spl.parent_user_id = auth.uid()
    )
);

-- Unified Write Policy (Admin & Teacher)
CREATE POLICY "academic_performance_write" ON public.academic_performance
FOR ALL USING (
    is_school_admin(school_id)
    OR
    EXISTS (
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.user_id = auth.uid() 
        AND sm.school_id = academic_performance.school_id 
        AND sm.base_role = 'teacher' 
        AND sm.is_active = true
    )
);

-- ==============================================================================
-- 2. ACADEMIC YEARS
-- ==============================================================================
DROP POLICY IF EXISTS "academic_years_write_admin" ON public.academic_years;
DROP POLICY IF EXISTS "academic_years_select_member" ON public.academic_years;
DROP POLICY IF EXISTS "academic_years_read" ON public.academic_years;
DROP POLICY IF EXISTS "academic_years_write" ON public.academic_years;

CREATE POLICY "academic_years_read" ON public.academic_years
FOR SELECT USING (
    is_school_member(school_id)
);

CREATE POLICY "academic_years_write" ON public.academic_years
FOR ALL USING (
    is_school_admin(school_id)
);

-- ==============================================================================
-- 3. ACHIEVEMENTS
-- ==============================================================================
DROP POLICY IF EXISTS "Staff manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Everyone view achievements" ON public.achievements;
DROP POLICY IF EXISTS "achievements_read" ON public.achievements;
DROP POLICY IF EXISTS "achievements_write" ON public.achievements;

CREATE POLICY "achievements_read" ON public.achievements
FOR SELECT USING (
    is_school_member(school_id)
);

CREATE POLICY "achievements_write" ON public.achievements
FOR ALL USING (
    is_school_admin(school_id)
    OR
    EXISTS (
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.user_id = auth.uid() 
        AND sm.school_id = achievements.school_id 
        AND sm.base_role IN ('teacher', 'staff') 
        AND sm.is_active = true
    )
);

-- ==============================================================================
-- 4. ANNOUNCEMENTS
-- ==============================================================================
DROP POLICY IF EXISTS "Admin manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Students view announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_read" ON public.announcements;
DROP POLICY IF EXISTS "announcements_write" ON public.announcements;

-- Re-create Unified Policies
CREATE POLICY "announcements_read" ON public.announcements
FOR SELECT USING (
    -- Admins/Staff always see
    is_school_admin(school_id)
    OR
    EXISTS ( -- Teachers/Staff
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.user_id = auth.uid() 
        AND sm.school_id = announcements.school_id 
        AND sm.base_role IN ('teacher', 'staff')
    )
    OR 
    ( -- Students if target is all or specific
       (target_audience = 'all' OR target_audience = 'students')
       AND
       EXISTS (
         SELECT 1 FROM public.students s 
         WHERE s.user_id = auth.uid() 
         AND s.school_id = announcements.school_id
       )
    )
    OR
    ( -- Parents if target is all or specific
       (target_audience = 'all' OR target_audience = 'parents')
       AND
       EXISTS (
         SELECT 1 FROM public.school_memberships sm
         WHERE sm.user_id = auth.uid()
         AND sm.school_id = announcements.school_id
         AND sm.base_role = 'parent'
       )
    )
);

CREATE POLICY "announcements_write" ON public.announcements
FOR ALL USING (
    is_school_admin(school_id)
    OR
    EXISTS (
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.user_id = auth.uid() 
        AND sm.school_id = announcements.school_id 
        AND sm.base_role IN ('teacher', 'staff') 
        AND sm.is_active = true
    )
);

-- ==============================================================================
-- 5. QUIZ QUESTIONS
-- ==============================================================================
DROP POLICY IF EXISTS "Quiz questions follow quiz permissions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Student view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_access" ON public.quiz_questions;

CREATE POLICY "quiz_questions_access" ON public.quiz_questions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.quizzes q
        WHERE q.id = quiz_questions.quiz_id
        AND (
            -- Creator/Teacher Access
            q.teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
            OR
            -- Student Access (If published and in class) - Read Only essentially but RLS handles rows
            (
                q.school_id IN (SELECT school_id FROM public.students WHERE user_id = auth.uid()) 
                AND 
                (q.class_id IS NULL OR q.class_id IN (SELECT class_id FROM public.students WHERE user_id = auth.uid()))
            )
        )
    )
);
