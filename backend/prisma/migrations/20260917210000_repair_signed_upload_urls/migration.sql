-- Between 0.7.25 (2026-09-12) and 0.7.31 the upload endpoint handed back a
-- 1-hour SIGNED Supabase Storage URL, mis-joined without its /storage/v1
-- prefix:
--   https://<ref>.supabase.co/object/sign/<bucket>/<key>?token=<jwt>
-- Callers persisted that string as the permanent reference (avatar_url,
-- logo_url, document url, ...), so every image uploaded in that window 404s.
-- The objects themselves were stored fine; only the stored reference is bad.
--
-- Rewrite each such value to the object's permanent public URL:
--   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
-- Idempotent (the pattern no longer matches once rewritten) and scoped to
-- the exact malformed form — a correctly-joined signed URL under
-- /storage/v1/object/sign/ is left alone, as is every other value.
-- Column list = every text column that held one of these in production on
-- 2026-09-17 plus the other upload-URL columns the app writes to.
DO $$
DECLARE
  target record;
  touched bigint;
BEGIN
  FOR target IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('text', 'character varying')
      AND (c.table_name, c.column_name) IN (
        ('User', 'avatar_url'),
        ('Teacher', 'avatar_url'),
        ('Student', 'avatar_url'),
        ('Parent', 'avatar_url'),
        ('School', 'logo_url'),
        ('StudentDocument', 'url'),
        ('TeacherDocument', 'url'),
        ('Resource', 'url'),
        ('Resource', 'file_url'),
        ('Assignment', 'attachment_url'),
        ('AssignmentSubmission', 'file_url'),
        ('LessonPlan', 'material_url'),
        ('ChatMessage', 'attachment_url'),
        ('Message', 'attachment_url'),
        ('SOPEvidence', 'file_url')
      )
  LOOP
    EXECUTE format(
      'UPDATE %I SET %I = regexp_replace(%I, %L, %L) WHERE %I ~ %L',
      target.table_name, target.column_name, target.column_name,
      '^(https://[^/]+)/object/sign/([^?]+)\?token=.*$',
      '\1/storage/v1/object/public/\2',
      target.column_name,
      '^https://[^/]+/object/sign/[^?]+\?token='
    );
    GET DIAGNOSTICS touched = ROW_COUNT;
    IF touched > 0 THEN
      RAISE NOTICE 'repair_signed_upload_urls: % rows rewritten in %.%', touched, target.table_name, target.column_name;
    END IF;
  END LOOP;
END $$;
