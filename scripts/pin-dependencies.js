const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const pinDependencies = (deps) => {
        if (!deps) return {};
        const pinned = {};
        for (const [key, value] of Object.entries(deps)) {
            // Remove ^ and ~ from version strings
            pinned[key] = value.replace(/^[\^~]/, '');
        }
        return pinned;
    };

    if (packageJson.dependencies) {
        console.log('Pinning dependencies...');
        packageJson.dependencies = pinDependencies(packageJson.dependencies);
    }

    if (packageJson.devDependencies) {
        console.log('Pinning devDependencies...');
        packageJson.devDependencies = pinDependencies(packageJson.devDependencies);
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('✅ Successfully pinned all dependencies in package.json');

} catch (error) {
    console.error('Error processing package.json:', error);
    process.exit(1);
}
