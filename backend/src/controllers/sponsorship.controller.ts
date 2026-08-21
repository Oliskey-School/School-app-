import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

const db = prisma as any;

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

// ── Sponsorship Requests ─────────────────────────────────────────────────────

export const getSponsorshipRequests = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId) where.branch_id = branchId;
        if (req.query.status) where.status = req.query.status;

        const data = await db.sponsorshipRequest.findMany({
            where,
            include: {
                student: { select: { id: true, full_name: true, grade: true, section: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        const formatted = data.map((r: any) => ({
            ...r,
            students: r.student ? {
                name: r.student.full_name,
                class: `Grade ${r.student.grade || ''}${r.student.section || ''}`,
                age: null,
            } : null,
        }));

        res.json(formatted);
    } catch (error: any) {
        sendError(res, error, 'sponsorship.controller.ts');
    }
};

export const createSponsorshipRequest = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const request = await db.sponsorshipRequest.create({
            data: {
                school_id: schoolId,
                branch_id: branchId ?? null,
                student_id: req.body.student_id,
                amount_needed: req.body.amount_needed ?? 0,
                reason: req.body.reason,
                priority: req.body.priority ?? 'Medium',
                status: req.body.status ?? 'Pending',
            },
        });

        res.status(201).json(request);
    } catch (error: any) {
        sendError(res, error, 'sponsorship.controller.ts');
    }
};

export const updateSponsorshipRequest = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update sponsorship requests' });
        const { id } = req.params;
        // Verify the request belongs to the caller's own school before mutating —
        // a plain update-by-id would let any admin cross-tenant edit another school's data.
        const existing = await db.sponsorshipRequest.findFirst({ where: { id, school_id: req.user.school_id } });
        if (!existing) return res.status(404).json({ message: 'Sponsorship request not found' });
        const updated = await db.sponsorshipRequest.update({
            where: { id },
            data: {
                ...(req.body.status !== undefined && { status: req.body.status }),
                ...(req.body.priority !== undefined && { priority: req.body.priority }),
            },
        });
        res.json(updated);
    } catch (error: any) {
        sendError(res, error, 'sponsorship.controller.ts');
    }
};

// ── Sponsorships ─────────────────────────────────────────────────────────────

export const getSponsorships = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId) where.branch_id = branchId;
        if (req.query.status) where.status = req.query.status;

        const data = await db.sponsorship.findMany({
            where,
            include: {
                donor: { select: { id: true, donor_name: true } },
                student: { select: { id: true, full_name: true, grade: true, section: true } },
            },
            orderBy: { start_date: 'desc' },
        });

        const formatted = data.map((s: any) => ({
            ...s,
            donors: s.donor ? { donor_name: s.donor.donor_name } : null,
            students: s.student ? {
                name: s.student.full_name,
                class: `Grade ${s.student.grade || ''}${s.student.section || ''}`,
            } : null,
        }));

        res.json(formatted);
    } catch (error: any) {
        sendError(res, error, 'sponsorship.controller.ts');
    }
};

export const createSponsorship = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const sponsorship = await db.sponsorship.create({
            data: {
                school_id: schoolId,
                branch_id: branchId ?? null,
                sponsor_id: req.body.sponsor_id ?? null,
                student_id: req.body.student_id,
                amount_committed: req.body.amount_committed ?? 0,
                status: req.body.status ?? 'Pending',
                start_date: req.body.start_date ? new Date(req.body.start_date) : new Date(),
            },
        });

        res.status(201).json(sponsorship);
    } catch (error: any) {
        sendError(res, error, 'sponsorship.controller.ts');
    }
};

export const updateSponsorship = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update sponsorships' });
        const { id } = req.params;
        // Verify the sponsorship belongs to the caller's own school before mutating —
        // a plain update-by-id would let any admin cross-tenant edit another school's data.
        const existing = await db.sponsorship.findFirst({ where: { id, school_id: req.user.school_id } });
        if (!existing) return res.status(404).json({ message: 'Sponsorship not found' });
        const updated = await db.sponsorship.update({
            where: { id },
            data: {
                ...(req.body.status !== undefined && { status: req.body.status }),
                ...(req.body.amount_committed !== undefined && { amount_committed: req.body.amount_committed }),
            },
        });
        res.json(updated);
    } catch (error: any) {
        sendError(res, error, 'sponsorship.controller.ts');
    }
};

// ── Sponsorships count helper (for stats) ────────────────────────────────────

export const getSponsorshipsCount = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const where: any = { school_id: schoolId, deleted_at: null };
        if (req.query.status) where.status = req.query.status;

        const count = await db.sponsorship.count({ where });
        res.json({ count });
    } catch (error: any) {
        sendError(res, error, 'sponsorship.controller.ts');
    }
};
