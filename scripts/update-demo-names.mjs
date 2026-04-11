import pg from 'pg';
const { Client } = pg;

const client = new Client({ 
  connectionString: 'postgresql://postgres:password123@127.0.0.1:5432/school_app' 
});

async function main() {
  await client.connect();
  console.log('Connected to local PostgreSQL...\n');

  // Update demo teacher
  await client.query(
    `UPDATE teachers SET full_name = 'John Smith (Demo Teacher)' WHERE email = 'john.smith@demo.com'`
  );
  // Update demo student
  await client.query(
    `UPDATE students SET full_name = 'Alex Demo Student' WHERE email = 'student1@demo.com'`
  );
  // Update demo parent
  await client.query(
    `UPDATE parents SET full_name = 'Mary Demo Parent' WHERE email = 'parent1@demo.com'`
  );

  // Update users table too (for display in admin user accounts)
  await client.query(
    `UPDATE users SET full_name = 'John Smith (Demo Teacher)' WHERE email = 'john.smith@demo.com'`
  );
  await client.query(
    `UPDATE users SET full_name = 'Alex Demo Student' WHERE email = 'student1@demo.com'`
  );
  await client.query(
    `UPDATE users SET full_name = 'Mary Demo Parent' WHERE email = 'parent1@demo.com'`
  );

  // Verify results
  const teachers = await client.query(
    `SELECT full_name, email FROM teachers WHERE email = 'john.smith@demo.com'`
  );
  const students = await client.query(
    `SELECT full_name, email FROM students WHERE email = 'student1@demo.com'`
  );
  const parents = await client.query(
    `SELECT full_name, email FROM parents WHERE email = 'parent1@demo.com'`
  );

  console.log('Updated demo users:');
  teachers.rows.forEach(r => console.log('  ✅ Teacher:', r.full_name, '|', r.email));
  students.rows.forEach(r => console.log('  ✅ Student:', r.full_name, '|', r.email));
  parents.rows.forEach(r => console.log('  ✅ Parent: ', r.full_name, '|', r.email));

  console.log('\nDone! These users now appear in the admin lists.');
  await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
