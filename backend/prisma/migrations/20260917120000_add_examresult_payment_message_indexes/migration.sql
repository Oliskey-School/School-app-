-- Purely additive: speeds up existing tenant-scoped/hot-path queries
-- (student/parent exam-result history, exam result-sheet grading view,
-- fee/payment statements, payment reference dedup lookups, parent inbox,
-- class roster + enrollment-status lookups) that currently full-scan
-- these tables. No query semantics change, nothing is dropped.
CREATE INDEX IF NOT EXISTS "ExamResult_school_id_branch_id_idx"
  ON "ExamResult" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "ExamResult_student_id_created_at_idx"
  ON "ExamResult" ("student_id", "created_at");

CREATE INDEX IF NOT EXISTS "ExamResult_exam_id_idx"
  ON "ExamResult" ("exam_id");

CREATE INDEX IF NOT EXISTS "Payment_school_id_branch_id_idx"
  ON "Payment" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "Payment_school_id_student_id_idx"
  ON "Payment" ("school_id", "student_id");

CREATE INDEX IF NOT EXISTS "Payment_reference_idx"
  ON "Payment" ("reference");

CREATE INDEX IF NOT EXISTS "Message_school_id_receiver_id_idx"
  ON "Message" ("school_id", "receiver_id");

CREATE INDEX IF NOT EXISTS "Message_school_id_sender_id_idx"
  ON "Message" ("school_id", "sender_id");

CREATE INDEX IF NOT EXISTS "StudentEnrollment_class_id_status_idx"
  ON "StudentEnrollment" ("class_id", "status");
