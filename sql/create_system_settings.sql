CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB
);

-- Seed initial data
INSERT INTO system_settings (key, value) VALUES ('academic_calendar', '{"start": "2024-09-05", "end": "2025-06-20"}') ON CONFLICT DO NOTHING;
INSERT INTO system_settings (key, value) VALUES ('grading_config', '{"scale": "percentage", "weighted": true}') ON CONFLICT DO NOTHING;
