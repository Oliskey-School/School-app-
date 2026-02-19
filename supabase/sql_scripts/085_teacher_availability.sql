-- Migration: 0122_teacher_availability
-- Purpose: Add Part-Time/Full-Time employment types and day availability tracking
-- Enables AI timetable generator to respect teacher availability constraints

-- Add employment type column
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'FT' 
CHECK (employment_type IN ('FT', 'PT'));

-- Add available days column (array of day names)
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS available_days TEXT[] 
DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

-- Add helpful comments for documentation
COMMENT ON COLUMN public.teachers.employment_type IS 
  'Employment type: FT (Full-Time, available all days) or PT (Part-Time, specific days only)';

COMMENT ON COLUMN public.teachers.available_days IS 
  'Array of days teacher is available. Examples: 
   - FT teacher: ARRAY[''Monday'', ''Tuesday'', ''Wednesday'', ''Thursday'', ''Friday'']
   - PT teacher (Mon/Wed): ARRAY[''Monday'', ''Wednesday'']
   - PT teacher (Tue/Thu/Fri): ARRAY[''Tuesday'', ''Thursday'', ''Friday'']';

-- Create index for faster filtering by employment type
CREATE INDEX IF NOT EXISTS idx_teachers_employment_type 
ON public.teachers(employment_type);

-- Create GIN index for array searching (faster day availability queries)
CREATE INDEX IF NOT EXISTS idx_teachers_available_days 
ON public.teachers USING GIN(available_days);

-- Update existing teachers to be FT by default (already default, but explicit update for clarity)
UPDATE public.teachers 
SET employment_type = 'FT',
    available_days = ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
WHERE employment_type IS NULL;
