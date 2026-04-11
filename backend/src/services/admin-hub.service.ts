import prisma from '../config/database';

export class CustomReportService {
    static async getSavedReports(schoolId: string) {
        return prisma.savedReport.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createSavedReport(schoolId: string, data: any) {
        return prisma.savedReport.create({
            data: {
                ...data,
                school_id: schoolId
            }
        });
    }

    static async deleteSavedReport(schoolId: string, id: string) {
        return prisma.savedReport.delete({
            where: { id, school_id: schoolId }
        });
    }
}

export class DataRequestService {
    static async getRequests(schoolId: string) {
        return prisma.dataRequest.findMany({
            where: { school_id: schoolId },
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

    static async updateRequestStatus(id: string, status: string) {
        return prisma.dataRequest.update({
            where: { id },
            data: { 
                status,
                ...(status === 'completed' ? { completed_at: new Date() } : {})
            }
        });
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

    static async updateInvoiceStatus(id: string, status: string) {
        return prisma.invoice.update({
            where: { id },
            data: { 
                status,
                ...(status === 'sent' ? { sent_at: new Date() } : {})
            }
        });
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

    static async revokeSession(id: string, userId: string) {
        // @ts-ignore
        return prisma.userSession.delete({
            where: { id, user_id: userId }
        });
    }

    static async revokeAllOtherSessions(userId: string, currentSessionId?: string) {
        // @ts-ignore
        return prisma.userSession.deleteMany({
            where: {
                user_id: userId,
                ...(currentSessionId ? { NOT: { id: currentSessionId } } : {})
            }
        });
    }
}

export class AnalyticsService {
    static async getEnrollmentTrends(schoolId: string) {
        const students = await prisma.student.findMany({
            where: { school_id: schoolId },
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
    static async getConsents(schoolId: string) {
        // @ts-ignore
        return prisma.parentalConsent.findMany({
            where: { school_id: schoolId },
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

    static async updateConsentStatus(id: string, status: string) {
        // @ts-ignore
        return prisma.parentalConsent.update({
            where: { id },
            data: { 
                status,
                ...(status === 'granted' ? { granted_at: new Date() } : {}),
                ...(status === 'revoked' ? { revoked_at: new Date() } : {})
            }
        });
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
        // @ts-ignore
        return prisma.notificationSetting.upsert({
            where: { user_id: userId },
            create: {
                user_id: userId,
                ...data
            },
            update: data
        });
    }
}

export class KanbanService {
    static async getBoard(schoolId: string) {
        // @ts-ignore
        const columns = await prisma.kanbanColumn.findMany({
            where: { school_id: schoolId },
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
                    data: { school_id: schoolId, ...d }
                });
            }

            // @ts-ignore
            return prisma.kanbanColumn.findMany({
                where: { school_id: schoolId },
                include: { tasks: true },
                orderBy: { order: 'asc' }
            });
        }

        return columns;
    }

    static async createTask(columnId: string, data: any) {
        // @ts-ignore
        return prisma.kanbanTask.create({
            data: {
                column_id: columnId,
                ...data
            }
        });
    }

    static async moveTask(taskId: string, targetColumnId: string) {
        // @ts-ignore
        return prisma.kanbanTask.update({
            where: { id: taskId },
            data: { column_id: targetColumnId }
        });
    }

    static async deleteTask(taskId: string) {
        // @ts-ignore
        return prisma.kanbanTask.delete({
            where: { id: taskId }
        });
    }
}

export class HealthService {
    static async getHealthLogs(schoolId: string, studentId?: string) {
        // @ts-ignore
        return prisma.healthLog.findMany({
            where: {
                school_id: schoolId,
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

    static async createHealthLog(schoolId: string, data: any) {
        // @ts-ignore
        return prisma.healthLog.create({
            data: {
                ...data,
                school_id: schoolId,
                logged_date: data.logged_date ? new Date(data.logged_date) : new Date()
            }
        });
    }

    static async updateHealthLog(id: string, data: any) {
        // @ts-ignore
        return prisma.healthLog.update({
            where: { id },
            data: {
                ...data,
                updated_at: new Date()
            }
        });
    }
}

export class SafetyService {
    static async getEmergencyAlerts(schoolId: string) {
        // @ts-ignore
        return prisma.emergencyAlert.findMany({
            where: { school_id: schoolId },
            orderBy: { sent_at: 'desc' }
        });
    }

    static async createEmergencyAlert(schoolId: string, data: any) {
        // @ts-ignore
        return prisma.emergencyAlert.create({
            data: {
                ...data,
                school_id: schoolId,
                sent_at: new Date()
            }
        });
    }

    static async updateEmergencyAlert(id: string, data: any) {
        // @ts-ignore
        return prisma.emergencyAlert.update({
            where: { id },
            data: {
                ...data,
                sent_at: data.sent_at ? new Date(data.sent_at) : undefined
            }
        });
    }

    static async getHealthIncidents(schoolId: string) {
        // @ts-ignore
        return prisma.healthIncident.findMany({
            where: { school_id: schoolId },
            include: {
                student: {
                    select: { full_name: true }
                }
            },
            orderBy: { incident_date: 'desc' }
        });
    }

    static async createHealthIncident(schoolId: string, data: any) {
        // @ts-ignore
        return prisma.healthIncident.create({
            data: {
                ...data,
                school_id: schoolId,
                incident_date: data.incident_date ? new Date(data.incident_date) : new Date()
            }
        });
    }

    static async updateHealthIncident(id: string, data: any) {
        // @ts-ignore
        return prisma.healthIncident.update({
            where: { id },
            data: {
                ...data,
                incident_date: data.incident_date ? new Date(data.incident_date) : undefined
            }
        });
    }

    static async getEmergencyDrills(schoolId: string) {
        // @ts-ignore
        return prisma.emergencyDrill.findMany({
            where: { school_id: schoolId },
            orderBy: { drill_date: 'desc' }
        });
    }

    static async createEmergencyDrill(schoolId: string, data: any) {
        // @ts-ignore
        return prisma.emergencyDrill.create({
            data: {
                ...data,
                school_id: schoolId,
                drill_date: data.drill_date ? new Date(data.drill_date) : new Date()
            }
        });
    }

    static async getSafeguardingPolicies(schoolId: string) {
        // @ts-ignore
        return prisma.safeguardingPolicy.findMany({
            where: { school_id: schoolId },
            orderBy: { effective_date: 'desc' }
        });
    }

    static async createSafeguardingPolicy(schoolId: string, data: any) {
        // @ts-ignore
        return prisma.safeguardingPolicy.create({
            data: {
                ...data,
                school_id: schoolId,
                effective_date: data.effective_date ? new Date(data.effective_date) : new Date(),
                review_date: data.review_date ? new Date(data.review_date) : null
            }
        });
    }

    static async updateSafeguardingPolicy(id: string, data: any) {
        // @ts-ignore
        return prisma.safeguardingPolicy.update({
            where: { id },
            data: {
                ...data,
                effective_date: data.effective_date ? new Date(data.effective_date) : undefined,
                review_date: data.review_date ? new Date(data.review_date) : undefined
            }
        });
    }
}

export class GovernanceService {
    static async getGovernanceStats(schoolId: string) {
        // @ts-ignore
        const [students, teachers, policies, inspections] = await Promise.all([
            // @ts-ignore
            prisma.student.count({ where: { school_id: schoolId } }),
            // @ts-ignore
            prisma.teacher.count({ where: { school_id: schoolId } }),
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

