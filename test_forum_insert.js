const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ikowlorheeyrsbgvlhvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb3dsb3JoZWV5cnNiZ3ZsaHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NDMxMTIsImV4cCI6MjA4MDQxOTExMn0.3a_zLfX_Doo_DVbvLaNMJdVmejbM5IRV-nM7Olwj0Z4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'; // Demo School ID
    
    console.log(`Testing forum topic insert as anon for school: ${schoolId}`);
    
    const { data, error } = await supabase
        .from('forum_topics')
        .insert({
            title: 'Test Topic ' + Date.now(),
            content: 'Testing forum RLS from Node script with real anon key',
            author_name: 'Test Author',
            author_id: 'd3300000-0000-0000-0000-000000000002', // Some UUID
            school_id: schoolId,
            last_activity: new Date().toISOString(),
            post_count: 0
        })
        .select()
        .maybeSingle();

    if (error) {
        console.error('Insert failed:', JSON.stringify(error, null, 2));
    } else {
        console.log('Insert successful:', data.id);
        // Clean up
        const { error: delError } = await supabase.from('forum_topics').delete().eq('id', data.id);
        if (delError) console.error('Cleanup failed:', delError.message);
        else console.log('Cleanup successful');
    }
}

testInsert();
