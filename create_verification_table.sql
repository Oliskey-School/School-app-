CREATE TABLE IF NOT EXISTS "VerificationCode" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'email_verification',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ip_address" TEXT,
    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VerificationCode_user_id_idx" ON "VerificationCode"("user_id");
CREATE INDEX IF NOT EXISTS "VerificationCode_email_idx" ON "VerificationCode"("email");
CREATE INDEX IF NOT EXISTS "VerificationCode_code_idx" ON "VerificationCode"("code");

ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE;

SELECT 'VerificationCode table created successfully' AS result;
