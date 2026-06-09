-- Teacher attendance is now per-branch: a teacher can have one record per day PER
-- BRANCH (was one per day total, which made marking attendance in a second branch
-- silently overwrite the first branch's record).
DROP INDEX IF EXISTS "TeacherAttendance_teacher_id_date_key";
CREATE UNIQUE INDEX "TeacherAttendance_teacher_id_date_branch_id_key"
    ON "TeacherAttendance" ("teacher_id", "date", "branch_id");
