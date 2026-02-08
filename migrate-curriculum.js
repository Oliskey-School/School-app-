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

const NIGERIAN_CURRICULUM_ID = '899367eb-858b-4762-bf08-38d5fc8df355';
const BRITISH_CURRICULUM_ID = 'eacbbda8-4e69-4a1b-be15-8eae349f3f32';

async function updateSubjects() {
    console.log('Linking subjects to Nigerian curriculum...');

    // Update existing subjects where curriculum_id is null
    const updateData = JSON.stringify({ curriculum_id: NIGERIAN_CURRICULUM_ID });

    const options = {
        hostname: new URL(url).hostname,
        path: '/rest/v1/subjects?curriculum_id=is.null',
        method: 'PATCH',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ Subjects linked successfully.');
                    resolve(JSON.parse(body));
                } else {
                    reject(`Error ${res.statusCode}: ${body}`);
                }
            });
        });
        req.on('error', reject);
        req.write(updateData);
        req.end();
    });
}

async function seedBritishSubjects() {
    console.log('Seeding British curriculum subjects...');

    const subjects = [
        {
            name: 'Cambridge Mathematics',
            category: 'Core',
            grade_level_category: 'Primary',
            curriculum_id: BRITISH_CURRICULUM_ID,
            school_id: '00000000-0000-0000-0000-000000000000',
            is_active: true,
            is_core: true
        },
        {
            name: 'Cambridge English',
            category: 'Core',
            grade_level_category: 'Primary',
            curriculum_id: BRITISH_CURRICULUM_ID,
            school_id: '00000000-0000-0000-0000-000000000000',
            is_active: true,
            is_core: true
        }
    ];

    const options = {
        hostname: new URL(url).hostname,
        path: '/rest/v1/subjects',
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ British subjects seeded successfully.');
                    resolve(JSON.parse(body));
                } else {
                    reject(`Error ${res.statusCode}: ${body}`);
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(subjects));
        req.end();
    });
}

async function run() {
    try {
        await updateSubjects();
        await seedBritishSubjects();
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

run();
