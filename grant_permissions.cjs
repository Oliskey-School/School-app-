const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
    db: { schema: 'public' }
});

async function grantPermissions() {
    console.log('🔓 Granting SELECT permissions on junction tables...\n');

    const grants = [
        "GRANT SELECT ON public.teacher_subjects TO anon, authenticated",
        "GRANT SELECT ON public.teacher_classes TO anon, authenticated",
        "GRANT SELECT ON public.parent_children TO anon, authenticated",
        "GRANT SELECT ON public.student_parent_links TO anon, authenticated"
    ];

    // Execute HTTP request to Supabase SQL API
    const projectRef = supabaseUrl.split('//')[1].split('.')[0];

    for (const grant of grants) {
        try {
            // Use raw query execution
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/_raw_execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`
                },
                body: JSON.stringify({ query: grant })
            });

            const tableName = grant.split(' ON ')[1].split(' TO')[0];
            if (response.ok) {
                console.log(`✅ ${tableName}: Permission granted`);
            } else {
                const error = await response.text();
                console.log(`❌ ${tableName}: ${error}`);
            }
        } catch (err) {
            console.log(`❌ Error: ${err.message}`);
        }
    }

    console.log('\n✨ Testing after permissions...');

    // Test the query again
    const { data, error } = await supabase
        .from('teachers')
        .select(`
            *,
            teacher_subjects(subject),
            teacher_classes(class_name)
        `)
        .eq('school_id', 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1')
        .limit(1);

    console.log(`Test query result: ${data?.length || 0} teachers`);
    if (error) console.log(`Test query error: ${error.message}`);
}

grantPermissions().catch(console.error);
