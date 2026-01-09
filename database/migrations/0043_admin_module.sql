-- ============================================================================
-- MIGRATION 0043: Admin Module - NEW TABLES ONLY (Safe Version)
-- ============================================================================
-- This version only creates tables that don't exist in migrations 0001-0042
-- Safe to run - uses CREATE TABLE IF NOT EXISTS
-- Date: 2026-01-09
-- ============================================================================

-- ============================================================================
-- TEACHER_SALARIES TABLE (NEW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID,
    basic_salary DECIMAL(12, 2) NOT NULL,
    housing_allowance DECIMAL(12, 2) DEFAULT 0,
    transport_allowance DECIMAL(12, 2) DEFAULT 0,
    meal_allowance DECIMAL(12, 2) DEFAULT 0,
    other_allowances DECIMAL(12, 2) DEFAULT 0,
    deductions DECIMAL(12, 2) DEFAULT 0,
    pension_contribution DECIMAL(12, 2) DEFAULT 0,
    tax_deduction DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) GENERATED ALWAYS AS (
        basic_salary + housing_allowance + transport_allowance + meal_allowance + other_allowances - deductions - pension_contribution - tax_deduction
    ) STORED,
    payment_frequency VARCHAR(20) CHECK (payment_frequency IN ('monthly', 'biweekly', 'weekly')) DEFAULT 'monthly',
    currency VARCHAR(3) DEFAULT 'NGN',
    effective_from DATE NOT NULL,
    effective_to DATE,
    status VARCHAR(20) CHECK (status IN ('active', 'suspended', 'terminated')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teacher_salaries' AND column_name = 'teacher_id') THEN
        CREATE INDEX IF NOT EXISTS idx_teacher_salaries_teacher_id ON public.teacher_salaries(teacher_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teacher_salaries' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_teacher_salaries_status ON public.teacher_salaries(status);
    END IF;
END $$;

ALTER TABLE public.teacher_salaries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_salaries' AND policyname = 'Teachers can view salaries') THEN
        CREATE POLICY "Teachers can view salaries" ON public.teacher_salaries FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- PAYSLIPS TABLE (NEW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID,
    salary_id UUID,
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    year INTEGER CHECK (year >= 2020),
    basic_salary DECIMAL(12, 2) NOT NULL,
    allowances DECIMAL(12, 2) DEFAULT 0,
    deductions DECIMAL(12, 2) DEFAULT 0,
    gross_salary DECIMAL(12, 2) NOT NULL,
    net_salary DECIMAL(12, 2) NOT NULL,
    payment_date DATE,
    payment_method VARCHAR(50) CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'mobile_money')),
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')) DEFAULT 'pending',
    generated_by UUID,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payslips' AND column_name = 'teacher_id') THEN
        CREATE INDEX IF NOT EXISTS idx_payslips_teacher_id ON public.payslips(teacher_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payslips' AND column_name = 'payment_status') THEN
        CREATE INDEX IF NOT EXISTS idx_payslips_payment_status ON public.payslips(payment_status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payslips' AND column_name = 'month') THEN
        CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON public.payslips(month, year);
    END IF;
END $$;

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payslips' AND policyname = 'Users can view payslips') THEN
        CREATE POLICY "Users can view payslips" ON public.payslips FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- ARREARS TABLE (NEW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.arrears (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    month_year VARCHAR(7) NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('pending', 'acknowledged', 'resolved', 'disputed')) DEFAULT 'pending',
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'arrears' AND column_name = 'teacher_id') THEN
        CREATE INDEX IF NOT EXISTS idx_arrears_teacher_id ON public.arrears(teacher_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'arrears' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_arrears_status ON public.arrears(status);
    END IF;
END $$;

ALTER TABLE public.arrears ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'arrears' AND policyname = 'Users can view arrears') THEN
        CREATE POLICY "Users can view arrears" ON public.arrears FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- LEAVE_BALANCES TABLE (NEW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID,
    academic_year VARCHAR(9),
    annual_leave_total INTEGER DEFAULT 20,
    annual_leave_used INTEGER DEFAULT 0,
    annual_leave_remaining INTEGER GENERATED ALWAYS AS (annual_leave_total - annual_leave_used) STORED,
    sick_leave_total INTEGER DEFAULT 10,
    sick_leave_used INTEGER DEFAULT 0,
    sick_leave_remaining INTEGER GENERATED ALWAYS AS (sick_leave_total - sick_leave_used) STORED,
    casual_leave_total INTEGER DEFAULT 5,
    casual_leave_used INTEGER DEFAULT 0,
    casual_leave_remaining INTEGER GENERATED ALWAYS AS (casual_leave_total - casual_leave_used) STORED,
    maternity_leave_total INTEGER DEFAULT 90,
    maternity_leave_used INTEGER DEFAULT 0,
    paternity_leave_total INTEGER DEFAULT 10,
    paternity_leave_used INTEGER DEFAULT 0,
    unpaid_leave_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_balances' AND column_name = 'teacher_id') THEN
        CREATE INDEX IF NOT EXISTS idx_leave_balances_teacher_id ON public.leave_balances(teacher_id);
    END IF;
END $$;

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- LEAVE_REQUESTS TABLE (NEW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID,
    
    leave_type VARCHAR(50) CHECK (leave_type IN ('annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid', 'bereavement', 'study')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    handover_notes TEXT,
    relief_teacher_id UUID,
    emergency_contact VARCHAR(255),
    supporting_documents JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'teacher_id') THEN
        CREATE INDEX IF NOT EXISTS idx_leave_requests_teacher_id ON public.leave_requests(teacher_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'start_date') THEN
        CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
    END IF;
END $$;

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SALARY_PAYMENTS TABLE (NEW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.salary_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payslip_id UUID,
    teacher_id UUID,
    
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'mobile_money')) NOT NULL,
    payment_reference VARCHAR(100),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    transaction_id VARCHAR(100),
    status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    initiated_by UUID,
    approved_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salary_payments' AND column_name = 'teacher_id') THEN
        CREATE INDEX IF NOT EXISTS idx_salary_payments_teacher_id ON public.salary_payments(teacher_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salary_payments' AND column_name = 'payslip_id') THEN
        CREATE INDEX IF NOT EXISTS idx_salary_payments_payslip_id ON public.salary_payments(payslip_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salary_payments' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON public.salary_payments(status);
    END IF;
END $$;

ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VENDORS TABLE (NEW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    vendor_name VARCHAR(255) NOT NULL,
    vendor_code VARCHAR(50) UNIQUE,
    category VARCHAR(100),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(100),
    bank_account VARCHAR(100),
    payment_terms INTEGER DEFAULT 30,
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'blacklisted')) DEFAULT 'active',
    rating DECIMAL(3, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);
    END IF;
END $$;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MAINTENANCE_TICKETS TABLE (NEW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) CHECK (category IN ('electrical', 'plumbing', 'furniture', 'equipment', 'building', 'grounds', 'it', 'other')) NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('open', 'in_progress', 'on_hold', 'resolved', 'closed')) DEFAULT 'open',
    reported_by UUID,
    assigned_to UUID,
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    scheduled_date DATE,
    completed_date DATE,
    resolution_notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maintenance_tickets' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_status ON public.maintenance_tickets(status);
    END IF;
END $$;

ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (Conditional - only if types match)
-- ============================================================================
-- Add foreign keys only if both columns exist and have matching types

-- payslips.salary_id -> teacher_salaries.id
DO $$ 
BEGIN
    -- Check if both columns exist and are UUID type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payslips' 
        AND column_name = 'salary_id' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'teacher_salaries' 
        AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        -- Check if constraint doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'payslips_salary_id_fkey'
        ) THEN
            ALTER TABLE public.payslips 
            ADD CONSTRAINT payslips_salary_id_fkey 
            FOREIGN KEY (salary_id) REFERENCES public.teacher_salaries(id);
        END IF;
    END IF;
END $$;

-- salary_payments.payslip_id -> payslips.id
DO $$ 
BEGIN
    -- Check if both columns exist and are UUID type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'salary_payments' 
        AND column_name = 'payslip_id' AND data_type = 'uuid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payslips' 
        AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        -- Check if constraint doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'salary_payments_payslip_id_fkey'
        ) THEN
            ALTER TABLE public.salary_payments 
            ADD CONSTRAINT salary_payments_payslip_id_fkey 
            FOREIGN KEY (payslip_id) REFERENCES public.payslips(id);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.teacher_salaries IS 'Teacher salary configuration and allowances';
COMMENT ON TABLE public.payslips IS 'Monthly payslips generated for teachers';
COMMENT ON TABLE public.arrears IS 'Salary arrears tracking for teachers';
COMMENT ON TABLE public.leave_balances IS 'Leave balance tracking for teachers';
COMMENT ON TABLE public.leave_requests IS 'Teacher leave requests';
COMMENT ON TABLE public.salary_payments IS 'Salary payment transactions';
COMMENT ON TABLE public.vendors IS 'School vendors and suppliers';
COMMENT ON TABLE public.maintenance_tickets IS 'Maintenance and facility management tickets';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '? Migration 0043 completed successfully - Created 8 new admin tables';
END $$;
