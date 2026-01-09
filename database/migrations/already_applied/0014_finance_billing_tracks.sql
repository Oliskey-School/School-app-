-- Phase 10: Step 15 Finance & Billing

-- Add curriculum_type to fees if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fees' AND column_name='curriculum_type') THEN
        ALTER TABLE public.fees ADD COLUMN curriculum_type TEXT DEFAULT 'General' CHECK (curriculum_type IN ('Nigerian', 'British', 'Dual', 'General'));
    END IF;
END $$;
