-- Add total_mark column to cbt_tests
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cbt_tests' AND column_name='total_mark') THEN
        ALTER TABLE cbt_tests ADD COLUMN total_mark INTEGER DEFAULT 60;
    END IF;
END $$;
