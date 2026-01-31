-- Migration: Add Subscription & Onboarding Fields to Schools Table
-- Date: 2026-01-28
-- Description: Adds motto, premium status, plan type, and user count fields. Adds user limit enforcement logic.

-- 1. Add new columns to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS motto TEXT,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS user_count INTEGER DEFAULT 0;

-- 2. Create function to check user limit before inserting into users table
-- This function will be called by RLS policies or triggers on the users table
CREATE OR REPLACE FUNCTION check_tenant_user_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    is_premium_school BOOLEAN;
    limit_max CONSTANT INTEGER := 10;
BEGIN
    -- Get current school status
    SELECT count(*), bool_or(s.is_premium)
    INTO current_count, is_premium_school
    FROM users u
    JOIN schools s ON u.school_id = s.id
    WHERE u.school_id = NEW.school_id;

    -- Update the cached count on the school table for performance
    -- We do this here as a side effect or separate trigger, but keeping count sync is good.
    -- For now, let's just check the limit.

    -- If not premium and count >= limit, raise exception
    IF (is_premium_school IS NOT TRUE) AND (current_count >= limit_max) THEN
        RAISE EXCEPTION 'Free tier limit reached. Maximum % users allowed. Please upgrade to Premium.', limit_max;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on Users table to enforce limit
-- DROP TRIGGER IF EXISTS enforce_user_limit ON users;
-- CREATE TRIGGER enforce_user_limit
-- BEFORE INSERT ON users
-- FOR EACH ROW
-- EXECUTE FUNCTION check_tenant_user_limit();

-- Note: In Supabase, it's often better to use RLS for read limits, but for INSERT blocking, 
-- a trigger is safer to prevent bypass. 
-- However, since simple trigger might be complex with RLS, ensure 'users' table is accessible.

-- 4. Function to increment/decrement user count (Performance optimization)
CREATE OR REPLACE FUNCTION update_school_user_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
         UPDATE schools SET user_count = user_count + 1 WHERE id = NEW.school_id;
    ELSIF (TG_OP = 'DELETE') THEN
         UPDATE schools SET user_count = user_count - 1 WHERE id = OLD.school_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS update_user_count_trigger ON users;
-- CREATE TRIGGER update_user_count_trigger
-- AFTER INSERT OR DELETE ON users
-- FOR EACH ROW
-- EXECUTE FUNCTION update_school_user_count();
