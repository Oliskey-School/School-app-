-- ============================================
-- CHAT SYSTEM SCHEMA (MATCHING FRONTEND CODE)
-- ============================================

-- 1. CLEANUP (Drop old tables if they exist to avoid confusion)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
-- Also drop the mismatched ones from final_setup if needed, or leave them.
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS conversation_participants CASCADE;
-- DROP TABLE IF EXISTS conversations CASCADE;

-- 2. CHAT ROOMS
CREATE TABLE chat_rooms (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct', 'group', 'class'
  name VARCHAR(255),
  title VARCHAR(255), -- Some components might use title
  is_group BOOLEAN DEFAULT FALSE,
  creator_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_text TEXT
);

-- 3. CHAT PARTICIPANTS
CREATE TABLE chat_participants (
  room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- 'member', 'admin'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_message_id INTEGER,
  PRIMARY KEY (room_id, user_id)
);

-- 4. CHAT MESSAGES
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id),
  content TEXT,
  type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file'
  media_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  reply_to_id INTEGER REFERENCES chat_messages(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TRIGGERS
-- Function to update chat_rooms last message
CREATE OR REPLACE FUNCTION public.update_chat_room_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.chat_rooms
  SET last_message_text = new.content,
      last_message_at = new.created_at,
      updated_at = new.created_at
  WHERE id = new.room_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new message
DROP TRIGGER IF EXISTS on_new_chat_message ON public.chat_messages;
CREATE TRIGGER on_new_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_chat_room_last_message();

-- 6. RLS POLICIES (Open for now to fix access)
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access Rooms" ON chat_rooms FOR ALL USING (true);
CREATE POLICY "Public Access Participants" ON chat_participants FOR ALL USING (true);
CREATE POLICY "Public Access Messages" ON chat_messages FOR ALL USING (true);

-- 7. REALTIME
-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

-- Replica identity for full updates
ALTER TABLE chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_participants REPLICA IDENTITY FULL;
