/**
 * Class Battle — multiplayer educational game wiring.
 *
 *  - seedClassBattleGames: creates ONE "Class Battle" game per class in a school,
 *    tagged with that class's id, grade and subjects, and stored in the database so
 *    every class shows a real game in the Games Hub (no more "0 Games").
 *  - getClassmates: the people a student can invite — students in the same class.
 *  - getBattleSetup: the lobby options (subjects + grade) for a stored game.
 *
 * The live, real-time play itself is handled over Socket.IO (socket.service.ts);
 * this module only owns the persistent catalog + roster.
 */
import prisma from '../config/database';

const DEFAULT_SUBJECTS = ['Mathematics', 'English', 'Basic Science', 'Social Studies', 'General Knowledge'];

/** Map a grade to the Games Hub level label so battles group under the right level. */
export function gradeToLevel(grade: number): string {
    if (grade < 1) return 'Early Years (1-3 years)';
    if (grade <= 3) return 'Lower Primary (6-8 years)';
    if (grade <= 6) return 'Upper Primary (9-11 years)';
    if (grade <= 9) return 'Junior Secondary (12-14 years)';
    return 'Senior Secondary (15-18 years)';
}

async function pickTeacherId(schoolId: string, branchId?: string | null): Promise<string | null> {
    const t = await prisma.teacher.findFirst({
        where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
        select: { id: true },
    }) || await prisma.teacher.findFirst({ where: { school_id: schoolId }, select: { id: true } });
    return t?.id ?? null;
}

/**
 * Create/refresh one Class Battle game per class in the school. Idempotent:
 * a class that already has its battle is updated (subjects/grade kept current),
 * never duplicated. Returns how many were created vs updated.
 */
export async function seedClassBattleGames(schoolId: string, branchId?: string | null): Promise<{ created: number; updated: number; skipped: number }> {
    const classes = await prisma.class.findMany({
        where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}), deleted_at: null as any },
        include: { subjects: { select: { name: true } } },
    });

    let created = 0, updated = 0, skipped = 0;

    for (const cls of classes) {
        const teacherId = await pickTeacherId(schoolId, cls.branch_id);
        if (!teacherId) { skipped++; continue; } // need a teacher to satisfy the FK

        const subjects = cls.subjects.map(s => s.name).filter(Boolean);
        const subjectList = subjects.length ? subjects : DEFAULT_SUBJECTS;
        const level = gradeToLevel(cls.grade);
        const title = `Class Battle — ${cls.name}`;
        const config = {
            kind: 'ClassBattle',
            level,
            mode: 'Online',
            classId: cls.id,
            className: cls.name,
            grade: cls.grade,
            subjects: subjectList,
            howToPlay: 'Create a battle, invite your classmates with the join code, then everyone answers the same questions live — fastest correct answers win!',
            topic: subjectList.slice(0, 3).join(', '),
        };
        const description = `Live multiplayer quiz battle for ${cls.name}. Play with your classmates across ${subjectList.length} subjects and learn together.`;

        const existing = await prisma.educationalGame.findFirst({
            where: { school_id: schoolId, class_id: cls.id, game_type: 'ClassBattle' },
            select: { id: true },
        });

        if (existing) {
            await prisma.educationalGame.update({
                where: { id: existing.id },
                data: { title, description, config, grade: cls.grade, subject: subjectList[0], branch_id: cls.branch_id },
            });
            updated++;
        } else {
            await prisma.educationalGame.create({
                data: {
                    title, description, game_type: 'ClassBattle', config, metadata: {},
                    teacher_id: teacherId, school_id: schoolId, branch_id: cls.branch_id,
                    class_id: cls.id, subject: subjectList[0], grade: cls.grade,
                },
            });
            created++;
        }
    }

    return { created, updated, skipped };
}

/** Students in the same class(es) as this user — the people they can invite. */
export async function getClassmates(userId: string, schoolId: string): Promise<Array<{ id: string; user_id: string | null; name: string; avatar_url: string | null; school_generated_id: string | null }>> {
    const me = await prisma.student.findFirst({
        where: { user_id: userId, school_id: schoolId },
        select: { id: true, branch_id: true },
    });
    if (!me) return [];

    const myEnrollments = await prisma.studentEnrollment.findMany({
        where: { student_id: me.id, status: 'Active' },
        select: { class_id: true },
    });
    const classIds = myEnrollments.map(e => e.class_id);
    if (classIds.length === 0) return [];

    const classmateEnrollments = await prisma.studentEnrollment.findMany({
        where: { class_id: { in: classIds }, status: 'Active', student_id: { not: me.id }, school_id: schoolId },
        select: { student_id: true },
        distinct: ['student_id'],
    });
    const ids = classmateEnrollments.map(e => e.student_id);
    if (ids.length === 0) return [];

    const students = await prisma.student.findMany({
        where: { id: { in: ids } },
        select: { id: true, user_id: true, full_name: true, avatar_url: true, school_generated_id: true },
    });
    return students.map(s => ({ id: s.id, user_id: s.user_id, name: s.full_name, avatar_url: s.avatar_url, school_generated_id: s.school_generated_id }));
}

/** Lobby setup for a stored Class Battle game: its subjects + grade. */
export async function getBattleSetup(gameId: string, schoolId: string): Promise<{ subjects: string[]; grade: number; className: string } | null> {
    const game = await prisma.educationalGame.findFirst({
        where: { id: gameId, school_id: schoolId },
        select: { config: true, grade: true },
    });
    if (!game) return null;
    const cfg: any = game.config || {};
    return {
        subjects: Array.isArray(cfg.subjects) && cfg.subjects.length ? cfg.subjects : DEFAULT_SUBJECTS,
        grade: game.grade ?? cfg.grade ?? 5,
        className: cfg.className || 'Your Class',
    };
}
