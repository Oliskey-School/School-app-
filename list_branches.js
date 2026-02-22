const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBranches() {
    console.log('--- Branches ---');
    const { data: branches, error: bError } = await supabase.from('branches').select('id, name, is_main');
    if (bError) {
        console.error(bError);
        return;
    }
    console.table(branches);

    for (const branch of branches) {
        const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('branch_id', branch.id);
        const { count: tCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('branch_id', branch.id);
        console.log(`${branch.name}: Students=${sCount}, Teachers=${tCount}`);
    }

    const { count: sAll } = await supabase.from('students').select('*', { count: 'exact', head: true });
    const { count: tAll } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    console.log(`TOTAL: Students=${sAll}, Teachers=${tAll}`);

    console.log('\n--- Submitted Reports ---');
    const { data: reports, error: rError } = await supabase.from('report_cards').select('id, branch_id').eq('status', 'Submitted');
    if (rError) {
        console.error(rError);
    } else {
        console.log(`Total Submitted Reports: ${reports.length}`);
        const branchCounts = reports.reduce((acc, r) => {
            const name = branches.find(b => b.id === r.branch_id)?.name || 'Unknown';
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {});
        console.log('Reports by Branch:', branchCounts);
    }
}

listBranches();
