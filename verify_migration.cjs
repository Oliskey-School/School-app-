// Verify Inspector Portal & Production Readiness
// Run: node verify_migration.cjs

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env
const envPath = path.join(__dirname, '.env');
let supabaseUrl, supabaseKey;

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...parts] = line.split('=');
        if (key && key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = parts.join('=').trim();
        if (key && key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = parts.join('=').trim();
    });
} catch (e) {
    console.error('❌ Could not read .env file');
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const url = new URL(supabaseUrl);

const tablesToCheck = [
    'schools',
    'facility_registers',
    'compliance_snapshots',
    'inspection_checklist_templates',
    'exam_results'
];

console.log('🔄 Verifying production readiness (checking critical tables)...');

const checkTable = (tableName) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.hostname,
            path: `/rest/v1/${tableName}?select=count`,
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Range': '0-0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 206) {
                    resolve({ table: tableName, exists: true, status: '✅ Found' });
                } else if (res.statusCode === 404) {
                    resolve({ table: tableName, exists: false, status: '❌ MISSING (404)' });
                } else {
                    resolve({ table: tableName, exists: false, status: `⚠️ Error ${res.statusCode}` });
                }
            });
        });

        req.on('error', (e) => {
            resolve({ table: tableName, exists: false, status: `❌ Connection Error` });
        });

        req.end();
    });
};

Promise.all(tablesToCheck.map(checkTable)).then(results => {
    console.log('\n📊 Verification Results:');
    console.log('------------------------');
    results.forEach(r => console.log(`${r.status.padEnd(20)} ${r.table}`));
    console.log('------------------------');

    const missing = results.filter(r => !r.exists);
    if (missing.length === 0) {
        console.log('\n🎉 ALL SYSTEMS GO! All critical tables are present.');
    } else {
        console.log('\n⚠️  MISSING TABLES DETECTED!');
        console.log('You may need to run the consolidated setup script.');
    }
});
