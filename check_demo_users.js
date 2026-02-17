require('dotenv').config();
const https = require('https');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const roles = ['admin', 'teacher', 'parent', 'student', 'proprietor', 'inspector', 'exam_officer', 'compliance_officer'];

const url = new URL(supabaseUrl);
const options = {
    hostname: url.hostname,
    path: '/rest/v1/profiles?select=email,role',
    method: 'GET',
    headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (res.statusCode === 200) {
            const profiles = JSON.parse(data);
            console.log('Existing Profiles:');
            profiles.forEach(p => console.log(`- ${p.email} (${p.role})`));

            console.log('\nMissing Roles:');
            roles.forEach(role => {
                if (!profiles.some(p => p.role === role)) {
                    console.log(`- ${role}`);
                }
            });
        } else {
            console.error(`Error: ${res.statusCode} ${data}`);
        }
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e.message);
});

req.end();
