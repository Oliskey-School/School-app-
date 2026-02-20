const fs = require('fs');
const path = require('path');

try {
    // 1. Extract frontend endpoints
    const apiTs = fs.readFileSync('lib/api.ts', 'utf8');
    const lines = apiTs.split('\n');
    const frontendEndpoints = new Set();

    for (let line of lines) {
        if (line.includes('this.fetch<')) {
            const match = line.match(/this\.fetch<[^>]+>\s*\(\s*[\`\'\"](.*?)(?:\?|[\`\'\"])/);
            if (match) {
                let ep = match[1].split('?')[0]; // remove query parameters
                // Replace template literal injects like ${id} with standard express params like :id
                ep = ep.replace(/\$\{[^\}]+\}/g, ':id');
                frontendEndpoints.add(ep);
            }
        }
    }

    console.log('\n================================');
    console.log('--- Frontend Expected Endpoints ---');
    const feArray = Array.from(frontendEndpoints).filter(e => e.startsWith('/'));
    console.log(feArray.sort().join('\n'));

    // 2. Extract backend registered routes
    const routesDir = path.join('backend', 'src', 'routes');
    if (!fs.existsSync(routesDir)) {
        console.error(`Routes directory not found: ${routesDir}`);
        process.exit(1);
    }

    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.ts'));
    const backendEndpoints = new Set();
    // read index.ts for base paths
    const indexTs = fs.readFileSync(path.join(routesDir, 'index.ts'), 'utf8');
    const basePaths = {};

    // Handle imports with variable name and literal path mapping
    const linesIdx = indexTs.split('\n');
    for (let line of linesIdx) {
        const rm = line.match(/router\.use\(['\"](.*?)['\"],\s*(\w+)Routes/);
        if (rm) {
            basePaths[rm[2]] = rm[1]; // mapping variable prefix out of literal string
        }
    }
    // Try to assign the correct base map based on the filename standard prefix
    for (let file of routeFiles) {
        const rawName = file.split('.')[0];
        let base = basePaths[rawName] || `/${rawName}s`; // fallback standard if not strict match

        if (rawName === 'index') continue;

        const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
        for (let line of content.split('\n')) {
            const rm = line.match(/router\.(get|post|put|delete|patch)\(['\"](.*?)['\"]/);
            if (rm) {
                let epSegment = rm[2];
                let ep = base + (epSegment === '/' ? '' : epSegment);
                if (epSegment === '' || epSegment === '/') {
                    ep = base; // clean
                }
                backendEndpoints.add(ep);
            }
        }
    }

    let output = '\n================================\n';
    output += '--- Backend Registered Endpoints ---\n';
    output += Array.from(backendEndpoints).sort().join('\n');

    output += '\n================================\n';
    output += '--- Missing Endpoints in Backend ---\n';
    for (let fe of feArray) {
        let feNorm = fe.replace(/\/$/, ''); // strip trailing slash

        if (!backendEndpoints.has(feNorm)) {
            output += 'Expected but missing => ' + fe + '\n';
        }
    }
    fs.writeFileSync('api_report.txt', output, 'utf8');
} catch (e) {
    console.error(e);
}
