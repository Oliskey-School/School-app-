import prisma from '../config/database';

export class CustomReportService {
    static async getSavedReports(schoolId: string, branchId?: string) {
        return prisma.savedReport.findMany({
            where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createSavedReport(schoolId: string, branchId: string | undefined, data: any) {
        return prisma.savedReport.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId || data.branch_id || null,
            }
        });
    }

    static async deleteSavedReport(schoolId: string, branchId: string | undefined, id: string) {
        return prisma.savedReport.deleteMany({
            where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }
        });
    }
}

export class DataRequestService {
    static async getRequests(schoolId: string, branchId?: string) {
        return prisma.dataRequest.findMany({
            where: {
                school_id: schoolId,
                deleted_at: null,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
            orderBy: { requested_at: 'desc' }
        });
    }

    static async createRequest(schoolId: string, branchId: string | undefined, data: any) {
        return prisma.dataRequest.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                requested_at: new Date()
            }
        });
    }

    static async updateRequestStatus(id: string, schoolId: string, branchId: string | undefined, status: string) {
        const result = await prisma.dataRequest.updateMany({
            where: { id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
            data: {
                status,
                ...(status === 'completed' ? { completed_at: new Date() } : {})
            }
        });
        if (result.count === 0) throw new Error('Data request not found in your school/branch');
        return prisma.dataRequest.findUniqueOrThrow({ where: { id } });
    }
}

export class InvoiceService {
    static async getInvoices(schoolId: string, branchId?: string) {
        return prisma.invoice.findMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
            include: {
                student: {
                    select: {
                        full_name: true,
                        grade: true,
                        section: true,
                        parents: {
                            include: {
                                parent: {
                                    select: { full_name: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { generated_at: 'desc' }
        });
    }

    static async createInvoice(schoolId: string, branchId: string | undefined, data: any) {
        return prisma.invoice.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                generated_at: new Date()
            }
        });
    }

    static async updateInvoiceStatus(id: string, schoolId: string, branchId: string | undefined, status: string) {
        const result = await prisma.invoice.updateMany({
            where: { id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
            data: {
                status,
                ...(status === 'sent' ? { sent_at: new Date() } : {})
            }
        });
        if (result.count === 0) throw new Error('Invoice not found in your school/branch');
        return prisma.invoice.findUniqueOrThrow({ where: { id } });
    }
}

export class SessionService {
    static async getSessions(userId: string) {
        // @ts-ignore
        return prisma.userSession.findMany({
            where: { user_id: userId },
            orderBy: { last_active: 'desc' }
        });
    }

    static async revokeSession(id: string, userId: string, currentSid?: string) {
        // @ts-ignore
        const target = await prisma.userSession.findFirst({ where: { id, user_id: userId } });
        if (!target) throw new Error('Session not found');
        // Defense-in-depth: the frontend already hides the Revoke button for the
        // caller's own live session (session.is_current), but a self-revoke via a
        // direct API call would otherwise delete the session backing the caller's
        // own refresh token — silently logging them out with no recovery.
        if (currentSid && (target as any).token_id === currentSid) {
            throw new Error('Cannot revoke your own active session');
        }
        // @ts-ignore
        return prisma.userSession.delete({
            where: { id, user_id: userId }
        });
    }

    static async revokeAllOtherSessions(userId: string, currentSid?: string) {
        // @ts-ignore
        return prisma.userSession.deleteMany({
            where: {
                user_id: userId,
                // currentSid is the token_id the caller's own session row was created
                // with (see admin-hub.controller#revokeAllOtherSessions) — excluding by
                // the wrong field (row id) here meant "Revoke All Others" always
                // revoked the caller's own live session too, since it never matched.
                ...(currentSid ? { NOT: { token_id: currentSid } } : {})
            }
        });
    }
}

export class AnalyticsService {
    static async getEnrollmentTrends(schoolId: string, branchId?: string) {
        const students = await prisma.student.findMany({
            where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            select: { created_at: true, status: true }
        });

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const trends: any[] = [];

        // Last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthName = months[date.getMonth()];
            const year = date.getFullYear();
            const label = `${monthName} ${year}`;

            const enrolled = students.filter(s => {
                const d = new Date(s.created_at);
                return d.getMonth() === date.getMonth() && d.getFullYear() === year;
            }).length;

            const withdrawn = students.filter(s => {
                const d = new Date(s.created_at);
                return s.status === 'Withdrawn' && d.getMonth() === date.getMonth() && d.getFullYear() === year;
            }).length;

            trends.push({
                month: label,
                enrolled: enrolled,
                withdrawn: withdrawn,
                net: enrolled - withdrawn
            });
        }

        return trends;
    }
}

export class ConsentService {
    static async getConsents(schoolId: string, branchId?: string) {
        // @ts-ignore
        return prisma.parentalConsent.findMany({
            where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            include: {
                student: {
                    select: {
                        full_name: true,
                        grade: true,
                        section: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async updateConsentStatus(id: string, schoolId: string, branchId: string | undefined, status: string) {
        // @ts-ignore
        const result = await prisma.parentalConsent.updateMany({
            where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            data: {
                status,
                ...(status === 'granted' ? { granted_at: new Date() } : {}),
                ...(status === 'revoked' ? { revoked_at: new Date() } : {})
            }
        });
        if (result.count === 0) throw new Error('Consent record not found in your school/branch');
        // @ts-ignore
        return prisma.parentalConsent.findUniqueOrThrow({ where: { id } });
    }
}

export class NotificationSettingService {
    static async getSettings(userId: string) {
        // @ts-ignore
        return prisma.notificationSetting.findUnique({
            where: { user_id: userId }
        });
    }

    static async updateSettings(userId: string, data: any) {
        // Map the flat object from frontend into the categories Json field
        const settingsData = {
            categories: data
        };

        return (prisma.notificationSetting.upsert as any)({
            where: { user_id: userId },
            create: {
                user_id: userId,
                ...settingsData
            },
            update: settingsData
        });
    }
}

export class KanbanService {
    static async getBoard(schoolId: string, branchId?: string) {
        // @ts-ignore
        const columns = await prisma.kanbanColumn.findMany({
            where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            include: {
                tasks: {
                    orderBy: { created_at: 'asc' }
                }
            },
            orderBy: { order: 'asc' }
        });

        // Initialize default columns if board is empty
        if (columns.length === 0) {
            const defaults = [
                { title: 'To Do', color: 'bg-gray-400', order: 0 },
                { title: 'In Progress', color: 'bg-blue-500', order: 1 },
                { title: 'Review', color: 'bg-amber-500', order: 2 },
                { title: 'Done', color: 'bg-emerald-500', order: 3 }
            ];

            for (const d of defaults) {
                // @ts-ignore
                await prisma.kanbanColumn.create({
                    data: { school_id: schoolId, branch_id: branchId || null, ...d }
                });
            }

            // @ts-ignore
            return prisma.kanbanColumn.findMany({
                where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
                include: { tasks: true },
                orderBy: { order: 'asc' }
            });
        }

        return columns;
    }

    static async createTask(columnId: string, schoolId: string, branchId: string | undefined, data: any) {
        // A column belongs to exactly one tenant — confirm the caller's tenant
        // owns it before attaching a task, otherwise a task (and its column_id
        // pointer) could be created against another school/branch's board.
        // @ts-ignore
        const column = await prisma.kanbanColumn.findFirst({
            where: { id: columnId, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            select: { id: true }
        });
        if (!column) throw new Error('Board column not found in your school/branch');

        // @ts-ignore
        return prisma.kanbanTask.create({
            data: {
                column_id: columnId,
                school_id: schoolId,
                branch_id: branchId || null,
                ...data
            }
        });
    }

    static async moveTask(taskId: string, targetColumnId: string, schoolId: string, branchId: string | undefined) {
        // @ts-ignore
        const [task, targetColumn] = await Promise.all([
            prisma.kanbanTask.findFirst({ where: { id: taskId, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }, select: { id: true } }),
            // @ts-ignore
            prisma.kanbanColumn.findFirst({ where: { id: targetColumnId, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }, select: { id: true } }),
        ]);
        if (!task || !targetColumn) throw new Error('Task or target column not found in your school/branch');

        // @ts-ignore
        return prisma.kanbanTask.update({
            where: { id: taskId },
            data: { column_id: targetColumnId }
        });
    }

    static async deleteTask(taskId: string, schoolId: string, branchId: string | undefined) {
        // @ts-ignore
        const result = await prisma.kanbanTask.deleteMany({
            where: { id: taskId, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }
        });
        if (result.count === 0) throw new Error('Task not found in your school/branch');
        return { success: true };
    }
}

export class HealthService {
    static async getHealthLogs(schoolId: string, branchId: string | undefined, studentId?: string) {
        // @ts-ignore
        return prisma.healthLog.findMany({
            where: {
                school_id: schoolId,
                ...(branchId ? { branch_id: branchId } : {}),
                ...(studentId ? { student_id: studentId } : {})
            },
            include: {
                student: {
                    select: { full_name: true }
                }
            },
            orderBy: { logged_date: 'desc' }
        });
    }

    static async createHealthLog(schoolId: string, branchId: string | undefined, data: any) {
        const { student_id, description, ...rest } = data;
        return prisma.healthLog.create({
            data: {
                ...rest,
                school_id: schoolId,
                branch_id: branchId || null,
                logged_date: data.logged_date ? new Date(data.logged_date) : new Date(),
                notes: description,
                ...(student_id ? { student: { connect: { id: student_id } } } : {})
            }
        });
    }

    static async updateHealthLog(id: string, schoolId: string, branchId: string | undefined, data: any) {
        // @ts-ignore
        const result = await prisma.healthLog.updateMany({
            where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            data: {
                ...data,
                updated_at: new Date()
            }
        });
        if (result.count === 0) throw new Error('Health log not found in your school/branch');
        // @ts-ignore
        return prisma.healthLog.findUniqueOrThrow({ where: { id } });
    }
    static async deleteHealthLog(id: string, schoolId: string, branchId?: string) {
        // @ts-ignore
        return prisma.healthLog.deleteMany({
            where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }
        });
    }
}

export class SafetyService {
    static async getEmergencyAlerts(schoolId: string, branchId?: string) {
        // @ts-ignore
        return prisma.emergencyAlert.findMany({
            where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            orderBy: { sent_at: 'desc' }
        });
    }

    static async createEmergencyAlert(schoolId: string, branchId: string | undefined, data: any) {
        // @ts-ignore
        return prisma.emergencyAlert.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId || null,
                sent_at: new Date()
            }
        });
    }

    static async updateEmergencyAlert(id: string, schoolId: string, branchId: string | undefined, data: any) {
        // @ts-ignore
        const result = await prisma.emergencyAlert.updateMany({
            where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            data: {
                ...data,
                sent_at: data.sent_at ? new Date(data.sent_at) : undefined
            }
        });
        if (result.count === 0) throw new Error('Emergency alert not found in your school/branch');
        // @ts-ignore
        return prisma.emergencyAlert.findUniqueOrThrow({ where: { id } });
    }

    static async getHealthIncidents(schoolId: string, branchId?: string) {
        // @ts-ignore
        return prisma.healthIncident.findMany({
            where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            include: {
                student: {
                    select: { full_name: true }
                }
            },
            orderBy: { incident_date: 'desc' }
        });
    }

    // The incident form collects a separate date and time; HealthIncident only
    // has a single incident_date column, so fold the time into it here rather
    // than passing an incident_time field Prisma doesn't recognize.
    private static combineIncidentDate(incident_date?: string, incident_time?: string): Date | undefined {
        if (!incident_date) return undefined;
        return incident_time ? new Date(`${incident_date}T${incident_time}:00`) : new Date(incident_date);
    }

    static async createHealthIncident(schoolId: string, branchId: string | undefined, data: any) {
        const { student_id, incident_type, description, action_taken, location, severity, reported_by, witnesses, parent_notified, status, incident_date, incident_time } = data;
        return prisma.healthIncident.create({
            data: {
                student_id, incident_type, description, action_taken, location, severity, reported_by, witnesses, parent_notified, status,
                school_id: schoolId,
                branch_id: branchId || null,
                incident_date: this.combineIncidentDate(incident_date, incident_time) || new Date(),
            }
        });
    }

    static async updateHealthIncident(id: string, schoolId: string, branchId: string | undefined, data: any) {
        const { student_id, incident_type, description, action_taken, location, severity, reported_by, witnesses, parent_notified, status, incident_date, incident_time } = data;
        const result = await prisma.healthIncident.updateMany({
            where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            data: {
                student_id, incident_type, description, action_taken, location, severity, reported_by, witnesses, parent_notified, status,
                incident_date: this.combineIncidentDate(incident_date, incident_time),
            }
        });
        if (result.count === 0) throw new Error('Health incident not found in your school/branch');
        return prisma.healthIncident.findUniqueOrThrow({ where: { id } });
    }

    // The frontend's Drill form/list (components/admin/SafetyHealthLogs.tsx) uses
    // duration_minutes/participants_count/success_rating, but the actual columns
    // are duration/participants/outcome — map both directions here rather than
    // spreading the raw request body into Prisma (which crashed with "Unknown
    // argument" since those frontend names aren't real columns).
    private static mapDrillToFrontend(drill: any) {
        const { duration, participants, outcome, ...rest } = drill;
        return {
            ...rest,
            duration_minutes: duration,
            participants_count: participants,
            success_rating: outcome,
        };
    }

    static async getEmergencyDrills(schoolId: string, branchId?: string) {
        // @ts-ignore
        const drills = await prisma.emergencyDrill.findMany({
            where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            orderBy: { drill_date: 'desc' }
        });
        return drills.map((d: any) => this.mapDrillToFrontend(d));
    }

    static async createEmergencyDrill(schoolId: string, branchId: string | undefined, data: any) {
        const { duration_minutes, participants_count, success_rating, drill_type, drill_date, start_time, end_time, notes, conducted_by } = data;
        // @ts-ignore
        const drill = await prisma.emergencyDrill.create({
            data: {
                drill_type,
                start_time,
                end_time,
                notes,
                conducted_by,
                duration: duration_minutes,
                participants: participants_count != null ? String(participants_count) : undefined,
                outcome: success_rating,
                school_id: schoolId,
                branch_id: branchId || data.branch_id || null,
                drill_date: drill_date ? new Date(drill_date) : new Date()
            }
        });
        return this.mapDrillToFrontend(drill);
    }

    static async getSafeguardingPolicies(schoolId: string, branchId?: string) {
        // @ts-ignore
        return prisma.safeguardingPolicy.findMany({
            where: {
                school_id: schoolId,
                deleted_at: null,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
            orderBy: { effective_date: 'desc' }
        });
    }

    static async createSafeguardingPolicy(schoolId: string, branchId: string | undefined, data: any) {
        // @ts-ignore
        return prisma.safeguardingPolicy.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                effective_date: data.effective_date ? new Date(data.effective_date) : new Date(),
                review_date: data.review_date ? new Date(data.review_date) : null
            }
        });
    }

    static async updateSafeguardingPolicy(id: string, schoolId: string, branchId: string | undefined, data: any) {
        // @ts-ignore
        const result = await prisma.safeguardingPolicy.updateMany({
            where: { id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
            data: {
                ...data,
                effective_date: data.effective_date ? new Date(data.effective_date) : undefined,
                review_date: data.review_date ? new Date(data.review_date) : undefined
            }
        });
        if (result.count === 0) throw new Error('Policy not found in your school/branch');
        // @ts-ignore
        return prisma.safeguardingPolicy.findUniqueOrThrow({ where: { id } });
    }
}

export class GovernanceService {
    static async getGovernanceStats(schoolId: string, branchId?: string) {
        // @ts-ignore
        const [students, teachers, policies, inspections] = await Promise.all([
            // @ts-ignore
            prisma.student.count({ where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) } }),
            // @ts-ignore
            prisma.teacher.count({ where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) } }),
            // @ts-ignore
            prisma.schoolPolicy.count({ where: { school_id: schoolId } }),
            // @ts-ignore
            prisma.inspection.count({ where: { school_id: schoolId } })
        ]);

        return { students, teachers, policies, inspections };
    }

    static async getComplianceMetrics(schoolId: string) {
        // Since we don't have a concrete vw_compliance_metrics view accessible via Prisma,
        // we're mocking these values for demonstration. In a real-world scenario, you might
        // calculate these dynamically based on the number of completed inspections, resolved
        // safety issues, and up-to-date policies.
        return {
            facilities_score: 94,
            equipment_score: 100,
            safety_score: 88,
            safeguarding_score: 96
        };
    }

    static async getValidationAuditCount(schoolId: string) {
        // @ts-ignore
        return prisma.userSession.count({ where: { school_id: schoolId } });
    }
}
