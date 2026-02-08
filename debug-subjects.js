const https = require('https');
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

const url = envVars['VITE_SUPABASE_URL'];
const key = envVars['VITE_SUPABASE_ANON_KEY'];

async function testTable(tableName) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: new URL(url).hostname,
            path: `/rest/v1/${tableName}?select=*&limit=5`,
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(body));
                } else {
                    reject(`Error ${res.statusCode}: ${body}`);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log('Checking curricula...');
        const curricula = await testTable('curricula');
        console.log('Curricula found:', curricula.length);
        console.log(JSON.stringify(curricula, null, 2));

        console.log('\nChecking subjects...');
        const subjects = await testTable('subjects');
        console.log('Subjects found:', subjects.length);
        console.log(JSON.stringify(subjects, null, 2));
    } catch (err) {
        console.error('Debug failed:', err);
    }
}

run();
