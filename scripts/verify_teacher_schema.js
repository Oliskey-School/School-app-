// Teacher Module Schema Verification
// Compares Teacher module tables against existing database schema

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load teacher module audit results
const teacherAuditPath = join(__dirname, 'teacher_module_audit_report.json');
const teacherAudit = JSON.parse(readFileSync(teacherAuditPath, 'utf-8'));

// Load existing schema verification (from admin audit)
const schemaReportPath = join(__dirname, 'schema_verification_report.json');
let existingSchema = { existingTables: [], missingTables: [] };

try {
    existingSchema = JSON.parse(readFileSync(schemaReportPath, 'utf-8'));
} catch (error) {
    console.log('⚠️  No existing schema report found, will analyze migration files...');
}

// Get all Teacher module tables
const teacherTables = teacherAudit.allTables.filter(t => t !== 'the' && t !== 'database' && t !== '2fa');

console.log(`\n🔍 Teacher Module Schema Verification`);
console.log(`======================================\n`);
console.log(`📊 Found ${teacherTables.length} unique tables in Teacher module\n`);

// Check which tables exist in schema
const migrationsDir = join(__dirname, '..', 'database', 'migrations');
const migrationFiles = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

const tablesInSchema = new Set();

migrationFiles.forEach(file => {
    const content = readFileSync(join(migrationsDir, file), 'utf-8');

    // Match CREATE TABLE statements
    const createTablePattern = /CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/gi;
    const matches = content.matchAll(createTablePattern);

    for (const match of matches) {
        tablesInSchema.add(match[1].toLowerCase());
    }
});

console.log(`✅ Tables found in migrations: ${tablesInSchema.size}\n`);

// Categorize tables
const existingTables = [];
const missingTables = [];

teacherTables.forEach(table => {
    if (tablesInSchema.has(table)) {
        existingTables.push(table);
    } else {
        missingTables.push(table);
    }
});

// Get usage statistics for missing tables
const missingWithUsage = missingTables.map(table => {
    const usage = teacherAudit.componentsByTable[table] || [];
    return {
        table,
        usageCount: usage.length,
        components: usage
    };
}).sort((a, b) => b.usageCount - a.usageCount);

const report = {
    summary: {
        totalTablesReferenced: teacherTables.length,
        existingTables: existingTables.length,
        missingTables: missingTables.length,
        percentageComplete: Math.round((existingTables.length / teacherTables.length) * 100),
        timestamp: new Date().toISOString()
    },
    existingTables: existingTables.sort(),
    missingTables: missingWithUsage,
    tableDetails: {}
};

console.log(`📊 SUMMARY:`);
console.log(`   Total tables referenced: ${teacherTables.length}`);
console.log(`   ✅ Existing in schema: ${existingTables.length} (${report.summary.percentageComplete}%)`);
console.log(`   ❌ Missing from schema: ${missingTables.length} (${100 - report.summary.percentageComplete}%)\n`);

if (missingTables.length > 0) {
    console.log(`⚠️  MISSING TABLES:\n`);
    missingWithUsage.forEach(({ table, usageCount, components }) => {
        console.log(`   ❌ ${table.padEnd(30)} (${usageCount} component${usageCount > 1 ? 's' : ''})`);
        components.forEach(comp => {
            console.log(`      - ${comp}`);
        });
        report.tableDetails[table] = {
            status: 'MISSING',
            usageCount,
            components
        };
    });
} else {
    console.log(`✅ All Teacher module tables exist in schema!`);
}

if (existingTables.length > 0) {
    console.log(`\n✅ EXISTING TABLES:\n`);
    existingTables.forEach(table => {
        const usage = teacherAudit.componentsByTable[table] || [];
        console.log(`   ✅ ${table.padEnd(30)} (${usage.length} component${usage.length > 1 ? 's' : ''})`);
        report.tableDetails[table] = {
            status: 'EXISTS',
            usageCount: usage.length,
            components: usage
        };
    });
}

// Save report
const reportPath = join(__dirname, 'teacher_schema_verification.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📁 Report saved to: ${reportPath}`);

// Exit with error if missing tables
if (missingTables.length > 0) {
    console.log(`\n⚠️  ACTION REQUIRED: ${missingTables.length} missing tables need to be created`);
    process.exit(1);
} else {
    console.log(`\n✅ Teacher module schema verification PASSED`);
    process.exit(0);
}
