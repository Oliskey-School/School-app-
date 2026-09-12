-- Purely additive: speeds up existing tenant-scoped/hot-path queries
-- (student list, attendance history, notification feed, chat room open,
-- audit log view) that currently full-scan these tables. No query
-- semantics change, nothing is dropped.
CREATE INDEX IF NOT EXISTS "Student_school_id_branch_id_idx"
  ON "Student" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "Attendance_school_id_branch_id_idx"
  ON "Attendance" ("school_id", "branch_id");

CREATE INDEX IF NOT EXISTS "Attendance_class_id_date_idx"
  ON "Attendance" ("class_id", "date");

CREATE INDEX IF NOT EXISTS "Attendance_student_id_date_idx"
  ON "Attendance" ("student_id", "date");

CREATE INDEX IF NOT EXISTS "Notification_school_id_user_id_idx"
  ON "Notification" ("school_id", "user_id");

CREATE INDEX IF NOT EXISTS "Notification_school_id_created_at_idx"
  ON "Notification" ("school_id", "created_at");

CREATE INDEX IF NOT EXISTS "AuditLog_school_id_performed_at_idx"
  ON "AuditLog" ("school_id", "performed_at");

CREATE INDEX IF NOT EXISTS "ChatMessage_room_id_created_at_idx"
  ON "ChatMessage" ("room_id", "created_at");
