const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const pUser = await prisma.user.findUnique({ where: { email: 'parent1@demo.com' } });
  if (!pUser) return console.log('No parent user');
  const parent = await prisma.parent.findUnique({ where: { user_id: pUser.id }, include: { children: { include: { student: true } } } });
  if (!parent) return console.log('No parent profile');
  console.log('Parent children length:', parent.children.length);
  if (parent.children.length > 0) {
      console.log('Linked to:', parent.children.map(s => s.student?.full_name || s.student?.name || 'Unknown student'));
  } else {
      console.log('Attempting to link student1@demo.com automatically...');
      const sUser = await prisma.user.findUnique({ where: { email: 'student1@demo.com' } });
      if (!sUser) return console.log('Student user not found!');
      const student = await prisma.student.findUnique({ where: { user_id: sUser.id } });
      if (!student) return console.log('Student profile not found!');
      
      await prisma.parentChild.create({
          data: {
              parent_id: parent.id,
              student_id: student.id,
              school_id: parent.school_id,
              relationship: 'Parent'
          }
      });
      console.log('✅ Successfully linked student1@demo.com to parent1@demo.com');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
