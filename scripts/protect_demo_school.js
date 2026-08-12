const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Applying database trigger for ODA protection...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION protect_demo_school() 
      RETURNS TRIGGER AS $$ 
      BEGIN 
        IF OLD.code = 'ODA' THEN 
          RAISE EXCEPTION 'Deletion protection: Oliskey Demo Academy (ODA) is a system-default school and cannot be deleted.'; 
        END IF; 
        RETURN OLD; 
      END; 
      $$ LANGUAGE plpgsql;
    `);
    
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_protect_demo_school ON "School"');
    
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_protect_demo_school 
      BEFORE DELETE ON "School" 
      FOR EACH ROW 
      EXECUTE FUNCTION protect_demo_school();
    `);
    
    console.log('TRIGGER_CREATED: Oliskey Demo Academy is now protected at the database level.');
  } catch (err) {
    console.error('TRIGGER_ERROR:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
