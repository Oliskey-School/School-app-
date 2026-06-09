-- Per-student subject assignment (authoritative when non-empty; empty inherits the class)
ALTER TABLE "Student" ADD COLUMN "assigned_subjects" TEXT[] NOT NULL DEFAULT '{}';
