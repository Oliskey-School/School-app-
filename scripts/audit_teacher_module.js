// Teacher Module Backend Audit Script
// Scans all Teacher module components for database table references

import { readFileSync, readdirSync, writeFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const teacherComponents = [
    'admin/AddTeacherScreen.tsx',
    'admin/TeacherAttendanceApproval.tsx',
    'admin/TeacherAttendanceDetail.tsx',
    'admin/TeacherAttendanceScreen.tsx',
    'admin/TeacherDetailAdminView.tsx',
    'admin/TeacherListScreen.tsx',
    'admin/TeacherPerformanceScreen.tsx',
    'dashboards/TeacherDashboard.tsx',
    'shared/TeacherCurriculumBadges.tsx',
    'teacher/EditTeacherProfileScreen.tsx',
    'teacher/TeacherAppointmentsScreen.tsx',
    'teacher/TeacherAssignmentsListScreen.tsx',
    'teacher/TeacherAttendanceScreen.tsx',
    'teacher/TeacherChangePasswordScreen.tsx',
    'teacher/TeacherCommunicationScreen.tsx',
    'teacher/TeacherCurriculumSelectionScreen.tsx',
    'teacher/TeacherDashboard.tsx',
    'teacher/TeacherExamManagement.tsx',
    'teacher/TeacherForum.tsx',
    'teacher/TeacherMessagesScreen.tsx',
    'teacher/TeacherNotificationSettingsScreen.tsx',
    'teacher/TeacherOverview.tsx',
    'teacher/TeacherProfile.tsx',
    'teacher/TeacherProfileEnhanced.tsx',
    'teacher/TeacherReportCardPreviewScreen.tsx',
    'teacher/TeacherReportsScreen.tsx',
    'teacher/TeacherResourcesScreen.tsx',
    'teacher/TeacherSalaryProfile.tsx',
    'teacher/TeacherSecurityScreen.tsx',
    'teacher/TeacherSelfAttendance.tsx',
    'teacher/TeacherSettingsScreen.tsx',
    'teacher/TeacherUnifiedAttendanceScreen.tsx'
];

const componentsDir = join(__dirname, '..', 'components');

// Patterns to match table references
const tablePatterns = [
    /from\(['"](\w+)['"]\)/g,                          // from('tablename')
    /\.from\(['"](\w+)['"]\)/g,                        // .from('tablename')
    /table:\s*['"](\w+)['"]/g,                         // table: 'tablename'
    /tableName:\s*['"](\w+)['"]/g,                     // tableName: 'tablename'
    /supabase\.from\(['"](\w+)['"]\)/g,               // supabase.from('tablename')
    /select.*from\s+(\w+)/gi,                          // SELECT ... FROM tablename
    /insert\s+into\s+(\w+)/gi,                         // INSERT INTO tablename
    /update\s+(\w+)\s+set/gi,                          // UPDATE tablename SET
    /delete\s+from\s+(\w+)/gi,                         // DELETE FROM tablename
    /join\s+(\w+)\s+on/gi,                             // JOIN tablename ON
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
            if (tableName && tableName.length > 2 && !tableName.includes('_')) {
                // Skip obvious non-table names
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

console.log('🔍 Auditing Teacher Module Components...\n');

teacherComponents.forEach(componentPath => {
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

const reportPath = join(__dirname, 'teacher_module_audit_report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📁 Detailed report saved to: ${reportPath}`);

// Create CSV summary
const csvLines = [
    'Table Name,Usage Count,Components',
    ...tablesByFrequency.map(({ table, count, components }) =>
        `${table},${count},"${components.join('; ')}"`
    )
];
const csvPath = join(__dirname, 'teacher_module_tables.csv');
writeFileSync(csvPath, csvLines.join('\n'));
console.log(`📁 CSV summary saved to: ${csvPath}`);

console.log(`\n✅ Audit complete! Found ${results.tablesFound.size} unique tables across ${results.totalComponents} components.`);
