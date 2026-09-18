-- Status values are compared case-sensitively against 'Active' / 'Inactive' /
-- 'Pending' everywhere; the enroll validator lower-cased them on the way in.
-- Normalise existing rows to canonical capitalised form. Idempotent.
UPDATE "Student" SET status = initcap(status)
 WHERE status IS NOT NULL AND status <> initcap(status);
UPDATE "StudentEnrollment" SET status = initcap(status)
 WHERE status IS NOT NULL AND status <> initcap(status);
