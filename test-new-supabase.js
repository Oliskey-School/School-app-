const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.new');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

console.log('Testing NEW Supabase Project...');
console.log('URL:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing URL or Key in .env.new');
    process.exit(1);
}

const url = new URL(supabaseUrl);
const options = {
    hostname: url.hostname,
    path: '/rest/v1/',
    method: 'GET',
    headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    }
};

const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
    if (res.statusCode === 200) {
        console.log('✅ SUCCESS! Connected to NEW Supabase.');
    } else {
        console.log('❌ FAILED to connect to NEW Supabase.');
    }
});

req.on('error', (e) => {
    console.error('❌ ERROR:', e.message);
});

req.end();
