-- Add publish state to timetable rows. Default 'Draft'; the Editor's "Publish Live"
-- sets 'Published'. Drives the Published / Draft / No Timetable lights on the dashboard.
ALTER TABLE "Timetable" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'Draft';
