/**
 * Fixture builder for the multi-tenant isolation gate.
 *
 * Creates two fresh schools THROUGH THE REAL ONBOARDING ENDPOINT (so school,
 * main branch and owner admin come from production code paths), then plants a
 * canary-tagged row of every resource kind the gate covers in each school, a
 * second branch per school, and a branch-scoped teacher login per school.
 *
 * Every string value in School B carries a unique canary token. If that token
 * ever appears in a response served to a School A caller, data crossed tenants —
 * no per-endpoint knowledge needed to detect it.
 *
 * Seeding rows directly (with the RLS bypass flag) is deliberate: the fixture
 * needs to exist regardless of whether a given create endpoint works, because
 * what the gate tests is READ / WRITE isolation across every route, not the
 * create endpoints themselves. Onboarding and login are exercised for real.
 *
 * Usage: npx tsx --tsconfig backend/tsconfig.json tests/security/seed-tenants.ts
 * Prints one JSON document on stdout.
 */
import bcrypt from 'bcrypt';
import { PrismaClient } from '../../backend/generated/prisma-client';

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api';
const PASSWORD = 'GateTestPass!23';

const prisma = new PrismaClient();

// Runs a Prisma call with the transaction-local bypass flag. Same mechanism the
// backend uses for pre-tenant work (login, onboarding, seeds).
async function bypass<T>(op: any, label = "op"): Promise<T> {
  try {
    const res = await prisma.$transaction([
        prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
        op,
    ] as any);
    return res[res.length - 1] as T;
  } catch (e: any) { throw new Error(`[${label}] ${e.message}`); }
}

async function onboard(tag: string, canary: string) {
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const email = `${tag}-admin-${unique}@example.com`.toLowerCase();
    const res = await fetch(`${API}/schools/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            schoolName: `${canary} School ${tag}`,
            schoolCode: `${tag}${unique}`.toUpperCase().slice(0, 12),
            adminEmail: email,
            adminName: `${canary} Admin ${tag}`,
            adminPassword: PASSWORD,
            phone: '08000000000',
            address: `${canary} address`,
            state: 'Lagos',
            planType: 'free',
        }),
    });
    if (!res.ok) throw new Error(`onboard ${tag} failed: ${res.status} ${await res.text()}`);
    const body: any = await res.json();
    return { schoolId: body.data.schoolId as string, adminEmail: email };
}

async function login(email: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(`login ${email} failed: ${res.status} ${await res.text()}`);
    const body: any = await res.json();
    return body.token as string;
}

async function seedSchool(tag: string, canary: string) {
    const { schoolId, adminEmail } = await onboard(tag, canary);
    const adminToken = await login(adminEmail, PASSWORD);

    const school = await bypass<any>(prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, code: true } }), "school.findUnique");
    const mainBranch = await bypass<any>(prisma.branch.findFirst({ where: { school_id: schoolId, is_main: true } }), "branch.findFirst");
    const adminUser = await bypass<any>(prisma.user.findFirst({ where: { school_id: schoolId, email: adminEmail } }), "user.findFirst");
    if (!mainBranch || !adminUser) throw new Error(`${tag}: onboarding did not produce main branch + admin`);

    // A second branch so branch-crossover can be tested INSIDE a school.
    const subBranch = await bypass<any>(prisma.branch.create({
        data: { school_id: schoolId, name: `${canary} Sub Branch`, code: `SB${tag}`.slice(0, 8), is_main: false },
    }), "branch.create");

    const hash = await bcrypt.hash(PASSWORD, 10);
    const mk = (label: string) => `${canary} ${label}`;

    // People — user row + role profile, pinned to the MAIN branch.
    const teacherEmail = `${tag}-teacher-${canary}@example.com`.toLowerCase();
    const teacherUser = await bypass<any>(prisma.user.create({
        data: { email: teacherEmail, password_hash: hash, full_name: mk('Teacher'), role: 'TEACHER', school_id: schoolId, branch_id: mainBranch.id, email_verified: true, is_active: true },
    }), "user.create");
    const teacher = await bypass<any>(prisma.teacher.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, full_name: mk('Teacher'), user_id: teacherUser.id } as any,
    }), "teacher.create");
    const studentUser = await bypass<any>(prisma.user.create({
        data: { email: `${tag}-student-${canary}@example.com`.toLowerCase(), password_hash: hash, full_name: mk('Student'), role: 'STUDENT', school_id: schoolId, branch_id: mainBranch.id, email_verified: true, is_active: true },
    }), "user.create");
    const student = await bypass<any>(prisma.student.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, full_name: mk('Student'), user_id: studentUser.id } as any,
    }), "student.create");
    const parentUser = await bypass<any>(prisma.user.create({
        data: { email: `${tag}-parent-${canary}@example.com`.toLowerCase(), password_hash: hash, full_name: mk('Parent'), role: 'PARENT', school_id: schoolId, branch_id: mainBranch.id, email_verified: true, is_active: true },
    }), "user.create");
    const parent = await bypass<any>(prisma.parent.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, full_name: mk('Parent'), user_id: parentUser.id } as any,
    }), "parent.create");

    // A student in the SUB branch, for branch-crossover checks.
    const subStudentUser = await bypass<any>(prisma.user.create({
        data: { email: `${tag}-substudent-${canary}@example.com`.toLowerCase(), password_hash: hash, full_name: mk('SubBranch Student'), role: 'STUDENT', school_id: schoolId, branch_id: subBranch.id, email_verified: true, is_active: true },
    }), "user.create(sub)");
    const subStudent = await bypass<any>(prisma.student.create({
        data: { school_id: schoolId, branch_id: subBranch.id, full_name: mk('SubBranch Student'), user_id: subStudentUser.id } as any,
    }), "student.create(sub)");

    const klass = await bypass<any>(prisma.class.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, name: mk('Class'), grade: 5, section: 'A' } as any,
    }), "class.create");
    const attendance = await bypass<any>(prisma.attendance.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, student_id: student.id, class_id: klass.id, status: 'present', date: new Date() } as any,
    }), "attendance.create");
    const reportCard = await bypass<any>(prisma.reportCard.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, student_id: student.id, session: '2026/2027', term: 'First Term' } as any,
    }), "reportCard.create");
    const fee = await bypass<any>(prisma.fee.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, title: mk('Fee'), amount: 12345, due_date: new Date() } as any,
    }), "fee.create");
    const invoice = await bypass<any>(prisma.invoice.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, student_id: student.id, amount: 12345, due_date: new Date(), invoice_number: `INV-${canary}` } as any,
    }), "invoice.create");
    const room = await bypass<any>(prisma.chatRoom.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, creator_id: adminUser.id, name: mk('Room') } as any,
    }), "chatRoom.create");
    await bypass(prisma.chatParticipant.create({ data: { school_id: schoolId, branch_id: mainBranch.id, room_id: room.id, user_id: adminUser.id } as any }), "chatParticipant.create");
    await bypass(prisma.chatParticipant.create({ data: { school_id: schoolId, branch_id: mainBranch.id, room_id: room.id, user_id: teacherUser.id } as any }), "chatParticipant.create");
    const chatMessage = await bypass<any>(prisma.chatMessage.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, room_id: room.id, sender_id: adminUser.id, content: mk('chat message body') } as any,
    }), "chatMessage.create");
    const message = await bypass<any>(prisma.message.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, sender_id: adminUser.id, receiver_id: teacherUser.id, content: mk('direct message body') } as any,
    }), "message.create");
    const notification = await bypass<any>(prisma.notification.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, user_id: adminUser.id, title: mk('Notification'), message: mk('notification body') } as any,
    }), "notification.create");
    const announcement = await bypass<any>(prisma.announcement.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, title: mk('Announcement'), content: mk('announcement body'), category: 'general' } as any,
    }), "announcement.create");
    const document = await bypass<any>(prisma.schoolDocument.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, name: mk('Document'), url: `/uploads/${schoolId}/${canary}-document.pdf` } as any,
    }), "schoolDocument.create");
    const timetable = await bypass<any>(prisma.timetable.create({
        data: { school_id: schoolId, branch_id: mainBranch.id, subject: mk('Subject'), start_time: '08:00', end_time: '09:00', class_id: klass.id, teacher_id: teacher.id } as any,
    }), "timetable.create");

    const teacherToken = await login(teacherEmail, PASSWORD);

    return {
        tag, canary, schoolId, schoolCode: school.code,
        mainBranchId: mainBranch.id, subBranchId: subBranch.id,
        adminEmail, adminUserId: adminUser.id, adminToken,
        teacherEmail, teacherUserId: teacherUser.id, teacherToken,
        ids: {
            teacher: teacher.id, student: student.id, subStudent: subStudent.id, parent: parent.id,
            studentUser: studentUser.id, parentUser: parentUser.id,
            class: klass.id, attendance: attendance.id, reportCard: reportCard.id,
            fee: fee.id, invoice: invoice.id, chatRoom: room.id, chatMessage: chatMessage.id,
            message: message.id, notification: notification.id, announcement: announcement.id,
            document: document.id, timetable: timetable.id,
        },
        generatedIds: {
            admin: adminUser.school_generated_id, student: student.school_generated_id ?? null, teacher: teacher.school_generated_id ?? null,
        },
    };
}

(async () => {
    const stamp = Date.now().toString(36).toUpperCase();
    const A = await seedSchool('GA', `ZCANA${stamp}`);
    const B = await seedSchool('GB', `ZCANB${stamp}`);
    process.stdout.write(JSON.stringify({ A, B }) + '\n');
    await prisma.$disconnect();
})().catch(async (e) => {
    console.error('SEED_FAILED', e && (e.stack || e.message));
    await prisma.$disconnect();
    process.exit(1);
});
