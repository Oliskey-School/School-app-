
const https = require('https');

const supabaseUrl = 'https://ikowlorheeyrsbgvlhvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb3dsb3JoZWV5cnNiZ3ZsaHZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg0MzExMiwiZXhwIjoyMDgwNDE5MTEyfQ.9ItUVZWnMdpXQ4Evboht6op2XK_2XpvCUbeZjGP4J9A';

const options = {
  hostname: 'ikowlorheeyrsbgvlhvg.supabase.co',
  path: '/rest/v1/student_enrollments?limit=1',
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Prefer': 'count=exact'
  }
};

console.log('--- Fetching student_enrollments metadata via REST ---');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    if (res.statusCode === 200 || res.statusCode === 204) {
      const data = JSON.parse(body || '[]');
      if (data.length > 0) {
        console.log('✅ Columns found from row keys:', Object.keys(data[0]).join(', '));
      } else {
        console.log('Table is empty. Trying to get schema via HEAD request...');
        // PostgREST returns column names in the response if we use CSV format or just check the schema
        const headOptions = { ...options, method: 'GET', path: '/rest/v1/student_enrollments?limit=0', headers: { ...options.headers, 'Accept': 'text/csv' } };
        const headReq = https.request(headOptions, (headRes) => {
            let csvHead = '';
            headRes.on('data', (d) => csvHead += d);
            headRes.on('end', () => {
                console.log('CSV Header:', csvHead.split('\n')[0]);
            });
        });
        headReq.end();
      }
    } else {
      console.error('❌ Error response:', body);
    }
  });
});

req.on('error', (e) => console.error('❌ Request error:', e.message));
req.end();
