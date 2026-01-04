-- Ensure system_settings exists (KV store for config)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Academic Calendar [Pilot Term]
INSERT INTO system_settings (key, value) VALUES
('academic_calendar', '{"start": "2024-09-09", "end": "2024-12-13", "term": "First Term", "year": "2024/2025"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Seed Grading Config
INSERT INTO system_settings (key, value) VALUES
('grading_config', '{"scale": "percentage", "weighted": false}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Seed Fee Structure [Pilot: JSS1 Example]
-- This mimics what a "Fee Structure" setup would do if we had a dedicated table, 
-- or sets defaults for frontend logic if it reads from here.
INSERT INTO system_settings (key, value) VALUES
('fee_config_jss1', '{"tuition": 50000, "books": 15000, "uniform": 10000, "total": 75000}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Sample Notices for Pilot Launch
INSERT INTO notices (title, content, category, audience, is_pinned) VALUES
('Welcome to our Digital Pilot! 🚀', 'We are excited to introduce the new School App. Parents can now check attendance and fees instantly.', 'General', '["all"]', true),
('Fee Payment Reminder', 'All First Term fees are due by Sept 30th. Please check your "Fee Status" tab.', 'Finance', '["parents"]', false);
