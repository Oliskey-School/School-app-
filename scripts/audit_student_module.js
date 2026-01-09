// Student Module Backend Audit Script
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const studentComponents = [
    'admin/AddStudentScreen.tsx',
    'admin/AdminStudentListForReport.tsx',
    'admin/AdminStudentReportCardScreen.tsx',
    'admin/StudentDetailReport.tsx',
    'admin/StudentEnrollmentWizard.tsx',
    'admin/StudentListScreen.tsx',
    'admin/StudentProfileAdminView.tsx',
    'dashboards/StudentDashboard.tsx',
    'student/AcademicReportScreen.tsx',
    'student/AchievementsScreen.tsx',
    'student/AnonymousReporting.tsx',
    'student/AssignmentFeedbackScreen.tsx',
    'student/AssignmentSubmissionScreen.tsx',
    'student/AssignmentsScreen.tsx',
    'student/AttendanceScreen.tsx',
    'student/ClassroomScreen.tsx',
    'student/ExtracurricularsScreen.tsx',
    'student/NewMessageScreen.tsx',
    'student/ProfessionalStudentProfile.tsx',
    'student/QuizPlayerScreen.tsx',
    'student/QuizzesScreen.tsx',
    'student/ResultsScreen.tsx',
    'student/StudentDashboard.tsx',
    'student/StudentFinanceScreen.tsx',
    'student/StudentMessagesScreen.tsx',
    'student/StudentProfileEnhanced.tsx',
    'student/StudentProfileScreen.tsx',
    'student/StudyBuddy.tsx',
    'student/SubjectsScreen.tsx',
    'student/VideoLessonScreen.tsx',
    'student/cbt/StudentCBTListScreen.tsx',
    'student/cbt/StudentCBTPlayerScreen.tsx'
];

const componentsDir = join(__dirname, '..', 'components');

const tablePatterns = [
    /from\(['"](\w+)['"]\)/g,
    /\.from\(['"](\w+)['"]\)/g,
    /supabase\.from\(['"](\w+)['"]\)/g,
    /from\(['"]([a-z_]+)['"]\)/g,
];

const results = { totalComponents: 0, tablesFound: new Set(), tablesByComponent: {}, componentsByTable: {} };

function extractTables(content) {
    const tables = new Set();
    tablePatterns.forEach(pattern => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
            const tableName = match[1];
            if (tableName && tableName.length > 2 && !['state', 'data', 'error', 'loading'].includes(tableName.toLowerCase())) {
                tables.add(tableName.toLowerCase());
            }
        }
    });
    return Array.from(tables);
}

console.log('🔍 Auditing Student Module Components...\n');

studentComponents.forEach(componentPath => {
    const fullPath = join(componentsDir, componentPath);
    try {
        const content = readFileSync(fullPath, 'utf-8');
        const tables = extractTables(content);

        results.totalComponents++;
        results.tablesByComponent[componentPath] = tables;

        tables.forEach(table => {
            results.tablesFound.add(table);
            if (!results.componentsByTable[table]) results.componentsByTable[table] = [];
            results.componentsByTable[table].push(componentPath);
        });

        console.log(`✓ ${componentPath}: ${tables.length} tables`);
    } catch (error) {
        console.error(`✗ ${componentPath}: ${error.message}`);
    }
});

const tablesByFrequency = Object.entries(results.componentsByTable)
    .map(([table, components]) => ({ table, count: components.length, components }))
    .sort((a, b) => b.count - a.count);

console.log(`\n📊 Analysis Complete:`);
console.log(`   Components: ${results.totalComponents}`);
console.log(`   Unique tables: ${results.tablesFound.size}`);
console.log(`\n🏆 Top 10 Tables:`);
tablesByFrequency.slice(0, 10).forEach(({ table, count }) => {
    console.log(`   ${table.padEnd(30)} (${count} components)`);
});

const report = {
    summary: { totalComponents: results.totalComponents, uniqueTables: results.tablesFound.size, timestamp: new Date().toISOString() },
    allTables: Array.from(results.tablesFound).sort(),
    tablesByFrequency,
    componentsByTable: results.componentsByTable,
    tablesByComponent: results.tablesByComponent
};

writeFileSync(join(__dirname, 'student_module_audit_report.json'), JSON.stringify(report, null, 2));
console.log(`\n📁 Report saved`);
console.log(`✅ Found ${results.tablesFound.size} tables across ${results.totalComponents} components`);
