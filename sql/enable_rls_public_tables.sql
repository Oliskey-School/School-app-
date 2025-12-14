-- enable_rls_public_tables.sql
--
-- Enables Row Level Security (RLS) on public tables flagged by the linter
-- and creates example policies for authenticated users.
-- IMPORTANT: These example policies are permissive (they grant access to
-- the `authenticated` role). Review and replace the USING / WITH CHECK
-- expressions with owner-based checks (for example ``owner_id = auth.uid()``)
-- or other business logic to restrict access to only appropriate rows.
--
-- Supabase docs: https://supabase.com/docs/guides/auth#row-level-security-rls

BEGIN;

-- List of tables reported by the linter. Customize policies as needed.

-- chat schema (chat app)
ALTER TABLE IF EXISTS public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on chat_rooms" ON public.chat_rooms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on chat_rooms" ON public.chat_rooms
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on chat_rooms" ON public.chat_rooms
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on chat_rooms" ON public.chat_rooms
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on chat_participants" ON public.chat_participants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on chat_participants" ON public.chat_participants
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on chat_participants" ON public.chat_participants
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on chat_participants" ON public.chat_participants
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on chat_messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on chat_messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on chat_messages" ON public.chat_messages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on chat_messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on chat_message_reactions" ON public.chat_message_reactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on chat_message_reactions" ON public.chat_message_reactions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on chat_message_reactions" ON public.chat_message_reactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on chat_message_reactions" ON public.chat_message_reactions
  FOR DELETE TO authenticated USING (true);

-- presence
ALTER TABLE IF EXISTS public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on user_presence" ON public.user_presence
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on user_presence" ON public.user_presence
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on user_presence" ON public.user_presence
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on user_presence" ON public.user_presence
  FOR DELETE TO authenticated USING (true);

-- bus / transport
ALTER TABLE IF EXISTS public.bus_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on bus_routes" ON public.bus_routes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on bus_routes" ON public.bus_routes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on bus_routes" ON public.bus_routes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on bus_routes" ON public.bus_routes
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.bus_roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on bus_roster" ON public.bus_roster
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on bus_roster" ON public.bus_roster
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on bus_roster" ON public.bus_roster
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on bus_roster" ON public.bus_roster
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on drivers" ON public.drivers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on drivers" ON public.drivers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on drivers" ON public.drivers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on drivers" ON public.drivers
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.pickup_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on pickup_points" ON public.pickup_points
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on pickup_points" ON public.pickup_points
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on pickup_points" ON public.pickup_points
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on pickup_points" ON public.pickup_points
  FOR DELETE TO authenticated USING (true);

-- audit / logs
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on audit_logs" ON public.audit_logs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on audit_logs" ON public.audit_logs
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on health_logs" ON public.health_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on health_logs" ON public.health_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on health_logs" ON public.health_logs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on health_logs" ON public.health_logs
  FOR DELETE TO authenticated USING (true);

-- core user / school data
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on users" ON public.users
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on users" ON public.users
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on users" ON public.users
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on users" ON public.users
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on students" ON public.students
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on students" ON public.students
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on students" ON public.students
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on students" ON public.students
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on teachers" ON public.teachers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on teachers" ON public.teachers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on teachers" ON public.teachers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on teachers" ON public.teachers
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on parents" ON public.parents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on parents" ON public.parents
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on parents" ON public.parents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on parents" ON public.parents
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on classes" ON public.classes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on classes" ON public.classes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on classes" ON public.classes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on classes" ON public.classes
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on assignments" ON public.assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on assignments" ON public.assignments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on assignments" ON public.assignments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on assignments" ON public.assignments
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on notices" ON public.notices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on notices" ON public.notices
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on notices" ON public.notices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on notices" ON public.notices
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.student_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on student_fees" ON public.student_fees
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on student_fees" ON public.student_fees
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on student_fees" ON public.student_fees
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on student_fees" ON public.student_fees
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.teacher_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on teacher_subjects" ON public.teacher_subjects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on teacher_subjects" ON public.teacher_subjects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on teacher_subjects" ON public.teacher_subjects
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on teacher_subjects" ON public.teacher_subjects
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.teacher_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on teacher_classes" ON public.teacher_classes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on teacher_classes" ON public.teacher_classes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on teacher_classes" ON public.teacher_classes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on teacher_classes" ON public.teacher_classes
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on timetable" ON public.timetable
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on timetable" ON public.timetable
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on timetable" ON public.timetable
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on timetable" ON public.timetable
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.parent_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on parent_children" ON public.parent_children
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on parent_children" ON public.parent_children
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on parent_children" ON public.parent_children
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on parent_children" ON public.parent_children
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.student_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on student_attendance" ON public.student_attendance
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on student_attendance" ON public.student_attendance
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on student_attendance" ON public.student_attendance
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on student_attendance" ON public.student_attendance
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.academic_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on academic_performance" ON public.academic_performance
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on academic_performance" ON public.academic_performance
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on academic_performance" ON public.academic_performance
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on academic_performance" ON public.academic_performance
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on submissions" ON public.submissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on submissions" ON public.submissions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on submissions" ON public.submissions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on submissions" ON public.submissions
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on exams" ON public.exams
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on exams" ON public.exams
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on exams" ON public.exams
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on exams" ON public.exams
  FOR DELETE TO authenticated USING (true);

-- forum / messaging / store
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on conversations" ON public.conversations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on conversations" ON public.conversations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on conversations" ON public.conversations
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on messages" ON public.messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on messages" ON public.messages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on messages" ON public.messages
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.forum_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on forum_topics" ON public.forum_topics
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on forum_topics" ON public.forum_topics
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on forum_topics" ON public.forum_topics
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on forum_topics" ON public.forum_topics
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on forum_posts" ON public.forum_posts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on forum_posts" ON public.forum_posts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on forum_posts" ON public.forum_posts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on forum_posts" ON public.forum_posts
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on store_products" ON public.store_products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on store_products" ON public.store_products
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on store_products" ON public.store_products
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on store_products" ON public.store_products
  FOR DELETE TO authenticated USING (true);

ALTER TABLE IF EXISTS public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated select on store_orders" ON public.store_orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on store_orders" ON public.store_orders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on store_orders" ON public.store_orders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on store_orders" ON public.store_orders
  FOR DELETE TO authenticated USING (true);

COMMIT;

-- Notes:
-- 1) Replace the permissive USING/WITH CHECK (true) conditions with the
--    appropriate predicates (for example "owner_id = auth.uid()") to ensure
--    users can only access rows they own.
-- 2) If you need public read access for some tables, consider granting
--    explicit SELECT to the `anon` role instead of leaving broad policies.
-- 3) The `service_role` bypasses RLS; never expose `service_role` credentials
--    to clients. Use server-side code for privileged operations.
-- 4) Run this file against your database after reviewing and customizing it.
