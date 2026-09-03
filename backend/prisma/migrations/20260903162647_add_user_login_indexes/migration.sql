-- Login indexes for the Prisma User model (mapped to the "User" table).
DROP INDEX IF EXISTS "User_school_id_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_school_id_branch_id_email_key"
  ON "User" ("school_id", "branch_id", "email");

DROP INDEX IF EXISTS "User_school_id_branch_id_idx";
DROP INDEX IF EXISTS "User_school_id_is_active_idx";
DROP INDEX IF EXISTS "idx_User_school_branch";
DROP INDEX IF EXISTS "User_email_idx";

CREATE INDEX IF NOT EXISTS "User_school_id_email_idx"
  ON "User" ("school_id", "email");

CREATE INDEX IF NOT EXISTS "User_school_id_role_id_idx"
  ON "User" ("school_id", "role", "id");
