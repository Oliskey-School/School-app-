import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { BusService } from '../services/bus.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';
import { sendError } from '../utils/httpError';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

// A parent may only ever look up bus/route details for their OWN linked
// children (driver name/phone and stop addresses are sensitive); a student
// only their own.
async function assertCanViewStudentBus(req: AuthRequest, studentId: string): Promise<boolean> {
    if (isAdmin(req) || (req.user.role || '').toLowerCase() === 'teacher') return true;
    const role = (req.user.role || '').toLowerCase();
    if (role === 'student') {
        const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        return !!student && student.id === studentId;
    }
    if (role === 'parent') {
        const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!parent) return false;
        const link = await prisma.parentChild.findFirst({ where: { parent_id: parent.id, student_id: studentId, deleted_at: null } });
        return !!link;
    }
    return false;
}

export const getBuses = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const buses = await BusService.getBuses(schoolId, branchId);
        res.json(buses);
    } catch (error: any) {
        sendError(res, error, 'bus.controller.ts');
    }
};

export const createBus = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can create buses' });
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const bus = await BusService.createBus(schoolId, branchId, req.body);
        res.status(201).json(bus);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateBus = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update buses' });
        const schoolId = req.user.school_id;
        const branchId = req.user.branch_id || req.body.branch_id;
        const bus = await BusService.updateBus(schoolId, branchId, req.params.id as string, req.body);
        res.json(bus);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteBus = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can delete buses' });
        const schoolId = req.user.school_id;
        const branchId = req.user.branch_id || req.body.branch_id;
        await BusService.deleteBus(schoolId, branchId, req.params.id as string);
        res.json({ message: 'Bus deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getStudentBus = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id as string;
        const studentId = req.params.studentId as string;
        if (!(await assertCanViewStudentBus(req, studentId))) {
            return res.status(403).json({ message: 'You do not have access to this student\'s bus assignment' });
        }
        const bus = await BusService.getStudentBus(schoolId, studentId);

        if (!bus) {
            return res.status(404).json({ message: 'No bus assignment found for this student.' });
        }

        res.json(bus);
    } catch (error: any) {
        sendError(res, error, 'bus.controller.ts');
    }
};
