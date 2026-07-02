import prisma from '../config/database';
import { IdGeneratorService } from './idGenerator.service';
import { getDemoSessionRoot } from '../utils/branchScope';

/**
 * Branch transfer / assignment + authorized-branch resolution.
 *
 * Only the MAIN branch administrator (admin with no fixed branch), a proprietor,
 * or a super admin may transfer users or change branch assignments.
 *
 * Transferring a user to a different PRIMARY branch regenerates their
 * school_generated_id for the new branch (per owner decision). Assigning a
 * teacher an ADDITIONAL branch (allowed_branch_ids) leaves their primary branch
 * and ID untouched.
 */

export function isMainAdmin(user: any): boolean {
    const role = (user?.role || '').toLowerCase();
    if (role === 'superadmin' || role === 'proprietor') return true;
    // Main school admin = admin with NO fixed branch OR pinned to the Main Branch
    // (onboarding pins the owner admin to Main; is_main_admin is set by auth mw).
    return role === 'admin' && (!user?.branch_id || !!user?.is_main_admin);
}

/**
 * Branches the caller is authorized to see/operate in.
 *  - Unrestricted users (main admin / super admin / proprietor): all school branches.
 *  - Branch-scoped users (branch admin, teacher, etc.): primary + allowed_branch_ids.
 */
export async function getAuthorizedBranches(user: any) {
    const schoolId = user.school_id;
    if (!schoolId) return [];

    if (String(user.role || '').toUpperCase() === 'TEACHER') {
        // Always read allowed_branch_ids FRESH from the DB teacher record.
        // The JWT copy goes stale the moment an admin edits the teacher's branch
        // assignments without the teacher re-logging in — using user.allowed_branch_ids
        // (JWT) would surface phantom branches the admin already removed.
        const teacher: any = await prisma.teacher.findFirst({
            where: { user_id: user.id },
            select: { allowed_branch_ids: true },
        });
        const ids = new Set<string>();
        if (user.branch_id) ids.add(user.branch_id);   // home branch (stable)
        for (const b of (teacher?.allowed_branch_ids || [])) if (b) ids.add(b);
        if (ids.size === 0) return [];
        return prisma.branch.findMany({
            where: { school_id: schoolId, id: { in: Array.from(ids) } },
            orderBy: { is_main: 'desc' },
        });
    }

    // Demo session: the visitor's sandbox (root + the branches they created).
    const demoRoot = getDemoSessionRoot(user);
    if (demoRoot) {
        return prisma.branch.findMany({
            where: { school_id: schoolId, OR: [{ id: demoRoot }, { id: { startsWith: demoRoot + '__' } }] },
            orderBy: { is_main: 'desc' },
        });
    }

    if (!user.branch_id) {
        return prisma.branch.findMany({
            where: { school_id: schoolId },
            orderBy: { is_main: 'desc' },
        });
    }

    const ids = [user.branch_id, ...(user.allowed_branch_ids || [])].filter(Boolean);
    return prisma.branch.findMany({
        where: { school_id: schoolId, id: { in: ids } },
        orderBy: { is_main: 'desc' },
    });
}

interface TransferParams {
    userId: string;
    newBranchId?: string;          // change of PRIMARY branch (regenerates ID)
    allowedBranchIds?: string[];   // set of ADDITIONAL authorized branches
}

export async function transferUser(actor: any, params: TransferParams) {
    const schoolId = actor.school_id;
    const { userId, newBranchId, allowedBranchIds } = params;

    if (!userId) throw Object.assign(new Error('userId is required'), { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw Object.assign(new Error('User not found'), { status: 404 });
    // Strict tenant isolation: the main admin can only act within their own school.
    if (target.school_id !== schoolId) {
        throw Object.assign(new Error('User belongs to a different school'), { status: 403 });
    }

    // Validate every supplied branch belongs to this school.
    const branchIdsToCheck = [newBranchId, ...(allowedBranchIds || [])].filter(Boolean) as string[];
    if (branchIdsToCheck.length) {
        const found = await prisma.branch.findMany({
            where: { school_id: schoolId, id: { in: branchIdsToCheck } },
            select: { id: true },
        });
        const foundIds = new Set(found.map(b => b.id));
        for (const bid of branchIdsToCheck) {
            if (!foundIds.has(bid)) {
                throw Object.assign(new Error(`Branch ${bid} is not part of this school`), { status: 400 });
            }
        }
    }

    const data: any = {};
    let newGeneratedId: string | undefined;

    // Primary-branch transfer → regenerate the global ID for the new branch.
    if (newBranchId && newBranchId !== target.branch_id) {
        newGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, newBranchId, target.role);
        data.branch_id = newBranchId;
        data.school_generated_id = newGeneratedId;
    }

    // Multi-branch assignment → store ADDITIONAL branches only (exclude primary).
    if (Array.isArray(allowedBranchIds)) {
        const primary = data.branch_id || target.branch_id;
        data.allowed_branch_ids = Array.from(new Set(allowedBranchIds.filter(b => b && b !== primary)));
    }

    if (Object.keys(data).length === 0) {
        throw Object.assign(new Error('Nothing to change (provide newBranchId and/or allowedBranchIds)'), { status: 400 });
    }

    const updated = await prisma.user.update({ where: { id: userId }, data });

    // Mirror an ID/branch change to the role-specific profile table.
    if (newGeneratedId) {
        const role = (target.role || '').toLowerCase();
        const mirror = { branch_id: data.branch_id, school_generated_id: newGeneratedId };
        try {
            if (role === 'teacher') await prisma.teacher.updateMany({ where: { user_id: userId }, data: mirror });
            else if (role === 'student') await prisma.student.updateMany({ where: { user_id: userId }, data: mirror });
            else if (role === 'parent') await prisma.parent.updateMany({ where: { user_id: userId }, data: mirror });
        } catch (e: any) {
            console.warn('[BranchTransfer] role-table mirror failed:', e?.message);
        }
    }

    return {
        id: updated.id,
        branch_id: updated.branch_id,
        allowed_branch_ids: updated.allowed_branch_ids,
        school_generated_id: updated.school_generated_id,
        idRegenerated: !!newGeneratedId,
    };
}
