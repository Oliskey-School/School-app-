-- AI Assistant chat history: one row per conversation, owned by one user.
--
-- Safe to re-run (every statement is guarded) and safe on a live database:
--   * the table is new, so no existing rows are locked or rewritten;
--   * RLS is enabled AND forced, and its policy created, in this same
--     migration. Production has an event trigger that turns RLS on for every
--     new table with no policy (deny-all), so shipping the table without the
--     policy would make every read and write fail;
--   * the policy is the standard tenant + branch policy every school_id /
--     branch_id table uses (copied from 20260823000000_rls_performance via
--     20261007100000_family_referrals). It keeps rows inside their school and
--     branch; "only the owner may read it" is enforced in the service, which
--     filters every query by the signed-in user's id;
--   * the composite (school_id, branch_id) -> Branch FK is the invariant the
--     migration-safety / db-security-check gates assert for every table that
--     carries both columns (see 20260924130000_school_branch_pair_all_tables).
--     branch_id is nullable, so ON DELETE SET NULL (branch_id) on PG15+, with
--     the same pre-15 fallback that migration uses.

CREATE TABLE IF NOT EXISTS "AiConversation" (
  "id"          TEXT NOT NULL,
  "school_id"   TEXT NOT NULL,
  "branch_id"   TEXT,
  "user_id"     TEXT NOT NULL,
  "title"       TEXT NOT NULL DEFAULT 'New chat',
  "messages"    JSONB NOT NULL DEFAULT '[]',
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_AiConversation_school_branch" ON "AiConversation" ("school_id", "branch_id");
CREATE INDEX IF NOT EXISTS "idx_AiConversation_user_updated" ON "AiConversation" ("user_id", "updated_at");

DO $$
DECLARE
  pg15 boolean := current_setting('server_version_num')::int >= 150000;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiConversation_school_id_fkey') THEN
    ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_school_id_fkey"
      FOREIGN KEY ("school_id") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiConversation_user_id_fkey') THEN
    ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiConversation_school_branch_fkey') THEN
    -- Same per-table exception handling as 20260924130000: if the Branch
    -- (school_id, id) key is somehow absent, record it and carry on rather
    -- than leave a failed row that blocks every later deploy (P3009). The
    -- migration-safety invariant ("every school_id+branch_id table carries
    -- <table>_school_branch_fkey") still fails CI loudly if this is skipped.
    BEGIN
      EXECUTE format(
        'ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_school_branch_fkey" '
        'FOREIGN KEY (school_id, branch_id) REFERENCES "Branch" (school_id, id) ON UPDATE CASCADE %s',
        CASE WHEN pg15 THEN 'ON DELETE SET NULL (branch_id)' ELSE 'ON DELETE NO ACTION' END);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'AiConversation school/branch pair FK not added: %', SQLERRM;
    END;
  END IF;
END $$;

ALTER TABLE "AiConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiConversation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AiConversation";
CREATE POLICY tenant_isolation ON "AiConversation"
  USING ((school_id = (select current_setting('app.current_school_id', true)) AND (branch_id IS NULL OR (select current_setting('app.current_branch_ids', true)) = '' OR branch_id = ANY(string_to_array((select current_setting('app.current_branch_ids', true)), ',')))) OR (select coalesce(current_setting('app.bypass_rls', true), '')) = 'on')
  WITH CHECK ((school_id = (select current_setting('app.current_school_id', true)) AND (branch_id IS NULL OR (select current_setting('app.current_branch_ids', true)) = '' OR branch_id = ANY(string_to_array((select current_setting('app.current_branch_ids', true)), ',')))) OR (select coalesce(current_setting('app.bypass_rls', true), '')) = 'on');

