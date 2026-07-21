import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DepartureService } from '../services/departure.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
const STAFF_ROLES = [...ADMIN_ROLES, 'teacher'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}
function isStaff(req: AuthRequest): boolean {
    return STAFF_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/required|must be|already been actioned|not authorized|has not been approved|cannot be completed|was denied/i.test(message)) return 400;
    return 500;
}

async function assertParentOwnsStudent(req: AuthRequest, studentId: string): Promise<void> {
    if (isAdmin(req)) return;
    const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    if (!parent) throw new Error('Not found');
    const link = await prisma.parentChild.findFirst({ where: { parent_id: parent.id, student_id: studentId, deleted_at: null } });
    if (!link) throw new Error('Student not found');
}

export const getAuthorizedPersons = async (req: AuthRequest, res: Response) => {
    try {
        await assertParentOwnsStudent(req, req.params.studentId as string);
        const result = await DepartureService.getAuthorizedPersons(req.user.school_id, req.params.studentId as string);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const addAuthorizedPerson = async (req: AuthRequest, res: Response) => {
    try {
        await assertParentOwnsStudent(req, req.params.studentId as string);
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await DepartureService.addAuthorizedPerson(req.user.school_id, branchId, req.params.studentId as string, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const removeAuthorizedPerson = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            const person = await (prisma as any).authorizedPickupPerson.findFirst({ where: { id: req.params.id as string, school_id: req.user.school_id }, select: { student_id: true } });
            if (!person) throw new Error('Not found');
            await assertParentOwnsStudent(req, person.student_id);
        }
        const result = await DepartureService.removeAuthorizedPerson(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const requestDeparture = async (req: AuthRequest, res: Response) => {
    try {
        if (!isStaff(req)) {
            await assertParentOwnsStudent(req, req.body.student_id);
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await DepartureService.requestDeparture(req.user.school_id, branchId, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const approveDeparture = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can approve a gate pass' });
        const result = await DepartureService.approveDeparture(req.user.school_id, req.params.id as string, req.user.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const denyDeparture = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can deny a gate pass' });
        const result = await DepartureService.denyDeparture(req.user.school_id, req.params.id as string, req.user.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const confirmDeparture = async (req: AuthRequest, res: Response) => {
    try {
        if (!isStaff(req)) return res.status(403).json({ message: 'Only staff can confirm a pickup' });
        const result = await DepartureService.confirmDeparture(req.user.school_id, req.params.id as string, req.user.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getDepartures = async (req: AuthRequest, res: Response) => {
    try {
        if (!isStaff(req)) return res.status(403).json({ message: 'Only staff can view the departure log' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await DepartureService.getDepartures(req.user.school_id, branchId, { status: req.query.status as string, studentId: req.query.studentId as string });
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};
