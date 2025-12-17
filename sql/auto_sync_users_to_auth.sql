-- Auto-sync trigger to ensure all users have auth_accounts entries
-- This trigger automatically creates an auth account when a new user is added to the users table

-- First, create a function to auto-create auth accounts for new users
CREATE OR REPLACE FUNCTION auto_create_auth_account()
RETURNS TRIGGER AS $$
DECLARE
    v_username VARCHAR(255);
    v_password VARCHAR(255);
    v_surname VARCHAR(255);
    v_user_type VARCHAR(50);
    v_hashed_password VARCHAR(255);
BEGIN
    -- Get user type from the role field in users table
    v_user_type := COALESCE(NEW.role, 'Student');
    
    -- Extract surname (last word in name)
    v_surname := regexp_replace(TRIM(NEW.name), '^.* ', '');
    
    -- Generate username: first letter of user_type + name with dots
    v_username := LOWER(
        SUBSTRING(v_user_type FROM 1 FOR 1) || 
        regexp_replace(LOWER(TRIM(NEW.name)), '\s+', '.', 'g')
    );
    
    -- Generate password: surname + '1234'
    v_password := LOWER(v_surname) || '1234';
    
    -- Hash the password using pgcrypto extension
    -- Note: Make sure pgcrypto extension is enabled
    -- You can enable it with: CREATE EXTENSION IF NOT EXISTS pgcrypto;
    v_hashed_password := crypt(v_password, gen_salt('bf', 10));
    
    -- Check if auth account already exists for this user
    IF NOT EXISTS (
        SELECT 1 FROM auth_accounts WHERE user_id = NEW.id
    ) THEN
        -- Insert into auth_accounts
        INSERT INTO auth_accounts (
            username,
            password,
            user_type,
            email,
            user_id,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            v_username,
            v_hashed_password,
            v_user_type,
            NEW.email,
            NEW.id,
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (username) DO NOTHING; -- Skip if username already exists
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_create_auth_account ON users;

-- Create trigger that fires after insert on users table
CREATE TRIGGER trigger_auto_create_auth_account
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_auth_account();

-- Enable pgcrypto extension if not already enabled (for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional: Backfill existing users who don't have auth accounts
DO $$
DECLARE
    user_record RECORD;
    v_username VARCHAR(255);
    v_password VARCHAR(255);
    v_surname VARCHAR(255);
    v_hashed_password VARCHAR(255);
BEGIN
    FOR user_record IN 
        SELECT u.id, u.name, u.email, u.role
        FROM users u
        LEFT JOIN auth_accounts aa ON aa.user_id = u.id
        WHERE aa.id IS NULL
    LOOP
        -- Extract surname
        v_surname := regexp_replace(TRIM(user_record.name), '^.* ', '');
        
        -- Generate username
        v_username := LOWER(
            SUBSTRING(COALESCE(user_record.role, 'Student') FROM 1 FOR 1) || 
            regexp_replace(LOWER(TRIM(user_record.name)), '\s+', '.', 'g')
        );
        
        -- Generate password
        v_password := LOWER(v_surname) || '1234';
        
        -- Hash password
        v_hashed_password := crypt(v_password, gen_salt('bf', 10));
        
        -- Insert auth account
        INSERT INTO auth_accounts (
            username,
            password,
            user_type,
            email,
            user_id,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            v_username,
            v_hashed_password,
            COALESCE(user_record.role, 'Student'),
            user_record.email,
            user_record.id,
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (username) DO NOTHING;
        
        RAISE NOTICE 'Created auth account for user: % (ID: %)', user_record.name, user_record.id;
    END LOOP;
END $$;

COMMENT ON FUNCTION auto_create_auth_account() IS 'Automatically creates an auth_account entry when a new user is inserted into the users table';
COMMENT ON TRIGGER trigger_auto_create_auth_account ON users IS 'Triggers auto-creation of auth accounts for new users';
