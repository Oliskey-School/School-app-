-- Purely additive: /api/dashboard/stats runs up to 25 tenant-scoped
-- queries per call (Promise.all), several of them COUNT/aggregate queries
-- against Teacher, Parent, Class, StudentFee, ReportCard, Timetable,
-- BehaviorNote and AcademicPerformance filtered by (school_id, branch_id).
-- None of these 8 tables had any index, so every one of those queries was
-- a full table scan. No query semantics change, nothing is dropped.
CREATE INDEX IF NOT EXISTS "Teacher_school_id_branch_id_idx"
  ON "Teacher" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "Teacher_school_id_created_at_idx"
  ON "Teacher" ("school_id", "created_at");

CREATE INDEX IF NOT EXISTS "Parent_school_id_branch_id_idx"
  ON "Parent" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "Parent_school_id_created_at_idx"
  ON "Parent" ("school_id", "created_at");

CREATE INDEX IF NOT EXISTS "Class_school_id_branch_id_idx"
  ON "Class" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "Class_school_id_created_at_idx"
  ON "Class" ("school_id", "created_at");

CREATE INDEX IF NOT EXISTS "StudentFee_school_id_branch_id_idx"
  ON "StudentFee" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "ReportCard_school_id_branch_id_idx"
  ON "ReportCard" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "Timetable_school_id_branch_id_idx"
  ON "Timetable" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "BehaviorNote_school_id_branch_id_idx"
  ON "BehaviorNote" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "BehaviorNote_school_id_created_at_idx"
  ON "BehaviorNote" ("school_id", "created_at");

CREATE INDEX IF NOT EXISTS "AcademicPerformance_school_id_branch_id_idx"
  ON "AcademicPerformance" ("school_id", "branch_id");
