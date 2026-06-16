import prisma from '../config/database';

async function main() {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Timetable" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'Draft';`);
    const cols: any[] = await prisma.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'Timetable' AND column_name = 'status';`
    );
    console.log('status column present:', cols.length > 0);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
