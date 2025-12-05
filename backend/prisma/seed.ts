
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // 1. Create Admin
  const adminHash = await bcrypt.hash('admin', 10);
  await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      email: 'admin@school.com',
      name: 'Admin User',
      password: adminHash,
      role: 'ADMIN',
      avatarUrl: 'https://i.pravatar.cc/150?u=admin'
    },
  });

  // 2. Create Teachers
  const teacher1Hash = await bcrypt.hash('teacher', 10);
  const teacherUser1 = await prisma.user.upsert({
    where: { email: 'j.adeoye@school.com' },
    update: {},
    create: {
      email: 'j.adeoye@school.com',
      name: 'Mr. John Adeoye',
      password: teacher1Hash,
      role: 'TEACHER',
      avatarUrl: 'https://i.pravatar.cc/150?u=teacher1'
    },
  });
  await prisma.teacher.create({
    data: {
        userId: teacherUser1.id,
        subjects: ['Mathematics', 'Physics'],
        classes: ['9A', '10A']
    }
  });

  const teacherUser2 = await prisma.user.upsert({
    where: { email: 'f.akintola@school.com' },
    update: {},
    create: {
      email: 'f.akintola@school.com',
      name: 'Mrs. Funke Akintola',
      password: teacher1Hash, // same pwd for demo
      role: 'TEACHER',
      avatarUrl: 'https://i.pravatar.cc/150?u=teacher2'
    },
  });
  const teacher2 = await prisma.teacher.create({
    data: {
        userId: teacherUser2.id,
        subjects: ['English'],
        classes: ['9A', '9B', '10A', '10B']
    }
  });

  // 3. Create Students
  const studentHash = await bcrypt.hash('student', 10);
  
  const studentUser1 = await prisma.user.upsert({
    where: { email: 'adebayo@school.com' },
    update: {},
    create: {
        email: 'adebayo@school.com',
        name: 'Adebayo Oluwaseun',
        password: studentHash,
        role: 'STUDENT',
        avatarUrl: 'https://i.pravatar.cc/150?u=adebayo'
    }
  });
  await prisma.student.create({
      data: {
          userId: studentUser1.id,
          grade: 10,
          section: 'A',
          department: 'Science'
      }
  });

  const studentUser4 = await prisma.user.upsert({
    where: { email: 'fatima@school.com' },
    update: {},
    create: {
        email: 'fatima@school.com',
        name: 'Fatima Bello',
        password: studentHash,
        role: 'STUDENT',
        avatarUrl: 'https://i.pravatar.cc/150?u=fatima'
    }
  });
  await prisma.student.create({
      data: {
          userId: studentUser4.id,
          grade: 10,
          section: 'A',
          department: 'Science'
      }
  });

  // 4. Create Parent
  const parentHash = await bcrypt.hash('parent', 10);
  const parentUser = await prisma.user.upsert({
      where: { email: 'bello@example.com' },
      update: {},
      create: {
          email: 'bello@example.com',
          name: 'Mrs. Bello',
          password: parentHash,
          role: 'PARENT',
          avatarUrl: 'https://i.pravatar.cc/150?u=parent2'
      }
  });
  await prisma.parent.create({
      data: {
          userId: parentUser.id,
          // Relation to students would be connected here via update in a real scenario
      }
  });

  // 5. Seed some CBT Data
  await prisma.cBTTest.create({
      data: {
          teacherId: teacher2.id,
          title: "General Science Assessment",
          type: "Test",
          className: "Grade 10A",
          subject: "Science",
          duration: 45,
          questionsCount: 20,
          isPublished: true,
          questions: {
              create: [
                  { text: "What is the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Cytoplasm"], correctAnswer: "Mitochondria" },
                  { text: "What is the chemical symbol for Gold?", options: ["Au", "Ag", "Fe", "Pb"], correctAnswer: "Au" }
              ]
          }
      }
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
