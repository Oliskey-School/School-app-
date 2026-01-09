-- Add has_payment_plan field to fees table
-- This indicates when a fee has an associated installment payment plan

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fees' 
        AND column_name = 'has_payment_plan'
    ) THEN
        ALTER TABLE fees ADD COLUMN has_payment_plan BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_fees_has_payment_plan ON fees(has_payment_plan) WHERE has_payment_plan = true;

-- Update existing fees that have payment plans
UPDATE fees
SET has_payment_plan = true
WHERE id IN (
    SELECT DISTINCT fee_id 
    FROM payment_plans 
    WHERE status = 'active'
);
