-- ============================================
-- CHAT SYSTEM SCHEMA UPDATE
-- ============================================

-- 1. CHAT ROOMS
CREATE TABLE IF NOT EXISTS chat_rooms (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct', 'group', 'class'
    name VARCHAR(255), -- Nullable for direct chats
    is_group BOOLEAN DEFAULT FALSE,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CHAT PARTICIPANTS
CREATE TABLE IF NOT EXISTS chat_participants (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
    last_read_message_id INTEGER, -- To calculate unread counts
    UNIQUE(room_id, user_id)
);

-- 3. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'file'
    media_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    reply_to_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MESSAGE REACTIONS
CREATE TABLE IF NOT EXISTS chat_message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- 5. USER PRESENCE (Persisted fallbacks)
CREATE TABLE IF NOT EXISTS user_presence (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY (Disable for now for development ease as per instructions)
ALTER TABLE chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence DISABLE ROW LEVEL SECURITY;

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- SAMPLE INITIAL DATA FOR TESTING
-- 1. Create a Direct Chat between User 1 (Admin/Teacher) and User 4 (Student)
INSERT INTO chat_rooms (type, is_group, creator_id, last_message_at) 
VALUES ('direct', FALSE, 1, NOW());

-- Get the ID of the inserted room (Assuming it's 1 if empty, but let's be safe in real scripts. Here hardcoding for seed)
-- In a real migration runner we'd capture the ID. For this file we assume it runs sequentially.

INSERT INTO chat_participants (room_id, user_id, role) VALUES 
(1, 4, 'member'), -- Student (Fatima/Adebayo based on ID 4 possibility)
(1, 1, 'member'); -- User 1 (Maybe Admin)

INSERT INTO chat_messages (room_id, sender_id, content, type) VALUES
(1, 1, 'Hello, how are you doing with your assignments?', 'text'),
(1, 4, 'I am doing well, thank you! Just finishing the Math homework.', 'text');
