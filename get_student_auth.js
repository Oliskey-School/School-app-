
const { createClient } = require('@supabase/supabase-js');
try { require('dotenv').config(); } catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function getStudentAuthId() {
    console.log('--- Get Student User ID by Email ---');
    const EMAIL = 'student@demo.com';

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const user = users.find(u => u.email === EMAIL);

    if (user) {
        console.log(`✅ FOUND USER: ${EMAIL}`);
        console.log(`UUID: ${user.id}`);
        console.log(`Metadata:`, user.user_metadata);
    } else {
        console.log(`❌ User not found: ${EMAIL}`);
    }
}

getStudentAuthId();
