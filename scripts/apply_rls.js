
const prismaImport = require('../backend/src/config/database');
const prisma = prismaImport.default || prismaImport;
const fs = require('fs');

async function main() {
    console.log('--- Applying Row Level Security Policies ---');
    const sql = fs.readFileSync('prisma/rls_policies.sql', 'utf8');
    
    // Improved splitting logic that doesn't break on semicolons inside $$ blocks
    const commands = sql
        .split(/;(?=(?:[^$]*\$\$[^$]*\$\$)*[^$]*$)/)
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0);
    
    for (const cmd of commands) {
        try {
            await prisma.$executeRawUnsafe(cmd);
            console.log(`✅ Executed: ${cmd.trim().substring(0, 60)}...`);
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log(`ℹ️ Skip: ${cmd.trim().substring(0, 40)}... (Already exists)`);
            } else {
                console.error(`❌ Error: ${err.message}`);
            }
        }
    }
    
    if (prisma.$disconnect) await prisma.$disconnect();
}

main();
