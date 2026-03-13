const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://ikowlorheeyrsbgvlhvg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb3dsb3JoZWV5cnNiZ3ZsaHZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg0MzExMiwiZXhwIjoyMDgwNDE5MTEyfQ.9ItUVZWnMdpXQ4Evboht6op2XK_2XpvCUbeZjGP4J9A'
);

async function check() {
    const { data, error } = await supabase.rpc('get_dashboard_stats', { p_school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' });
    console.log("RPC Data:", data);
    console.log("RPC Error:", error);
}

check();
