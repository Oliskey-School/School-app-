-- Enable Row Level Security (RLS) for the assignments table
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (Insert, Select, Update, Delete) for everyone
-- Note: In a production app, you would restrict this to authenticated users or specific roles.
DROP POLICY IF EXISTS "Allow public access to assignments" ON assignments;

CREATE POLICY "Allow public access to assignments"
ON assignments
FOR ALL
USING (true)
WITH CHECK (true);
