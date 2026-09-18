-- Per-user read marks for shared (audience) notifications. Idempotent.
CREATE TABLE IF NOT EXISTS "NotificationRead" (
  "id"              TEXT PRIMARY KEY,
  "school_id"       TEXT NOT NULL,
  "notification_id" TEXT NOT NULL,
  "user_id"         TEXT NOT NULL,
  "read_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationRead_notification_id_user_id_key" ON "NotificationRead" ("notification_id", "user_id");
CREATE INDEX IF NOT EXISTS "NotificationRead_school_id_user_id_idx" ON "NotificationRead" ("school_id", "user_id");

ALTER TABLE "NotificationRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationRead" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "NotificationRead";
CREATE POLICY tenant_isolation ON "NotificationRead"
  USING (school_id = (select current_setting('app.current_school_id', true)) OR (select coalesce(current_setting('app.bypass_rls', true), '')) = 'on')
  WITH CHECK (school_id = (select current_setting('app.current_school_id', true)) OR (select coalesce(current_setting('app.bypass_rls', true), '')) = 'on');
