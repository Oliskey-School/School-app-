import prisma from '../config/database';
import { AuditService } from './audit.service';
import { getEffectiveBranchId } from '../utils/branchScope';

/**
 * Family referrals — a parent asks the school for support for their own child.
 *
 * Who sees what (owner-confirmed):
 *   - Parent: only referrals they submitted, for their own linked children.
 *   - Main (school-level) admin: every branch of their school, confidential included.
 *   - Branch admin: their branch only, confidential EXCLUDED.
 *   - Counselor: the branch(es) they are assigned to, confidential included.
 *
 * school_id always comes from the verified token (req.user.school_id) — never
 * from the query string or body. Branch scope comes from getEffectiveBranchId,
 * the same resolver every other branch-scoped feature (incl. counseling) uses.
 * RLS on the table enforces the school/branch boundary a second time.
 */

export const REFERRAL_TYPES = ['Counselling', 'Learning Support', 'Financial Hardship', 'Health', 'Other'] as const;
export const REFERRAL_URGENCIES = ['Low', 'Medium', 'High'] as const;
export const REFERRAL_STATUSES = ['Submitted', 'In Progress', 'Resolved', 'Closed'] as const;

const MAX_DESCRIPTION = 2000;
const MAX_NOTE = 1000;

export type ReferralActor = {
    id: string;
    role: string;
    school_id: string;
    branch_id?: string | null;
    allowed_branch_ids?: string[];
    active_branch_id?: string | null;
    is_main_admin?: boolean;
};

const ADMIN_ROLES = ['ADMIN', 'PROPRIETOR'];
const COUNSELOR_ROLES = ['COUNSELOR', 'COUNSELLOR'];

function httpError(status: number, message: string) {
    const err: any = new Error(message);
    err.statusCode = status;
    return err;
}

const roleOf = (actor: ReferralActor) => (actor.role || '').toUpperCase();
export const isReferralStaff = (actor: ReferralActor) =>
    ADMIN_ROLES.includes(roleOf(actor)) || COUNSELOR_ROLES.includes(roleOf(actor));

/**
 * The Prisma `where` that limits a staff member to the referrals they may see.
 * Returns null when the actor has no staff access at all.
 */
export function staffScope(actor: ReferralActor): Record<string, any> | null {
    const role = roleOf(actor);
    const base: Record<string, any> = { school_id: actor.school_id, deleted_at: null };

    if (ADMIN_ROLES.includes(role)) {
        const branchId = getEffectiveBranchId(actor);
        if (actor.is_main_admin) {
            // School-level admin: all branches (or the branch they switched to).
            return branchId ? { ...base, branch_id: branchId } : base;
        }
        // Branch admin: locked to their branch, and never confidential referrals.
        if (!branchId) return null;
        return { ...base, branch_id: branchId, is_confidential: false };
    }

    if (COUNSELOR_ROLES.includes(role)) {
        // A counselor works in their assigned branch(es), one active branch at a
        // time — same as every other multi-branch staff feature. A counselor with
        // no branch assignment sees nothing rather than the whole school.
        const assigned = [actor.branch_id, ...(actor.allowed_branch_ids || [])].filter(Boolean);
        if (assigned.length === 0) return null;
        const branchId = getEffectiveBranchId(actor);
        if (!branchId || !assigned.includes(branchId)) return null;
        return { ...base, branch_id: branchId };
    }

    return null;
}

async function resolveParentId(actor: ReferralActor): Promise<string | null> {
    const parent = await prisma.parent.findFirst({
        where: { user_id: actor.id, school_id: actor.school_id },
        select: { id: true },
    });
    return parent?.id ?? null;
}

const studentSelect = { select: { id: true, full_name: true, school_generated_id: true } } as const;

function shape(row: any, parentNames?: Map<string, string>) {
    const student = row.student
        ? { id: row.student.id, name: row.student.full_name, full_name: row.student.full_name, school_generated_id: row.student.school_generated_id }
        : null;
    return {
        id: row.id,
        branch_id: row.branch_id,
        student_id: row.student_id,
        parent_id: row.parent_id,
        referral_type: row.referral_type,
        need_description: row.need_description,
        urgency: row.urgency,
        is_confidential: row.is_confidential,
        status: row.status,
        staff_note: row.staff_note,
        created_at: row.created_at,
        updated_at: row.updated_at,
        student,
        ...(parentNames ? { parent_name: parentNames.get(row.parent_id) || null } : {}),
    };
}

export class ReferralService {
    static async createForParent(actor: ReferralActor, body: any) {
        const studentId = typeof body?.student_id === 'string' ? body.student_id : '';
        const referralType = String(body?.referral_type || '');
        const urgency = String(body?.urgency || 'Medium');
        const description = typeof body?.need_description === 'string' ? body.need_description.trim() : '';
        const isConfidential = body?.is_confidential === true;

        if (!studentId) throw httpError(400, 'Please choose which child this referral is for.');
        if (!(REFERRAL_TYPES as readonly string[]).includes(referralType)) throw httpError(400, 'Please choose a valid type of support.');
        if (!(REFERRAL_URGENCIES as readonly string[]).includes(urgency)) throw httpError(400, 'Please choose a valid urgency.');
        if (!description) throw httpError(400, 'Please describe what support is needed.');
        if (description.length > MAX_DESCRIPTION) throw httpError(400, `Please keep the description under ${MAX_DESCRIPTION} characters.`);

        const parentId = await resolveParentId(actor);
        if (!parentId) throw httpError(403, 'Only a parent can submit a family referral.');

        // The child must be linked to THIS parent, in THIS school.
        const link = await prisma.parentChild.findFirst({
            where: { parent_id: parentId, student_id: studentId, school_id: actor.school_id, deleted_at: null },
            select: { student: { select: { id: true, branch_id: true, school_id: true } } },
        });
        if (!link?.student || link.student.school_id !== actor.school_id) {
            throw httpError(403, 'You can only submit a referral for your own child.');
        }

        const row = await prisma.familyReferral.create({
            data: {
                school_id: actor.school_id,
                // The referral belongs to the child's branch, so that branch's
                // staff (and the main admin) can see it.
                branch_id: link.student.branch_id || null,
                student_id: link.student.id,
                parent_id: parentId,
                referral_type: referralType,
                need_description: description,
                urgency,
                is_confidential: isConfidential,
                status: 'Submitted',
            },
            include: { student: studentSelect },
        });
        return shape(row);
    }

    static async listForParent(actor: ReferralActor) {
        const parentId = await resolveParentId(actor);
        if (!parentId) return [];
        const rows = await prisma.familyReferral.findMany({
            where: { school_id: actor.school_id, parent_id: parentId, deleted_at: null },
            include: { student: studentSelect },
            orderBy: { created_at: 'desc' },
            take: 200,
        });
        return rows.map(r => shape(r));
    }

    static async listForStaff(actor: ReferralActor) {
        const where = staffScope(actor);
        if (!where) return [];
        const rows = await prisma.familyReferral.findMany({
            where,
            include: { student: studentSelect },
            orderBy: { created_at: 'desc' },
            take: 500,
        });
        const parentIds = Array.from(new Set(rows.map(r => r.parent_id)));
        const parents = parentIds.length
            ? await prisma.parent.findMany({
                where: { id: { in: parentIds }, school_id: actor.school_id },
                select: { id: true, full_name: true },
            })
            : [];
        const names = new Map(parents.map(p => [p.id, p.full_name || '']));
        return rows.map(r => shape(r, names));
    }

    static async updateByStaff(actor: ReferralActor, id: string, body: any, meta: { ip?: string; userAgent?: string } = {}) {
        const where = staffScope(actor);
        // Same 404 whether the row is in another school, another branch, or
        // confidential and out of reach — never reveal that it exists.
        if (!where) throw httpError(404, 'Referral not found');
        const existing = await prisma.familyReferral.findFirst({ where: { ...where, id } });
        if (!existing) throw httpError(404, 'Referral not found');

        const data: Record<string, any> = {};
        if (body?.status !== undefined) {
            if (!(REFERRAL_STATUSES as readonly string[]).includes(body.status)) {
                throw httpError(400, 'Please choose a valid status.');
            }
            data.status = body.status;
        }
        if (body?.staff_note !== undefined) {
            if (body.staff_note !== null && typeof body.staff_note !== 'string') throw httpError(400, 'Invalid note.');
            const note = (body.staff_note || '').trim();
            if (note.length > MAX_NOTE) throw httpError(400, `Please keep the note under ${MAX_NOTE} characters.`);
            data.staff_note = note || null;
        }
        if (Object.keys(data).length === 0) throw httpError(400, 'Nothing to update.');
        data.handled_by = actor.id;

        const updated = await prisma.familyReferral.update({
            where: { id: existing.id },
            data,
            include: { student: studentSelect },
        });

        // Audit the change. The referral itself is already saved; an audit write
        // failure is logged, not surfaced, so it can't make staff retry a change
        // that succeeded. The description and note text are NOT copied into the
        // log — only the status transition and whether the note changed.
        AuditService.createLog(actor.school_id, existing.branch_id || undefined, {
            user_id: actor.id,
            action: 'family_referral.update',
            action_type: 'UPDATE',
            action_description: data.status && data.status !== existing.status
                ? `Referral status changed from ${existing.status} to ${data.status}`
                : 'Referral staff note updated',
            entity_type: 'FamilyReferral',
            entity_id: existing.id,
            old_values: { status: existing.status, has_note: !!existing.staff_note },
            new_values: { status: updated.status, has_note: !!updated.staff_note },
            ip_address: meta.ip || null,
            user_agent: meta.userAgent || null,
            is_sensitive: existing.is_confidential,
        }).catch(err => console.error('[referral] audit log write failed:', err?.message || err));

        return shape(updated);
    }
}
