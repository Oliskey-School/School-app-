-- OPTIMIZE QUIZ QUESTIONS AND SECURE ACCESS

-- 1. Ensure Index exists (already confirmed quiz_id index exists, adding composite if needed)
-- 1. Ensure Index exists
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_order ON public.quiz_questions (quiz_id, question_order ASC);


-- 2. RLS for Quiz Questions
-- Students can select questions if the quiz is assigned to their class/school
DROP POLICY IF EXISTS "Student view quiz questions" ON public.quiz_questions;

CREATE POLICY "Student view quiz questions" ON public.quiz_questions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.quizzes q
        JOIN public.students s ON s.id = (SELECT id FROM public.students WHERE user_id = auth.uid() LIMIT 1)
        WHERE q.id = quiz_questions.quiz_id
        AND (q.class_id = s.class_id OR q.class_id IS NULL) -- Simple check, can be expanded
        AND q.school_id = s.school_id
    )
);
