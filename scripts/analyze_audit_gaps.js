const fs = require('fs');
const path = require('path');

const adminPagesListPath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\2ba5cc21-0d11-4e17-bb5c-855f094ef187\\admin_pages_list.md';
const adminDashboardPath = 'c:\\Users\\USER\\OneDrive\\Desktop\\Project\\school-app-\\components\\admin\\AdminDashboard.tsx';

function analyze() {
    const listContent = fs.readFileSync(adminPagesListPath, 'utf8');
    const dashboardContent = fs.readFileSync(adminDashboardPath, 'utf8');

    // Extract component names from the markdown table
    const pageMatches = listContent.matchAll(/\|\s*\d+\s*\|\s*(.*?)\s*\|/g);
    const allPages = Array.from(pageMatches).map(m => m[1].trim()).filter(p => p !== 'Page Component');

    // Extract registered components from viewComponents object
    const viewComponentsMatch = dashboardContent.match(/viewComponents:.*{([\s\S]*?)};/);
    const registeredText = viewComponentsMatch ? viewComponentsMatch[1] : '';
    
    // Also extract imports/lazy loads
    const lazyLoads = Array.from(dashboardContent.matchAll(/const\s+(\w+)\s+=\s+lazy/g)).map(m => m[1]);

    const results = allPages.map(page => {
        const componentName = page.replace('.tsx', '');
        const isImported = dashboardContent.includes(componentName);
        const isRegistered = registeredText.includes(componentName);
        
        let status = 'Passed';
        if (listContent.includes(`| ${page} | [ ]`)) {
            status = 'Failing/Manual';
        }

        return {
            page,
            componentName,
            isImported,
            isRegistered,
            status
        };
    });

    const missingRegistration = results.filter(r => !r.isRegistered);
    const failingButRegistered = results.filter(r => r.isRegistered && r.status === 'Failing/Manual');

    console.log(`Total Pages in List: ${allPages.length}`);
    console.log(`Missing Registration: ${missingRegistration.length}`);
    console.log(`Registered but Failing: ${failingButRegistered.length}`);

    console.log('\n--- Missing Registration ---');
    missingRegistration.forEach(r => console.log(r.page));

    console.log('\n--- Registered but Failing (Trigger Issue) ---');
    failingButRegistered.forEach(r => console.log(r.page));
}

analyze();
