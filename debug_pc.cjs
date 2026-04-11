const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const rs = await prisma.parentChild.findMany({
      include: {
          parent: { select: { email: true } },
          student: { select: { email: true } }
      }
  });
  console.log(rs.map(r => ({ parent: r.parent.email, student: r.student.email, school: r.school_id, branch: r.branch_id })));
}
main().finally(() => prisma.$disconnect());
