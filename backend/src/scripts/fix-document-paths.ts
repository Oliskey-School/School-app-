import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const uploadBaseDir = path.join(process.cwd(), 'uploads', 'teacher-documents');

async function main() {
    console.log('🔍 [Migration] Starting document path fix (using pg)...');
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        
        // 1. Get all teachers with certificates containing /temp/
        const res = await client.query(`
            SELECT id, full_name, trcn_certificate, degree_certificate, british_qualification 
            FROM "Teacher"
            WHERE trcn_certificate LIKE '%/temp/%' 
               OR degree_certificate LIKE '%/temp/%' 
               OR british_qualification LIKE '%/temp/%'
        `);

        const teachers = res.rows;
        console.log(`📋 Found ${teachers.length} teachers with potential path issues.`);

        for (const teacher of teachers) {
            const fields = ['trcn_certificate', 'degree_certificate', 'british_qualification'];
            
            for (const field of fields) {
                const url = teacher[field];
                if (!url || !url.includes('/temp/')) continue;

                // Extract relative path after /uploads/teacher-documents/
                const match = url.match(/\/uploads\/teacher-documents\/(.+)$/);
                if (!match) continue;

                const relativePathWithTemp = match[1]; // e.g. temp/degree/123_file.png
                const filename = path.basename(relativePathWithTemp);
                const targetPath = path.join(uploadBaseDir, relativePathWithTemp);
                const sourcePath = path.join(uploadBaseDir, filename);

                // Check if file exists at source (root) and NOT at target
                if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
                    console.log(`🚚 Moving ${filename} to ${relativePathWithTemp}...`);
                    
                    // Ensure target directory exists
                    const targetDir = path.dirname(targetPath);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    try {
                        fs.renameSync(sourcePath, targetPath);
                        console.log(`✅ Moved successfully.`);
                    } catch (err) {
                        console.error(`❌ Failed to move ${filename}:`, err);
                    }
                } else if (fs.existsSync(targetPath)) {
                    console.log(`ℹ️ File already at target: ${relativePathWithTemp}`);
                } else {
                    console.warn(`⚠️ Source file not found in root: ${filename}`);
                }
            }
        }
    } catch (err) {
        console.error('❌ Database error:', err);
    } finally {
        await client.end();
    }

    console.log('🏁 [Migration] Done.');
}

main().catch(console.error);
