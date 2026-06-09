
import { PrismaClient } from '../../generated/prisma-client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '../../prisma/backfill_isolation.sql'), 'utf8');
  console.log('Running backfill SQL...');
  await prisma.$executeRawUnsafe(sql);
  console.log('Backfill complete.');
  await prisma.$disconnect();
}

main().catch(console.error);
