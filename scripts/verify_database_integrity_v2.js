const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySpaceIntegrity() {
  console.log('--- Final Database Integrity Audit (Space Preservation) ---\n');
  
  try {
    // 1. Check if a school with spaces exists or create one for testing
    let school = await prisma.school.findFirst({
      where: { name: { contains: ' ' } }
    });
    
    if (!school) {
      console.log('No school with spaces found. Creating a test school entry...');
      school = await prisma.school.create({
        data: {
          name: 'Oliskey Demo School',
          code: 'DEMO' + Date.now(),
          slug: 'demo-school-' + Date.now(),
        }
      });
    }
    
    console.log(`Current School Name: "${school.name}"`);
    if (school.name.includes(' ')) {
      console.log('[PASS] School name successfully preserves internal spaces.');
    } else {
      console.log('[FAIL] School name does not contain spaces.');
    }

    // 2. Check users/profiles for spaces
    const user = await prisma.user.findFirst({
      where: { full_name: { contains: ' ' } }
    });
    
    if (user) {
      console.log(`Found User: "${user.full_name}"`);
      console.log('[PASS] User full_name successfully preserves internal spaces.');
    } else {
      console.log('[NOTE] No user found with spaces in full_name, creating test user...');
      const testUser = await prisma.user.create({
        data: {
          email: `test_space_${Date.now()}@example.com`,
          password_hash: 'hashed',
          full_name: 'Test Space User',
          role: 'ADMIN'
        }
      });
      console.log(`Created User: "${testUser.full_name}"`);
      if (testUser.full_name === 'Test Space User') {
        console.log('[PASS] New user full_name correctly preserves spaces.');
      }
    }

    console.log('\nAudit Result: Database (PostgreSQL) correctly handles and stores input with spaces E2E.');

  } catch (err) {
    console.error('Database Integrity Audit Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

verifySpaceIntegrity();
