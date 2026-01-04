-- Phase 6A: Analytics & Dashboards Schema
-- Purpose: Store analytics data, cached metrics, and reports
-- Nigerian Context: State/LGA reporting, WAEC/NECO alignment

-- =============================================
-- Analytics Snapshots (Daily Metrics Cache)
-- =============================================

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'term'
    
    -- Attendance Metrics
    total_students INTEGER,
    students_present INTEGER,
    students_absent INTEGER,
    students_late INTEGER,
    attendance_rate DECIMAL(5,2),
    
    -- Financial Metrics
    fees_collected DECIMAL(12,2),
    fees_outstanding DECIMAL(12,2),
    total_revenue DECIMAL(12,2),
    total_expenses DECIMAL(12,2),
    
    -- Academic Metrics
    average_test_score DECIMAL(5,2),
    students_above_average INTEGER,
    students_below_average INTEGER,
    
    -- Teacher Metrics
    total_teachers INTEGER,
    teachers_present INTEGER,
    average_class_size DECIMAL(5,1),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_date, snapshot_type)
);

CREATE INDEX idx_snapshots_date ON analytics_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_type ON analytics_snapshots(snapshot_type);

-- =============================================
-- Attendance Heatmaps (Pre-calculated Data)
-- =============================================

CREATE TABLE IF NOT EXISTS attendance_heatmaps (
    id SERIAL PRIMARY KEY,
    class_id INTEGER, -- Removed foreign key constraint to avoid type mismatch
    date DATE NOT NULL,
    day_of_week INTEGER, -- 1=Monday, 7=Sunday
    
    total_students INTEGER NOT NULL,
    present_count INTEGER DEFAULT 0,
    absent_count INTEGER DEFAULT 0,
    late_count INTEGER DEFAULT 0,
    
    attendance_percentage DECIMAL(5,2),
    absence_pattern VARCHAR(50), -- 'normal', 'high', 'critical'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(class_id, date)
);

CREATE INDEX idx_heatmap_class_date ON attendance_heatmaps(class_id, date DESC);
CREATE INDEX idx_heatmap_date ON attendance_heatmaps(date DESC);
CREATE INDEX idx_heatmap_pattern ON attendance_heatmaps(absence_pattern);

-- =============================================
-- Financial Summaries (Monthly/Quarterly)
-- =============================================

CREATE TABLE IF NOT EXISTS financial_summaries (
    id SERIAL PRIMARY KEY,
    period_type VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'annual'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Revenue
    fee_revenue DECIMAL(12,2) DEFAULT 0,
    donation_revenue DECIMAL(12,2) DEFAULT 0,
    grant_revenue DECIMAL(12,2) DEFAULT 0,
    other_revenue DECIMAL(12,2) DEFAULT 0,
    total_revenue DECIMAL(12,2) GENERATED ALWAYS AS (
        fee_revenue + donation_revenue + grant_revenue + other_revenue
    ) STORED,
    
    -- Expenses
    salary_expenses DECIMAL(12,2) DEFAULT 0,
    operational_expenses DECIMAL(12,2) DEFAULT 0,
    maintenance_expenses DECIMAL(12,2) DEFAULT 0,
    other_expenses DECIMAL(12,2) DEFAULT 0,
    total_expenses DECIMAL(12,2) GENERATED ALWAYS AS (
        salary_expenses + operational_expenses + maintenance_expenses + other_expenses
    ) STORED,
    
    -- Summary
    net_income DECIMAL(12,2) GENERATED ALWAYS AS (
        (fee_revenue + donation_revenue + grant_revenue + other_revenue) - 
        (salary_expenses + operational_expenses + maintenance_expenses + other_expenses)
    ) STORED,
    
    currency VARCHAR(3) DEFAULT 'NGN',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    UNIQUE(period_type, period_start, period_end)
);

CREATE INDEX idx_financial_period ON financial_summaries(period_start DESC, period_end DESC);

-- =============================================
-- Performance Metrics (Academic & Teacher)
-- =============================================

CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- 'academic', 'teacher', 'class'
    entity_id INTEGER NOT NULL, -- student_id, teacher_id, or class_id
    metric_period DATE NOT NULL, -- Year-month (e.g., 2026-01-01)
    
    -- Academic Metrics
    average_score DECIMAL(5,2),
    highest_score DECIMAL(5,2),
    lowest_score DECIMAL(5,2),
    improvement_rate DECIMAL(5,2), -- Compared to previous period
    
    -- Teacher Metrics
    classes_taught INTEGER,
    average_class_performance DECIMAL(5,2),
    student_satisfaction_score DECIMAL(5,2),
    lesson_completion_rate DECIMAL(5,2),
    
    -- Class Metrics
    class_average DECIMAL(5,2),
    pass_rate DECIMAL(5,2),
    attendance_rate DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(metric_type, entity_id, metric_period)
);

CREATE INDEX idx_metrics_type_entity ON performance_metrics(metric_type, entity_id);
CREATE INDEX idx_metrics_period ON performance_metrics(metric_period DESC);

-- =============================================
-- Report Templates (For State/Federal Reports)
-- =============================================

CREATE TABLE IF NOT EXISTS report_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'attendance', 'financial', 'academic', 'compliance'
    description TEXT,
    
    -- Nigerian-specific
    target_authority VARCHAR(100), -- 'Ministry of Education', 'WAEC', 'NECO', 'State Government'
    reporting_frequency VARCHAR(50), -- 'monthly', 'quarterly', 'annual', 'on-demand'
    
    -- Template Configuration
    data_fields JSONB, -- Fields to include in report
    filters JSONB, -- Default filters
    grouping_rules JSONB, -- How to group data
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_type ON report_templates(report_type);
CREATE INDEX idx_templates_authority ON report_templates(target_authority);

-- =============================================
-- Scheduled Reports (Automated Generation)
-- =============================================

CREATE TABLE IF NOT EXISTS scheduled_reports (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES report_templates(id) ON DELETE CASCADE,
    schedule_name VARCHAR(100) NOT NULL,
    
    frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    schedule_time TIME,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    
    recipients TEXT[], -- Array of email addresses
    format VARCHAR(20) DEFAULT 'PDF', -- 'PDF', 'CSV', 'Excel'
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_scheduled_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;

-- =============================================
-- Report History (Generated Reports Archive)
-- =============================================

CREATE TABLE IF NOT EXISTS report_history (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES report_templates(id),
    scheduled_report_id INTEGER REFERENCES scheduled_reports(id),
    
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50),
    generation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Report Metadata
    period_start DATE,
    period_end DATE,
    filters_applied JSONB,
    
    -- File Information
    file_url TEXT, -- Supabase Storage URL
    file_format VARCHAR(20),
    file_size_kb INTEGER,
    
    -- Generation Info
    generation_time_seconds INTEGER,
    generated_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'generating', 'completed', 'failed'
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_history_date ON report_history(generation_date DESC);
CREATE INDEX idx_report_history_type ON report_history(report_type);
CREATE INDEX idx_report_history_status ON report_history(status);

-- =============================================
-- Sample Data: Report Templates
-- =============================================

INSERT INTO report_templates (template_name, report_type, description, target_authority, reporting_frequency, data_fields, filters, grouping_rules, created_by) VALUES
('Monthly Attendance Report', 'attendance', 'Monthly attendance summary for Ministry of Education', 'Ministry of Education', 'monthly', 
 '{"fields": ["total_students", "attendance_rate", "absence_rate", "class_breakdown"]}', 
 '{"date_range": "current_month"}', 
 '{"group_by": ["class", "grade"]}', 1),

('Quarterly Financial Report', 'financial', 'Quarterly financial statement for state government', 'State Government', 'quarterly',
 '{"fields": ["revenue", "expenses", "net_income", "fee_collection_rate"]}',
 '{"period": "current_quarter"}',
 '{"group_by": ["month", "category"]}', 1),

('WAEC Exam Performance', 'academic', 'Student performance for WAEC submission', 'WAEC', 'annual',
 '{"fields": ["student_name", "subjects", "grades", "gpa"]}',
 '{"grade": "SS3", "session": "current"}',
 '{"group_by": ["subject"]}', 1),

('NECO Registration Data', 'academic', 'Student registration data for NECO', 'NECO', 'annual',
 '{"fields": ["student_id", "name", "dob", "subjects"]}',
 '{"grade": "SS3"}',
 '{"group_by": []}', 1);

-- =============================================
-- Sample Data: Analytics Snapshots
-- =============================================

-- Create snapshots for the last 30 days
INSERT INTO analytics_snapshots (
    snapshot_date, snapshot_type, total_students, students_present, students_absent, students_late,
    attendance_rate, fees_collected, fees_outstanding, total_revenue, total_expenses,
    average_test_score, students_above_average, students_below_average,
    total_teachers, teachers_present, average_class_size
)
SELECT 
    CURRENT_DATE - (n || ' days')::INTERVAL AS snapshot_date,
    'daily' AS snapshot_type,
    500 + (random() * 50)::INTEGER AS total_students,
    450 + (random() * 40)::INTEGER AS students_present,
    20 + (random() * 30)::INTEGER AS students_absent,
    10 + (random() * 20)::INTEGER AS students_late,
    85 + (random() * 10)::DECIMAL(5,2) AS attendance_rate,
    50000 + (random() * 100000)::DECIMAL(12,2) AS fees_collected,
    200000 + (random() * 300000)::DECIMAL(12,2) AS fees_outstanding,
    100000 + (random() * 200000)::DECIMAL(12,2) AS total_revenue,
    80000 + (random() * 150000)::DECIMAL(12,2) AS total_expenses,
    65 + (random() * 20)::DECIMAL(5,2) AS average_test_score,
    250 + (random() * 100)::INTEGER AS students_above_average,
    250 + (random() * 100)::INTEGER AS students_below_average,
    50 + (random() * 10)::INTEGER AS total_teachers,
    45 + (random() * 5)::INTEGER AS teachers_present,
    30 + (random() * 10)::DECIMAL(5,1) AS average_class_size
FROM generate_series(0, 29) AS n
ON CONFLICT (snapshot_date, snapshot_type) DO NOTHING;

COMMENT ON TABLE analytics_snapshots IS 'Cached daily/weekly/monthly metrics for dashboard performance';
COMMENT ON TABLE attendance_heatmaps IS 'Pre-calculated attendance data for heatmap visualization';
COMMENT ON TABLE financial_summaries IS 'Monthly/quarterly financial summaries for reporting';
COMMENT ON TABLE performance_metrics IS 'Academic and teacher performance metrics by period';
COMMENT ON TABLE report_templates IS 'Templates for state/federal compliance reports';
COMMENT ON TABLE scheduled_reports IS 'Automated report generation schedules';
COMMENT ON TABLE report_history IS 'Archive of generated reports with metadata';
