-- One report card per student per term per session, and one result per
-- student per exam. Both were only enforced by a find-then-create in the
-- service, which is a race: three simultaneous first saves on production
-- produced 1 success + 2 unexplained 500s, and nothing stopped duplicates.
-- Verified zero duplicate groups exist before adding these (2026-09-18).
-- Partial on deleted_at so soft-deleted rows never block a fresh one.
CREATE UNIQUE INDEX IF NOT EXISTS "ReportCard_school_student_session_term_key"
  ON "ReportCard" ("school_id", "student_id", "session", "term")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ExamResult_exam_student_key"
  ON "ExamResult" ("exam_id", "student_id")
  WHERE "deleted_at" IS NULL;

-- Audit history is read per report card; the existing (school_id, performed_at)
-- index does not cover that lookup.
CREATE INDEX IF NOT EXISTS "AuditLog_entity_idx" ON "AuditLog" ("school_id", "entity_type", "entity_id");
