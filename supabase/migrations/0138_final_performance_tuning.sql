-- Migration: Final Performance Tuning & Index Optimization
-- Description: Adds strategic indexes to support fast multi-tenant queries and real-time features.

BEGIN;

-- 1. Core Multi-Tenancy Indexes (High Impact)
-- school_id is used in almost every query to scope data.
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_parents_school_id ON public.parents(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON public.assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_school_id ON public.student_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_school_id ON public.student_attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_notices_school_id ON public.notices(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_school_id ON public.timetable(school_id);

-- 2. Foreign Key & Relation Indexes
-- user_id lookups during login/auth
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON public.parents(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id); -- id is user_id in profiles

-- class and student relations
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(current_class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher_id ON public.timetable(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_student_id ON public.student_fees(student_id);

-- 3. Search & Filter Optimization
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_teachers_name ON public.teachers USING gin (name gin_trgm_ops);

-- 4. Messaging Performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);

-- 5. Statistics Update
ANALYZE public.students;
ANALYZE public.teachers;
ANALYZE public.classes;
ANALYZE public.assignments;
ANALYZE public.timetable;
ANALYZE public.student_attendance;
ANALYZE public.student_fees;

COMMIT;
