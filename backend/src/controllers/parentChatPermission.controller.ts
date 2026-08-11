import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const resolveSchoolId = (req: AuthRequest) =>
    req.user?.school_id || req.user?.app_metadata?.school_id || req.headers['x-school-id'] as string || '';

// GET /api/admin/parent-chat-permissions
export const listPermissions = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: 'Unauthorized' });

        const { parentId, teacherId } = req.query;
        const now = new Date();

        const grants = await (prisma as any).parentTeacherChatPermission.findMany({
            where: {
                school_id: schoolId,
                ...(parentId ? { parent_id: parentId as string } : {}),
                ...(teacherId ? { teacher_id: teacherId as string } : {}),
            },
            include: {
                parent: { include: { user: { select: { id: true, full_name: true, avatar_url: true } } } },
                teacher: { include: { user: { select: { id: true, full_name: true, avatar_url: true } } } },
            },
            orderBy: { created_at: 'desc' }
        });

        const enriched = grants.map((g: any) => ({
            ...g,
            is_expired: g.expires_at ? new Date(g.expires_at) <= now : false,
            status: !g.is_active ? 'revoked' : (g.expires_at && new Date(g.expires_at) <= now) ? 'expired' : 'active'
        }));

        res.json(enriched);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/admin/parent-chat-permissions
export const grantPermission = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = resolveSchoolId(req);
        const adminId = req.user?.id;
        if (!schoolId || !adminId) return res.status(401).json({ message: 'Unauthorized' });

        const { parent_id, teacher_id, duration_type, duration_value } = req.body;
        if (!parent_id || !teacher_id || !duration_type)
            return res.status(400).json({ message: 'parent_id, teacher_id, and duration_type are required' });
        if (!['hours', 'days', 'forever'].includes(duration_type))
            return res.status(400).json({ message: 'duration_type must be hours, days, or forever' });
        if (duration_type !== 'forever' && (!duration_value || duration_value < 1))
            return res.status(400).json({ message: 'duration_value is required for hours/days' });

        // A branch admin must not be able to grant chat access involving a
        // parent or teacher outside their own branch.
        const branchId = getEffectiveBranchId(req.user);
        const [parentInScope, teacherInScope] = await Promise.all([
            prisma.parent.findFirst({ where: { id: parent_id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }, select: { id: true } }),
            prisma.teacher.findFirst({ where: { id: teacher_id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }, select: { id: true } }),
        ]);
        if (!parentInScope || !teacherInScope) {
            return res.status(404).json({ message: 'Parent or teacher not found in your school/branch' });
        }

        let expires_at: Date | null = null;
        if (duration_type === 'hours') {
            expires_at = new Date(Date.now() + duration_value * 3_600_000);
        } else if (duration_type === 'days') {
            expires_at = new Date(Date.now() + duration_value * 86_400_000);
        }

        // Upsert: reactivate if an existing (even expired/revoked) grant exists
        const existing = await (prisma as any).parentTeacherChatPermission.findFirst({
            where: { parent_id, teacher_id, school_id: schoolId }
        });

        let grant: any;
        if (existing) {
            grant = await (prisma as any).parentTeacherChatPermission.update({
                where: { id: existing.id },
                data: {
                    granted_by: adminId,
                    duration_type,
                    duration_value: duration_type === 'forever' ? null : duration_value,
                    expires_at,
                    is_active: true,
                    revoked_at: null,
                    updated_at: new Date()
                }
            });
        } else {
            grant = await (prisma as any).parentTeacherChatPermission.create({
                data: {
                    school_id: schoolId,
                    parent_id,
                    teacher_id,
                    granted_by: adminId,
                    duration_type,
                    duration_value: duration_type === 'forever' ? null : duration_value,
                    expires_at,
                    is_active: true
                }
            });
        }

        // Notify the parent
        try {
            const parent = await prisma.parent.findUnique({ where: { id: parent_id }, include: { user: true } });
            const teacher = await prisma.teacher.findUnique({ where: { id: teacher_id } });
            if (parent?.user_id && teacher) {
                const durationLabel = duration_type === 'forever'
                    ? 'permanently'
                    : `for ${duration_value} ${duration_type}`;
                await prisma.notification.create({
                    data: {
                        school_id: schoolId,
                        user_id: parent.user_id,
                        title: 'Teacher Chat Access Granted',
                        message: `You can now message ${teacher.full_name} ${durationLabel}.`,
                        category: 'Communication',
                        audience: [],
                        is_read: false
                    }
                }).catch(() => {});
            }
        } catch { /* notification failure is non-fatal */ }

        res.status(201).json(grant);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/admin/parent-chat-permissions/:id
export const revokePermission = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: 'Unauthorized' });

        const { id } = req.params;
        const grant = await (prisma as any).parentTeacherChatPermission.findFirst({
            where: { id, school_id: schoolId }
        });
        if (!grant) return res.status(404).json({ message: 'Permission not found' });

        await (prisma as any).parentTeacherChatPermission.update({
            where: { id },
            data: { is_active: false, revoked_at: new Date() }
        });

        // Notify the parent
        try {
            const parent = await prisma.parent.findUnique({ where: { id: grant.parent_id }, include: { user: true } });
            const teacher = await prisma.teacher.findUnique({ where: { id: grant.teacher_id } });
            if (parent?.user_id && teacher) {
                await prisma.notification.create({
                    data: {
                        school_id: schoolId,
                        user_id: parent.user_id,
                        title: 'Teacher Chat Access Removed',
                        message: `Your access to message ${teacher.full_name} has been removed by the school.`,
                        category: 'Communication',
                        audience: [],
                        is_read: false
                    }
                }).catch(() => {});
            }
        } catch { /* non-fatal */ }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/admin/parent-chat-permissions/parents — list parents for the picker
export const listParentsForPicker = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: 'Unauthorized' });

        const { search } = req.query;
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const parents = await prisma.parent.findMany({
            where: {
                school_id: schoolId,
                ...(branchId ? { branch_id: branchId } : {}),
                ...(search ? { full_name: { contains: search as string, mode: 'insensitive' } } : {})
            },
            include: { user: { select: { id: true, full_name: true, avatar_url: true } } },
            take: 50,
            orderBy: { full_name: 'asc' }
        });

        res.json(parents.map(p => ({
            id: p.id,
            name: p.full_name,
            userId: p.user_id,
            avatarUrl: p.user?.avatar_url
        })));
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/admin/parent-chat-permissions/teachers — list teachers for the picker
export const listTeachersForPicker = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: 'Unauthorized' });

        const { search } = req.query;
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const teachers = await prisma.teacher.findMany({
            where: {
                school_id: schoolId,
                ...(branchId ? { branch_id: branchId } : {}),
                ...(search ? { full_name: { contains: search as string, mode: 'insensitive' } } : {})
            },
            include: { user: { select: { id: true, full_name: true, avatar_url: true } } },
            take: 50,
            orderBy: { full_name: 'asc' }
        });

        res.json(teachers.map(t => ({
            id: t.id,
            name: t.full_name,
            userId: t.user_id,
            avatarUrl: t.user?.avatar_url
        })));
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
