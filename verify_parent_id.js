
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try generic dotenv
try {
    require('dotenv').config();
} catch (e) {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase URL or Service Key.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function verifyParentIdMapping() {
    console.log('--- Verifying Parent ID Mapping ---');

    const SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

    // Simulate fetchParents query
    const { data: parents, error } = await supabase
        .from('parents')
        .select(`
            id, school_generated_id, name, email, phone, avatar_url, school_id, user_id, branch_id
        `)
        .eq('school_id', SCHOOL_ID)
        .limit(5);

    if (error) {
        console.error('Error fetching parents:', error);
        return;
    }

    console.log(`Fetched ${parents.length} parents via raw query.`);

    // Simulate mapping done in lib/database.ts
    const mappedParents = parents.map(p => ({
        id: p.id,
        schoolId: p.school_id,           // The fix: UUID
        schoolGeneratedId: p.school_generated_id, // The fix: Readable ID
        name: p.name
    }));

    console.log('\nMapped Parents (Simulating Frontend Object):');
    console.table(mappedParents);

    const missingIds = mappedParents.filter(p => !p.schoolGeneratedId);
    if (missingIds.length > 0) {
        console.error('\n❌ FAILURE: Some parents are missing schoolGeneratedId.');
        console.table(missingIds);
    } else {
        console.log('\n✅ SUCCESS: All fetched parents have schoolGeneratedId mapped.');
    }
}

verifyParentIdMapping();
