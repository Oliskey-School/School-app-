// Quick Supabase Connection Test
// Run: node test-supabase.js

const https = require('https');

// Read environment variables from .env file
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
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

console.log('='.repeat(50));
console.log('SUPABASE CONNECTION TEST');
console.log('='.repeat(50));
console.log('');
console.log('📍 URL:', supabaseUrl || '❌ NOT SET');
console.log('🔑 Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '❌ NOT SET');
console.log('');

// Validate key format
if (supabaseKey) {
    if (supabaseKey.startsWith('eyJ')) {
        console.log('✅ Key format looks correct (JWT token)');
    } else if (supabaseKey.startsWith('sb_')) {
        console.log('❌ Key format is WRONG! This looks like a Stripe key, not Supabase.');
        console.log('   Supabase keys start with "eyJ..." (JWT format)');
        process.exit(1);
    } else {
        console.log('⚠️  Key format is unusual. Supabase anon keys usually start with "eyJ..."');
    }
}
console.log('');

// Test connection
if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase URL or Key. Please update your .env file.');
    process.exit(1);
}

console.log('🔄 Testing connection to Supabase...');

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
    console.log('');
    if (res.statusCode === 200) {
        console.log('✅ SUCCESS! Connected to Supabase.');
        console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
    } else if (res.statusCode === 401) {
        console.log('❌ AUTHENTICATION FAILED (401)');
        console.log('   Your anon key is invalid. Please get the correct key from:');
        console.log('   Supabase Dashboard → Settings → API → Project API keys');
    } else {
        console.log(`⚠️  Unexpected response: ${res.statusCode} ${res.statusMessage}`);
    }
    console.log('');
});

req.on('error', (e) => {
    console.log('');
    console.log('❌ CONNECTION FAILED:', e.message);
    console.log('');
    console.log('Possible causes:');
    console.log('  - No internet connection');
    console.log('  - Supabase project is paused (free tier)');
    console.log('  - Firewall/VPN blocking the connection');
    console.log('');
});

req.end();
