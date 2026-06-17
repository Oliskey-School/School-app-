import prisma from '../config/database';
import { BranchIdentityService } from './branchIdentity.service';

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
            school_id: schoolId,
            AND: [] as any[],
        };

        if (branchId && branchId !== 'all') {
            // A user belongs to a branch if it's their primary branch OR they were
            // assigned to it (allowed_branch_ids — e.g. a multi-branch teacher). This
            // makes User Accounts match the Total Staff count for the branch.
            where.AND.push({
                OR: [
                    { branch_id: branchId },
                    { allowed_branch_ids: { has: branchId } },
                ],
            });
        }

        if (role) {
            where.role = role;
        }

        if (term) {
            where.AND.push({
                OR: [
                    { full_name: { contains: term, mode: 'insensitive' } },
                    { email: { contains: term, mode: 'insensitive' } },
                ],
            });
        }

        if (where.AND.length === 0) delete where.AND;

        const users = await prisma.user.findMany({
            where,
            orderBy: { full_name: 'asc' }
        });

        // Show each account's Global ID FOR THE ACTIVE BRANCH: a user merely
        // ASSIGNED to this branch (primary elsewhere) displays this branch's id,
        // never their home/Main id.
        const scoped = branchId && branchId !== 'all';
        // SEQUENTIAL on purpose: per-branch ids are allocated one-by-one so each
        // reservation is visible to the next user. Resolving in parallel (Promise.all)
        // let several users grab the SAME number — the cause of duplicate IDs.
        const out: any[] = [];
        for (const u of users as any[]) {
            if (scoped && u.branch_id !== branchId && u.school_generated_id) {
                try {
                    const id = await BranchIdentityService.resolveForUser(
                        { id: u.id, school_id: u.school_id, branch_id: u.branch_id, school_generated_id: u.school_generated_id, role: u.role },
                        branchId as string
                    );
                    out.push({ ...u, school_generated_id: id });
                    continue;
                } catch { /* fall through to raw user */ }
            }
            out.push(u);
        }
        return out;
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

        // The id may be the UUID primary key OR the readable school_generated_id (e.g.
        // OLISKEY_MAIN_ADM_0001 — demo tokens carry the readable id). Match either.
        // STRICT tenant scoping: only update if the target user belongs to the caller's school.
        const where = { OR: [{ id: userId }, { school_generated_id: userId }], school_id };
        const result = await prisma.user.updateMany({ where, data });

        if (result.count === 0) {
            throw new Error('User not found or access denied');
        }

        return await prisma.user.findFirst({ where });
    }

    /**
     * Self-service profile update. Persists name/phone/avatar to the core `users`
     * row AND keeps the role-specific profile (teacher/parent/student) in sync, so
     * the data shows everywhere (header avatar reads users.avatar_url; lists read
     * the profile table). Field aliases from the frontend are normalised.
     */
    static async updateMyProfile(userId: string, schoolId: string, updates: any) {
        const full_name = updates.full_name ?? updates.name;
        const avatar_url = updates.avatar_url ?? updates.avatarUrl;
        const phone = updates.phone;

        const userData: any = {};
        if (full_name !== undefined) userData.full_name = full_name;
        if (avatar_url !== undefined) userData.avatar_url = avatar_url;
        if (phone !== undefined) userData.phone = phone;

        if (Object.keys(userData).length > 0) {
            const result = await prisma.user.updateMany({
                where: { id: userId, school_id: schoolId },
                data: userData,
            });
            if (result.count === 0) {
                throw Object.assign(new Error('Profile not found'), { status: 404 });
            }
        }

        // Keep the role-specific profile in sync.
        const target = await prisma.user.findFirst({ where: { id: userId, school_id: schoolId }, select: { role: true } });
        const role = (target?.role || '').toLowerCase();
        const profileData: any = {};
        if (full_name !== undefined) profileData.full_name = full_name;
        if (avatar_url !== undefined) profileData.avatar_url = avatar_url;
        if (phone !== undefined) profileData.phone = phone;

        if (Object.keys(profileData).length > 0) {
            try {
                if (role === 'teacher') {
                    await prisma.teacher.updateMany({ where: { user_id: userId }, data: profileData });
                } else if (role === 'parent') {
                    await prisma.parent.updateMany({ where: { user_id: userId }, data: profileData });
                } else if (role === 'student') {
                    const { phone: _omitPhone, ...studentData } = profileData; // Student has no phone column
                    await prisma.student.updateMany({ where: { user_id: userId }, data: studentData });
                }
            } catch (err: any) {
                console.warn('[UserService] profile-table sync skipped:', err?.message);
            }
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
