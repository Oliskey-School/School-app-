// Parent Module Schema Verification
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parentAuditPath = join(__dirname, 'parent_module_audit_report.json');
const parentAudit = JSON.parse(readFileSync(parentAuditPath, 'utf-8'));

const parentTables = parentAudit.allTables.filter(t => t !== 'the' && t !== 'database');

console.log(`\n🔍 Parent Module Schema Verification`);
console.log(`======================================\n`);
console.log(`📊 Found ${parentTables.length} unique tables in Parent module\n`);

const migrationsDir = join(__dirname, '..', 'database', 'migrations');
const migrationFiles = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

const tablesInSchema = new Set();

migrationFiles.forEach(file => {
    const content = readFileSync(join(migrationsDir, file), 'utf-8');
    const createTablePattern = /CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/gi;
    const matches = content.matchAll(createTablePattern);

    for (const match of matches) {
        tablesInSchema.add(match[1].toLowerCase());
    }
});

console.log(`✅ Tables found in migrations: ${tablesInSchema.size}\n`);

const existingTables = [];
const missingTables = [];

parentTables.forEach(table => {
    if (tablesInSchema.has(table)) {
        existingTables.push(table);
    } else {
        missingTables.push(table);
    }
});

const missingWithUsage = missingTables.map(table => {
    const usage = parentAudit.componentsByTable[table] || [];
    return {
        table,
        usageCount: usage.length,
        components: usage
    };
}).sort((a, b) => b.usageCount - a.usageCount);

const report = {
    summary: {
        totalTablesReferenced: parentTables.length,
        existingTables: existingTables.length,
        missingTables: missingTables.length,
        percentageComplete: Math.round((existingTables.length / parentTables.length) * 100),
        timestamp: new Date().toISOString()
    },
    existingTables: existingTables.sort(),
    missingTables: missingWithUsage,
    tableDetails: {}
};

console.log(`📊 SUMMARY:`);
console.log(`   Total tables referenced: ${parentTables.length}`);
console.log(`   ✅ Existing in schema: ${existingTables.length} (${report.summary.percentageComplete}%)`);
console.log(`   ❌ Missing from schema: ${missingTables.length} (${100 - report.summary.percentageComplete}%)\n`);

if (missingTables.length > 0) {
    console.log(`⚠️  MISSING TABLES:\n`);
    missingWithUsage.forEach(({ table, usageCount, components }) => {
        console.log(`   ❌ ${table.padEnd(30)} (${usageCount} component${usageCount > 1 ? 's' : ''})`);
        report.tableDetails[table] = {
            status: 'MISSING',
            usageCount,
            components
        };
    });
}

if (existingTables.length > 0) {
    console.log(`\n✅ EXISTING TABLES:\n`);
    existingTables.forEach(table => {
        const usage = parentAudit.componentsByTable[table] || [];
        console.log(`   ✅ ${table.padEnd(30)} (${usage.length} component${usage.length > 1 ? 's' : ''})`);
        report.tableDetails[table] = {
            status: 'EXISTS',
            usageCount: usage.length,
            components: usage
        };
    });
}

const reportPath = join(__dirname, 'parent_schema_verification.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📁 Report saved to: ${reportPath}`);

if (missingTables.length > 0) {
    console.log(`\n⚠️  ACTION REQUIRED: ${missingTables.length} missing tables need to be created`);
    process.exit(1);
} else {
    console.log(`\n✅ Parent module schema verification PASSED`);
    process.exit(0);
}
