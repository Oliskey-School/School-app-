-- Plaintext passwords must never be persisted. The column held the generated
-- first password of every account in clear text. Dropping it deletes that data;
-- generated passwords are now returned ONCE in the create/reset response only.
ALTER TABLE "User" DROP COLUMN IF EXISTS "initial_password";
