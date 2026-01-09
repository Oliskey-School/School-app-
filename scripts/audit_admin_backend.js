/**
 * Admin Module Backend Connection Audit Script
 * This script analyzes all admin components and extracts database table references
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminComponentsPath = path.join(__dirname, '..', 'components', 'admin');
const results = {
    tables: new Set(),
    componentTableMap: {},
    errors: []
};

function extractTableReferences(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        const tables = [];

        // Extract .from('table_name') patterns
        const fromMatches = content.matchAll(/\.from\(['"]([^'"]+)['"]\)/g);
        for (const match of fromMatches) {
            tables.push(match[1]);
            results.tables.add(match[1]);
        }

        // Extract insert/update/delete table references
        const tableMatches = content.matchAll(/supabase\s*\.\s*from\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
        for (const match of tableMatches) {
            if (!tables.includes(match[1])) {
                tables.push(match[1]);
                results.tables.add(match[1]);
            }
        }

        if (tables.length > 0) {
            results.componentTableMap[fileName] = [...new Set(tables)].sort();
        }

    } catch (error) {
        results.errors.push({ file: filePath, error: error.message });
    }
}

// Read all admin component files
const files = fs.readdirSync(adminComponentsPath);
files.filter(f => f.endsWith('.tsx')).forEach(file => {
    extractTableReferences(path.join(adminComponentsPath, file));
});

// Generate report
console.log('='.repeat(80));
console.log('ADMIN MODULE BACKEND CONNECTION AUDIT REPORT');
console.log('='.repeat(80));
console.log('\n📊 SUMMARY');
console.log('-'.repeat(80));
console.log(`Total Admin Components Analyzed: ${files.filter(f => f.endsWith('.tsx')).length}`);
console.log(`Components Using Database: ${Object.keys(results.componentTableMap).length}`);
console.log(`Unique Tables Referenced: ${results.tables.size}`);
console.log();

console.log('\n📋 ALL TABLES REFERENCED BY ADMIN MODULE');
console.log('-'.repeat(80));
const sortedTables = Array.from(results.tables).sort();
sortedTables.forEach((table, idx) => {
    console.log(`${(idx + 1).toString().padStart(3, ' ')}. ${table}`);
});

console.log('\n\n🔍 DETAILED COMPONENT-TO-TABLE MAPPING');
console.log('-'.repeat(80));
const sortedComponents = Object.keys(results.componentTableMap).sort();
sortedComponents.forEach(component => {
    console.log(`\n📄 ${component}`);
    results.componentTableMap[component].forEach(table => {
        console.log(`   └─ ${table}`);
    });
});

if (results.errors.length > 0) {
    console.log('\n\n⚠️  ERRORS ENCOUNTERED');
    console.log('-'.repeat(80));
    results.errors.forEach(err => {
        console.log(`File: ${err.file}`);
        console.log(`Error: ${err.error}`);
        console.log();
    });
}

// Save to JSON file for further analysis
const outputPath = path.join(__dirname, 'admin_audit_results.json');
fs.writeFileSync(outputPath, JSON.stringify({
    summary: {
        totalComponents: files.filter(f => f.endsWith('.tsx')).length,
        componentsUsingDb: Object.keys(results.componentTableMap).length,
        uniqueTables: results.tables.size
    },
    tables: sortedTables,
    componentTableMap: results.componentTableMap,
    errors: results.errors,
    timestamp: new Date().toISOString()
}, null, 2));

console.log(`\n\n✅ Audit results saved to: ${outputPath}`);
console.log('='.repeat(80));
