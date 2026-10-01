-- The parent notification screen's "Email Alerts" and "Weekly Summary" switches
-- had nowhere to live: NotificationSetting stored only digest_time and the
-- categories array, so the write appeared to succeed and the next read handed
-- back the defaults.
--
-- They get their own columns rather than a key inside `categories`. That column
-- holds the category ARRAY and is asserted to be an array by
-- notification-preferences.test.ts — writing a document into it re-creates the
-- original "an empty object was written" bug that test was added to prevent.
ALTER TABLE "NotificationSetting"
    ADD COLUMN IF NOT EXISTS "email_alerts" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "NotificationSetting"
    ADD COLUMN IF NOT EXISTS "weekly_summary" BOOLEAN NOT NULL DEFAULT false;
