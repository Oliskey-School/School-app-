import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ReportCardService } from '../services/reportCard.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

// A parent may only ever see report cards for THEIR OWN linked children, and
// a student only their own — never trust the role alone, resolve the actual
// allowed student id set from the ownership tables. Returns null when the
// caller isn't a parent/student (no restriction needed), or an array
// (possibly empty) of student ids the caller is allowed to see.
async function resolveOwnStudentIds(req: AuthRequest): Promise<string[] | null> {
    const role = req.user.role;
    if (role === 'PARENT') {
        const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!parent) return [];
        const links = await prisma.parentChild.findMany({
            where: { parent_id: parent.id, deleted_at: null },
            select: { student_id: true }
        });
        return links.map(l => l.student_id);
    }
    if (role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        return student ? [student.id] : [];
    }
    return null;
}

export const getReportCards = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        const ownStudentIds = await resolveOwnStudentIds(req);
        if (ownStudentIds && ownStudentIds.length === 0) return res.json([]);

        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await ReportCardService.getReportCards(req.user.school_id, branchId, teacherId, {
            studentIds: ownStudentIds || undefined,
            publishedOnly: !!ownStudentIds,
        });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getReportCard = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await ReportCardService.getReportCard(id as string, req.user.school_id, branchId);

        if (!result) {
            return res.status(404).json({ message: 'Report card not found' });
        }

        // Same ownership rule as the list endpoint: a parent/student may only
        // fetch a report card for their own child/self, and only once
        // published — otherwise any authenticated parent could pull any
        // report card in the school just by knowing/guessing its id.
        const ownStudentIds = await resolveOwnStudentIds(req);
        if (ownStudentIds) {
            const owns = ownStudentIds.includes((result as any).student_id);
            if (!owns || !(result as any).is_published) {
                return res.status(404).json({ message: 'Report card not found' });
            }
        }

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Publishing (or unpublishing) makes results visible to students and parents —
// that authority belongs to school leadership, not the teacher who entered them.
const canPublish = (role?: string) =>
    ['admin', 'superadmin', 'proprietor'].includes((role || '').toLowerCase());

export const updateStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (String(req.body.status).toLowerCase() === 'published' && !canPublish(req.user.role)) {
            return res.status(403).json({ message: 'Only an admin can publish report cards.' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await ReportCardService.updateStatus(req.user.school_id, branchId, req.params.id as string, req.body.status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const publishReportCards = async (req: AuthRequest, res: Response) => {
    try {
        if (!canPublish(req.user.role)) {
            return res.status(403).json({ message: 'Only an admin can publish report cards.' });
        }
        const { term, session } = req.body;
        if (!term || !session) {
            return res.status(400).json({ message: 'Term and session are required' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await ReportCardService.publishReportCards(req.user.school_id, branchId, term, session);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
