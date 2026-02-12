
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try { require('dotenv').config(); } catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function listParents() {
    console.log('--- Listing Parents ---');

    // Search by name "Demo"
    const { data: parents, error } = await supabase
        .from('parents')
        .select('id, name, school_generated_id, school_id')
        .ilike('name', '%Demo%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${parents.length} parents with "Demo" in name:`);
    console.table(parents);

    // Also verify if the specific ID exists at all
    const { data: exactId } = await supabase
        .from('parents')
        .select('id, name, school_generated_id')
        .eq('school_generated_id', 'OLISKEY_MAIN_PAR_0001');

    console.log('\nExact ID Search (OLISKEY_MAIN_PAR_0001):');
    if (exactId && exactId.length > 0) {
        console.table(exactId);
    } else {
        console.log('No record found with this exact ID string.');
    }
}

listParents();
