-- ============================================
-- FIX NOTIFICATIONS SCHEMA
-- Run this to enable the notification system
-- ============================================

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  student_id INTEGER REFERENCES students(id),
  related_id INTEGER
);

-- 2. Disable RLS for easier development
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 3. Enable Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
