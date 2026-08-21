import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
const DEMO_BRANCH_ID = '7601cbea-e1ba-49d6-b59b-412a584cb94f';

export async function seedDemoSchool() {
  console.log('🌱 Starting comprehensive database seed for Real Data...');
  
  const hashedAdminPassword = await bcrypt.hash('password123', 10);

  // Upsert the main Demo School
  const school = await prisma.school.upsert({
    where: { slug: 'demo-school' },
    update: {},
    create: {
      name: 'Oliskey Comprehensive School',
      code: 'DEMO-SCH',
      slug: 'demo-school',
      contact_email: 'admin@oliskey.com',
      subscription_status: 'active',
      is_premium: true,
      plan_type: 'premium',
      user_count: 50,
      id: DEMO_SCHOOL_ID,
      updated_at: new Date()
    },
  });

  console.log(`✅ School ${school.name} ensured.`);

  // Create Main Branch
  let branch = await prisma.branch.upsert({
    where: { id: DEMO_BRANCH_ID },
    update: { school_id: school.id, name: 'Main Campus', is_main: true },
    create: {
      id: DEMO_BRANCH_ID,
      school_id: school.id,
      name: 'Main Campus',
      code: 'MAIN-CMP',
      is_main: true,
    } as any
  });

  // 1. Setup Admin Account
  const admin = await prisma.user.upsert({
    // Users are unique per (school, branch, email) — the multi-tenant key —
    // not by email alone. Looking up by bare email made Postgres reject the
    // upsert outright: 42P10 "no unique or exclusion constraint matching the
    // ON CONFLICT specification", which aborted the whole seed.
    where: { school_id_branch_id_email: { school_id: school.id, branch_id: branch.id, email: 'admin@demo.com' } },
    update: { 
      password_hash: hashedAdminPassword, 
      school_id: school.id, 
      branch_id: branch.id,
      full_name: 'School Admin',
      school_generated_id: 'OLISKEY_MAIN_ADM_0001'
    },
    create: {
      email: 'admin@demo.com',
      password_hash: hashedAdminPassword,
      full_name: 'School Admin',
      role: Role.ADMIN,
      school_id: school.id,
      branch_id: branch.id,
      email_verified: true,
      school_generated_id: 'OLISKEY_MAIN_ADM_0001',
    } as any
  });

  await prisma.schoolMembership.upsert({
    where: { school_id_user_id: { school_id: school.id, user_id: admin.id } },
    update: {},
    create: { school_id: school.id, user_id: admin.id, base_role: Role.ADMIN, is_active: true } as any
  });

  // 2. Setup Classes
  const classNames = [
    { name: 'Grade 10A', grade: 10, section: 'A' },
    { name: 'Grade 10B', grade: 10, section: 'B' },
    { name: 'Grade 11A', grade: 11, section: 'A' },
    { name: 'Grade 12A', grade: 12, section: 'A' },
  ];

  const classRecords = [];
  for (const c of classNames) {
    const cl = await prisma.class.upsert({
        where: { id: `class-${c.grade}-${c.section}` },
        update: {
            school_id: school.id,
            branch_id: branch.id,
            name: c.name,
            grade: c.grade,
            section: c.section
        },
        create: {
            id: `class-${c.grade}-${c.section}`,
            school_id: school.id,
            branch_id: branch.id,
            name: c.name,
            grade: c.grade,
            section: c.section
        } as any
    });
    classRecords.push(cl);
  }

  // 3. Setup Subjects
  console.log('Seeding subjects...');
  const subjectsData = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'Science', code: 'SCI' },
    { name: 'English', code: 'ENG' },
    { name: 'Social Studies', code: 'SOC' }
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const sub = await prisma.subject.upsert({
      where: { id: `subj-${s.code}` },
      update: {
        school_id: school.id,
        branch_id: branch.id,
        name: s.name,
        code: s.code
      },
      create: {
        id: `subj-${s.code}`,
        school_id: school.id,
        branch_id: branch.id,
        name: s.name,
        code: s.code
      } as any
    });
    subjects.push(sub);
  }

  // 4. Setup Teachers
  const teacherData = [
    { email: 'john.smith@demo.com', name: 'John Smith', subject: 'Mathematics' },
    { email: 'teacher1@school.com', name: 'Alice Smith', subject: 'Mathematics' },
    { email: 'teacher2@school.com', name: 'Bob Johnson', subject: 'Science' },
    { email: 'teacher3@school.com', name: 'Carol Williams', subject: 'English' }
  ];

  const teachers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const t = teacherData[i];
    const u = await prisma.user.upsert({
      where: { school_id_branch_id_email: { school_id: school.id, branch_id: branch.id, email: t.email } },
      update: { password_hash: hashedAdminPassword, school_id: school.id, branch_id: branch.id, role: Role.TEACHER, email_verified: true },
      create: {
        email: t.email,
        password_hash: hashedAdminPassword,
        full_name: t.name,
        role: Role.TEACHER,
        school_id: school.id,
        branch_id: branch.id,
        email_verified: true
      } as any
    });

    const teacherObj = await prisma.teacher.upsert({
      where: { user_id: u.id },
      update: { 
        full_name: t.name, 
        email: t.email,
        school_id: school.id,
        branch_id: branch.id,
        school_generated_id: t.email === 'john.smith@demo.com' ? 'OLISKEY_MAIN_TCH_0001' : `OLISKEY_MAIN_TCH_000${i+1}`
      },
      create: {
        user_id: u.id,
        school_id: school.id,
        branch_id: branch.id,
        full_name: t.name,
        email: t.email,
        school_generated_id: t.email === 'john.smith@demo.com' ? 'OLISKEY_MAIN_TCH_0001' : `OLISKEY_MAIN_TCH_000${i+1}`
      } as any
    });
    
    // Sync to User record for universal login
    await prisma.user.update({
        where: { id: u.id },
        data: { school_generated_id: teacherObj.school_generated_id }
    });
    
    teachers.push(teacherObj);

    // Assign teacher to class
    await prisma.classTeacher.upsert({
        where: { 
          class_id_teacher_id_subject_id: { 
            class_id: classRecords[i % classRecords.length].id, 
            teacher_id: teacherObj.id,
            subject_id: subjects[i % subjects.length].id // Assign a subject from the list
          } 
        },
        update: {
          school_id: school.id,
          branch_id: branch.id
        },
        create: { 
          class_id: classRecords[i % classRecords.length].id, 
          teacher_id: teacherObj.id,
          subject_id: subjects[i % subjects.length].id,
          school_id: school.id,
          branch_id: branch.id
        } as any
    });
  }

  // 4. Setup Parents
  const parentEmails = ['parent1@demo.com', 'parent2@school.com', 'parent3@school.com', 'parent4@school.com', 'parent5@school.com'];
  const parentUsers = [];
  for(let i=0; i<parentEmails.length; i++) {
      const email = parentEmails[i];
      const realisticParentNames = [
          'Mr. Samuel Oliskey',
          'Mrs. Chidinma Okafor',
          'Alhaji Musa Yusuf',
          'Dr. Elizabeth Williams',
          'Engr. Babatunde Raji'
      ];
      const fullName = realisticParentNames[i] || `Parent Name ${i+1}`;

      const u = await prisma.user.upsert({
          where: { school_id_branch_id_email: { school_id: school.id, branch_id: branch.id, email } },
          update: { password_hash: hashedAdminPassword, school_id: school.id, branch_id: branch.id, role: Role.PARENT, email_verified: true, full_name: fullName },
          create: {
              email,
              password_hash: hashedAdminPassword,
              full_name: fullName,
              role: Role.PARENT,
              school_id: school.id,
              branch_id: branch.id,
              email_verified: true
          } as any
      });
      const p = await prisma.parent.upsert({
          where: { user_id: u.id },
          update: { 
            email, 
            school_id: school.id,
            branch_id: branch.id,
            updated_at: new Date(),
            school_generated_id: email === 'parent1@demo.com' ? 'OLISKEY_MAIN_PAR_0001' : `PAR-2026-${String(i+1).padStart(3, '0')}`
          },
          create: {
              user_id: u.id,
              school_id: school.id,
              branch_id: branch.id,
              full_name: u.full_name,
              email,
              phone: `555-010${i+1}`,
              school_generated_id: email === 'parent1@demo.com' ? 'OLISKEY_MAIN_PAR_0001' : `PAR-2026-${String(i+1).padStart(3, '0')}`,
              updated_at: new Date()
          } as any
      });
      // Sync back to User record
      await prisma.user.update({
          where: { id: u.id },
          data: { school_generated_id: p.school_generated_id }
      });

      parentUsers.push(p);
  }

  // 5. Setup Students & Enrollments
  console.log('Seeding Transport routes and buses...');
  const routesData = [
      { 
          route_name: 'Ikeja - Surulere Express', 
          bus_number: 'BUS-001', 
          driver_name: 'Mr. Adeyemi Bakare', 
          driver_phone: '+234 801 234 5678', 
          capacity: 45, 
          status: 'active' 
      },
      { 
          route_name: 'Lekki - Ajah Shuttle', 
          bus_number: 'BUS-002', 
          driver_name: 'Mr. John Okafor', 
          driver_phone: '+234 802 345 6789', 
          capacity: 30, 
          status: 'active' 
      }
  ];

  const createdRoutes = [];
  for (const r of routesData) {
      const route = await prisma.transportRoute.create({
          data: {
              ...r,
              school_id: school.id,
              branch_id: branch.id,
          }
      });
      createdRoutes.push(route);

      // Create a matching TransportBus
      await prisma.transportBus.create({
          data: {
              name: `School Bus ${r.bus_number.split('-')[1]}`,
              school_id: school.id,
              branch_id: branch.id,
              driver_name: r.driver_name,
              plate_number: `LND-${Math.floor(Math.random() * 900) + 100}-KJ`,
              capacity: r.capacity,
              status: 'active',
              route_name: r.route_name
          }
      });
  }

  console.log('Inserting students and links...');
  const studentEmails = ['student1@demo.com'];
  for(let i=2; i<=25; i++) studentEmails.push(`student${i}@school.com`);

  for(let i=0; i<studentEmails.length; i++) {
      const email = studentEmails[i];
      const realisticStudentNames = [
          'Samuel Oliskey Jr.', 'Jane Oliskey', 'David Oliskey', 'Grace Oliskey', 'Victor Oliskey',
          'Chidi Okafor', 'Amaka Okafor', 'Obinna Okafor', 'Zainab Yusuf', 'Ahmed Yusuf',
          'Fatima Yusuf', 'John Williams', 'Sarah Williams', 'Peter Williams', 'Tunde Raji',
          'Sola Raji', 'Bisi Raji', 'Ifeoluwa Raji', 'Damilola Raji', 'Oluwaseun Raji',
          'Favour Okafor', 'Divine Williams', 'Destiny Yusuf', 'Hope Oliskey', 'Joy Raji'
      ];
      const fullName = realisticStudentNames[i] || `Student First Last ${i+1}`;

      const u = await prisma.user.upsert({
          where: { school_id_branch_id_email: { school_id: school.id, branch_id: branch.id, email } },
          update: { password_hash: hashedAdminPassword, school_id: school.id, branch_id: branch.id, role: Role.STUDENT, email_verified: true, updated_at: new Date(), full_name: fullName },
          create: {
              email,
              password_hash: hashedAdminPassword,
              full_name: fullName,
              role: Role.STUDENT,
              school_id: school.id,
              branch_id: branch.id,
              email_verified: true,
              updated_at: new Date()
          } as any
      });
      
      const s = await prisma.student.upsert({
          where: { user_id: u.id },
          update: { 
            email, 
            school_id: school.id,
            branch_id: branch.id,
            updated_at: new Date(),
            school_generated_id: email === 'student1@demo.com' ? 'OLISKEY_MAIN_STU_0001' : `STU-2026-${String(i+1).padStart(3, '0')}`
          },
          create: {
              user_id: u.id,
              school_id: school.id,
              branch_id: branch.id,
              full_name: u.full_name,
              email,
              school_generated_id: email === 'student1@demo.com' ? 'OLISKEY_MAIN_STU_0001' : `STU-2026-${String(i+1).padStart(3, '0')}`,
              grade: classRecords[i % classRecords.length].grade,
              section: classRecords[i % classRecords.length].section,
              status: 'Active',
              updated_at: new Date()
          } as any
      });

      // Sync back to User record for universal login
      await prisma.user.update({
          where: { id: u.id },
          data: { school_generated_id: s.school_generated_id, updated_at: new Date() }
      });

      // Enroll student in class
      const cls = classRecords[i % classRecords.length];
      await prisma.studentEnrollment.upsert({
          where: { student_id_class_id: { student_id: s.id, class_id: cls.id } },
          update: { updated_at: new Date() },
          create: { student_id: s.id, class_id: cls.id, school_id: school.id, is_primary: true, updated_at: new Date() } as any
      });

      // Link to parent (every 5 students share 1 parent)
      const parent = parentUsers[i % 5];

      // Assign to transport if within first 10 students
      if (i < 10) {
          const route = createdRoutes[Math.floor(i / 5)];
          await prisma.transportAssignment.create({
              data: {
                  route_id: route.id,
                  student_id: s.id,
                  academic_year: '2025/2026',
                  status: 'active',
                  // school_id is required on this model (see schema.prisma) and
                  // omitting it made Prisma reject the whole create input.
                  // Every row is tenant-scoped; the seed must say which tenant.
                  school_id: school.id,
                  branch_id: branch.id
              }
          });
      }
      await prisma.parentChild.upsert({
          where: { parent_id_student_id: { parent_id: parent.id, student_id: s.id } },
          update: { },
          create: { parent_id: parent.id, student_id: s.id, school_id: school.id, branch_id: branch.id } as any
      });
  }

  // 6. Setup Specialized Demo Roles
  const specializedRoles = [
    { email: 'proprietor@demo.com', name: 'Demo Proprietor', role: Role.PROPRIETOR },
    { email: 'inspector@demo.com', name: 'Demo Inspector', role: (Role as any).INSPECTOR },
    { email: 'examofficer@demo.com', name: 'Demo Exam Officer', role: (Role as any).EXAM_OFFICER },
    { email: 'compliance@demo.com', name: 'Demo Compliance Officer', role: (Role as any).COMPLIANCE_OFFICER }
  ];

  for (const r of specializedRoles) {
    // Email is unique per school+branch, not globally — address the compound key.
    const specializedUser = await prisma.user.upsert({
      where: { school_id_branch_id_email: { school_id: school.id, branch_id: branch.id, email: r.email } },
      update: { password_hash: hashedAdminPassword, school_id: school.id, branch_id: branch.id, role: r.role, email_verified: true, updated_at: new Date() },
      create: {
        email: r.email,
        password_hash: hashedAdminPassword,
        full_name: r.name,
        role: r.role,
        school_id: school.id,
        branch_id: branch.id,
        email_verified: true,
        updated_at: new Date()
      } as any
    });

    await prisma.schoolMembership.upsert({
      where: { school_id_user_id: { school_id: school.id, user_id: specializedUser.id } },
      update: { base_role: r.role, updated_at: new Date() },
      create: {
        school_id: school.id,
        user_id: specializedUser.id,
        base_role: r.role,
        is_active: true,
        updated_at: new Date()
      } as any
    });
  }

  // Provide some Dashboard stats filler like overdue fees
  const firstStudent = await prisma.student.findFirst({where: {school_id: school.id}});
  if(firstStudent) {
      await prisma.studentFee.create({
          data: {
              student_id: firstStudent.id,
              school_id: school.id,
              branch_id: branch.id,
              amount: 500,
              paid_amount: 100,
              due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // A month ago
              status: 'Overdue',
              title: 'Term 1 Tuition'
          } as any
      });

      await prisma.reportCard.create({
          data: {
              school_id: school.id,
              student_id: firstStudent.id,
              session: '2025/2026',
              term: 'First Term',
              is_published: false
          } as any
      });

      // 7. Seed Notifications
      console.log('Seeding notifications...');
      const adminId = admin.id;
      await prisma.notification.createMany({
          data: [
              {
                  school_id: school.id,
                  title: 'Welcome to Oliskey Demo School',
                  message: 'This is a demo environment powered by PostgreSQL.',
                  category: 'System',
                  audience: ['all'],
                  is_read: false
              },
              {
                  school_id: school.id,
                  user_id: firstStudent.user_id,
                  title: 'New Assignment Posted',
                  message: 'Mathematics homework has been posted for Grade 10A.',
                  category: 'Academic',
                  audience: ['STUDENT'],
                  is_read: false
              }
          ] as any
      });

      // 8. Seed Assignments
      console.log('Seeding assignments...');
      const firstClass = classRecords[0];
      const mathTeacher = teachers[0];
      const assignment = await prisma.assignment.create({
          data: {
              class_id: firstClass.id,
              title: 'Quadratic Equations Practice',
              subject: 'Mathematics',
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              teacher_id: mathTeacher.id,
              is_published: true,
              description: 'Complete exercises 1-10 on page 45 of the textbook.'
          } as any
      });

      // 9. Seed Timetable
      console.log('Seeding timetable...');
      const days = [1, 2, 3, 4, 5]; // Mon-Fri
      for (const day of days) {
          await prisma.timetable.create({
              data: {
                  school_id: school.id,
                  branch_id: branch.id,
                  class_id: firstClass.id,
                  subject: 'Mathematics',
                  teacher_id: mathTeacher.id,
                  day_of_week: day,
                  start_time: '08:00',
                  end_time: '09:00',
                  room: 'Room 101'
              } as any
          });
      }

      // 10. Seed Attendance records for the last 7 days
      console.log('Seeding attendance...');
      for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          // Only seed for current students (limit to 10 for performance)
          const sampleStudents = await prisma.student.findMany({ 
              where: { school_id: school.id },
              take: 10 
          });
          
          for (const s of sampleStudents) {
              await prisma.attendance.upsert({
                  where: {
                      student_id_class_id_date: {
                          student_id: s.id,
                          class_id: firstClass.id,
                          date: date
                      }
                  },
                  update: {},
                  create: {
                      student_id: s.id,
                      class_id: firstClass.id,
                      date: date,
                      status: Math.random() > 0.1 ? 'Present' : 'Absent',
                      remark: i === 0 ? 'Regular check' : null
                  } as any
              });
          }
      }

      // 11. Seed Lesson Notes
      console.log('Seeding lesson notes...');
      await prisma.lessonNote.createMany({
          data: [
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  teacher_id: mathTeacher.id,
                  class_id: firstClass.id,
                  subject_id: subjects[0].id,
                  term: 'First Term',
                  week: 1,
                  title: 'Introduction to Algebra',
                  content: 'This lesson covers the basics of algebraic expressions and equations.',
                  status: 'approved'
              },
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  teacher_id: mathTeacher.id,
                  class_id: firstClass.id,
                  subject_id: subjects[0].id,
                  term: 'First Term',
                  week: 2,
                  title: 'Linear Equations',
                  content: 'Solving first-degree equations with one variable.',
                  status: 'pending'
              }
          ] as any
      });

      // 12. Seed Quizzes
      console.log('Seeding quizzes...');
      const quiz = await prisma.quiz.create({
          data: {
              school_id: school.id,
              branch_id: branch.id,
              teacher_id: mathTeacher.id,
              class_id: firstClass.id,
              subject_id: subjects[0].id,
              title: 'Algebra Quiz 1',
              description: 'Covers basic algebra and linear equations.',
              time_limit: 30,
              total_marks: 20,
              is_published: true
          } as any
      });

      await prisma.quizQuestion.createMany({
          data: [
              {
                  quiz_id: quiz.id,
                  school_id: school.id,
                  question_text: 'What is x in 2x + 4 = 10?',
                  options: ['2', '3', '4', '6'] as any,
                  correct_answer: '3',
                  points: 10,
                  order_index: 0
              },
              {
                  quiz_id: quiz.id,
                  school_id: school.id,
                  question_text: 'Simplify 3(x + 2) - 4.',
                  options: ['3x + 2', '3x + 6', '3x - 2', '3x + 4'] as any,
                  correct_answer: '3x + 2',
                  points: 10,
                  order_index: 1
              }
          ] as any
      });

      // 13. Seed Resources
      console.log('Seeding library resources...');
      await prisma.resource.createMany({
          data: [
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  teacher_id: mathTeacher.id,
                  title: 'Grade 10 Mathematics Textbook',
                  type: 'book',
                  file_type: 'pdf',
                  category: 'Textbook',
                  subject: 'Mathematics',
                  class_id: firstClass.id,
                  url: 'https://example.com/math-textbook.pdf',
                  thumbnail_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=300&fit=crop'
              },
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  teacher_id: mathTeacher.id,
                  title: 'Algebra Cheat Sheet',
                  type: 'document',
                  file_type: 'pdf',
                  category: 'Handout',
                  subject: 'Mathematics',
                  class_id: firstClass.id,
                  url: 'https://example.com/algebra-cheat-sheet.pdf',
                  thumbnail_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop'
              }
          ] as any
      });

      // 13.5. Seed PTA Meetings, Messages and Volunteering
      console.log('Seeding PTA meetings and Parent features...');
      await prisma.pTAMeeting.createMany({
          data: [
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  title: 'Term 1 General PTA Meeting',
                  date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                  time: '10:00 AM',
                  agenda: [
                      { title: 'Academic Calendar Review', presenter: 'Principal' },
                      { title: 'Facility Upgrades', presenter: 'Board Chairman' },
                      { title: 'Security Briefing', presenter: 'Security Chief' }
                  ] as any
              },
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  title: 'Grade 10 Parent-Teacher Conference',
                  date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
                  time: '2:00 PM',
                  agenda: [
                      { title: 'Mid-Term Performance Review', presenter: 'Grade Head' },
                      { title: 'Career Counseling', presenter: 'School Counselor' }
                  ] as any
              }
          ] as any
      });

      await prisma.volunteeringOpportunity.createMany({
          data: [
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  title: 'School Sports Day Assistant',
                  description: 'Help coordinate student activities and refreshments during the annual sports day.',
                  date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  slots_total: 10,
                  slots_filled: 2
              },
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  title: 'Library Book Fair Coordinator',
                  description: 'Organize and manage the book display and sales during the upcoming library week.',
                  date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                  slots_total: 5,
                  slots_filled: 0
              }
          ] as any
      });

      const parent1 = (parentUsers as any)[0];
      await prisma.message.createMany({
          data: [
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  sender_id: mathTeacher.user_id,
                  receiver_id: parent1.user_id,
                  content: 'Hello, I wanted to discuss your child\'s progress in Mathematics. They are doing very well!',
                  is_read: true
              },
              {
                  school_id: school.id,
                  branch_id: branch.id,
                  sender_id: parent1.user_id,
                  receiver_id: mathTeacher.user_id,
                  content: 'Thank you Mr. John. We are very happy to hear that. We will keep encouraging them at home.',
                  is_read: false
              }
          ] as any
      });

      // 14. Seed Forum Topics
      console.log('Seeding forum topics...');
      const topic = await prisma.forumTopic.create({
          data: {
              school_id: school.id,
              branch_id: branch.id,
              title: 'Welcome to the Mathematics Forum',
              content: 'Feel free to ask any questions related to Mathematics here.',
              author_id: mathTeacher.user_id,
              author_name: mathTeacher.full_name,
              author_role: 'TEACHER',
              category: 'Mathematics',
              post_count: 1
          } as any
      });

      await prisma.forumPost.create({
          data: {
              school_id: school.id,
              branch_id: branch.id,
              topic_id: topic.id,
              author_id: mathTeacher.user_id,
              author_name: mathTeacher.full_name,
              author_role: 'TEACHER',
              content: 'I will be online every Wednesday for live Q&A!'
          } as any
      });

      // 15. Seed Inspection Templates
      console.log('Seeding inspection templates...');
      await prisma.inspectionTemplate.upsert({
          where: { inspection_type: 'WSE' },
          update: {},
          create: {
              inspection_type: 'WSE',
              name: 'Whole School Evaluation (WSE)',
              description: 'Standard comprehensive review of school performance across seven domains.',
              version: 1,
              is_active: true,
              schema: {
                  domains: [
                      {
                          id: 'leadership',
                          title: 'Leadership & Management',
                          weight: 20,
                          sections: [
                              {
                                  id: 'vision',
                                  title: 'School Vision & Strategy',
                                  fields: [
                                      {
                                          id: 'vision_shared',
                                          label: 'Is the school vision clearly communicated and shared by all stakeholders?',
                                          type: 'rating',
                                          required: true,
                                          options: [
                                              { label: 'Outstanding', value: 4 },
                                              { label: 'Good', value: 3 },
                                              { label: 'Fair', value: 2 },
                                              { label: 'Poor', value: 1 }
                                          ]
                                      },
                                      {
                                          id: 'strategic_plan',
                                          label: 'Evidence of a long-term strategic development plan.',
                                          type: 'boolean',
                                          required: true
                                      }
                                  ]
                              }
                          ]
                      },
                      {
                          id: 'teaching',
                          title: 'Teaching & Learning',
                          weight: 30,
                          sections: [
                              {
                                  id: 'engagement',
                                  title: 'Student Engagement',
                                  fields: [
                                      {
                                          id: 'active_participation',
                                          label: 'Level of active student participation in lessons.',
                                          type: 'rating',
                                          required: true
                                      },
                                      {
                                          id: 'lesson_plans',
                                          label: 'Teachers provide evidence of structured lesson planning.',
                                          type: 'boolean',
                                          required: true
                                      }
                                  ]
                              }
                          ]
                      },
                      {
                          id: 'infrastructure',
                          title: 'Infrastructure & Safety',
                          weight: 15,
                          sections: [
                              {
                                  id: 'safety',
                                  title: 'Health & Safety',
                                  fields: [
                                      {
                                          id: 'fire_extinguishers',
                                          label: 'Presence and validity of fire extinguishers.',
                                          type: 'boolean',
                                          required: true
                                      },
                                      {
                                          id: 'clean_water',
                                          label: 'Access to clean potable water for students.',
                                          type: 'boolean',
                                          required: true
                                      }
                                  ]
                              }
                          ]
                      }
                  ]
              }
          } as any
      });
  }

  console.log('✅ Real Database Seed Completed. Your dashboard will now have proper statistics!');
}

if (require.main === module) {
  seedDemoSchool()
    .catch((e) => {
      console.error('Fatal Seeding Error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
