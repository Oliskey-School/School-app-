import prisma from '../config/database';
import { RiskService } from './risk.service';
import { DigitalTwinService } from './digitalTwin.service';
import { TeacherAssignmentService } from './teacherAssignment.service';

/**
 * The Insight Engine — every "AI Insights" panel is a role-scoped bundle of
 * numbers pulled from real, already-tracked data (reusing the Early Warning,
 * Digital Twin, and Workload engines built earlier this session). No AI call
 * happens here: the language model is only used in askAI.service.ts to
 * understand a free-text question and phrase an answer — never to invent or
 * recompute a figure that belongs here.
 */

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

export class InsightService {
    static async getAdminInsights(schoolId: string, branchId: string | undefined) {
        const branchWhere = branchId && branchId !== 'all' ? { branch_id: branchId } : {};
        const today = todayStr();

        const [snapshot, atRisk, pendingLeave, pendingDepartures, totalActiveStudents] = await Promise.all([
            DigitalTwinService.getSnapshot(schoolId, branchId),
            RiskService.getFlaggedStudents(schoolId, branchId),
            prisma.leaveRequest.count({ where: { school_id: schoolId, ...branchWhere, status: 'Pending', deleted_at: null } }),
            (prisma as any).studentDeparture.count({ where: { school_id: schoolId, ...branchWhere, status: 'Pending' } }),
            prisma.student.count({ where: { school_id: schoolId, ...branchWhere, status: 'Active', deleted_at: null } }),
        ]);
        const todayAttendancePct = totalActiveStudents > 0 ? Math.round((snapshot.students_present / totalActiveStudents) * 100) : 0;

        const workload = await TeacherAssignmentService.getWorkload(schoolId, branchId);
        const overloaded = workload.filter((w: any) => w.workload_level === 'High').length;
        const underloaded = workload.filter((w: any) => w.workload_level === 'Low').length;

        const recommendations: string[] = [];
        if (snapshot.teachers_absent > 0) recommendations.push(`${snapshot.teachers_absent} teacher${snapshot.teachers_absent > 1 ? 's are' : ' is'} absent today — check Substitute Coverage.`);
        if (atRisk.length > 0) recommendations.push(`${atRisk.length} student${atRisk.length > 1 ? 's need' : ' needs'} attention — review the Early Warning list.`);
        if (pendingLeave > 0) recommendations.push(`${pendingLeave} leave request${pendingLeave > 1 ? 's are' : ' is'} awaiting your approval.`);
        if (pendingDepartures > 0) recommendations.push(`${pendingDepartures} gate pass${pendingDepartures > 1 ? 'es are' : ' is'} awaiting approval.`);
        if (overloaded > 0) recommendations.push(`${overloaded} teacher${overloaded > 1 ? 's have' : ' has'} a high workload — consider rebalancing.`);
        if (snapshot.open_maintenance_requests > 0) recommendations.push(`${snapshot.open_maintenance_requests} maintenance request${snapshot.open_maintenance_requests > 1 ? 's are' : ' is'} still open.`);

        return {
            role: 'admin',
            today_attendance_pct: todayAttendancePct,
            teachers_absent: snapshot.teachers_absent,
            students_needing_attention: atRisk.length,
            fee_collection: { unpaid_today: snapshot.unpaid_fees_today },
            pending_approvals: { leave: pendingLeave, gate_passes: pendingDepartures },
            workload_imbalance: { overloaded, underloaded },
            open_maintenance_requests: snapshot.open_maintenance_requests,
            visitors_on_campus: snapshot.visitors_on_campus,
            recommendations,
            generated_for: today,
        };
    }

    static async getTeacherInsights(schoolId: string, teacherId: string) {
        const classLinks = await prisma.classTeacher.findMany({ where: { school_id: schoolId, teacher_id: teacherId, status: 'active' }, select: { class_id: true, role: true } });
        const classIds = Array.from(new Set(classLinks.map(c => c.class_id)));
        const isClassTeacher = classLinks.some(c => c.role === 'class_teacher');

        const [flaggedStudents, homeworkPending, todaysTimetable] = await Promise.all([
            RiskService.getFlaggedStudentsForTeacher(schoolId, teacherId),
            classIds.length > 0 ? prisma.assignment.count({ where: { school_id: schoolId, class_id: { in: classIds }, is_published: true, due_date: { gte: new Date() }, deleted_at: null } }) : 0,
            prisma.timetable.findMany({
                where: { school_id: schoolId, teacher_id: teacherId, day_of_week: new Date().getDay() === 0 ? 7 : new Date().getDay(), status: 'Published', deleted_at: null },
                select: { subject: true, class_name: true, start_time: true, end_time: true },
                orderBy: { start_time: 'asc' },
            }),
        ]);

        let absentToday = 0, behaviorConcerns = 0;
        if (isClassTeacher && classIds.length > 0) {
            [absentToday, behaviorConcerns] = await Promise.all([
                prisma.attendance.count({ where: { school_id: schoolId, class_id: { in: classIds }, date: new Date(todayStr()), status: 'Absent' } }),
                prisma.behaviorNote.count({ where: { school_id: schoolId, type: 'negative', date: { gte: daysAgo(7) }, deleted_at: null, student: { enrollments: { some: { class_id: { in: classIds }, status: 'Active' } } } } }),
            ]);
        }

        const recommendations: string[] = [];
        if (flaggedStudents.length > 0) recommendations.push(`${flaggedStudents.length} student${flaggedStudents.length > 1 ? 's in your classes need' : ' needs'} extra support.`);
        if (isClassTeacher && absentToday > 0) recommendations.push(`${absentToday} student${absentToday > 1 ? 's are' : ' is'} absent in your class today.`);
        if (isClassTeacher && behaviorConcerns > 0) recommendations.push(`${behaviorConcerns} behaviour note${behaviorConcerns > 1 ? 's were' : ' was'} logged this week.`);

        return {
            role: 'teacher',
            today_timetable: todaysTimetable,
            students_needing_support: flaggedStudents.length,
            homework_pending: homeworkPending,
            is_class_teacher: isClassTeacher,
            class_absentees_today: absentToday,
            behaviour_concerns_this_week: behaviorConcerns,
            recommendations,
        };
    }

    static async getParentInsights(schoolId: string, parentId: string) {
        const children = await prisma.parentChild.findMany({
            where: { parent_id: parentId, deleted_at: null },
            select: { student_id: true, student: { select: { full_name: true } } },
        });
        const studentIds = children.map(c => c.student_id);
        if (studentIds.length === 0) return { role: 'parent', children: [], recommendations: [] };

        const [attendanceRows, feeRows, upcomingEvents, riskFlags] = await Promise.all([
            prisma.attendance.findMany({ where: { student_id: { in: studentIds }, date: { gte: daysAgo(30) } }, select: { student_id: true, status: true } }),
            prisma.studentFee.findMany({ where: { student_id: { in: studentIds }, status: { not: 'Paid' }, deleted_at: null }, select: { student_id: true, amount: true, paid_amount: true } }),
            prisma.event.findMany({ where: { school_id: schoolId, date: { gte: new Date() }, deleted_at: null }, orderBy: { date: 'asc' }, take: 3, select: { title: true, date: true } }),
            RiskService.getFlaggedStudentsForParent(schoolId, parentId),
        ]);

        const childSummaries = children.map(c => {
            const att = attendanceRows.filter(a => a.student_id === c.student_id);
            const presentPct = att.length > 0 ? Math.round((att.filter(a => a.status === 'Present').length / att.length) * 100) : null;
            const unpaidFees = feeRows.filter(f => f.student_id === c.student_id).reduce((sum, f) => sum + (f.amount - f.paid_amount), 0);
            return { student_id: c.student_id, name: c.student.full_name, attendance_pct_30d: presentPct, unpaid_fees: unpaidFees };
        });

        const recommendations: string[] = [];
        for (const c of childSummaries) {
            if (c.attendance_pct_30d !== null && c.attendance_pct_30d < 80) recommendations.push(`${c.name}'s attendance has been low this month (${c.attendance_pct_30d}%).`);
            if (c.unpaid_fees > 0) recommendations.push(`${c.name} has ₦${c.unpaid_fees.toLocaleString()} in unpaid fees.`);
        }
        if (riskFlags.length > 0) recommendations.push(...riskFlags.map((f: any) => f.message));

        return { role: 'parent', children: childSummaries, upcoming_events: upcomingEvents, recommendations };
    }

    static async getStudentInsights(schoolId: string, studentId: string) {
        const [examResults, upcomingExams, pendingAssignments] = await Promise.all([
            prisma.examResult.findMany({ where: { student_id: studentId, created_at: { gte: daysAgo(60) } }, select: { subject: true, score: true, max_score: true } }),
            prisma.exam.findMany({ where: { school_id: schoolId, date: { gte: new Date() }, is_published: true }, orderBy: { date: 'asc' }, take: 3, select: { title: true, subject: true, date: true } }),
            prisma.assignment.findMany({
                where: { school_id: schoolId, is_published: true, due_date: { gte: new Date() }, deleted_at: null, class: { enrollments: { some: { student_id: studentId, status: 'Active' } } } },
                orderBy: { due_date: 'asc' }, take: 5, select: { title: true, subject: true, due_date: true },
            }),
        ]);

        const bySubject = new Map<string, { total: number; count: number }>();
        for (const r of examResults) {
            if (r.score == null || !r.max_score) continue;
            const pct = (r.score / r.max_score) * 100;
            const entry = bySubject.get(r.subject || 'General') || { total: 0, count: 0 };
            entry.total += pct; entry.count += 1;
            bySubject.set(r.subject || 'General', entry);
        }
        const weakSubjects = Array.from(bySubject.entries())
            .map(([subject, v]) => ({ subject, average_pct: Math.round(v.total / v.count) }))
            .filter(s => s.average_pct < 50)
            .sort((a, b) => a.average_pct - b.average_pct);

        const recommendations: string[] = [];
        if (weakSubjects.length > 0) recommendations.push(`Focus some extra study time on ${weakSubjects.map(s => s.subject).join(', ')}.`);
        if (pendingAssignments.length > 0) recommendations.push(`You have ${pendingAssignments.length} assignment${pendingAssignments.length > 1 ? 's' : ''} due soon.`);
        if (upcomingExams.length > 0) recommendations.push(`${upcomingExams[0].title} is coming up — start revising.`);

        return { role: 'student', weak_subjects: weakSubjects, upcoming_exams: upcomingExams, pending_assignments: pendingAssignments, recommendations };
    }
}
