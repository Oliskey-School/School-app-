import prisma from '../config/database';
import { NotificationService } from './notification.service';
import { SocketService } from './socket.service';
import { SuspensionService } from './suspension.service';
import { PersonnelService } from './personnel.service';

const INCIDENT_TYPE_FIELDS = ['name', 'description', 'severity', 'is_critical_alert', 'alert_audience', 'is_active'];

export class SOPService {
    // ---------- Incident type + workflow builder (admin) ----------

    static async getIncidentTypes(schoolId: string, branchId?: string) {
        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId && branchId !== 'all') where.branch_id = branchId;
        return (prisma as any).sOPIncidentType.findMany({
            where,
            include: { stages: { orderBy: { order: 'asc' } } },
            orderBy: { name: 'asc' },
        });
    }

    static async createIncidentType(schoolId: string, data: any, actorId: string, branchId?: string) {
        if (!data.name?.trim()) throw new Error('Incident type name is required');
        const incidentType = await (prisma as any).sOPIncidentType.create({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                name: data.name.trim(),
                description: data.description?.trim() || null,
                severity: data.severity === 'critical' ? 'critical' : 'standard',
                is_critical_alert: !!data.is_critical_alert,
                alert_audience: data.alert_audience || null,
                created_by: actorId,
            },
        });
        if (Array.isArray(data.stages) && data.stages.length > 0) {
            await this.setStages(schoolId, incidentType.id, data.stages);
        }
        return this.getIncidentTypeById(schoolId, incidentType.id);
    }

    static async updateIncidentType(schoolId: string, id: string, data: any, actorId: string) {
        const existing = await (prisma as any).sOPIncidentType.findFirst({ where: { id, school_id: schoolId, deleted_at: null } });
        if (!existing) throw new Error('Incident type not found');

        const update: any = { updated_by: actorId };
        for (const field of INCIDENT_TYPE_FIELDS) {
            if (data[field] !== undefined) update[field] = data[field];
        }
        await (prisma as any).sOPIncidentType.update({ where: { id }, data: update });
        if (Array.isArray(data.stages)) {
            await this.setStages(schoolId, id, data.stages);
        }
        return this.getIncidentTypeById(schoolId, id);
    }

    static async getIncidentTypeById(schoolId: string, id: string) {
        return (prisma as any).sOPIncidentType.findFirst({
            where: { id, school_id: schoolId, deleted_at: null },
            include: { stages: { orderBy: { order: 'asc' } } },
        });
    }

    /** Replaces the full stage sequence for an incident type. Existing cases keep
     * their already-logged stage_name snapshots regardless of later edits here. */
    static async setStages(schoolId: string, incidentTypeId: string, stages: any[]) {
        const incidentType = await (prisma as any).sOPIncidentType.findFirst({ where: { id: incidentTypeId, school_id: schoolId, deleted_at: null } });
        if (!incidentType) throw new Error('Incident type not found');
        if (stages.length === 0) throw new Error('A workflow needs at least one stage');

        await prisma.$transaction([
            (prisma as any).sOPWorkflowStage.deleteMany({ where: { incident_type_id: incidentTypeId } }),
            (prisma as any).sOPWorkflowStage.createMany({
                data: stages.map((s: any, i: number) => ({
                    incident_type_id: incidentTypeId,
                    order: i + 1,
                    name: s.name?.trim() || `Stage ${i + 1}`,
                    notify_roles: Array.isArray(s.notify_roles) ? s.notify_roles : [],
                    notify_user_ids: Array.isArray(s.notify_user_ids) ? s.notify_user_ids : [],
                    requires_evidence: !!s.requires_evidence,
                    requires_decision: !!s.requires_decision,
                    is_terminal: i === stages.length - 1 ? true : !!s.is_terminal,
                })),
            }),
        ]);
        return this.getIncidentTypeById(schoolId, incidentTypeId);
    }

    static async deactivateIncidentType(schoolId: string, id: string, actorId: string) {
        const existing = await (prisma as any).sOPIncidentType.findFirst({ where: { id, school_id: schoolId, deleted_at: null } });
        if (!existing) throw new Error('Incident type not found');
        return (prisma as any).sOPIncidentType.update({ where: { id }, data: { is_active: false, updated_by: actorId } });
    }

    // ---------- Notification helper ----------

    private static async notifyStage(schoolId: string, branchId: string | undefined, caseRow: any, stage: any) {
        const targets = new Set<string>(stage.notify_user_ids || []);
        if (Array.isArray(stage.notify_roles) && stage.notify_roles.length > 0) {
            // Match this branch OR school-level (branch_id: null) users — a
            // main admin must always be notified regardless of which branch
            // the case was reported from; only branch-locked staff are scoped.
            const users = await prisma.user.findMany({
                where: {
                    school_id: schoolId,
                    role: { in: stage.notify_roles as any },
                    ...(branchId && branchId !== 'all' ? { OR: [{ branch_id: branchId }, { branch_id: null }] } : {}),
                },
                select: { id: true },
            });
            users.forEach(u => targets.add(u.id));
        }
        for (const userId of targets) {
            await NotificationService.createNotification(schoolId, branchId, {
                user_id: userId,
                title: `SOP Case: ${stage.name}`,
                message: `"${caseRow.title}" has reached the "${stage.name}" stage.`,
                category: 'System',
            }).catch((err: any) => console.warn('⚠️ [SOP] stage notification failed:', err.message));
        }
        return Array.from(targets);
    }

    // ---------- Case lifecycle ----------

    /** Reports a new incident and immediately cascades through any leading
     * stages that require neither evidence nor a decision (pure notify
     * stages), stopping at the first stage that needs a human action. */
    static async reportCase(schoolId: string, branchId: string | undefined, data: any, reporter: { id: string; role: string }) {
        if (!data.incident_type_id) throw new Error('Incident type is required');
        if (!data.title?.trim()) throw new Error('Title is required');
        if (!data.description?.trim()) throw new Error('Description is required');

        const incidentType = await this.getIncidentTypeById(schoolId, data.incident_type_id);
        if (!incidentType) throw new Error('Incident type not found');
        if (!incidentType.is_active) throw new Error('This incident type is no longer active');
        if (incidentType.stages.length === 0) throw new Error('This incident type has no workflow stages configured yet');

        const caseRow = await (prisma as any).sOPCase.create({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                incident_type_id: incidentType.id,
                title: data.title.trim(),
                description: data.description.trim(),
                involved_student_ids: Array.isArray(data.involved_student_ids) ? data.involved_student_ids : [],
                involved_teacher_ids: Array.isArray(data.involved_teacher_ids) ? data.involved_teacher_ids : [],
                reported_by: reporter.id,
                reported_by_role: reporter.role,
                created_by: reporter.id,
            },
        });

        await (prisma as any).sOPCaseStageLog.createMany({
            data: incidentType.stages.map((s: any) => ({ case_id: caseRow.id, stage_order: s.order, stage_name: s.name })),
        });

        // Critical incident types fan out an immediate real-time alert on top
        // of the normal stage workflow — the case still proceeds through its
        // stages independently.
        if (incidentType.is_critical_alert) {
            await this.sendCriticalAlert(schoolId, branchId, caseRow, incidentType);
        }

        SocketService.emitToSchool(schoolId, 'sop:case-updated', { action: 'created', caseId: caseRow.id });
        return this.cascadeStages(schoolId, branchId, caseRow.id);
    }

    private static async sendCriticalAlert(schoolId: string, branchId: string | undefined, caseRow: any, incidentType: any) {
        const audience = incidentType.alert_audience || 'staff';
        const roleMap: Record<string, string[]> = {
            all: ['ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
            staff: ['ADMIN', 'TEACHER'],
            parents: ['PARENT'],
            teachers: ['TEACHER'],
        };
        const roles = roleMap[audience] || roleMap.staff;
        const users = await prisma.user.findMany({
            where: {
                school_id: schoolId,
                role: { in: roles as any },
                ...(branchId && branchId !== 'all' ? { OR: [{ branch_id: branchId }, { branch_id: null }] } : {}),
            },
            select: { id: true },
        });
        for (const u of users) {
            await NotificationService.createNotification(schoolId, branchId, {
                user_id: u.id,
                title: `🚨 Critical Incident: ${incidentType.name}`,
                message: caseRow.title,
                category: 'System',
            }).catch((err: any) => console.warn('⚠️ [SOP] critical alert failed:', err.message));
        }
        SocketService.emitToSchool(schoolId, 'sop:critical-alert', { caseId: caseRow.id, title: caseRow.title, incidentType: incidentType.name });
        await (prisma as any).sOPCase.update({ where: { id: caseRow.id }, data: { critical_alert_sent: true } });
    }

    /** Advances through consecutive stages that need no human action (no
     * evidence/decision requirement), notifying each as it's reached, and
     * stops at the first blocking stage or archives the case at the end. */
    private static async cascadeStages(schoolId: string, branchId: string | undefined, caseId: string) {
        while (true) {
            const caseRow = await (prisma as any).sOPCase.findUnique({ where: { id: caseId } });
            if (!caseRow || caseRow.status === 'archived') break;

            const stage = await (prisma as any).sOPWorkflowStage.findFirst({
                where: { incident_type_id: caseRow.incident_type_id, order: caseRow.current_stage_order },
            });
            if (!stage) break;

            const stageLog = await (prisma as any).sOPCaseStageLog.findFirst({
                where: { case_id: caseId, stage_order: stage.order },
            });

            // Notify once per stage (idempotent — skip if already notified).
            if (stageLog && stageLog.notified_user_ids.length === 0) {
                const notified = await this.notifyStage(schoolId, branchId, caseRow, stage);
                await (prisma as any).sOPCaseStageLog.update({ where: { id: stageLog.id }, data: { notified_user_ids: notified } });
            }

            const blocked = stage.requires_evidence || stage.requires_decision;
            if (blocked) {
                if (caseRow.status === 'open') {
                    await (prisma as any).sOPCase.update({ where: { id: caseId }, data: { status: 'in_progress' } });
                }
                break;
            }

            // No requirements — auto-complete this stage and move on.
            await (prisma as any).sOPCaseStageLog.update({
                where: { id: stageLog!.id },
                data: { status: 'completed', completed_at: new Date(), completed_by: 'system' },
            });

            if (stage.is_terminal) {
                await (prisma as any).sOPCase.update({ where: { id: caseId }, data: { status: 'archived', closed_at: new Date() } });
                break;
            }
            await (prisma as any).sOPCase.update({
                where: { id: caseId },
                data: { current_stage_order: caseRow.current_stage_order + 1, status: 'in_progress' },
            });
        }
        SocketService.emitToSchool(schoolId, 'sop:case-updated', { action: 'advanced', caseId });
        return this.getCaseDetail(schoolId, caseId);
    }

    /** Explicitly completes the CURRENT stage (validating its requirements
     * are met) and cascades forward. This is how an admin manually pushes a
     * case through stages with no automatic trigger (e.g. "Investigation"). */
    static async advanceStage(schoolId: string, branchId: string | undefined, caseId: string, actorId: string, notes?: string) {
        const caseRow = await (prisma as any).sOPCase.findFirst({ where: { id: caseId, school_id: schoolId, deleted_at: null } });
        if (!caseRow) throw new Error('Case not found');
        if (caseRow.status === 'archived') throw new Error('This case is already archived');

        const stage = await (prisma as any).sOPWorkflowStage.findFirst({
            where: { incident_type_id: caseRow.incident_type_id, order: caseRow.current_stage_order },
        });
        if (!stage) throw new Error('No active stage found for this case');

        if (stage.requires_evidence) {
            const count = await (prisma as any).sOPEvidence.count({ where: { case_id: caseId } });
            if (count === 0) throw new Error(`Evidence must be uploaded before completing "${stage.name}"`);
        }
        if (stage.requires_decision) {
            const count = await (prisma as any).sOPDecision.count({ where: { case_id: caseId } });
            if (count === 0) throw new Error(`A decision must be recorded before completing "${stage.name}"`);
        }

        const stageLog = await (prisma as any).sOPCaseStageLog.findFirst({ where: { case_id: caseId, stage_order: stage.order } });
        await (prisma as any).sOPCaseStageLog.update({
            where: { id: stageLog!.id },
            data: { status: 'completed', completed_at: new Date(), completed_by: actorId, notes: notes?.trim() || stageLog!.notes },
        });

        if (stage.is_terminal) {
            await (prisma as any).sOPCase.update({ where: { id: caseId }, data: { status: 'archived', closed_at: new Date() } });
            SocketService.emitToSchool(schoolId, 'sop:case-updated', { action: 'archived', caseId });
            return this.getCaseDetail(schoolId, caseId);
        }

        await (prisma as any).sOPCase.update({
            where: { id: caseId },
            data: { current_stage_order: caseRow.current_stage_order + 1, status: 'in_progress' },
        });
        return this.cascadeStages(schoolId, branchId, caseId);
    }

    static async getCases(schoolId: string, branchId: string | undefined, filters: { status?: string; incidentTypeId?: string; reportedBy?: string } = {}) {
        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId && branchId !== 'all') where.branch_id = branchId;
        if (filters.status) where.status = filters.status;
        if (filters.incidentTypeId) where.incident_type_id = filters.incidentTypeId;
        if (filters.reportedBy) where.reported_by = filters.reportedBy;

        return (prisma as any).sOPCase.findMany({
            where,
            include: { incident_type: { select: { id: true, name: true, severity: true } } },
            orderBy: { created_at: 'desc' },
        });
    }

    static async getCaseDetail(schoolId: string, caseId: string) {
        const caseRow = await (prisma as any).sOPCase.findFirst({
            where: { id: caseId, school_id: schoolId, deleted_at: null },
            include: {
                incident_type: { include: { stages: { orderBy: { order: 'asc' } } } },
                stage_logs: { orderBy: { stage_order: 'asc' } },
                evidence: { orderBy: { created_at: 'desc' } },
                decisions: { orderBy: { decided_at: 'desc' } },
                letters: { orderBy: { created_at: 'desc' } },
            },
        });
        if (!caseRow) throw new Error('Case not found');
        return caseRow;
    }

    /** A teacher may view a case only if they reported it or are named as involved. */
    static canTeacherViewCase(caseRow: any, teacherId: string, teacherUserId: string): boolean {
        return caseRow.reported_by === teacherUserId || caseRow.involved_teacher_ids.includes(teacherId);
    }

    // ---------- Evidence ----------

    static async addEvidence(schoolId: string, caseId: string, data: any, uploadedBy: string) {
        const caseRow = await (prisma as any).sOPCase.findFirst({ where: { id: caseId, school_id: schoolId, deleted_at: null } });
        if (!caseRow) throw new Error('Case not found');
        if (!data.url) throw new Error('File URL is required');
        return (prisma as any).sOPEvidence.create({
            data: { case_id: caseId, url: data.url, file_type: data.file_type || null, description: data.description?.trim() || null, uploaded_by: uploadedBy },
        });
    }

    // ---------- Decision (with optional auto-link to permanent records) ----------

    static async recordDecision(schoolId: string, branchId: string | undefined, caseId: string, data: any, decidedBy: { id: string; name?: string }) {
        const caseRow = await (prisma as any).sOPCase.findFirst({ where: { id: caseId, school_id: schoolId, deleted_at: null } });
        if (!caseRow) throw new Error('Case not found');
        if (!data.decision_text?.trim()) throw new Error('Decision text is required');

        let linkedType: string | null = null;
        let linkedId: string | null = null;

        if (data.outcome === 'suspension' && data.student_id && data.suspension) {
            const suspension = await SuspensionService.issueSuspension(schoolId, {
                student_id: data.student_id,
                reason: data.decision_text.trim(),
                start_date: data.suspension.start_date,
                return_date: data.suspension.return_date,
                return_conditions: data.suspension.return_conditions,
            }, decidedBy, branchId);
            linkedType = 'suspension';
            linkedId = suspension.id;
        } else if (data.outcome === 'warning' && data.teacher_id) {
            const record = await PersonnelService.createRecord(schoolId, {
                teacher_id: data.teacher_id,
                type: 'warning',
                title: `Warning — ${caseRow.title}`,
                details: data.decision_text.trim(),
            }, decidedBy.id, branchId);
            linkedType = 'teacher_warning';
            linkedId = record.id;
        }

        const decision = await (prisma as any).sOPDecision.create({
            data: {
                case_id: caseId,
                decision_text: data.decision_text.trim(),
                outcome: data.outcome || 'no_action',
                decided_by: decidedBy.id,
                linked_record_type: linkedType,
                linked_record_id: linkedId,
            },
        });
        SocketService.emitToSchool(schoolId, 'sop:case-updated', { action: 'decision', caseId });
        return decision;
    }

    // ---------- Letters ----------

    static async generateLetterDraft(schoolId: string, caseId: string, data: any, generatedBy: string) {
        const caseRow = await this.getCaseDetail(schoolId, caseId);
        const latestDecision = caseRow.decisions[0];
        const draft = [
            `Re: ${caseRow.title}`,
            '',
            `This letter concerns an incident recorded under the school's "${caseRow.incident_type.name}" procedure on ${new Date(caseRow.created_at).toLocaleDateString()}.`,
            '',
            caseRow.description,
            '',
            latestDecision ? `Outcome: ${latestDecision.decision_text}` : '',
            '',
            'Please do not hesitate to contact the school administration should you have any questions.',
        ].filter(Boolean).join('\n');

        return (prisma as any).sOPLetter.create({
            data: {
                case_id: caseId,
                draft_text: draft,
                recipient_type: data.recipient_type || null,
                recipient_id: data.recipient_id || null,
                generated_by: generatedBy,
            },
        });
    }

    static async updateLetter(schoolId: string, letterId: string, data: any) {
        const letter = await (prisma as any).sOPLetter.findFirst({ where: { id: letterId }, include: { case: true } });
        if (!letter || letter.case.school_id !== schoolId) throw new Error('Letter not found');
        if (letter.status === 'sent') throw new Error('This letter has already been sent');
        return (prisma as any).sOPLetter.update({
            where: { id: letterId },
            data: { draft_text: data.draft_text ?? letter.draft_text, recipient_type: data.recipient_type ?? letter.recipient_type, recipient_id: data.recipient_id ?? letter.recipient_id },
        });
    }

    static async sendLetter(schoolId: string, branchId: string | undefined, letterId: string, sentBy: string) {
        const letter = await (prisma as any).sOPLetter.findFirst({ where: { id: letterId }, include: { case: true } });
        if (!letter || letter.case.school_id !== schoolId) throw new Error('Letter not found');
        if (letter.status === 'sent') throw new Error('This letter has already been sent');
        if (!letter.recipient_id) throw new Error('A recipient must be set before sending');

        const updated = await (prisma as any).sOPLetter.update({
            where: { id: letterId },
            data: { status: 'sent', final_text: letter.draft_text, sent_by: sentBy, sent_at: new Date() },
        });

        await NotificationService.createNotification(schoolId, branchId, {
            user_id: letter.recipient_id,
            title: 'Formal Letter Regarding Reported Incident',
            message: `A letter regarding "${letter.case.title}" has been sent to you. Please review it.`,
            category: 'System',
        }).catch((err: any) => console.warn('⚠️ [SOP] letter notification failed:', err.message));

        return updated;
    }
}
