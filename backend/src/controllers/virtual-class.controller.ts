import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { VirtualClassService } from '../services/virtual-class.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';
import { SocketService } from '../services/socket.service';
import { NotificationService } from '../services/notification.service';
import { sendError } from '../utils/httpError';

// A student must only see live/scheduled sessions for a class they're actually
// enrolled in (or school/branch-wide sessions with no class_id at all) — not
// every session in their branch. Without this, getActiveVirtualClasses /
// getVirtualClassSessions handed every student in a branch the meeting_url +
// password for every OTHER class's live session too, letting a student join
// a class meant for a different grade/section entirely. class_id isn't on the
// generated Prisma client yet (see VirtualClassService.createSession), so it's
// read back via raw SQL.
async function filterSessionsForStudent(req: AuthRequest, sessions: any[]): Promise<any[]> {
    if ((req.user.role || '').toUpperCase() !== 'STUDENT' || sessions.length === 0) return sessions;

    const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    if (!student) return [];

    const enrollments = await prisma.studentEnrollment.findMany({
        where: { student_id: student.id, status: 'Active' },
        select: { class_id: true },
    });
    const myClassIds = new Set(enrollments.map(e => e.class_id));

    const ids = sessions.map(s => s.id);
    const rows = await prisma.$queryRawUnsafe<{ id: string; class_id: string | null }[]>(
        `SELECT id, class_id FROM "VirtualClassSession" WHERE id = ANY($1::text[])`, ids
    );
    const classIdById = new Map(rows.map(r => [r.id, r.class_id]));

    return sessions.filter(s => {
        const classId = classIdById.get(s.id);
        return !classId || myClassIds.has(classId);
    });
}

export const deleteVirtualClassSession = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const session = await prisma.virtualClassSession.findFirst({
            where: { id, school_id: req.user.school_id },
        });
        if (!session) return res.status(404).json({ message: 'Session not found' });

        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true },
            });
            if (!teacher || session.teacher_id !== teacher.id) {
                return res.status(403).json({ message: 'You can only delete your own sessions' });
            }
        }

        await prisma.virtualClassSession.delete({ where: { id } });

        SocketService.emitToSchool(req.user.school_id, 'virtual-class:deleted', { sessionId: id });

        res.json({ message: 'Session deleted' });
    } catch (error: any) {
        sendError(res, error, 'virtual-class.controller.ts');
    }
};

export const createVirtualClassSession = async (req: AuthRequest, res: Response) => {
    try {
        const sessionData = {
            ...req.body,
            school_id: req.user.school_id
        };

        // Compute end_time from duration_minutes if not already provided
        if (req.body.duration_minutes && !sessionData.end_time) {
            const start = new Date(sessionData.start_time || new Date());
            sessionData.end_time = new Date(
                start.getTime() + Number(req.body.duration_minutes) * 60 * 1000
            ).toISOString();
        }

        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });

            if (!teacher) return res.status(403).json({ message: 'Teacher profile not found' });

            // Force teacher_id to match the logged in teacher
            sessionData.teacher_id = teacher.id;

            // Verify class access
            if (sessionData.class_id) {
                const access = await prisma.classTeacher.findFirst({
                    where: {
                        teacher_id: teacher.id,
                        class_id: sessionData.class_id
                    }
                });

                if (!access) return res.status(403).json({ message: 'Unauthorized access to this class' });
            }
        }

        const session = await VirtualClassService.createSession(sessionData);

        // Persist which class this session is for (used later to tell who attended
        // vs missed). Done via raw SQL so it works without regenerating the client.
        if (sessionData.class_id) {
            try {
                await prisma.$executeRawUnsafe(
                    `UPDATE "VirtualClassSession" SET class_id = $1 WHERE id = $2`,
                    sessionData.class_id, session.id
                );
            } catch (e: any) {
                console.warn('[VirtualClass] could not store class_id:', e.message);
            }
        }

        // Notify students AND parents that a live class started.
        //  - Students get a "join" notification + a realtime event so their dashboard
        //    shows a persistent glowing "Join Live Class" button until it ends.
        //  - Parents get an informational notification only (they cannot join).
        try {
            const branchId = getEffectiveBranchId(req.user, sessionData.branch_id);
            const subjectLabel = session.subject || session.title;
            await NotificationService.createNotification(req.user.school_id, branchId, {
                title: '📹 Live Class Started',
                message: `${session.title} is now live. Open Virtual Classroom to join.`,
                category: 'Virtual Class',
                audience: ['student'],
            });
            await NotificationService.createNotification(req.user.school_id, branchId, {
                title: '📹 Live Class In Progress',
                message: `A live ${subjectLabel} class is now on for your child.`,
                category: 'Virtual Class',
                audience: ['parent'],
            });
            SocketService.emitToSchool(req.user.school_id, 'virtual-class:started', {
                sessionId: session.id,
                title: session.title,
                subject: session.subject,
                topic: session.topic || null,
                class_id: sessionData.class_id || null,
                branch_id: session.branch_id || null,
                teacher_id: session.teacher_id,
            });
        } catch (notifyErr: any) {
            console.warn('[VirtualClass] live-class notification failed:', notifyErr.message);
        }

        res.status(201).json(session);
    } catch (error: any) {
        sendError(res, error, 'virtual-class.controller.ts');
    }
};

export const getVirtualClassSessions = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        let teacherId = (req.query.teacher_id as string) || (req.query.teacherId as string);

        // Always scope a TEACHER caller to their own sessions — the query-string
        // teacherId was previously trusted as-is, so any teacher could pass
        // ?teacher_id=<another teacher's id> and read that teacher's full session
        // list, including meeting_url, password, and recording_url. Verified live
        // with two real teacher accounts (round 8 audit). Admins keep the ability
        // to filter by any teacherId.
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true },
            });
            teacherId = teacher?.id;
        }

        const sessions = await VirtualClassService.getSessions(req.user.school_id, branchId, teacherId);
        res.json(await filterSessionsForStudent(req, sessions));
    } catch (error: any) {
        sendError(res, error, 'virtual-class.controller.ts');
    }
};

// Live sessions only (status 'active'). Used by the student dashboard to decide
// whether to show the persistent "Join Live Class" button on load / refresh.
export const getActiveVirtualClasses = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const where: any = { school_id: req.user.school_id, status: 'active' };
        // Use AND so branch and time filters coexist (top-level OR would conflict).
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
        where.AND = [
            // A session is "live" if:
            //   - it has an explicit end_time in the future, OR
            //   - it has no end_time but started within the last 4 hours
            //     (prevents abandoned test sessions from showing indefinitely)
            {
                OR: [
                    { end_time: { gt: new Date() } },
                    { AND: [{ end_time: null }, { start_time: { gt: fourHoursAgo } }] },
                ],
            },
        ];
        // Include school-wide sessions (branch_id null) too — a teacher often
        // starts a class without a branch set, and it must still reach students
        // whose branch is filled in. Matching only the exact branch hid the
        // session and made the "Join Live Class" button flash and vanish.
        if (branchId && branchId !== 'all') {
            where.AND.push({ OR: [{ branch_id: branchId }, { branch_id: null }] });
        }

        const sessions = await prisma.virtualClassSession.findMany({
            where,
            include: { teacher: { select: { full_name: true, id: true } } },
            orderBy: { start_time: 'desc' },
        });
        res.json(await filterSessionsForStudent(req, sessions));
    } catch (error: any) {
        sendError(res, error, 'virtual-class.controller.ts');
    }
};

// End a live session: mark it ended and tell every connected client so the
// students' "Join Live Class" button disappears immediately.
export const endVirtualClassSession = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const session = await prisma.virtualClassSession.findFirst({
            where: { id, school_id: req.user.school_id },
        });
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // A teacher can only end a session they own; admins can end any.
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true },
            });
            if (!teacher || session.teacher_id !== teacher.id) {
                return res.status(403).json({ message: 'You can only end your own class' });
            }
        }

        const updated = await prisma.virtualClassSession.update({
            where: { id },
            data: { status: 'ended', end_time: new Date() },
        });

        SocketService.emitToSchool(req.user.school_id, 'virtual-class:ended', {
            sessionId: id,
            branch_id: session.branch_id || null,
        });

        // Tell each student whether they attended or missed the class.
        try {
            const subjectLabel = session.subject || session.title;

            // Students who actually joined (recorded attendance for this session).
            const joinedRows = await prisma.virtualClassAttendance.findMany({
                where: { session_id: id },
                select: { student_id: true },
            });
            const joinedSet = new Set(joinedRows.map(j => j.student_id));

            // The class roster (who was supposed to attend). class_id is read via
            // raw SQL because the column is newer than the generated client.
            const clsRows = await prisma.$queryRawUnsafe<any[]>(
                `SELECT class_id FROM "VirtualClassSession" WHERE id = $1`, id
            );
            const classId = clsRows[0]?.class_id || null;

            let roster: { id: string; user_id: string }[] = [];
            if (classId) {
                const enr = await prisma.studentEnrollment.findMany({
                    where: { class_id: classId, status: 'Active' },
                    select: { student: { select: { id: true, user_id: true } } },
                });
                roster = enr.map(e => e.student).filter(Boolean) as any;
            }

            const notifyStudent = (userId: string, attended: boolean) =>
                NotificationService.createNotification(session.school_id, session.branch_id || undefined, {
                    title: attended ? '✅ Class Attended' : '⚠️ You Missed a Live Class',
                    message: attended
                        ? `Thanks for joining the live ${subjectLabel} class. It has now ended.`
                        : `The live ${subjectLabel} class has ended and you missed it. Ask your teacher for the recording or notes.`,
                    category: 'Virtual Class',
                    user_id: userId,
                });

            if (roster.length) {
                for (const s of roster) {
                    await notifyStudent(s.user_id, joinedSet.has(s.id));
                }
            } else if (joinedSet.size) {
                // No roster available — at least thank the students who joined.
                const joinedStudents = await prisma.student.findMany({
                    where: { id: { in: [...joinedSet] } },
                    select: { user_id: true },
                });
                for (const s of joinedStudents) await notifyStudent(s.user_id, true);
            }

            // Nudge bells to refresh so the attended/missed note shows immediately.
            SocketService.emitToSchool(session.school_id, 'notification:received', { category: 'Virtual Class' });
        } catch (notifyErr: any) {
            console.warn('[VirtualClass] attended/missed notification failed:', notifyErr.message);
        }

        res.json(updated);
    } catch (error: any) {
        sendError(res, error, 'virtual-class.controller.ts');
    }
};

export const recordVirtualAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { sessionId } = req.body;
        let { studentId } = req.body;

        // A student self-marking their own attendance on join
        // (components/video/VirtualClassroom.tsx) must not be able to pass an
        // arbitrary studentId and mark a classmate present/absent instead —
        // resolve their own Student.id from the session and ignore whatever
        // the client sent. Teachers/admins keep the ability to mark
        // attendance on behalf of a student who couldn't join.
        const role = (req.user.role || '').toLowerCase();
        if (role === 'student') {
            const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!student) return res.status(403).json({ message: 'Student profile not found' });
            studentId = student.id;
        }

        if (!sessionId || !studentId) {
            return res.status(400).json({ message: 'Session ID and Student ID are required' });
        }

        const branchId = getEffectiveBranchId(req.user);
        const attendance = await VirtualClassService.recordAttendance(req.user.school_id, branchId, sessionId, studentId);
        res.status(200).json(attendance);
    } catch (error: any) {
        sendError(res, error, 'virtual-class.controller.ts');
    }
};
