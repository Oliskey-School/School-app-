-- ============================================================================
-- Phase 3A Schema: Payroll & Leave Management
-- ============================================================================
-- Apply this after Phase 2 schema
-- ============================================================================

-- ====================
-- PAYROLL TABLES
-- ====================

-- Teacher Salary Configuration
CREATE TABLE IF NOT EXISTS teacher_salaries (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id) ON DELETE CASCADE,
  base_salary DECIMAL(12,2) NOT NULL CHECK (base_salary >= 0),
  currency TEXT DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD', 'GBP', 'EUR')),
  payment_frequency TEXT DEFAULT 'Monthly' CHECK (payment_frequency IN ('Monthly', 'Bi-weekly', 'Weekly')),
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  mobile_money_provider TEXT,
  mobile_money_number TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > effective_date)
);

-- Salary Components (Allowances, Bonuses, Deductions)
CREATE TABLE IF NOT EXISTS salary_components (
  id BIGSERIAL PRIMARY KEY,
  teacher_salary_id BIGINT REFERENCES teacher_salaries(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN ('Allowance', 'Bonus', 'Deduction')),
  component_name TEXT NOT NULL,
  amount DECIMAL(12,2),
  percentage DECIMAL(5,2),
  is_taxable BOOLEAN DEFAULT TRUE,
  is_recurring BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT amount_or_percentage CHECK (
    (amount IS NOT NULL AND percentage IS NULL) OR 
    (amount IS NULL AND percentage IS NOT NULL)
  )
);

-- Generated Payslips
CREATE TABLE IF NOT EXISTS payslips (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id) ON DELETE CASCADE,
  teacher_salary_id BIGINT REFERENCES teacher_salaries(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  days_worked INTEGER,
  gross_salary DECIMAL(12,2) NOT NULL,
  total_allowances DECIMAL(12,2) DEFAULT 0,
  total_bonuses DECIMAL(12,2) DEFAULT 0,
  total_deductions DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  pension_amount DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Paid', 'Cancelled')),
  payslip_number TEXT UNIQUE,
  notes TEXT,
  generated_by BIGINT,
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_period CHECK (period_end > period_start),
  CONSTRAINT valid_net_salary CHECK (net_salary >= 0),
  UNIQUE(teacher_id, period_start, period_end)
);

-- Payslip Line Items (Detail breakdown)
CREATE TABLE IF NOT EXISTS payslip_items (
  id BIGSERIAL PRIMARY KEY,
  payslip_id BIGINT REFERENCES payslips(id) ON DELETE CASCADE,
  item_type TEXT CHECK (item_type IN ('Earning', 'Deduction')),
  item_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  is_taxable BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  payslip_id BIGINT REFERENCES payslips(id),
  teacher_id BIGINT REFERENCES teachers(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT CHECK (payment_method IN ('Bank Transfer', 'Mobile Money', 'Cash', 'Cheque')),
  transaction_reference TEXT,
  bank_name TEXT,
  bank_account TEXT,
  mobile_money_provider TEXT,
  mobile_money_number TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled')),
  initiated_by BIGINT,
  payment_date TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Arrears Tracking
CREATE TABLE IF NOT EXISTS arrears (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id) ON DELETE CASCADE,
  original_payslip_id BIGINT REFERENCES payslips(id),
  amount_owed DECIMAL(12,2) NOT NULL CHECK (amount_owed >= 0),
  amount_paid DECIMAL(12,2) DEFAULT 0 CHECK (amount_paid >= 0),
  amount_remaining DECIMAL(12,2) GENERATED ALWAYS AS (amount_owed - amount_paid) STORED,
  reason TEXT NOT NULL,
  due_date DATE,
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
  status TEXT DEFAULT 'Outstanding' CHECK (status IN ('Outstanding', 'Partially Paid', 'Cleared', 'Written Off')),
  notes TEXT,
  created_by BIGINT,
  cleared_by BIGINT,
  cleared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_amounts CHECK (amount_paid <= amount_owed)
);

-- ====================
-- LEAVE MANAGEMENT
-- ====================

-- Leave Types Configuration
CREATE TABLE IF NOT EXISTS leave_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  description TEXT,
  days_allowed INTEGER CHECK (days_allowed >= 0),
  carry_forward_allowed BOOLEAN DEFAULT FALSE,
  max_carry_forward_days INTEGER,
  requires_approval BOOLEAN DEFAULT TRUE,
  requires_medical_certificate BOOLEAN DEFAULT FALSE,
  is_paid BOOLEAN DEFAULT TRUE,
  color_code TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id) ON DELETE CASCADE,
  leave_type_id BIGINT REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER NOT NULL CHECK (days_requested > 0),
  reason TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_leave_period CHECK (end_date >= start_date)
);

-- Leave Balances (Annual tracking)
CREATE TABLE IF NOT EXISTS leave_balances (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT REFERENCES teachers(id) ON DELETE CASCADE,
  leave_type_id BIGINT REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  days_allocated INTEGER NOT NULL CHECK (days_allocated >= 0),
  days_used INTEGER DEFAULT 0 CHECK (days_used >= 0),
  days_pending INTEGER DEFAULT 0 CHECK (days_pending >= 0),
  days_remaining INTEGER GENERATED ALWAYS AS (days_allocated - days_used - days_pending) STORED,
  carry_forward_from_previous INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, leave_type_id, year),
  CONSTRAINT valid_usage CHECK (days_used + days_pending <= days_allocated + carry_forward_from_previous)
);

-- ====================
-- INDEXES
-- ====================

CREATE INDEX idx_teacher_salaries_teacher ON teacher_salaries(teacher_id);
CREATE INDEX idx_teacher_salaries_active ON teacher_salaries(teacher_id, is_active);
CREATE INDEX idx_salary_components_salary ON salary_components(teacher_salary_id);

CREATE INDEX idx_payslips_teacher ON payslips(teacher_id);
CREATE INDEX idx_payslips_period ON payslips(period_start, period_end);
CREATE INDEX idx_payslips_status ON payslips(status);
CREATE INDEX idx_payslip_items_payslip ON payslip_items(payslip_id);

CREATE INDEX idx_payment_transactions_payslip ON payment_transactions(payslip_id);
CREATE INDEX idx_payment_transactions_teacher ON payment_transactions(teacher_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

CREATE INDEX idx_arrears_teacher ON arrears(teacher_id);
CREATE INDEX idx_arrears_status ON arrears(status);

CREATE INDEX idx_leave_requests_teacher ON leave_requests(teacher_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_balances_teacher_year ON leave_balances(teacher_id, year);

-- ====================
-- DEFAULT DATA
-- ====================

-- Insert default leave types
INSERT INTO leave_types (name, code, description, days_allowed, is_paid, carry_forward_allowed) VALUES
('Annual Leave', 'ANNUAL', 'Regular annual vacation leave', 20, TRUE, TRUE),
('Sick Leave', 'SICK', 'Medical sick leave', 10, TRUE, FALSE),
('Maternity Leave', 'MATERNITY', 'Maternity leave for female staff', 90, TRUE, FALSE),
('Paternity Leave', 'PATERNITY', 'Paternity leave for male staff', 7, TRUE, FALSE),
('Compassionate Leave', 'COMPASSIONATE', 'Leave for family emergencies', 3, TRUE, FALSE),
('Study Leave', 'STUDY', 'Leave for professional development', 5, FALSE, FALSE)
ON CONFLICT (name) DO NOTHING;

-- ====================
-- COMMENTS
-- ====================

COMMENT ON TABLE teacher_salaries IS 'Base salary configuration for teachers';
COMMENT ON TABLE salary_components IS 'Allowances, bonuses, and deductions for teacher salaries';
COMMENT ON TABLE payslips IS 'Generated monthly payslips for teachers';
COMMENT ON TABLE payment_transactions IS 'Payment records and transaction history';
COMMENT ON TABLE arrears IS 'Tracking of outstanding salary payments';
COMMENT ON TABLE leave_types IS 'Configuration for different types of leave';
COMMENT ON TABLE leave_requests IS 'Teacher leave requests and approvals';
COMMENT ON TABLE leave_balances IS 'Annual leave balance tracking per teacher';

SELECT '✅ Phase 3A Schema Applied Successfully!' as status;
