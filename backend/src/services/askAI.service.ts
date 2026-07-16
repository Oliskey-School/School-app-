import prisma from '../config/database';
import { NvidiaAIService, NVIDIA_MODELS } from './nvidiaAI.service';
import { RiskService } from './risk.service';
import { DigitalTwinService } from './digitalTwin.service';

/**
 * Ask AI — "rules compute, AI phrases." A curated catalog of safe, tenant-
 * scoped queries. The AI's only two jobs are (1) matching a free-text
 * question to one of these queries and (2) writing a short plain-English
 * answer from the data that query returns. It never sees another school's
 * data and never generates its own database query — every catalog entry is
 * hand-written and already scoped to the asking user's role/branch/classes/
 * children before the AI ever sees the result.
 */

interface AskContext {
    schoolId: string;
    branchId?: string;
    role: string;
    userId: string;
    teacherId?: string;
    parentId?: string;
    studentId?: string;
}

interface CatalogEntry {
    id: string;
    description: string;
    roles: string[];
    run: (ctx: AskContext) => Promise<{ summary: string; data: any }>;
}

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}
function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CATALOG: CatalogEntry[] = [
    {
        id: 'at_risk_students', description: 'Which students are at risk of failing or need attention (Early Warning flags)',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher'],
        run: async (ctx) => {
            const rows = ctx.role === 'teacher' && ctx.teacherId
                ? await RiskService.getFlaggedStudentsForTeacher(ctx.schoolId, ctx.teacherId)
                : await RiskService.getFlaggedStudents(ctx.schoolId, ctx.branchId);
            return { summary: `${rows.length} student(s) currently flagged.`, data: rows.slice(0, 20).map((r: any) => ({ name: r.student_name, level: r.level, reasons: r.reasons?.map((x: any) => x.detail) })) };
        },
    },
    {
        id: 'unpaid_fees', description: 'Show unpaid or overdue school fees',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin'],
        run: async (ctx) => {
            const branchWhere = ctx.branchId && ctx.branchId !== 'all' ? { branch_id: ctx.branchId } : {};
            const rows = await prisma.studentFee.findMany({
                where: { school_id: ctx.schoolId, ...branchWhere, status: { not: 'Paid' }, deleted_at: null },
                include: { student: { select: { full_name: true } } }, take: 20, orderBy: { due_date: 'asc' },
            });
            const total = rows.reduce((s, r) => s + (r.amount - r.paid_amount), 0);
            return { summary: `${rows.length} unpaid fee record(s) totalling ₦${total.toLocaleString()}.`, data: rows.map(r => ({ student: r.student.full_name, title: r.title, outstanding: r.amount - r.paid_amount, due_date: r.due_date })) };
        },
    },
    {
        id: 'teachers_absent_today', description: 'Which teachers are absent or missed classes today',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin'],
        run: async (ctx) => {
            const branchWhere = ctx.branchId && ctx.branchId !== 'all' ? { branch_id: ctx.branchId } : {};
            const rows = await (prisma as any).teacherAttendance.findMany({
                where: { school_id: ctx.schoolId, ...branchWhere, date: todayStr(), status: 'Absent' },
                include: { teacher: { select: { full_name: true } } },
            });
            return { summary: `${rows.length} teacher(s) absent today.`, data: rows.map((r: any) => ({ name: r.teacher.full_name })) };
        },
    },
    {
        id: 'best_attendance_class', description: 'Which class has the best attendance',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin'],
        run: async (ctx) => classAttendanceRanking(ctx, 'best'),
    },
    {
        id: 'worst_attendance_class', description: 'Which class has the worst attendance',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin'],
        run: async (ctx) => classAttendanceRanking(ctx, 'worst'),
    },
    {
        id: 'top_students', description: 'Who are the top-performing students by exam score',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher'],
        run: async (ctx) => {
            const branchWhere = ctx.branchId && ctx.branchId !== 'all' ? { branch_id: ctx.branchId } : {};
            const results = await prisma.examResult.findMany({
                where: { school_id: ctx.schoolId, ...branchWhere, created_at: { gte: daysAgo(90) }, score: { not: null } },
                select: { student_id: true, score: true, max_score: true, student: { select: { full_name: true } } },
            });
            const byStudent = new Map<string, { name: string; total: number; count: number }>();
            for (const r of results) {
                if (!r.max_score) continue;
                const pct = (r.score! / r.max_score) * 100;
                const e = byStudent.get(r.student_id) || { name: r.student.full_name, total: 0, count: 0 };
                e.total += pct; e.count += 1;
                byStudent.set(r.student_id, e);
            }
            const ranked = Array.from(byStudent.values()).map(s => ({ name: s.name, average_pct: Math.round(s.total / s.count) })).sort((a, b) => b.average_pct - a.average_pct).slice(0, 20);
            return { summary: `Top ${ranked.length} students by average score.`, data: ranked };
        },
    },
    {
        id: 'lowest_pass_rate_subjects', description: 'Which subjects have the lowest pass rate',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin'],
        run: async (ctx) => {
            const branchWhere = ctx.branchId && ctx.branchId !== 'all' ? { branch_id: ctx.branchId } : {};
            const results = await prisma.examResult.findMany({
                where: { school_id: ctx.schoolId, ...branchWhere, created_at: { gte: daysAgo(90) }, score: { not: null } },
                select: { subject: true, score: true, max_score: true },
            });
            const bySubject = new Map<string, { pass: number; total: number }>();
            for (const r of results) {
                if (!r.max_score || !r.subject) continue;
                const pct = (r.score! / r.max_score) * 100;
                const e = bySubject.get(r.subject) || { pass: 0, total: 0 };
                e.total += 1; if (pct >= 50) e.pass += 1;
                bySubject.set(r.subject, e);
            }
            const ranked = Array.from(bySubject.entries()).map(([subject, v]) => ({ subject, pass_rate_pct: Math.round((v.pass / v.total) * 100), sample_size: v.total })).sort((a, b) => a.pass_rate_pct - b.pass_rate_pct);
            return { summary: `${ranked.length} subject(s) ranked by pass rate.`, data: ranked.slice(0, 10) };
        },
    },
    {
        id: 'late_assignment_submitters', description: 'Which students frequently submit assignments late',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher'],
        run: async (ctx) => {
            const branchWhere = ctx.branchId && ctx.branchId !== 'all' ? { branch_id: ctx.branchId } : {};
            const rows = await prisma.assignmentSubmission.findMany({
                where: { school_id: ctx.schoolId, ...branchWhere, created_at: { gte: daysAgo(60) } },
                include: { student: { select: { full_name: true } }, assignment: { select: { due_date: true } } },
            });
            const late = rows.filter(r => r.submitted_at > r.assignment.due_date);
            const byStudent = new Map<string, { name: string; count: number }>();
            for (const r of late) {
                const e = byStudent.get(r.student_id) || { name: r.student.full_name, count: 0 };
                e.count += 1;
                byStudent.set(r.student_id, e);
            }
            const ranked = Array.from(byStudent.values()).sort((a, b) => b.count - a.count).slice(0, 15);
            return { summary: `${ranked.length} student(s) with late submissions in the last 60 days.`, data: ranked };
        },
    },
    {
        id: 'pending_approvals', description: 'What is pending my approval today (leave requests, gate passes)',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin'],
        run: async (ctx) => {
            const branchWhere = ctx.branchId && ctx.branchId !== 'all' ? { branch_id: ctx.branchId } : {};
            const [leave, gatePasses] = await Promise.all([
                prisma.leaveRequest.count({ where: { school_id: ctx.schoolId, ...branchWhere, status: 'Pending', deleted_at: null } }),
                (prisma as any).studentDeparture.count({ where: { school_id: ctx.schoolId, ...branchWhere, status: 'Pending' } }),
            ]);
            return { summary: `${leave} leave request(s) and ${gatePasses} gate pass(es) awaiting approval.`, data: { leave, gatePasses } };
        },
    },
    {
        id: 'school_status_now', description: 'Overall school status right now / what should I focus on today',
        roles: ['admin', 'proprietor', 'superadmin', 'super_admin'],
        run: async (ctx) => {
            const snapshot = await DigitalTwinService.getSnapshot(ctx.schoolId, ctx.branchId);
            return { summary: 'Live school snapshot.', data: snapshot };
        },
    },
    {
        id: 'my_child_summary', description: "How is my child doing — attendance, fees, academic progress",
        roles: ['parent'],
        run: async (ctx) => {
            if (!ctx.parentId) return { summary: 'No children linked.', data: [] };
            const children = await prisma.parentChild.findMany({ where: { parent_id: ctx.parentId, deleted_at: null }, select: { student_id: true, student: { select: { full_name: true } } } });
            const studentIds = children.map(c => c.student_id);
            const [attendance, fees] = await Promise.all([
                prisma.attendance.findMany({ where: { student_id: { in: studentIds }, date: { gte: daysAgo(30) } }, select: { student_id: true, status: true } }),
                prisma.studentFee.findMany({ where: { student_id: { in: studentIds }, status: { not: 'Paid' }, deleted_at: null }, select: { student_id: true, amount: true, paid_amount: true } }),
            ]);
            const data = children.map(c => {
                const att = attendance.filter(a => a.student_id === c.student_id);
                const pct = att.length > 0 ? Math.round((att.filter(a => a.status === 'Present').length / att.length) * 100) : null;
                const unpaid = fees.filter(f => f.student_id === c.student_id).reduce((s, f) => s + (f.amount - f.paid_amount), 0);
                return { name: c.student.full_name, attendance_pct_30d: pct, unpaid_fees: unpaid };
            });
            return { summary: `Summary for ${data.length} child(ren).`, data };
        },
    },
    {
        id: 'my_weak_subjects', description: 'What are my weak subjects / what should I study / upcoming exams',
        roles: ['student'],
        run: async (ctx) => {
            if (!ctx.studentId) return { summary: 'No student profile found.', data: [] };
            const results = await prisma.examResult.findMany({ where: { student_id: ctx.studentId, created_at: { gte: daysAgo(60) } }, select: { subject: true, score: true, max_score: true } });
            const bySubject = new Map<string, { total: number; count: number }>();
            for (const r of results) {
                if (r.score == null || !r.max_score) continue;
                const pct = (r.score / r.max_score) * 100;
                const e = bySubject.get(r.subject || 'General') || { total: 0, count: 0 };
                e.total += pct; e.count += 1;
                bySubject.set(r.subject || 'General', e);
            }
            const weak = Array.from(bySubject.entries()).map(([subject, v]) => ({ subject, average_pct: Math.round(v.total / v.count) })).filter(s => s.average_pct < 50).sort((a, b) => a.average_pct - b.average_pct);
            return { summary: `${weak.length} subject(s) below 50% average.`, data: weak };
        },
    },
];

function catalogForRole(role: string): CatalogEntry[] {
    return CATALOG.filter(c => c.roles.includes(role.toLowerCase()));
}

async function classAttendanceRanking(ctx: AskContext, direction: 'best' | 'worst') {
    const branchWhere = ctx.branchId && ctx.branchId !== 'all' ? { branch_id: ctx.branchId } : {};
    const rows = await prisma.attendance.findMany({
        where: { school_id: ctx.schoolId, ...branchWhere, date: { gte: daysAgo(30) } },
        select: { class_id: true, status: true, class: { select: { name: true } } },
    });
    const byClass = new Map<string, { name: string; present: number; total: number }>();
    for (const r of rows) {
        const e = byClass.get(r.class_id) || { name: r.class.name, present: 0, total: 0 };
        e.total += 1; if (r.status === 'Present') e.present += 1;
        byClass.set(r.class_id, e);
    }
    const ranked = Array.from(byClass.values()).map(c => ({ class_name: c.name, attendance_pct: Math.round((c.present / c.total) * 100) }));
    ranked.sort((a, b) => direction === 'best' ? b.attendance_pct - a.attendance_pct : a.attendance_pct - b.attendance_pct);
    return { summary: `Attendance ranking over the last 30 days (${direction}).`, data: ranked.slice(0, 5) };
}

async function resolveContext(schoolId: string, branchId: string | undefined, userId: string, role: string): Promise<AskContext> {
    const ctx: AskContext = { schoolId, branchId, role: role.toLowerCase(), userId };
    if (ctx.role === 'teacher') {
        const teacher = await prisma.teacher.findUnique({ where: { user_id: userId }, select: { id: true } });
        ctx.teacherId = teacher?.id;
    } else if (ctx.role === 'parent') {
        const parent = await prisma.parent.findUnique({ where: { user_id: userId }, select: { id: true } });
        ctx.parentId = parent?.id;
    } else if (ctx.role === 'student') {
        const student = await prisma.student.findUnique({ where: { user_id: userId }, select: { id: true } });
        ctx.studentId = student?.id;
    }
    return ctx;
}

export class AskAIService {
    static async ask(schoolId: string, branchId: string | undefined, userId: string, role: string, question: string) {
        if (!question?.trim()) throw new Error('A question is required');
        const ctx = await resolveContext(schoolId, branchId, userId, role);
        const available = catalogForRole(ctx.role);

        if (available.length === 0) {
            return { answer: "I don't have any questions I can answer for your role yet.", query_id: null, data: null };
        }

        const catalogText = available.map(c => `- ${c.id}: ${c.description}`).join('\n');
        let matchedId: string | null = null;

        if (NvidiaAIService.isConfigured()) {
            try {
                const match = await NvidiaAIService.chat({
                    model: NVIDIA_MODELS.chat,
                    messages: [
                        { role: 'system', content: `You match a school-app user's question to exactly one query from this list, or none. Reply with ONLY the query id (e.g. "unpaid_fees") or the word "none" — nothing else.\n\nAvailable queries:\n${catalogText}` },
                        { role: 'user', content: question },
                    ],
                    temperature: 0, max_tokens: 20,
                });
                const candidate = match.text.trim().toLowerCase().replace(/[^a-z_]/g, '');
                if (available.some(c => c.id === candidate)) matchedId = candidate;
            } catch (err: any) {
                console.warn('⚠️ [AskAI] intent match failed, falling back to keyword match:', err.message);
            }
        }

        if (!matchedId) {
            // Keyword fallback if AI is unavailable or gave an unusable answer.
            const q = question.toLowerCase();
            const scored = available.map(c => ({ id: c.id, score: c.description.toLowerCase().split(' ').filter(w => w.length > 3 && q.includes(w)).length }));
            scored.sort((a, b) => b.score - a.score);
            if (scored[0]?.score > 0) matchedId = scored[0].id;
        }

        if (!matchedId) {
            return { answer: `I can help with things like: ${available.slice(0, 5).map(c => c.description.toLowerCase()).join('; ')}.`, query_id: null, data: null };
        }

        const entry = available.find(c => c.id === matchedId)!;
        const result = await entry.run(ctx);

        let answer = result.summary;
        if (NvidiaAIService.isConfigured()) {
            try {
                const phrasing = await NvidiaAIService.chat({
                    model: NVIDIA_MODELS.chat,
                    messages: [
                        { role: 'system', content: 'You are a helpful school-management assistant. Write a short (2-4 sentence), warm, plain-English answer using ONLY the data given — never invent numbers or names not present in the data. If the data list is empty, say so positively.' },
                        { role: 'user', content: `Question: ${question}\n\nData: ${JSON.stringify(result.data).slice(0, 4000)}` },
                    ],
                    temperature: 0.4, max_tokens: 300,
                });
                if (phrasing.text?.trim()) answer = phrasing.text.trim();
            } catch (err: any) {
                console.warn('⚠️ [AskAI] phrasing failed, using raw summary:', err.message);
            }
        }

        return { answer, query_id: matchedId, data: result.data };
    }

    static listAvailableQuestions(role: string) {
        return catalogForRole(role.toLowerCase()).map(c => c.description);
    }
}
