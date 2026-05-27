import prisma from '../config/database';

export class RoleService {
    static async getRolePermissions(schoolId: string) {
        return prisma.rolePermission.findMany({
            where: { school_id: schoolId }
        });
    }

    static async updateRolePermission(schoolId: string, role: string, permissionId: string, enabled: boolean) {
        return prisma.rolePermission.upsert({
            where: {
                school_id_role_permission_id: {
                    school_id: schoolId,
                    role: role,
                    permission_id: permissionId
                }
            },
            update: { enabled },
            create: {
                school_id: schoolId,
                role: role,
                permission_id: permissionId,
                enabled
            }
        });
    }
}
