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

    static async updateUser(school_id: string, branch_id: string | undefined, userId: string, updates: any) {
        return await prisma.user.update({
            where: { id: userId },
            data: updates
        });
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
