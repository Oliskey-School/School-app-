import prisma from '../config/database';
import { NotificationService } from './notification.service';
import { SocketService } from './socket.service';

export class DepartureService {
    // ---- Authorized pickup persons (parent-managed) ----

    static async getAuthorizedPersons(schoolId: string, studentId: string) {
        return (prisma as any).authorizedPickupPerson.findMany({
            where: { school_id: schoolId, student_id: studentId, is_active: true },
            orderBy: { created_at: 'asc' },
        });
    }

    static async addAuthorizedPerson(schoolId: string, branchId: string | undefined, studentId: string, data: any, addedBy: string) {
        if (!data.name?.trim()) throw new Error('A name is required');
        if (!data.relationship?.trim()) throw new Error('A relationship is required');
        return (prisma as any).authorizedPickupPerson.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                student_id: studentId, name: data.name.trim(), relationship: data.relationship.trim(),
                phone: data.phone?.trim() || null, photo_url: data.photo_url || null, added_by: addedBy,
            },
        });
    }

    static async removeAuthorizedPerson(schoolId: string, id: string) {
        const person = await (prisma as any).authorizedPickupPerson.findFirst({ where: { id, school_id: schoolId } });
        if (!person) throw new Error('Authorized person not found');
        return (prisma as any).authorizedPickupPerson.update({ where: { id }, data: { is_active: false } });
    }

    // ---- Departures (routine end-of-day pickup or mid-day early dismissal) ----

    static async requestDeparture(schoolId: string, branchId: string | undefined, data: any, requestedBy: string) {
        if (!data.student_id) throw new Error('A student is required');
        if (!['EndOfDay', 'EarlyDismissal'].includes(data.type)) throw new Error('type must be EndOfDay or EarlyDismissal');

        let pickupPersonName = data.pickup_person_name?.trim() || null;
        let isAuthorized = false;
        if (data.pickup_person_id) {
            const person = await (prisma as any).authorizedPickupPerson.findFirst({
                where: { id: data.pickup_person_id, school_id: schoolId, student_id: data.student_id, is_active: true },
            });
            if (!person) throw new Error('That pickup person is not on the authorized list for this student');
            pickupPersonName = person.name;
            isAuthorized = true;
        }

        const requiresApproval = data.type === 'EarlyDismissal';
        const departure = await (prisma as any).studentDeparture.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                student_id: data.student_id, type: data.type,
                pickup_person_id: data.pickup_person_id || null, pickup_person_name: pickupPersonName,
                is_authorized: isAuthorized, reason: data.reason?.trim() || null,
                status: requiresApproval ? 'Pending' : 'Approved',
                requested_by: requestedBy,
            },
        });

        if (requiresApproval) {
            const student = await prisma.student.findUnique({ where: { id: data.student_id }, select: { full_name: true } });
            const admins = await prisma.user.findMany({
                where: { school_id: schoolId, role: { in: ['ADMIN', 'PROPRIETOR'] as any } },
                select: { id: true },
            });
            for (const admin of admins) {
                await NotificationService.createNotification(schoolId, branchId, {
                    user_id: admin.id, title: 'Gate Pass Requested',
                    message: `Early dismissal requested for ${student?.full_name || 'a student'}${departure.reason ? `: ${departure.reason}` : ''}.`,
                    category: 'System',
                }).catch(err => console.warn('⚠️ [Departure] admin notify failed:', err.message));
            }
        }

        SocketService.emitToSchool(schoolId, 'departure:updated', { departureId: departure.id, status: departure.status });
        return departure;
    }

    static async approveDeparture(schoolId: string, id: string, approverId: string) {
        const departure = await (prisma as any).studentDeparture.findFirst({ where: { id, school_id: schoolId } });
        if (!departure) throw new Error('Departure request not found');
        if (departure.status !== 'Pending') throw new Error('This request has already been actioned');
        const updated = await (prisma as any).studentDeparture.update({ where: { id }, data: { status: 'Approved', approved_by: approverId } });
        SocketService.emitToSchool(schoolId, 'departure:updated', { departureId: id, status: 'Approved' });
        return updated;
    }

    static async denyDeparture(schoolId: string, id: string, approverId: string) {
        const departure = await (prisma as any).studentDeparture.findFirst({ where: { id, school_id: schoolId } });
        if (!departure) throw new Error('Departure request not found');
        if (departure.status !== 'Pending') throw new Error('This request has already been actioned');
        const updated = await (prisma as any).studentDeparture.update({ where: { id }, data: { status: 'Denied', approved_by: approverId } });
        SocketService.emitToSchool(schoolId, 'departure:updated', { departureId: id, status: 'Denied' });
        return updated;
    }

    /** Staff at the gate confirms the identity of whoever is collecting the
     * student — this is the actual hand-off, separate from the (optional)
     * early-dismissal approval step. */
    static async confirmDeparture(schoolId: string, id: string, confirmerId: string) {
        const departure = await (prisma as any).studentDeparture.findFirst({ where: { id, school_id: schoolId } });
        if (!departure) throw new Error('Departure request not found');
        if (departure.status === 'Denied') throw new Error('This departure was denied and cannot be completed');
        if (departure.status === 'Completed') throw new Error('This departure has already been completed');
        if (departure.type === 'EarlyDismissal' && departure.status !== 'Approved') throw new Error('This early dismissal has not been approved yet');

        const updated = await (prisma as any).studentDeparture.update({
            where: { id },
            data: { status: 'Completed', confirmed_by: confirmerId, departure_time: new Date() },
        });
        SocketService.emitToSchool(schoolId, 'departure:updated', { departureId: id, status: 'Completed' });
        return updated;
    }

    static async getDepartures(schoolId: string, branchId: string | undefined, filters: { status?: string; studentId?: string } = {}) {
        const where: any = { school_id: schoolId };
        if (branchId && branchId !== 'all') where.branch_id = branchId;
        if (filters.status) where.status = filters.status;
        if (filters.studentId) where.student_id = filters.studentId;

        const rows = await (prisma as any).studentDeparture.findMany({ where, orderBy: { created_at: 'desc' } });
        const studentIds = Array.from(new Set(rows.map((r: any) => r.student_id)));
        const students = await prisma.student.findMany({ where: { id: { in: studentIds as string[] } }, select: { id: true, full_name: true } });
        const studentMap = new Map(students.map(s => [s.id, s.full_name]));
        return rows.map((r: any) => ({ ...r, student_name: studentMap.get(r.student_id) || 'Unknown' }));
    }
}
