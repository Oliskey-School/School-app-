-- Add category column to notifications table for better UI mapping
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'System';

-- Update existing notifications to have a reasonable default
UPDATE public.notifications SET category = 'Alert' WHERE user_id IS NULL;
UPDATE public.notifications SET category = 'Assignment' WHERE title LIKE '%Assignment%';
UPDATE public.notifications SET category = 'Fees' WHERE title LIKE '%Fee%';
UPDATE public.notifications SET category = 'Message' WHERE title LIKE '%Message%' OR title LIKE '%Chat%';
