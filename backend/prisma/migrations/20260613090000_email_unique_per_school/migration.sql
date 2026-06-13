-- Email is now unique PER SCHOOL + BRANCH instead of globally, so the same email
-- is a separate, independent account in a different school OR branch (multi-tenant
-- isolation: "each branch has its own rows"). Drop the global unique on email; add
-- a composite unique (school_id, branch_id, email) and keep a plain index on email
-- for fast login lookups.

DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_school_id_email_key";

CREATE UNIQUE INDEX IF NOT EXISTS "User_school_id_branch_id_email_key" ON "User"("school_id", "branch_id", "email");

CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
