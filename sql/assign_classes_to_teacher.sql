-- 1. First, let's fix the schema to ensure the constraint exists (good practice / fixes schema drift)
-- Remove any existing duplicates first to ensure we can add the constraint
DELETE FROM teacher_classes a USING teacher_classes b
WHERE a.id < b.id AND a.teacher_id = b.teacher_id AND a.class_name = b.class_name;

-- Add the unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'teacher_classes_teacher_id_class_name_key' 
        OR conname = 'teacher_classes_teacher_id_class_name_idx'
    ) THEN
        ALTER TABLE teacher_classes ADD CONSTRAINT teacher_classes_teacher_id_class_name_key UNIQUE (teacher_id, class_name);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add constraint, proceeding with safe inserts...';
END $$;


-- 2. Ensure a teacher profile exists for the default/logged-in user
INSERT INTO teachers (name, email, phone, avatar_url)
VALUES ('Demo Teacher', 'user@school.com', '+1234567890', 'https://i.pravatar.cc/150?u=user')
ON CONFLICT (email) DO NOTHING;


-- 3. Assign classes using safe inserts (works even if constraint creation failed)
DO $$
DECLARE
    demo_teacher_id INTEGER;
    john_id INTEGER;
BEGIN
    SELECT id INTO demo_teacher_id FROM teachers WHERE email = 'user@school.com';
    SELECT id INTO john_id FROM teachers WHERE email = 'j.adeoye@school.com';
    
    -- Assign classes to 'Demo Teacher' (user@school.com)
    -- Class '3' (10A Science)
    IF demo_teacher_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM teacher_classes WHERE teacher_id = demo_teacher_id AND class_name = '3') THEN
            INSERT INTO teacher_classes (teacher_id, class_name) VALUES (demo_teacher_id, '3');
        END IF;

        -- Class '1' (9A General)
        IF NOT EXISTS (SELECT 1 FROM teacher_classes WHERE teacher_id = demo_teacher_id AND class_name = '1') THEN
            INSERT INTO teacher_classes (teacher_id, class_name) VALUES (demo_teacher_id, '1');
        END IF;
    END IF;
    
    -- Assign John Adeoye to classes
    IF john_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM teacher_classes WHERE teacher_id = john_id AND class_name = '3') THEN
            INSERT INTO teacher_classes (teacher_id, class_name) VALUES (john_id, '3');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM teacher_classes WHERE teacher_id = john_id AND class_name = '1') THEN
            INSERT INTO teacher_classes (teacher_id, class_name) VALUES (john_id, '1');
        END IF;
    END IF;

END $$;
