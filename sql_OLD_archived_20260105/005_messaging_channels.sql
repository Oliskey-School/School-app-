-- ============================================
-- MIGRATION: Advanced Messaging System
-- Purpose: Announcement channels, read receipts, delivery tracking
-- ============================================

-- Create messaging channels table
CREATE TABLE IF NOT EXISTS messaging_channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'class', 'school', 'grade', 'department', 'custom'
  class_id VARCHAR(50),
  grade VARCHAR(10),
  school_id INTEGER,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create channel members table
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES messaging_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'moderator', 'member'
  can_post BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Create channel messages table
CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES messaging_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'announcement', 'alert', 'poll'
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  attachments JSONB,
  metadata JSONB,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create message delivery tracking table
CREATE TABLE IF NOT EXISTS message_delivery (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES channel_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL, -- 'push', 'sms', 'email', 'in_app'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, channel)
);

-- Create read receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES channel_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Add read receipt columns to existing messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'sent';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS messaging_channels_type_idx ON messaging_channels(type);
CREATE INDEX IF NOT EXISTS messaging_channels_active_idx ON messaging_channels(is_active);
CREATE INDEX IF NOT EXISTS channel_members_user_idx ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS channel_members_channel_idx ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS channel_messages_channel_idx ON channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS channel_messages_created_idx ON channel_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS message_delivery_message_idx ON message_delivery(message_id);
CREATE INDEX IF NOT EXISTS message_delivery_user_idx ON message_delivery(user_id);
CREATE INDEX IF NOT EXISTS message_read_receipts_message_idx ON message_read_receipts(message_id);

-- Enable RLS
ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messaging_channels
CREATE POLICY "Users can view channels they're members of"
  ON messaging_channels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = messaging_channels.id
      AND channel_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal')
    )
  );

CREATE POLICY "Admins can create channels"
  ON messaging_channels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher', 'principal')
    )
  );

CREATE POLICY "Admins can update channels"
  ON messaging_channels FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal')
    )
  );

-- RLS Policies for channel_members
CREATE POLICY "Users can view channel members"
  ON channel_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM channel_members cm2
      WHERE cm2.channel_id = channel_members.channel_id
      AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Channel admins can manage members"
  ON channel_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = channel_members.channel_id
      AND channel_members.user_id = auth.uid()
      AND channel_members.role IN ('admin', 'moderator')
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal')
    )
  );

-- RLS Policies for channel_messages
CREATE POLICY "Users can view messages in their channels"
  ON channel_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = channel_messages.channel_id
      AND channel_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can post messages"
  ON channel_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = channel_messages.channel_id
      AND channel_members.user_id = auth.uid()
      AND channel_members.can_post = TRUE
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher', 'principal')
    )
  );

-- RLS Policies for message_delivery
CREATE POLICY "Users can view own delivery status"
  ON message_delivery FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can track delivery"
  ON message_delivery FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for message_read_receipts
CREATE POLICY "Users can view read receipts for their messages"
  ON message_read_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channel_messages
      WHERE channel_messages.id = message_read_receipts.message_id
      AND channel_messages.sender_id = auth.uid()
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can create own read receipts"
  ON message_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to automatically add channel members based on type
CREATE OR REPLACE FUNCTION auto_add_channel_members()
RETURNS TRIGGER AS $$
BEGIN
  -- For school-wide channels, add all users
  IF NEW.type = 'school' THEN
    INSERT INTO channel_members (channel_id, user_id, can_post)
    SELECT NEW.id, id, FALSE
    FROM profiles
    WHERE profiles.role IN ('student', 'teacher', 'parent', 'admin', 'principal', 'counselor');
  END IF;
  
  -- For class channels, add students and teachers of that class
  IF NEW.type = 'class' AND NEW.class_id IS NOT NULL THEN
    -- Add students
    INSERT INTO channel_members (channel_id, user_id, can_post)
    SELECT NEW.id, profiles.id, FALSE
    FROM profiles
    INNER JOIN students ON profiles.student_id = students.id
    WHERE CONCAT('Grade ', students.grade, students.section) = NEW.class_id;
    
    -- Add teachers (can post)
    INSERT INTO channel_members (channel_id, user_id, can_post)
    SELECT NEW.id, profiles.id, TRUE
    FROM profiles
    INNER JOIN teacher_classes ON profiles.teacher_id = teacher_classes.teacher_id
    WHERE teacher_classes.class_name = NEW.class_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_add_members_trigger
  AFTER INSERT ON messaging_channels
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_channel_members();

-- Function to mark message as read
CREATE OR REPLACE FUNCTION mark_message_read(msg_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO message_read_receipts (message_id, user_id, read_at)
  VALUES (msg_id, auth.uid(), NOW())
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE messaging_channels IS 'Announcement and messaging channels (class, school, custom)';
COMMENT ON TABLE channel_members IS 'Users subscribed to channels';
COMMENT ON TABLE channel_messages IS 'Messages posted in channels';
COMMENT ON TABLE message_delivery IS 'Track multi-channel message delivery';
COMMENT ON TABLE message_read_receipts IS 'Track when users read messages';
