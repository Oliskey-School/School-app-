// Parent Module Backend Audit Script
// Scans all Parent module components for database table references

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parentComponents = [
    'admin/AddParentScreen.tsx',
    'admin/ParentDetailAdminView.tsx',
    'admin/ParentListScreen.tsx',
    'dashboards/ParentDashboard.tsx',
    'parent/AIParentingTips.tsx',
    'parent/AlertsScreen.tsx',
    'parent/AppointmentScreen.tsx',
    'parent/EditParentProfileScreen.tsx',
    'parent/FeeStatusScreen.tsx',
    'parent/FeedbackScreen.tsx',
    'parent/InstallmentSchedule.tsx',
    'parent/LearningResourcesScreen.tsx',
    'parent/PTAMeetingScreen.tsx',
    'parent/ParentDashboard.tsx',
    'parent/ParentMessagesScreen.tsx',
    'parent/ParentNewChatScreen.tsx',
    'parent/ParentNotificationSettingsScreen.tsx',
    'parent/ParentPhotoGalleryScreen.tsx',
    'parent/ParentProfileScreen.tsx',
    'parent/ParentSecurityScreen.tsx',
    'parent/PermissionSlipScreen.tsx',
    'parent/ReportCardScreen.tsx',
    'parent/SchoolPoliciesScreen.tsx',
    'parent/SchoolUtilitiesScreen.tsx',
    'parent/SelectChildForReportScreen.tsx',
    'parent/VolunteerSignup.tsx',
    'parent/VolunteeringScreen.tsx'
];

const componentsDir = join(__dirname, '..', 'components');

// Patterns to match table references
const tablePatterns = [
    /from\(['"](\w+)['"]\)/g,
    /\.from\(['"](\w+)['"]\)/g,
    /table:\s*['"](\w+)['"]/g,
    /tableName:\s*['"](\w+)['"]/g,
    /supabase\.from\(['"](\w+)['"]\)/g,
    /select.*from\s+(\w+)/gi,
    /insert\s+into\s+(\w+)/gi,
    /update\s+(\w+)\s+set/gi,
    /delete\s+from\s+(\w+)/gi,
    /join\s+(\w+)\s+on/gi,
];

const results = {
    totalComponents: 0,
    componentsAnalyzed: [],
    tablesFound: new Set(),
    tablesByComponent: {},
    componentsByTable: {}
};

function extractTables(content, componentName) {
    const tables = new Set();

    tablePatterns.forEach(pattern => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
            const tableName = match[1];
            if (tableName && tableName.length > 2) {
                if (!['state', 'data', 'error', 'loading', 'value', 'name', 'id', 'type'].includes(tableName.toLowerCase())) {
                    tables.add(tableName.toLowerCase());
                }
            }
        }
    });

    // Also look for snake_case table names
    const snakeCasePattern = /from\(['"]([a-z_]+)['"]\)/g;
    const snakeMatches = content.matchAll(snakeCasePattern);
    for (const match of snakeMatches) {
        const tableName = match[1];
        if (tableName && tableName.includes('_')) {
            tables.add(tableName);
        }
    }

    return Array.from(tables);
}

console.log('🔍 Auditing Parent Module Components...\n');

parentComponents.forEach(componentPath => {
    const fullPath = join(componentsDir, componentPath);

    try {
        const content = readFileSync(fullPath, 'utf-8');
        const tables = extractTables(content, componentPath);

        results.totalComponents++;
        results.componentsAnalyzed.push({
            component: componentPath,
            tables: tables,
            tableCount: tables.length
        });

        results.tablesByComponent[componentPath] = tables;

        tables.forEach(table => {
            results.tablesFound.add(table);
            if (!results.componentsByTable[table]) {
                results.componentsByTable[table] = [];
            }
            results.componentsByTable[table].push(componentPath);
        });

        console.log(`✓ ${componentPath}: ${tables.length} tables referenced`);
    } catch (error) {
        console.error(`✗ ${componentPath}: Error - ${error.message}`);
    }
});

console.log(`\n📊 Analysis Complete:`);
console.log(`   Components analyzed: ${results.totalComponents}`);
console.log(`   Unique tables found: ${results.tablesFound.size}`);

// Sort tables by usage frequency
const tablesByFrequency = Object.entries(results.componentsByTable)
    .map(([table, components]) => ({ table, count: components.length, components }))
    .sort((a, b) => b.count - a.count);

console.log(`\n🏆 Top 10 Most Referenced Tables:`);
tablesByFrequency.slice(0, 10).forEach(({ table, count }) => {
    console.log(`   ${table.padEnd(30)} (${count} components)`);
});

// Write detailed report
const report = {
    summary: {
        totalComponents: results.totalComponents,
        uniqueTables: results.tablesFound.size,
        timestamp: new Date().toISOString()
    },
    allTables: Array.from(results.tablesFound).sort(),
    tablesByFrequency: tablesByFrequency,
    componentsByTable: results.componentsByTable,
    tablesByComponent: results.tablesByComponent
};

const reportPath = join(__dirname, 'parent_module_audit_report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📁 Detailed report saved to: ${reportPath}`);

// Create CSV summary
const csvLines = [
    'Table Name,Usage Count,Components',
    ...tablesByFrequency.map(({ table, count, components }) =>
        `${table},${count},"${components.join('; ')}"`
    )
];
const csvPath = join(__dirname, 'parent_module_tables.csv');
writeFileSync(csvPath, csvLines.join('\n'));
console.log(`📁 CSV summary saved to: ${csvPath}`);

console.log(`\n✅ Audit complete! Found ${results.tablesFound.size} unique tables across ${results.totalComponents} components.`);
