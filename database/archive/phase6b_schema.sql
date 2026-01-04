-- Phase 6B: Budgeting & Procurement Schema
-- Purpose: Budget management, procurement, asset tracking
-- Nigerian Context: Grant tracking, local vendor management

-- =============================================
-- Budget Management
-- =============================================

CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    budget_year INTEGER NOT NULL,
    budget_name VARCHAR(100) NOT NULL,
    total_budget DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_budget - spent_amount) STORED,
    
    status VARCHAR(20) DEFAULT 'Draft', -- 'Draft', 'Approved', 'Active', 'Closed'
    fiscal_year_start DATE,
    fiscal_year_end DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    
    UNIQUE(budget_year, budget_name)
);

CREATE INDEX idx_budgets_year ON budgets(budget_year DESC);
CREATE INDEX idx_budgets_status ON budgets(status);

-- =============================================
-- Budget Lines (Department/Category Allocation)
-- =============================================

CREATE TABLE IF NOT EXISTS budget_lines (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
    department VARCHAR(100) NOT NULL, -- 'Administration', 'Teaching', 'Facilities', etc.
    category VARCHAR(100) NOT NULL, -- 'Salaries', 'Supplies', 'Equipment', 'Utilities'
    
    allocated_amount DECIMAL(12,2) NOT NULL,
    spent_amount DECIMAL(12,2) DEFAULT 0,
    committed_amount DECIMAL(12,2) DEFAULT 0, -- POs pending
    available_amount DECIMAL(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount - committed_amount) STORED,
    
    variance DECIMAL(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
    variance_percentage DECIMAL(5,2),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX idx_budget_lines_dept ON budget_lines(department);

-- =============================================
-- Grants (External Funding Tracking)
-- =============================================

CREATE TABLE IF NOT EXISTS grants (
    id SERIAL PRIMARY KEY,
    grant_name VARCHAR(200) NOT NULL,
    grantor_organization VARCHAR(200) NOT NULL,
    grant_type VARCHAR(50), -- 'Government', 'Corporate', 'NGO', 'International'
    
    total_amount DECIMAL(15,2) NOT NULL,
    received_amount DECIMAL(15,2) DEFAULT 0,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    
    grant_start_date DATE,
    grant_end_date DATE,
    reporting_frequency VARCHAR(50), -- 'Monthly', 'Quarterly', 'Annual'
    
    purpose TEXT,
    restrictions TEXT, -- Usage restrictions
    compliance_requirements TEXT,
    
    status VARCHAR(20) DEFAULT 'Applied', -- 'Applied', 'Approved', 'Active', 'Completed', 'Rejected'
    
    contact_person VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grants_dates ON grants(grant_start_date, grant_end_date);

-- =============================================
-- Vendors (Supplier Management)
-- =============================================

CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(200) NOT NULL,
    vendor_code VARCHAR(50) UNIQUE,
    vendor_type VARCHAR(50), -- 'Stationery', 'Equipment', 'Food', 'Services', 'Construction'
    
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    alternative_phone VARCHAR(20),
    
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    lga VARCHAR(100), -- Nigerian Local Government Area
    
    -- Banking Details
    bank_name VARCHAR(100),
    account_number VARCHAR(20),
    account_name VARCHAR(200),
    
    -- Performance
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5), -- 0-5 stars
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    
    -- Compliance
    tax_id VARCHAR(50), -- TIN (Tax Identification Number)
    is_verified BOOLEAN DEFAULT false,
    is_blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Inactive', 'Suspended'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_vendors_name ON vendors(vendor_name);
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_status ON vendors(status) WHERE status = 'Active';

-- =============================================
-- Purchase Orders
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    budget_line_id INTEGER REFERENCES budget_lines(id),
    
    po_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (subtotal + tax_amount - discount_amount) STORED,
    
    currency VARCHAR(3) DEFAULT 'NGN',
    
    -- Workflow
    status VARCHAR(20) DEFAULT 'Draft', -- 'Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Cancelled'
    requested_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    received_by INTEGER REFERENCES users(id),
    received_at TIMESTAMP,
    
    notes TEXT,
    cancellation_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_number ON purchase_orders(po_number);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_date ON purchase_orders(po_date DESC);

-- =============================================
-- Purchase Order Items
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    received_quantity INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);

-- =============================================
-- Assets (School Equipment & Inventory)
-- =============================================

CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(200) NOT NULL,
    asset_code VARCHAR(50) UNIQUE,
    qr_code TEXT, -- QR code data for scanning
    
    category_id INTEGER, -- Removed FK constraint - created later
    asset_type VARCHAR(50), -- 'Equipment', 'Furniture', 'Electronics', 'Books', 'Sports'
    
    description TEXT,
    location VARCHAR(200), -- 'Computer Lab', 'Library', 'Staff Room'
    
    -- Financial
    purchase_price DECIMAL(12,2),
    current_value DECIMAL(12,2),
    depreciation_rate DECIMAL(5,2), -- Annual percentage
    purchase_date DATE,
    warranty_expiry DATE,
    
    -- Status
    condition VARCHAR(20) DEFAULT 'Good', -- 'Excellent', 'Good', 'Fair', 'Poor', 'Damaged'
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Maintenance', 'Retired', 'Lost', 'Sold'
    
    -- Assignment
    assigned_to_user INTEGER REFERENCES users(id),
    assigned_to_class INTEGER, -- Removed FK to avoid type mismatch
    assignment_date DATE,
    
    -- Procurement Link
    po_id INTEGER REFERENCES purchase_orders(id),
    
    serial_number VARCHAR(100),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_code ON assets(asset_code);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_status ON assets(status) WHERE status = 'Active';
CREATE INDEX idx_assets_location ON assets(location);

-- =============================================
-- Asset Categories
-- =============================================

CREATE TABLE IF NOT EXISTS asset_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    depreciation_years INTEGER DEFAULT 5,
    requires_maintenance BOOLEAN DEFAULT false,
    maintenance_frequency_months INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO asset_categories (category_name, description, depreciation_years, requires_maintenance, maintenance_frequency_months) VALUES
('Computers & IT', 'Computers, laptops, printers, projectors', 3, true, 6),
('Furniture', 'Desks, chairs, cabinets, shelves', 10, false, NULL),
('Laboratory Equipment', 'Scientific instruments, lab supplies', 7, true, 12),
('Sports Equipment', 'Sports gear, field equipment', 5, false, NULL),
('Books & Library', 'Textbooks, reference books, library materials', 5, false, NULL),
('Office Equipment', 'Photocopiers, scanners, filing cabinets', 5, true, 12),
('Vehicles', 'School buses, vans', 8, true, 3),
('Musical Instruments', 'Drums, keyboards, guitars', 10, true, 6)
ON CONFLICT (category_name) DO NOTHING;

-- =============================================
-- Maintenance Tickets
-- =============================================

CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    asset_id INTEGER REFERENCES assets(id),
    
    issue_title VARCHAR(200) NOT NULL,
    issue_description TEXT,
    priority VARCHAR(20) DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    
    status VARCHAR(20) DEFAULT 'Open', -- 'Open', 'InProgress', 'OnHold', 'Resolved', 'Closed'
    
    reported_by INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    
    reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_date TIMESTAMP,
    completed_date TIMESTAMP,
    
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    
    resolution_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_number ON maintenance_tickets(ticket_number);
CREATE INDEX idx_tickets_asset ON maintenance_tickets(asset_id);
CREATE INDEX idx_tickets_status ON maintenance_tickets(status);
CREATE INDEX idx_tickets_priority ON maintenance_tickets(priority);

-- =============================================
-- Inventory Logs (Asset Movement/Changes)
-- =============================================

CREATE TABLE IF NOT EXISTS inventory_logs (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    
    action_type VARCHAR(50) NOT NULL, -- 'Created', 'Assigned', 'Transferred', 'Maintenance', 'Retired', 'Lost'
    
    from_location VARCHAR(200),
    to_location VARCHAR(200),
    
    from_user INTEGER REFERENCES users(id),
    to_user INTEGER REFERENCES users(id),
    
    notes TEXT,
    
    performed_by INTEGER REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_log_asset ON inventory_logs(asset_id);
CREATE INDEX idx_inventory_log_date ON inventory_logs(performed_at DESC);

-- =============================================
-- Sample Data: Budgets
-- =============================================

INSERT INTO budgets (budget_year, budget_name, total_budget, allocated_amount, spent_amount, status, fiscal_year_start, fiscal_year_end, created_by) VALUES
(2026, 'Annual Budget 2026', 50000000, 48000000, 15000000, 'Active', '2026-01-01', '2026-12-31', 1),
(2025, 'Annual Budget 2025', 45000000, 45000000, 42000000, 'Closed', '2025-01-01', '2025-12-31', 1);

-- Sample Budget Lines
INSERT INTO budget_lines (budget_id, department, category, allocated_amount, spent_amount, committed_amount) VALUES
(1, 'Administration', 'Salaries', 15000000, 5000000, 0),
(1, 'Teaching', 'Salaries', 20000000, 8000000, 0),
(1, 'Facilities', 'Maintenance', 5000000, 1500000, 500000),
(1, 'IT', 'Equipment', 3000000, 500000, 1000000),
(1, 'Library', 'Books', 2000000, 0, 300000),
(1, 'Sports', 'Equipment', 1500000, 200000, 0),
(1, 'Administration', 'Office Supplies', 1500000, 800000, 100000);

-- =============================================
-- Sample Data: Vendors
-- =============================================

INSERT INTO vendors (vendor_name, vendor_code, vendor_type, contact_person, email, phone, city, state, lga, rating, total_orders, status, created_by) VALUES
('ABC Stationery Ltd', 'VEN001', 'Stationery', 'John Adebayo', 'sales@abcstationery.ng', '08012345678', 'Lagos', 'Lagos', 'Ikeja', 4.5, 25, 'Active', 1),
('TechEquip Nigeria', 'VEN002', 'Equipment', 'Sarah Okon', 'info@techequip.ng', '08098765432', 'Abuja', 'FCT', 'Municipal', 4.8, 15, 'Active', 1),
('SchoolFurniture Co', 'VEN003', 'Equipment', 'Ibrahim Yusuf', 'contact@schoolfurniture.ng', '07045678901', 'Kano', 'Kano', 'Kano Municipal', 4.2, 8, 'Active', 1),
('BooksPlus Limited', 'VEN004', 'Stationery', 'Grace Okoro', 'orders@booksplus.ng', '08123456789', 'Port Harcourt', 'Rivers', 'Port Harcourt', 4.7, 30, 'Active', 1);

-- =============================================
-- Sample Data: Assets
-- =============================================

INSERT INTO assets (asset_name, asset_code, category_id, asset_type, description, location, purchase_price, current_value, purchase_date, condition, status, created_by) VALUES
('Dell Desktop Computer', 'COMP001', 1, 'Electronics', '24-inch monitor, i5 processor', 'Computer Lab', 250000, 200000, '2024-01-15', 'Good', 'Active', 1),
('HP Laser Printer', 'PRNT001', 1, 'Electronics', 'Multifunction printer', 'Admin Office', 150000, 120000, '2024-03-10', 'Good', 'Active', 1),
('Student Desk Set', 'DESK001', 2, 'Furniture', 'Desk and chair combo', 'JSS 1A Classroom', 25000, 22000, '2023-09-01', 'Good', 'Active', 1),
('Microscope', 'LAB001', 3, 'Equipment', 'Biology lab microscope', 'Science Laboratory', 180000, 160000, '2024-02-20', 'Excellent', 'Active', 1),
('Football Set', 'SPT001', 4, 'Sports', 'Professional football kit', 'Sports Equipment Room', 15000, 12000, '2024-06-01', 'Good', 'Active', 1);

COMMENT ON TABLE budgets IS 'Annual budgets with allocation tracking';
COMMENT ON TABLE budget_lines IS 'Department and category budget breakdowns';
COMMENT ON TABLE grants IS 'External grant funding tracking and compliance';
COMMENT ON TABLE vendors IS 'Approved vendor directory with performance ratings';
COMMENT ON TABLE purchase_orders IS 'Purchase order workflow and tracking';
COMMENT ON TABLE assets IS 'School asset inventory with QR code tracking';
COMMENT ON TABLE maintenance_tickets IS 'Equipment maintenance request system';
