
import { PrismaClient } from '../../generated/prisma-client';

const prisma = new PrismaClient();
const demo_school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

async function main() {
  const result = await prisma.$queryRawUnsafe<any[]>(`
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'school_id' 
    AND table_schema = 'public'
    AND is_nullable = 'YES'
  `);

  console.log(`Found ${result.length} tables to backfill.`);

  for (const row of result) {
    const tableName = row.table_name;
    console.log(`Backfilling ${tableName}...`);
    try {
      await prisma.$executeRawUnsafe(`UPDATE "${tableName}" SET school_id = '${demo_school_id}' WHERE school_id IS NULL`);
    } catch (e: any) {
      console.error(`Failed to backfill ${tableName}: ${e.message}`);
    }
  }

  console.log('Backfill complete.');
  await prisma.$disconnect();
}

main().catch(console.error);
