-- Create auth_accounts table for storing login credentials
CREATE TABLE IF NOT EXISTS auth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('Student', 'Teacher', 'Parent', 'Admin')),
  email VARCHAR(255),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_accounts_username ON auth_accounts(username);
CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id ON auth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_type ON auth_accounts(user_type);

-- Enable RLS (Row Level Security)
ALTER TABLE auth_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read auth_accounts for login" ON auth_accounts;
DROP POLICY IF EXISTS "Allow admins to manage auth_accounts" ON auth_accounts;
DROP POLICY IF EXISTS "Allow users to read their own auth account" ON auth_accounts;

-- Allow anyone to read auth accounts (for login purposes)
CREATE POLICY "Allow read auth_accounts for login" ON auth_accounts
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_auth_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_auth_accounts_updated_at_trigger ON auth_accounts;
CREATE TRIGGER update_auth_accounts_updated_at_trigger
BEFORE UPDATE ON auth_accounts
FOR EACH ROW
EXECUTE FUNCTION update_auth_accounts_updated_at();
