const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/teachers?school_id=d0ff3e95-9b4c-4c12-989c-e5640d3cacd1&branchId=7601cbea-e1ba-49d6-b59b-412a584cb94f',
    method: 'GET',
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        try {
            console.log('RESPONSE:', JSON.parse(data).length, 'items');
            console.log(data);
        } catch {
            console.log('RESPONSE TEXT:', data);
        }
    });
});

req.on('error', error => {
    console.error('ERROR:', error);
});

req.end();
