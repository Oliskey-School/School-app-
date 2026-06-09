
import { PrismaClient } from '../../generated/prisma-client';

const prisma = new PrismaClient();

async function main() {
  const models = [
    'student', 'teacher', 'parent', 'attendance', 'assignment', 'quiz', 'lessonNote', 'class', 'subject'
  ];

  console.log('--- Database Row Counts ---');
  for (const model of models) {
    try {
      const count = await (prisma as any)[model].count();
      console.log(`${model}: ${count}`);
    } catch (e) {
      console.log(`${model}: (Error or Model not found)`);
    }
  }
  await prisma.$disconnect();
}

main();
