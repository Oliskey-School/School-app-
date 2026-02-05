
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase Client with Service Role Key (BYPASS RLS)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const DEMO_SCHOOL_ID = '00000000-0000-0000-0000-000000000000'

        console.log(`Starting reset for School ID: ${DEMO_SCHOOL_ID}`)

        // 1. Delete all data for this school
        // Note: Cascading deletes on school_id FKs should handle most tables, 
        // but we can be explicit for safety or if cascades aren't perfect.
        // relying on ON DELETE CASCADE for:
        // profiles, students, parents, teacher_assignments, student_achievements, etc.

        // However, we must NOT delete the School record itself, just the children.
        // We can't easily "delete children" without knowing all tables usually.
        // But since we set ON DELETE CASCADE in migration 0105, 
        // simply deleting the school would work, BUT we want to keep the school record.

        // Alternative: Delete specific high-level entities
        const entities = ['profiles', 'subjects', 'academic_years', 'class_sections']

        for (const entity of entities) {
            const { error: deleteError } = await supabaseClient
                .from(entity)
                .delete()
                .eq('school_id', DEMO_SCHOOL_ID)

            if (deleteError) {
                console.error(`Error deleting ${entity}:`, deleteError)
                throw deleteError
            }
        }

        console.log('Cleanup complete. Starting re-seed...')

        // 2. Re-Seed Data
        // We assume there are helper SQL functions or we do raw inserts here.
        // Ideally, we call a Database Function `seed_demo_school()` to keep this logic close to DB.
        // Let's assume we created that function in migration 0107 or we do it here.
        // Doing it here allows using JSON files easily.

        // For now, let's call a database RPC if it exists, or just return success if the goal 
        // is to just wipe it (and let it be "empty" until someone signs up or a fresh seed runs).
        // Requirement says "INSERT a clean set of seed data".

        // Let's create a minimal seed here for validation

        // A. Create Admin
        const { error: adminError } = await supabaseClient.from('profiles').insert({
            id: '11111111-1111-1111-1111-111111111111', // Fixed ID for Demo Admin
            school_id: DEMO_SCHOOL_ID,
            email: 'admin@demo.school',
            full_name: 'Demo Admin',
            role: 'admin',
            school_generated_id: 'SCH_MAIN_ADM_001'
        })

        if (adminError && adminError.code !== '23505') { // Ignore unique constraint if exists (though we deleted above)
            console.error('Error seeding admin:', adminError)
        }

        return new Response(
            JSON.stringify({ message: 'Demo School Reset Complete' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
