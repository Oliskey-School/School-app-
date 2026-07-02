import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const db = prisma as any;

// ── Scholarships ────────────────────────────────────────────────────────────

export const getScholarships = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.query.school_id as string || req.user.school_id;
        const branchId = (req.query.branch_id as string) || getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId) where.branch_id = branchId;

        const data = await db.scholarship.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createScholarship = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const scholarship = await db.scholarship.create({
            data: {
                school_id: schoolId,
                branch_id: branchId ?? req.body.branch_id ?? null,
                scholarship_name: req.body.scholarship_name,
                description: req.body.description ?? null,
                amount: req.body.amount ?? 0,
                currency: req.body.currency ?? 'NGN',
                scholarship_type: req.body.scholarship_type ?? 'Merit-Based',
                eligibility_criteria: req.body.eligibility_criteria ?? null,
                application_deadline: req.body.application_deadline ? new Date(req.body.application_deadline) : null,
                slots_available: req.body.slots_available ?? 1,
                slots_filled: 0,
                is_active: req.body.is_active ?? true,
                is_renewable: req.body.is_renewable ?? false,
            },
        });

        res.status(201).json(scholarship);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateScholarship = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { scholarship_name, description, amount, slots_available, slots_filled, is_active, is_renewable, eligibility_criteria, application_deadline } = req.body;

        const updated = await db.scholarship.update({
            where: { id },
            data: {
                ...(scholarship_name !== undefined && { scholarship_name }),
                ...(description !== undefined && { description }),
                ...(amount !== undefined && { amount }),
                ...(slots_available !== undefined && { slots_available }),
                ...(slots_filled !== undefined && { slots_filled }),
                ...(is_active !== undefined && { is_active }),
                ...(is_renewable !== undefined && { is_renewable }),
                ...(eligibility_criteria !== undefined && { eligibility_criteria }),
                ...(application_deadline !== undefined && { application_deadline: application_deadline ? new Date(application_deadline) : null }),
            },
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteScholarship = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await db.scholarship.update({ where: { id }, data: { deleted_at: new Date() } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ── Scholarship Applications ─────────────────────────────────────────────────

export const getScholarshipApplications = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId) where.branch_id = branchId;
        if (req.query.status) where.status = req.query.status;

        const data = await db.scholarshipApplication.findMany({
            where,
            include: {
                student: { select: { id: true, full_name: true, grade: true, section: true, school_id: true, branch_id: true } },
                scholarship: { select: { id: true, scholarship_name: true, amount: true, school_id: true, branch_id: true } },
            },
            orderBy: { applied_date: 'desc' },
        });

        const formatted = data.map((a: any) => ({
            ...a,
            students: a.student ? { name: a.student.full_name, class: `Grade ${a.student.grade || ''}${a.student.section || ''}`, school_id: a.student.school_id, branch_id: a.student.branch_id } : null,
            scholarships: a.scholarship ? { scholarship_name: a.scholarship.scholarship_name, amount: a.scholarship.amount, school_id: a.scholarship.school_id, branch_id: a.scholarship.branch_id } : null,
        }));

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createScholarshipApplication = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const application = await db.scholarshipApplication.create({
            data: {
                school_id: schoolId,
                branch_id: branchId ?? null,
                scholarship_id: req.body.scholarship_id,
                student_id: req.body.student_id,
                status: req.body.status ?? 'Pending',
                review_notes: req.body.review_notes ?? null,
            },
        });

        res.status(201).json(application);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateScholarshipApplication = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updated = await db.scholarshipApplication.update({
            where: { id },
            data: {
                ...(req.body.status !== undefined && { status: req.body.status }),
                ...(req.body.review_notes !== undefined && { review_notes: req.body.review_notes }),
            },
        });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ── Scholarship Recipients ───────────────────────────────────────────────────

export const getScholarshipRecipients = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId) where.branch_id = branchId;

        const data = await db.scholarshipRecipient.findMany({
            where,
            include: {
                student: { select: { id: true, full_name: true, grade: true, section: true, school_id: true, branch_id: true } },
                scholarship: { select: { id: true, scholarship_name: true, amount: true, school_id: true, branch_id: true } },
            },
            orderBy: { award_date: 'desc' },
        });

        const formatted = data.map((r: any) => ({
            ...r,
            students: r.student ? { name: r.student.full_name, class: `Grade ${r.student.grade || ''}${r.student.section || ''}`, school_id: r.student.school_id, branch_id: r.student.branch_id } : null,
            scholarships: r.scholarship ? { scholarship_name: r.scholarship.scholarship_name, amount: r.scholarship.amount, school_id: r.scholarship.school_id, branch_id: r.scholarship.branch_id } : null,
        }));

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createScholarshipRecipient = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const recipient = await db.scholarshipRecipient.create({
            data: {
                school_id: schoolId,
                branch_id: branchId ?? null,
                scholarship_id: req.body.scholarship_id,
                student_id: req.body.student_id,
                award_date: req.body.award_date ? new Date(req.body.award_date) : new Date(),
                status: req.body.status ?? 'Active',
            },
        });

        res.status(201).json(recipient);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
