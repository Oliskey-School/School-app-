-- Fix for missing 'reference' column in payments table
-- This script safely updates the table schema

BEGIN;

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider VARCHAR(20) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add 'reference' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'reference') THEN
        ALTER TABLE public.payments ADD COLUMN reference VARCHAR(100);
        ALTER TABLE public.payments ADD CONSTRAINT payments_reference_key UNIQUE (reference);
    END IF;
END $$;

-- 3. Ensure other columns exist (idempotent checks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'school_id') THEN
        ALTER TABLE public.payments ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Re-create indexes to be safe
DROP INDEX IF EXISTS idx_payments_reference;
CREATE INDEX idx_payments_reference ON public.payments(reference);

DROP INDEX IF EXISTS idx_payments_school_id;
CREATE INDEX idx_payments_school_id ON public.payments(school_id);

-- 5. Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

COMMIT;
