import prisma from '../config/database';
import { SocketService } from './socket.service';

export class VendorService {
    static async getVendors(schoolId: string, branchId: string | undefined) {
        return await prisma.vendor.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            orderBy: { vendor_name: 'asc' }
        });
    }

    static async createVendor(schoolId: string, branchId: string | undefined, data: any) {
        const vendor = await prisma.vendor.create({
            data: {
                school_id: schoolId,
                branch_id: branchId || null,
                vendor_name: data.vendor_name,
                vendor_code: data.vendor_code || null,
                vendor_type: data.vendor_type || null,
                contact_person: data.contact_person || null,
                email: data.email || null,
                phone: data.phone || null,
                rating: parseFloat(data.rating || 0),
                status: data.status || 'Active'
            }
        });

        SocketService.emitToSchool(schoolId, 'infrastructure:updated', { action: 'create_vendor', vendorId: vendor.id });
        return vendor;
    }

    static async updateVendor(id: string, schoolId: string, data: any) {
        const vendor = await prisma.vendor.update({
            where: { id, school_id: schoolId },
            data: {
                vendor_name: data.vendor_name,
                vendor_code: data.vendor_code,
                vendor_type: data.vendor_type,
                contact_person: data.contact_person,
                email: data.email,
                phone: data.phone,
                rating: data.rating !== undefined ? parseFloat(data.rating) : undefined,
                status: data.status
            }
        });

        SocketService.emitToSchool(schoolId, 'infrastructure:updated', { action: 'update_vendor', vendorId: id });
        return vendor;
    }

    static async deleteVendor(id: string, schoolId: string) {
        const result = await prisma.vendor.delete({
            where: { id, school_id: schoolId }
        });

        SocketService.emitToSchool(schoolId, 'infrastructure:updated', { action: 'delete_vendor', vendorId: id });
        return result;
    }
}
