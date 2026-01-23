const https = require('https');

const urls = [
    'rwbkjotyxktonotvsvc.supabase.co',
    'rwbbjotyxkxtcnotvsvc.supabase.co'
];

async function testUrl(hostname) {
    return new Promise((resolve) => {
        console.log(`Testing ${hostname}...`);
        const options = {
            hostname: hostname,
            path: '/rest/v1/',
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            console.log(`  ${hostname}: ${res.statusCode}`);
            resolve(true);
        });

        req.on('error', (e) => {
            console.log(`  ${hostname} Error: ${e.message}`);
            resolve(false);
        });

        req.end();
    });
}

async function run() {
    for (const url of urls) {
        await testUrl(url);
    }
}

run();
