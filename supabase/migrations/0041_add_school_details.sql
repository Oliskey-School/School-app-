-- Add missing columns to schools table
-- This fixes the "column 'address' of relation 'schools' does not exist" error

DO $$
BEGIN
    -- Add address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'address') THEN
        ALTER TABLE public.schools ADD COLUMN address TEXT;
    END IF;

    -- Add motto column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'motto') THEN
        ALTER TABLE public.schools ADD COLUMN motto TEXT;
    END IF;

    -- Add contact_email column if it doesn't exist (also used in the function)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'contact_email') THEN
        ALTER TABLE public.schools ADD COLUMN contact_email TEXT;
    END IF;
END $$;
