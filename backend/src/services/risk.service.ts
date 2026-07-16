import prisma from '../config/database';
import { NotificationService } from './notification.service';
import { SocketService } from './socket.service';

const LOOKBACK_DAYS = 30;
const LOW_SCORE_THRESHOLD = 40; // percentage
const HIGH_LEVEL_MIN = 70;
const MEDIUM_LEVEL_MIN = 40;

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
}

interface RiskReason { category: string; detail: string; points: number; }

/** Pure scoring function — attendance, homework, fees, behaviour, exam scores,
 * lateness, each weighted, summed into a 0-100 risk score. */
function scoreLevel(score: number): 'Low' | 'Medium' | 'High' {
    if (score >= HIGH_LEVEL_MIN) return 'High';
    if (score >= MEDIUM_LEVEL_MIN) return 'Medium';
    return 'Low';
}

export class RiskService {
    static async computeRiskForStudent(studentId: string): Promise<{ score: number; level: string; reasons: RiskReason[] } | null> {
        const since = daysAgo(LOOKBACK_DAYS);
        const [attendance, submissions, assignedCount, fees, behaviorNotes, examResults] = await Promise.all([
            prisma.attendance.findMany({ where: { student_id: studentId, date: { gte: since }, deleted_at: null }, select: { status: true } }),
            prisma.assignmentSubmission.count({ where: { student_id: studentId, created_at: { gte: since }, deleted_at: null } }),
            prisma.assignment.count({
                where: {
                    deleted_at: null, due_date: { gte: since },
                    class: { enrollments: { some: { student_id: studentId, status: 'Active', deleted_at: null } } },
                },
            }),
            prisma.studentFee.findMany({ where: { student_id: studentId, status: { not: 'Paid' }, deleted_at: null }, select: { amount: true, paid_amount: true, due_date: true } }),
            prisma.behaviorNote.findMany({ where: { student_id: studentId, date: { gte: since }, deleted_at: null, type: 'negative' }, select: { points: true } }),
            prisma.examResult.findMany({ where: { student_id: studentId, created_at: { gte: since }, deleted_at: null }, select: { score: true, max_score: true, subject: true } }),
        ]);

        if (attendance.length === 0 && assignedCount === 0 && fees.length === 0 && behaviorNotes.length === 0 && examResults.length === 0) {
            return null; // nothing to score yet
        }

        const reasons: RiskReason[] = [];
        let score = 0;

        // Attendance: absences and lateness in the last 30 days.
        const absences = attendance.filter(a => a.status === 'Absent').length;
        const lates = attendance.filter(a => a.status === 'Late').length;
        if (absences >= 5) {
            const pts = Math.min(25, absences * 3);
            score += pts;
            reasons.push({ category: 'Attendance', detail: `Missed ${absences} class${absences > 1 ? 'es' : ''} in the last ${LOOKBACK_DAYS} days`, points: pts });
        }
        if (lates >= 3) {
            const pts = Math.min(15, lates * 2);
            score += pts;
            reasons.push({ category: 'Lateness', detail: `Arrived late ${lates} times in the last ${LOOKBACK_DAYS} days`, points: pts });
        }

        // Homework completion.
        if (assignedCount > 0) {
            const missed = Math.max(0, assignedCount - submissions);
            const missRate = missed / assignedCount;
            if (missRate >= 0.3) {
                const pts = Math.round(missRate * 20);
                score += pts;
                reasons.push({ category: 'Homework', detail: `Missed ${missed} of ${assignedCount} assignments`, points: pts });
            }
        }

        // Fees overdue.
        const overdue = fees.filter(f => f.due_date < new Date());
        if (overdue.length > 0) {
            const pts = Math.min(20, overdue.length * 8);
            score += pts;
            reasons.push({ category: 'Fees', detail: `${overdue.length} unpaid fee${overdue.length > 1 ? 's' : ''} past due`, points: pts });
        }

        // Behaviour: negative notes.
        if (behaviorNotes.length > 0) {
            const negPoints = behaviorNotes.reduce((sum, n) => sum + Math.abs(n.points), 0);
            const pts = Math.min(20, behaviorNotes.length * 4);
            score += pts;
            reasons.push({ category: 'Behaviour', detail: `${behaviorNotes.length} behaviour note${behaviorNotes.length > 1 ? 's' : ''} logged (${negPoints} demerit point${negPoints !== 1 ? 's' : ''})`, points: pts });
        }

        // Low exam scores.
        const lowScores = examResults.filter(r => r.score != null && r.max_score && (r.score / r.max_score) * 100 < LOW_SCORE_THRESHOLD);
        if (lowScores.length > 0) {
            const subjects = Array.from(new Set(lowScores.map(r => r.subject).filter(Boolean)));
            const pts = Math.min(20, lowScores.length * 5);
            score += pts;
            reasons.push({ category: 'Academic', detail: `Low scores in ${subjects.slice(0, 3).join(', ') || `${lowScores.length} subject${lowScores.length > 1 ? 's' : ''}`}`, points: pts });
        }

        score = Math.min(100, score);
        return { score, level: scoreLevel(score), reasons };
    }

    /** Nightly (or manually triggered) scan across every active student in a school.
     * Upserts one flag per student; students who no longer meet the threshold
     * have their existing flag resolved automatically. */
    static async runScanForSchool(schoolId: string) {
        const students = await prisma.student.findMany({
            where: { school_id: schoolId, status: 'Active', deleted_at: null },
            select: { id: true, branch_id: true, full_name: true },
        });

        let flaggedCount = 0;
        for (const student of students) {
            const result = await this.computeRiskForStudent(student.id);
            const existing = await (prisma as any).studentRiskFlag.findUnique({ where: { student_id: student.id } });

            if (!result || result.level === 'Low') {
                if (existing && existing.status === 'Active') {
                    await (prisma as any).studentRiskFlag.update({ where: { student_id: student.id }, data: { status: 'Resolved', resolved_at: new Date() } });
                }
                continue;
            }

            flaggedCount++;
            const wasAlreadyFlagged = existing?.status === 'Active';
            await (prisma as any).studentRiskFlag.upsert({
                where: { student_id: student.id },
                create: {
                    school_id: schoolId, branch_id: student.branch_id, student_id: student.id,
                    score: result.score, level: result.level, reasons: result.reasons as any, status: 'Active', computed_at: new Date(),
                },
                update: {
                    score: result.score, level: result.level, reasons: result.reasons as any, status: 'Active',
                    resolved_at: null, resolved_by: null, computed_at: new Date(),
                },
            });

            if (!wasAlreadyFlagged) {
                await this.notifyNewFlag(schoolId, student.id, student.branch_id, student.full_name, result.level, result.reasons);
            }
        }

        SocketService.emitToSchool(schoolId, 'risk:scan_complete', { flaggedCount });
        return { studentsScanned: students.length, flaggedCount };
    }

    private static async notifyNewFlag(schoolId: string, studentId: string, branchId: string | null, studentName: string, level: string, reasons: RiskReason[]) {
        const topReason = reasons.sort((a, b) => b.points - a.points)[0];
        const summary = topReason ? topReason.detail : 'Multiple risk factors detected';

        const admins = await prisma.user.findMany({
            where: { school_id: schoolId, role: { in: ['ADMIN', 'PROPRIETOR'] as any } },
            select: { id: true },
        });
        for (const admin of admins) {
            await NotificationService.createNotification(schoolId, branchId ?? undefined, {
                user_id: admin.id, title: `${level} Risk: ${studentName}`,
                message: `${studentName} is flagged as ${level.toLowerCase()} risk — ${summary}`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Risk] admin notify failed:', err.message));
        }

        const teacherLinks = await prisma.classTeacher.findMany({
            where: { school_id: schoolId, status: 'active', class: { enrollments: { some: { student_id: studentId, status: 'Active', deleted_at: null } } } },
            select: { teacher: { select: { user_id: true } } },
        });
        const teacherUserIds = Array.from(new Set(teacherLinks.map(t => t.teacher.user_id)));
        for (const userId of teacherUserIds) {
            await NotificationService.createNotification(schoolId, branchId ?? undefined, {
                user_id: userId, title: `${level} Risk: ${studentName}`,
                message: `${studentName} in your class is flagged as ${level.toLowerCase()} risk — ${summary}`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Risk] teacher notify failed:', err.message));
        }

        const parentLinks = await prisma.parentChild.findMany({ where: { student_id: studentId, deleted_at: null }, select: { parent: { select: { user_id: true } } } });
        for (const link of parentLinks) {
            await NotificationService.createNotification(schoolId, branchId ?? undefined, {
                user_id: link.parent.user_id, title: 'A Note About Your Child',
                message: `${studentName} may need some extra support this term. Please check in with their teacher.`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Risk] parent notify failed:', err.message));
        }
    }

    static async getFlaggedStudents(schoolId: string, branchId: string | undefined, filters: { level?: string; classId?: string } = {}) {
        const where: any = { school_id: schoolId, status: 'Active' };
        if (branchId && branchId !== 'all') where.branch_id = branchId;
        if (filters.level) where.level = filters.level;

        const flags = await (prisma as any).studentRiskFlag.findMany({ where, orderBy: { score: 'desc' } });
        const studentIds = flags.map((f: any) => f.student_id);
        let students = await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, full_name: true, avatar_url: true, grade: true, section: true, enrollments: { where: { status: 'Active', deleted_at: null }, select: { class_id: true, class: { select: { name: true } } } } } });

        if (filters.classId) {
            const idsInClass = new Set(students.filter(s => s.enrollments.some(e => e.class_id === filters.classId)).map(s => s.id));
            students = students.filter(s => idsInClass.has(s.id));
        }

        const studentMap = new Map(students.map(s => [s.id, s]));
        return flags
            .filter((f: any) => studentMap.has(f.student_id))
            .map((f: any) => {
                const s = studentMap.get(f.student_id)!;
                return {
                    id: f.id, student_id: s.id, student_name: s.full_name, avatar_url: s.avatar_url,
                    class_name: s.enrollments[0]?.class?.name || null,
                    score: f.score, level: f.level, reasons: f.reasons, computed_at: f.computed_at,
                };
            });
    }

    /** Teacher-scoped: only students in classes this teacher teaches. */
    static async getFlaggedStudentsForTeacher(schoolId: string, teacherId: string) {
        const classLinks = await prisma.classTeacher.findMany({ where: { school_id: schoolId, teacher_id: teacherId, status: 'active' }, select: { class_id: true } });
        const classIds = classLinks.map(c => c.class_id);
        if (classIds.length === 0) return [];

        const flags = await (prisma as any).studentRiskFlag.findMany({ where: { school_id: schoolId, status: 'Active' }, orderBy: { score: 'desc' } });
        const studentIds = flags.map((f: any) => f.student_id);
        const enrolled = await prisma.studentEnrollment.findMany({ where: { student_id: { in: studentIds }, class_id: { in: classIds }, status: 'Active', deleted_at: null }, select: { student_id: true, class: { select: { name: true } } } });
        const enrolledMap = new Map(enrolled.map(e => [e.student_id, e.class.name]));

        const students = await prisma.student.findMany({ where: { id: { in: Array.from(enrolledMap.keys()) } }, select: { id: true, full_name: true, avatar_url: true } });
        const studentMap = new Map(students.map(s => [s.id, s]));

        return flags
            .filter((f: any) => enrolledMap.has(f.student_id))
            .map((f: any) => {
                const s = studentMap.get(f.student_id)!;
                return {
                    id: f.id, student_id: s.id, student_name: s.full_name, avatar_url: s.avatar_url,
                    class_name: enrolledMap.get(f.student_id), score: f.score, level: f.level, reasons: f.reasons, computed_at: f.computed_at,
                };
            });
    }

    /** Parent-scoped: gentle, minimal detail for their own children only. */
    static async getFlaggedStudentsForParent(schoolId: string, parentId: string) {
        const children = await prisma.parentChild.findMany({ where: { parent_id: parentId, deleted_at: null }, select: { student_id: true, student: { select: { full_name: true } } } });
        const studentIds = children.map(c => c.student_id);
        if (studentIds.length === 0) return [];

        const flags = await (prisma as any).studentRiskFlag.findMany({ where: { school_id: schoolId, student_id: { in: studentIds }, status: 'Active' } });
        return flags.map((f: any) => ({
            student_id: f.student_id,
            student_name: children.find(c => c.student_id === f.student_id)?.student.full_name,
            message: 'Your child may need some extra support this term — please check in with their teacher.',
        }));
    }

    static async resolveFlag(schoolId: string, flagId: string, actorId: string) {
        const flag = await (prisma as any).studentRiskFlag.findFirst({ where: { id: flagId, school_id: schoolId } });
        if (!flag) throw new Error('Risk flag not found');
        if (flag.status === 'Resolved') throw new Error('This flag has already been resolved');
        return (prisma as any).studentRiskFlag.update({ where: { id: flagId }, data: { status: 'Resolved', resolved_at: new Date(), resolved_by: actorId } });
    }
}
