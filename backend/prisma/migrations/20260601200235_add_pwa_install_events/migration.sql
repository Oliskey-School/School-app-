-- CreateTable
CREATE TABLE "PwaInstallEvent" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT,
    "branch_id" TEXT,
    "action" TEXT NOT NULL,
    "platform" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PwaInstallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PwaInstallEvent_user_id_idx" ON "PwaInstallEvent"("user_id");

-- CreateIndex
CREATE INDEX "PwaInstallEvent_school_id_idx" ON "PwaInstallEvent"("school_id");

-- CreateIndex
CREATE INDEX "PwaInstallEvent_action_idx" ON "PwaInstallEvent"("action");

-- CreateIndex
CREATE INDEX "PwaInstallEvent_created_at_idx" ON "PwaInstallEvent"("created_at");
