-- Direct student -> bus link, so the Admin "Edit Student" bus dropdown has
-- somewhere to actually save its selection (previously the frontend sent
-- school_bus_id but no such column existed, so the value was silently dropped).

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "school_bus_id" TEXT;

DO $$ BEGIN
    ALTER TABLE "Student" ADD CONSTRAINT "Student_school_bus_id_fkey"
        FOREIGN KEY ("school_bus_id") REFERENCES "TransportBus"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Student_school_bus_id_idx" ON "Student"("school_bus_id");
