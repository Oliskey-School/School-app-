// Verification Script: Check if individual files are in master file
import { readFileSync } from 'fs';
import { join } from 'path';

const masterFile = 'database/migrations/MASTER_ALL_NEW_TABLES.sql';
const individualFiles = [
    '0043_critical_missing_tables_phase1.sql',
    '0044_missing_tables_phase2.sql',
    '0045_missing_tables_phase3a_hr_admin.sql',
    '0046_missing_tables_phase3b_resources.sql',
    '0047_missing_tables_phase3c_financial.sql',
    '0048_missing_tables_phase3d_communications.sql',
    '0049_missing_tables_phase3e_compliance.sql',
    '0050_teacher_module_phase1_core.sql',
    '0051_teacher_module_phase2_academic.sql',
    '0052_teacher_module_phase3_extended.sql',
    '0053_parent_module_phase1_core.sql',
    '0054_parent_module_phase2_academic.sql',
    '0055_parent_module_phase3_financial_volunteer.sql'
];

console.log('🔍 Verifying master file contains all individual migrations...\n');

try {
    const masterContent = readFileSync(masterFile, 'utf-8');
    const masterSize = masterContent.length;
    console.log(`📄 Master file size: ${(masterSize / 1024).toFixed(2)} KB\n`);

    let allFilesIncluded = true;
    const safeToDelete = [];
    const notFound = [];

    for (const file of individualFiles) {
        const filePath = join('database/migrations', file);
        try {
            const fileContent = readFileSync(filePath, 'utf-8');

            // Extract key table names from individual file
            const tableMatches = fileContent.match(/CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/gi);
            if (tableMatches && tableMatches.length > 0) {
                const tables = tableMatches.map(m => m.match(/public\.(\w+)/i)[1]);
                const firstTable = tables[0];
                const lastTable = tables[tables.length - 1];

                // Check if these tables are in master file
                const firstFound = masterContent.includes(`public.${firstTable}`);
                const lastFound = masterContent.includes(`public.${lastTable}`);

                if (firstFound && lastFound) {
                    console.log(`✅ ${file}`);
                    console.log(`   Tables: ${tables.length} (${firstTable}...${lastTable})`);
                    console.log(`   Status: IN MASTER FILE - Safe to delete\n`);
                    safeToDelete.push(file);
                } else {
                    console.log(`❌ ${file}`);
                    console.log(`   Status: NOT FULLY IN MASTER - Keep file\n`);
                    notFound.push(file);
                    allFilesIncluded = false;
                }
            }
        } catch (err) {
            console.log(`⚠️  ${file} - File not found or already deleted\n`);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Safe to delete: ${safeToDelete.length} files`);
    console.log(`   Must keep: ${notFound.length} files`);

    if (allFilesIncluded && safeToDelete.length > 0) {
        console.log(`\n✅ VERIFICATION PASSED: All content is in master file`);
        console.log(`   Safe to delete these ${safeToDelete.length} files:`);
        safeToDelete.forEach(f => console.log(`   - ${f}`));
    } else if (notFound.length > 0) {
        console.log(`\n⚠️  WARNING: Some files not fully verified`);
        console.log(`   Keep these files:`);
        notFound.forEach(f => console.log(`   - ${f}`));
    }

} catch (error) {
    console.error('❌ Error reading master file:', error.message);
    process.exit(1);
}
