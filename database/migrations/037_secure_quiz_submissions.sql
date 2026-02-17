-- SECURE QUIZ SUBMISSIONS FOR PARENTS
-- Replaces usage of legacy parent_children/parent_student_links with student_parent_links

DROP POLICY IF EXISTS "Parents view linked children submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_parent_view" ON public.quiz_submissions;

CREATE POLICY "quiz_submissions_parent_view" ON public.quiz_submissions
FOR SELECT USING (
    EXISTS (
        SELECT 1 
        FROM public.students s
        JOIN public.student_parent_links spl ON spl.student_user_id = s.user_id
        WHERE s.id = quiz_submissions.student_id
        AND spl.parent_user_id = (SELECT auth.uid())
        AND spl.is_active = true
    )
);
