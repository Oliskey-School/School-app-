import prisma from '../config/database';
import { NotificationService } from './notification.service';

const RECORD_TYPES = ['promotion', 'warning', 'commendation', 'disciplinary', 'note'];
const CLOSE_OUTCOMES = ['resolved', 'warning_issued', 'escalated'];

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class PersonnelService {
    /**
     * A teacher visible to this caller: same school, and — for branch-scoped
     * admins — within the caller's effective branch.
     */
    static async getScopedTeacher(schoolId: string, teacherId: string, branchId?: string) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, school_id: schoolId, deleted_at: null },
            include: { user: { select: { email: true, created_at: true } } }
        });
        if (!teacher) throw new Error('Teacher not found');
        if (branchId && branchId !== 'all') {
            const allowed = [teacher.branch_id, ...(teacher.allowed_branch_ids || [])].filter(Boolean);
            if (!allowed.includes(branchId)) throw new Error('Teacher not found');
        }
        return teacher;
    }

    /**
     * The complete personnel file: profile + employment, qualifications,
     * attendance summary, performance history, permanent records, and the
     * full query-letter history.
     */
    static async getPersonnelFile(schoolId: string, teacherId: string, branchId?: string) {
        const teacher = await this.getScopedTeacher(schoolId, teacherId, branchId);

        const [records, queryLetters, evaluations, attendance, lessonStats, branch] = await Promise.all([
            (prisma as any).teacherRecord.findMany({
                where: { teacher_id: teacherId, school_id: schoolId, deleted_at: null },
                orderBy: { created_at: 'desc' }
            }),
            this.listQueryLetters(schoolId, teacherId),
            prisma.teacherEvaluation.findMany({
                where: { teacher_id: teacherId, school_id: schoolId, deleted_at: null },
                orderBy: { created_at: 'desc' }
            }),
            (prisma as any).teacherAttendance.findMany({
                where: { teacher_id: teacherId, school_id: schoolId, deleted_at: null },
                orderBy: { date: 'desc' },
                take: 90
            }),
            (prisma as any).lessonAttendance.groupBy({
                by: ['status'],
                where: { teacher_id: teacherId, school_id: schoolId, deleted_at: null },
                _count: { _all: true }
            }).catch(() => []),
            teacher.branch_id
                ? prisma.branch.findUnique({ where: { id: teacher.branch_id }, select: { name: true, code: true } })
                : null,
        ]);

        const attendanceSummary = {
            recent: attendance.slice(0, 30),
            present: attendance.filter((a: any) => (a.status || '').toLowerCase() === 'present').length,
            absent: attendance.filter((a: any) => (a.status || '').toLowerCase() === 'absent').length,
            late: attendance.filter((a: any) => (a.status || '').toLowerCase() === 'late').length,
            total: attendance.length,
            lessons: (lessonStats as any[]).reduce((acc: any, s: any) => {
                acc[s.status] = s._count._all;
                return acc;
            }, {}),
        };

        return {
            teacher: {
                id: teacher.id,
                school_generated_id: teacher.school_generated_id,
                full_name: teacher.full_name,
                email: teacher.email || teacher.user?.email || null,
                phone: teacher.phone,
                avatar_url: teacher.avatar_url,
                status: teacher.status,
                branch_name: branch?.name || null,
                curriculum_type: teacher.curriculum_type,
                subject_specialty: teacher.subject_specialty,
                curriculum_eligibility: teacher.curriculum_eligibility,
                british_qualification: teacher.british_qualification,
                degree_certificate: teacher.degree_certificate,
                trcn_certificate: teacher.trcn_certificate,
                compliance_documents: teacher.compliance_documents,
                employed_since: teacher.user?.created_at || teacher.created_at,
            },
            records,
            query_letters: queryLetters,
            evaluations,
            attendance: attendanceSummary,
        };
    }

    // ---------- Permanent records ----------

    static async createRecord(schoolId: string, data: any, createdBy: string, branchId?: string) {
        if (!RECORD_TYPES.includes(data.type)) throw new Error(`Record type must be one of: ${RECORD_TYPES.join(', ')}`);
        if (!data.title?.trim()) throw new Error('Title is required');
        const teacher = await this.getScopedTeacher(schoolId, data.teacher_id, branchId);

        return await (prisma as any).teacherRecord.create({
            data: {
                school_id: schoolId,
                branch_id: teacher.branch_id ?? null,
                teacher_id: teacher.id,
                type: data.type,
                title: data.title.trim(),
                details: data.details?.trim() || null,
                effective_date: data.effective_date || todayStr(),
                attachment_urls: Array.isArray(data.attachment_urls) ? data.attachment_urls : [],
                created_by: createdBy,
            }
        });
    }

    /**
     * Same-day typo window only: the personnel file is a permanent record, so
     * entries can be corrected on the day they were written and never after.
     */
    static async updateRecord(schoolId: string, id: string, data: any, updatedBy: string, branchId?: string) {
        const record = await (prisma as any).teacherRecord.findFirst({
            where: { id, school_id: schoolId, deleted_at: null }
        });
        if (!record) throw new Error('Record not found');
        await this.getScopedTeacher(schoolId, record.teacher_id, branchId);

        const createdDay = new Date(record.created_at);
        const now = new Date();
        const sameDay = createdDay.getFullYear() === now.getFullYear()
            && createdDay.getMonth() === now.getMonth()
            && createdDay.getDate() === now.getDate();
        if (!sameDay) throw new Error('Personnel records can only be edited on the day they were created');

        return await (prisma as any).teacherRecord.update({
            where: { id },
            data: {
                ...(data.title?.trim() ? { title: data.title.trim() } : {}),
                ...(data.details !== undefined ? { details: data.details?.trim() || null } : {}),
                ...(data.effective_date !== undefined ? { effective_date: data.effective_date || null } : {}),
                updated_by: updatedBy,
            }
        });
    }

    // ---------- Query letters ----------

    static async listQueryLetters(schoolId: string, teacherId: string) {
        const letters = await (prisma as any).queryLetter.findMany({
            where: { teacher_id: teacherId, school_id: schoolId, deleted_at: null },
            orderBy: { created_at: 'desc' }
        });
        // Overdue is a live condition of a pending letter, not a stored state.
        const today = todayStr();
        return letters.map((l: any) => ({
            ...l,
            is_overdue: l.status === 'pending' && l.response_deadline < today,
        }));
    }

    static async issueQueryLetter(schoolId: string, data: any, issuedBy: { id: string; name?: string }, branchId?: string) {
        if (!data.subject?.trim()) throw new Error('Subject is required');
        if (!data.reason?.trim()) throw new Error('Reason is required');
        if (!data.response_deadline) throw new Error('Response deadline is required');
        const teacher = await this.getScopedTeacher(schoolId, data.teacher_id, branchId);

        const letter = await (prisma as any).queryLetter.create({
            data: {
                school_id: schoolId,
                branch_id: teacher.branch_id ?? null,
                teacher_id: teacher.id,
                subject: data.subject.trim(),
                reason: data.reason.trim(),
                issue_date: data.issue_date || todayStr(),
                response_deadline: data.response_deadline,
                attachment_urls: Array.isArray(data.attachment_urls) ? data.attachment_urls : [],
                issued_by: issuedBy.id,
                issued_by_name: issuedBy.name || null,
                created_by: issuedBy.id,
            }
        });

        await NotificationService.createNotification(schoolId, teacher.branch_id ?? undefined, {
            user_id: teacher.user_id,
            title: 'Query Letter Issued',
            message: `You have received a query letter: "${letter.subject}". Please respond by ${letter.response_deadline}.`,
            category: 'System',
        }).catch(err => console.warn('⚠️ [Personnel] query notification failed:', err.message));

        return letter;
    }

    /** The addressed teacher submits their written response. */
    static async respondToQueryLetter(schoolId: string, letterId: string, teacherId: string, data: any) {
        const letter = await (prisma as any).queryLetter.findFirst({
            where: { id: letterId, school_id: schoolId, teacher_id: teacherId, deleted_at: null }
        });
        if (!letter) throw new Error('Query letter not found');
        if (letter.response_text) throw new Error('A response has already been submitted for this query letter');
        if (!data.response_text?.trim()) throw new Error('A written response is required');

        const isLate = todayStr() > letter.response_deadline;
        const updated = await (prisma as any).queryLetter.update({
            where: { id: letterId },
            data: {
                response_text: data.response_text.trim(),
                response_attachment_urls: Array.isArray(data.attachment_urls) ? data.attachment_urls : [],
                responded_at: new Date(),
                is_late_response: isLate,
                status: 'responded',
            }
        });

        // Tell the issuing admin (fall back to a school-admin broadcast).
        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { full_name: true } });
        await NotificationService.createNotification(schoolId, letter.branch_id ?? undefined, {
            user_id: letter.issued_by || undefined,
            audience: letter.issued_by ? undefined : ['admin'],
            title: 'Query Letter Response Received',
            message: `${teacher?.full_name || 'A teacher'} has responded to the query letter "${letter.subject}"${isLate ? ' (submitted after the deadline)' : ''}.`,
            category: 'System',
        }).catch(err => console.warn('⚠️ [Personnel] response notification failed:', err.message));

        return updated;
    }

    /**
     * Admin closes the query with an outcome. "warning_issued" also writes a
     * permanent warning record into the personnel file automatically.
     */
    static async closeQueryLetter(schoolId: string, letterId: string, data: any, closedBy: string, branchId?: string) {
        if (!CLOSE_OUTCOMES.includes(data.outcome)) throw new Error(`Outcome must be one of: ${CLOSE_OUTCOMES.join(', ')}`);
        const letter = await (prisma as any).queryLetter.findFirst({
            where: { id: letterId, school_id: schoolId, deleted_at: null }
        });
        if (!letter) throw new Error('Query letter not found');
        await this.getScopedTeacher(schoolId, letter.teacher_id, branchId);
        if (['resolved', 'warning_issued', 'escalated'].includes(letter.status)) {
            throw new Error('This query letter has already been closed');
        }

        const updated = await (prisma as any).queryLetter.update({
            where: { id: letterId },
            data: {
                status: data.outcome,
                outcome_note: data.outcome_note?.trim() || null,
                closed_by: closedBy,
                closed_at: new Date(),
            }
        });

        if (data.outcome === 'warning_issued') {
            await (prisma as any).teacherRecord.create({
                data: {
                    school_id: schoolId,
                    branch_id: letter.branch_id ?? null,
                    teacher_id: letter.teacher_id,
                    type: 'warning',
                    title: `Warning — ${letter.subject}`,
                    details: data.outcome_note?.trim() || `Warning issued following query letter "${letter.subject}".`,
                    effective_date: todayStr(),
                    created_by: closedBy,
                }
            });
        }

        const teacher = await prisma.teacher.findUnique({ where: { id: letter.teacher_id }, select: { user_id: true } });
        if (teacher) {
            const OUTCOME_LABEL: Record<string, string> = {
                resolved: 'resolved', warning_issued: 'closed with a warning', escalated: 'escalated',
            };
            await NotificationService.createNotification(schoolId, letter.branch_id ?? undefined, {
                user_id: teacher.user_id,
                title: 'Query Letter Outcome',
                message: `The query letter "${letter.subject}" has been ${OUTCOME_LABEL[data.outcome]}.`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Personnel] outcome notification failed:', err.message));
        }

        return updated;
    }
}
