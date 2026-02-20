const fs = require('fs');
const path = require('path');

const frontendApiFile = fs.readFileSync('lib/api.ts', 'utf-8');
const backendRoutesDir = 'backend/src/routes';

const regex = /fetch\(\`?\\?\$\{(?:API_URL|this\.baseURL)\}\/([^\`\?\'\"]+)/g;
const apiCalls = [];
let match;
while ((match = regex.exec(frontendApiFile)) !== null) {
    apiCalls.push(match[1]);
}

console.log('Frontend calls found:', apiCalls.length);
const uniqueFrontendCalls = [...new Set(apiCalls)].sort();

const backendRoutes = [];
const files = fs.readdirSync(backendRoutesDir);
files.forEach(f => {
    if (f.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(backendRoutesDir, f), 'utf-8');
        const prefixMatch = f.replace('.routes.ts', '');

        const routeRegex = /router\.(get|post|put|delete|patch)\(['\"]\/([^'\"]*)['\"]/g;
        let routeMatch;
        while ((routeMatch = routeRegex.exec(content)) !== null) {
            const endpoint = prefixMatch === 'index' ? routeMatch[2] : (prefixMatch + (routeMatch[2] ? '/' + routeMatch[2] : ''));
            backendRoutes.push(endpoint.replace(/\/$/, ''));
        }
    }
});

const uniqueBackendRoutes = [...new Set(backendRoutes)].sort();
console.log('Backend routes found:', uniqueBackendRoutes.length);

console.log('\n--- Missing in Backend ---');
uniqueFrontendCalls.forEach(call => {
    let callBase = call.split('/$')[0]; // simple truncate parameters
    let isFound = false;
    uniqueBackendRoutes.forEach(br => {
        let brBase = br.split('/:')[0];
        if (callBase === brBase || callBase.startsWith(brBase + '/') || brBase.startsWith(callBase + '/')) {
            isFound = true;
        }
    });

    if (!isFound) {
        console.log('MISSING OR MISMATCHED:', call);
    }
});
