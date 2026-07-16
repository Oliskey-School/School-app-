import prisma from '../config/database';

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfToday(): Date {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
}

export class DigitalTwinService {
    /** Live snapshot of the school right now — pulled from data that already
     * exists elsewhere (attendance, fees, maintenance, visitors, risk flags),
     * not a separately-tracked "twin" state. Buses and % classes running are
     * best-effort estimates, clearly labeled as such, since there's no GPS or
     * live-headcount source to draw on. */
    static async getSnapshot(schoolId: string, branchId: string | undefined) {
        const today = todayStr();
        const dow = new Date().getDay() === 0 ? 7 : new Date().getDay();
        const branchWhere = branchId && branchId !== 'all' ? { branch_id: branchId } : {};

        const [
            studentsPresent, teachersPresent, teachersAbsent, busesActive,
            openMaintenanceTickets, unpaidFeesToday, medicalIncidentsToday,
            visitorsOnCampus, activeRiskAlerts, scheduledPeriodsToday, coveredOrTaughtPeriods,
        ] = await Promise.all([
            prisma.attendance.count({ where: { school_id: schoolId, ...branchWhere, date: new Date(today), status: 'Present' } }),
            (prisma as any).teacherAttendance.count({ where: { school_id: schoolId, ...branchWhere, date: today, status: 'Present' } }),
            (prisma as any).teacherAttendance.count({ where: { school_id: schoolId, ...branchWhere, date: today, status: 'Absent' } }),
            prisma.transportBus.count({ where: { school_id: schoolId, ...branchWhere, status: 'active', deleted_at: null } }),
            (prisma as any).maintenanceTicket.count({ where: { school_id: schoolId, ...branchWhere, status: { in: ['Pending', 'In Progress'] }, deleted_at: null } }),
            prisma.studentFee.count({ where: { school_id: schoolId, ...branchWhere, status: { not: 'Paid' }, due_date: { lte: endOfToday() }, deleted_at: null } }),
            (prisma as any).healthIncident.count({ where: { school_id: schoolId, ...branchWhere, incident_date: { gte: startOfToday(), lte: endOfToday() } } }),
            (prisma as any).visitorLog.count({ where: { school_id: schoolId, ...branchWhere, check_out: null } }),
            (prisma as any).studentRiskFlag.count({ where: { school_id: schoolId, ...branchWhere, status: 'Active' } }),
            prisma.timetable.count({ where: { school_id: schoolId, ...branchWhere, day_of_week: dow, status: 'Published', deleted_at: null } }),
            // A period "runs" if its own teacher isn't marked Absent today, OR a substitute has been Assigned/Accepted for it.
            prisma.timetable.count({
                where: {
                    school_id: schoolId, ...branchWhere, day_of_week: dow, status: 'Published', deleted_at: null,
                    OR: [
                        { teacher_id: null },
                        { teacher: { attendance: { none: { date: today, status: 'Absent' } } } },
                        { substitute_assignments: { some: { date: new Date(today), status: { in: ['Assigned', 'Accepted'] } } } },
                    ],
                },
            }),
        ]);

        const classesRunningPct = scheduledPeriodsToday > 0 ? Math.round((coveredOrTaughtPeriods / scheduledPeriodsToday) * 100) : 100;

        return {
            students_present: studentsPresent,
            teachers_present: teachersPresent,
            teachers_absent: teachersAbsent,
            buses_active: busesActive,
            open_maintenance_requests: openMaintenanceTickets,
            unpaid_fees_today: unpaidFeesToday,
            medical_incidents_today: medicalIncidentsToday,
            visitors_on_campus: visitorsOnCampus,
            classes_running_pct: classesRunningPct,
            ai_alerts: activeRiskAlerts,
            generated_at: new Date().toISOString(),
            estimates: ['buses_active', 'classes_running_pct'],
        };
    }
}
