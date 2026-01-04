-- Migration: Add Payment Plans and Installments Support
-- Description: Allows fees to be paid in multiple installments with scheduled due dates

-- =====================================================
-- 1. Payment Plans Table
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_plans (
    id SERIAL PRIMARY KEY,
    fee_id INTEGER NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    installment_count INTEGER NOT NULL CHECK (installment_count > 0),
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'weekly', 'monthly', 'termly', 'custom'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id),
    
    -- Constraints
    CONSTRAINT valid_frequency CHECK (frequency IN ('weekly', 'monthly', 'termly', 'custom'))
);

-- =====================================================
-- 2. Installments Table
-- =====================================================
CREATE TABLE IF NOT EXISTS installments (
    id SERIAL PRIMARY KEY,
    payment_plan_id INTEGER NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL CHECK (installment_number > 0),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'partial', 'overdue'
    paid_at TIMESTAMP,
    transaction_id INTEGER REFERENCES transactions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
    CONSTRAINT paid_amount_valid CHECK (paid_amount >= 0 AND paid_amount <= amount),
    UNIQUE (payment_plan_id, installment_number)
);

-- =====================================================
-- 3. Add provider tracking to transactions
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='provider') THEN
        ALTER TABLE transactions ADD COLUMN provider VARCHAR(50) DEFAULT 'Paystack';
    END IF;
END $$;

-- Add mobile money fields
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='mobile_money_provider') THEN
        ALTER TABLE transactions ADD COLUMN mobile_money_provider VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='transactions' AND column_name='mobile_money_number') THEN
        ALTER TABLE transactions ADD COLUMN mobile_money_number VARCHAR(20);
    END IF;
END $$;

-- =====================================================
-- 4. Create Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_payment_plans_fee ON payment_plans(fee_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_student ON payment_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON payment_plans(status);

CREATE INDEX IF NOT EXISTS idx_installments_plan ON installments(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_transaction ON installments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider);

-- =====================================================
-- 5. Create Triggers for Auto-updating Status
-- =====================================================

-- Function to update installment status based on paid_amount
CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.paid_amount >= NEW.amount THEN
        NEW.status := 'paid';
        NEW.paid_at := CURRENT_TIMESTAMP;
    ELSIF NEW.paid_amount > 0 THEN
        NEW.status := 'partial';
    ELSIF NEW.due_date < CURRENT_DATE AND NEW.paid_amount = 0 THEN
        NEW.status := 'overdue';
    ELSE
        NEW.status := 'pending';
    END IF;
    
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for installments
DROP TRIGGER IF EXISTS trg_update_installment_status ON installments;
CREATE TRIGGER trg_update_installment_status
    BEFORE UPDATE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION update_installment_status();

-- Function to update payment plan status
CREATE OR REPLACE FUNCTION update_payment_plan_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10,2);
    plan_amount DECIMAL(10,2);
    plan_id INTEGER;
BEGIN
    -- Get the payment plan ID from the installment
    plan_id := NEW.payment_plan_id;
    
    -- Calculate total paid amount for this plan
    SELECT SUM(paid_amount), MAX(pp.total_amount)
    INTO total_paid, plan_amount
    FROM installments i
    JOIN payment_plans pp ON pp.id = i.payment_plan_id
    WHERE i.payment_plan_id = plan_id;
    
    -- Update payment plan status
    IF total_paid >= plan_amount THEN
        UPDATE payment_plans SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = plan_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment plan completion
DROP TRIGGER IF EXISTS trg_update_payment_plan_status ON installments;
CREATE TRIGGER trg_update_payment_plan_status
    AFTER UPDATE ON installments
    FOR EACH ROW
    WHEN (NEW.status = 'paid')
    EXECUTE FUNCTION update_payment_plan_status();

-- =====================================================
-- 6. Grant Permissions (service_role already has full access)
-- =====================================================
-- If using Row Level Security, configure policies here
-- For now, using service role which bypasses RLS

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- To apply this migration:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste this entire SQL script
-- 3. Click "Run" to execute
