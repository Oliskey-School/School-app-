/**
 * Database Schema Verification Script
 * This script checks if all tables referenced by admin components actually exist in the database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the audit results
const auditResultsPath = path.join(__dirname, 'admin_audit_results.json');
const auditResults = JSON.parse(fs.readFileSync(auditResultsPath, 'utf-8'));

// Extract table definitions from migrations
const migrationsPath = path.join(__dirname, '..', 'database', 'migrations');
const existingTables = new Set();
const tableDefinitions = {};

function extractTablesFromMigration(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    // Pattern to match CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
    const matches = content.matchAll(createTableRegex);

    for (const match of matches) {
        const tableName = match[1];
        existingTables.add(tableName);

        if (!tableDefinitions[tableName]) {
            tableDefinitions[tableName] = {
                definedIn: [],
                columns: new Set()
            };
        }
        tableDefinitions[tableName].definedIn.push(fileName);

        // Extract column definitions for this table
        const tableBlockRegex = new RegExp(
            `CREATE\\s+TABLE[^;]*\\b${tableName}\\b[^(]*\\(([^;]+)\\);`,
            'gis'
        );
        const tableMatch = content.match(tableBlockRegex);
        if (tableMatch && tableMatch[1]) {
            const columnDefs = tableMatch[1].split(',');
            columnDefs.forEach(colDef => {
                const colName = colDef.trim().split(/\s+/)[0];
                if (colName && !colName.toUpperCase().startsWith('CONSTRAINT') && !colName.toUpperCase().startsWith('PRIMARY') && !colName.toUpperCase().startsWith('FOREIGN')) {
                    tableDefinitions[tableName].columns.add(colName);
                }
            });
        }
    }

    // Also check for ALTER TABLE ADD COLUMN statements
    const alterTableRegex = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
    const alterMatches = content.matchAll(alterTableRegex);

    for (const match of alterMatches) {
        const tableName = match[1];
        const columnName = match[2];
        existingTables.add(tableName);

        if (!tableDefinitions[tableName]) {
            tableDefinitions[tableName] = {
                definedIn: [],
                columns: new Set()
            };
        }
        if (!tableDefinitions[tableName].definedIn.includes(fileName)) {
            tableDefinitions[tableName].definedIn.push(fileName);
        }
        tableDefinitions[tableName].columns.add(columnName);
    }
}

// Read all migration files
const migrationFiles = fs.readdirSync(migrationsPath)
    .filter(f => f.endsWith('.sql'))
    .sort();

migrationFiles.forEach(file => {
    extractTablesFromMigration(path.join(migrationsPath, file));
});

// Compare referenced tables against existing tables
const missingTables = [];
const foundTables = [];

auditResults.tables.forEach(table => {
    if (existingTables.has(table)) {
        foundTables.push(table);
    } else {
        missingTables.push(table);
    }
});

// Generate comprehensive report
console.log('='.repeat(100));
console.log('DATABASE SCHEMA VERIFICATION REPORT');
console.log('='.repeat(100));

console.log('\n📊 EXECUTIVE SUMMARY');
console.log('-'.repeat(100));
console.log(`Admin Components Analyzed:          ${auditResults.summary.totalComponents}`);
console.log(`Components Using Database:          ${auditResults.summary.componentsUsingDb}`);
console.log(`Unique Tables Referenced:           ${auditResults.summary.uniqueTables}`);
console.log(`Tables Found in Schema:             ${foundTables.length} (${Math.round(foundTables.length / auditResults.summary.uniqueTables * 100)}%)`);
console.log(`Tables Missing from Schema:         ${missingTables.length} (${Math.round(missingTables.length / auditResults.summary.uniqueTables * 100)}%)`);
console.log(`Total Tables Defined in Migrations: ${existingTables.size}`);

if (missingTables.length > 0) {
    console.log('\n\n⚠️  MISSING TABLES - CRITICAL ISSUES');
    console.log('-'.repeat(100));
    console.log('The following tables are referenced by admin components but NOT found in the schema:');
    console.log();

    missingTables.forEach((table, idx) => {
        console.log(`${(idx + 1).toString().padStart(3, ' ')}. ❌ ${table}`);

        // Find which components use this table
        const componentsUsingTable = [];
        Object.keys(auditResults.componentTableMap).forEach(component => {
            if (auditResults.componentTableMap[component].includes(table)) {
                componentsUsingTable.push(component);
            }
        });

        console.log(`     Used by: ${componentsUsingTable.join(', ')}`);
        console.log();
    });
}

console.log('\n\n✅ VERIFIED TABLES');
console.log('-'.repeat(100));
console.log(`${foundTables.length} tables are correctly defined in the schema:`);
console.log();

foundTables.forEach((table, idx) => {
    const def = tableDefinitions[table];
    console.log(`${(idx + 1).toString().padStart(3, ' ')}. ✅ ${table}`);
    console.log(`     Defined in: ${def.definedIn.join(', ')}`);
    console.log(`     Columns: ${def.columns.size} (${Array.from(def.columns).slice(0, 5).join(', ')}${def.columns.size > 5 ? '...' : ''})`);
});

console.log('\n\n📋 TABLE USAGE STATISTICS');
console.log('-'.repeat(100));

// Count how many components use each table
const tableUsageCount = {};
Object.keys(auditResults.componentTableMap).forEach(component => {
    auditResults.componentTableMap[component].forEach(table => {
        tableUsageCount[table] = (tableUsageCount[table] || 0) + 1;
    });
});

// Sort by usage count
const sortedByUsage = Object.entries(tableUsageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

console.log('Top 20 Most Used Tables:');
console.log();
sortedByUsage.forEach(([table, count], idx) => {
    const status = existingTables.has(table) ? '✅' : '❌';
    console.log(`${(idx + 1).toString().padStart(3, ' ')}. ${status} ${table.padEnd(35, ' ')} - Used by ${count} component(s)`);
});

// Save comprehensive report
const reportPath = path.join(__dirname, 'schema_verification_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
        totalComponents: auditResults.summary.totalComponents,
        componentsUsingDb: auditResults.summary.componentsUsingDb,
        tablesReferenced: auditResults.summary.uniqueTables,
        tablesFound: foundTables.length,
        tablesMissing: missingTables.length,
        tablesDefined: existingTables.size,
        coveragePercentage: Math.round(foundTables.length / auditResults.summary.uniqueTables * 100)
    },
    missingTables: missingTables.map(table => ({
        name: table,
        usedByComponents: Object.keys(auditResults.componentTableMap)
            .filter(comp => auditResults.componentTableMap[comp].includes(table))
    })),
    foundTables: foundTables.map(table => ({
        name: table,
        definedIn: tableDefinitions[table].definedIn,
        columns: Array.from(tableDefinitions[table].columns),
        usedByComponents: Object.keys(auditResults.componentTableMap)
            .filter(comp => auditResults.componentTableMap[comp].includes(table))
    })),
    tableUsageStats: sortedByUsage.map(([table, count]) => ({
        table,
        count,
        exists: existingTables.has(table)
    })),
    timestamp: new Date().toISOString()
}, null, 2));

console.log(`\n\n✅ Full verification report saved to: ${reportPath}`);
console.log('='.repeat(100));

// Exit with error code if there are missing tables
if (missingTables.length > 0) {
    console.log(`\n⚠️  WARNING: ${missingTables.length} table(s) are missing from the schema!`);
    process.exit(1);
} else {
    console.log('\n✅ SUCCESS: All referenced tables exist in the schema!');
    process.exit(0);
}
