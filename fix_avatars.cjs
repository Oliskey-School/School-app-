const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

const supabase = createClient(supabaseUrl, serviceKey);

async function setStaticAvatars() {
    console.log('🖼️  Setting static avatar URLs for all students...\n');

    // Fetch all students with null avatar_url
    const { data: students, error } = await supabase
        .from('students')
        .select('id, name, avatar_url')
        .eq('school_id', schoolId)
        .is('avatar_url', null);

    if (error) {
        console.error('Error fetching students:', error.message);
        return;
    }

    console.log(`Found ${students.length} students without avatars\n`);

    // Update each student with a static avatar based on their name
    for (const student of students) {
        // Use a deterministic avatar URL that won't change
        // We'll use pravatar.cc with a hash of their name to ensure consistency
        const nameHash = student.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 70;
        const staticAvatarUrl = `https://i.pravatar.cc/150?img=${nameHash}`;

        const { error: updateError } = await supabase
            .from('students')
            .update({ avatar_url: staticAvatarUrl })
            .eq('id', student.id);

        if (updateError) {
            console.log(`❌ Failed to update ${student.name}: ${updateError.message}`);
        } else {
            console.log(`✅ ${student.name}: ${staticAvatarUrl}`);
        }
    }

    console.log('\n✨ Avatar update complete!');
}

setStaticAvatars().catch(console.error);
