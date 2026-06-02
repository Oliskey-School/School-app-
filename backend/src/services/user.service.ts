import prisma from '../config/database';

export class UserService {
    static async createUser(schoolId: string, branchId: string | undefined, data: any) {
        return await prisma.user.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId || data.branch_id
            }
        });
    }

    static async getUsers(schoolId: string, branchId: string | undefined, role?: string, term?: string) {
        const where: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        if (role) {
            where.role = role;
        }

        if (term) {
            where.OR = [
                { full_name: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } }
            ];
        }

        return await prisma.user.findMany({
            where,
            orderBy: { full_name: 'asc' }
        });
    }

    static async getUserById(schoolId: string, branchId: string | undefined, userId: string) {
        return await prisma.user.findFirst({
            where: {
                id: userId,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            }
        });
    }

    // Fields that must never be set through the generic update endpoint.
    // Role/tenant/credential changes require dedicated, audited admin flows.
    private static readonly FORBIDDEN_UPDATE_FIELDS = [
        'id', 'role', 'school_id', 'password_hash', 'password',
        'email_verified', 'initial_password', 'two_factor_secret',
        'two_factor_enabled', 'created_at', 'updated_at'
    ];

    static async updateUser(school_id: string, branch_id: string | undefined, userId: string, updates: any) {
        // Strip dangerous fields (mass-assignment / privilege-escalation protection)
        const data: any = { ...updates };
        for (const field of UserService.FORBIDDEN_UPDATE_FIELDS) {
            delete data[field];
        }

        // STRICT tenant scoping: only update if the target user belongs to the caller's school.
        const result = await prisma.user.updateMany({
            where: { id: userId, school_id },
            data
        });

        if (result.count === 0) {
            throw new Error('User not found or access denied');
        }

        return await prisma.user.findUnique({ where: { id: userId } });
    }

    static async getUserByEmail(schoolId: string, email: string) {
        return await prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                school_id: schoolId
            }
        });
    }

    static async deleteUser(schoolId: string, userId: string) {
        return await prisma.user.delete({
            where: {
                id: userId,
                school_id: schoolId
            }
        });
    }
}
