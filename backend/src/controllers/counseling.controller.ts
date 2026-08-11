import { Response } from 'express';
import { CounselingService } from '../services/counseling.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';

const counselingService = new CounselingService();

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
  return ADMIN_ROLES.includes((req.user?.role || '').toLowerCase());
}
function isStaff(req: AuthRequest): boolean {
  const role = (req.user?.role || '').toLowerCase();
  return isAdmin(req) || role === 'counselor' || role === 'counsellor' || role === 'teacher';
}

// Counseling appointments contain sensitive/confidential detail (reason,
// notes). A parent may only ever see/act on their OWN linked children's
// appointments; a student only their own. Returns null when unrestricted.
async function getAuthorizedStudentIds(req: AuthRequest): Promise<string[] | null> {
  if (isStaff(req)) return null;
  const role = (req.user?.role || '').toLowerCase();
  if (role === 'student') {
    const student = await prisma.student.findUnique({ where: { user_id: req.user!.id }, select: { id: true } });
    return student ? [student.id] : [];
  }
  if (role === 'parent') {
    const parent = await prisma.parent.findUnique({ where: { user_id: req.user!.id }, select: { id: true } });
    if (!parent) return [];
    const links = await prisma.parentChild.findMany({ where: { parent_id: parent.id, deleted_at: null }, select: { student_id: true } });
    return links.map(l => l.student_id);
  }
  return [];
}

export const getAppointments = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) {
      return res.status(401).json({ message: 'Tenant context missing' });
    }
    const branch_id = getEffectiveBranchId(req.user, req.query.branch_id as string);
    const allowedStudentIds = await getAuthorizedStudentIds(req);

    const filters: any = { ...req.query };
    if (allowedStudentIds) {
      // A parent/student may only ever request within their own allowed set —
      // never trust a client-supplied student_id filter to widen access.
      if (filters.student_id && !allowedStudentIds.includes(filters.student_id as string)) {
        return res.status(403).json({ message: 'You do not have access to this student\'s counseling records' });
      }
      if (allowedStudentIds.length === 0) return res.json([]);
      if (!filters.student_id) {
        // No specific student requested — restrict to the caller's own set.
        filters.student_id = { in: allowedStudentIds };
      }
    }

    const appointments = await counselingService.getAppointments(school_id, branch_id, filters);
    res.json(appointments);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const bookAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) {
      return res.status(401).json({ message: 'Tenant context missing' });
    }
    const branch_id = getEffectiveBranchId(req.user, req.body.branch_id);

    // A parent/student must only ever book a counseling appointment for
    // themselves / their own linked child — never a client-supplied student_id
    // belonging to another family.
    const allowedStudentIds = await getAuthorizedStudentIds(req);
    if (allowedStudentIds) {
      if (!req.body.student_id || !allowedStudentIds.includes(req.body.student_id)) {
        return res.status(403).json({ message: 'You can only book a counseling appointment for your own child' });
      }
    }

    const appointment = await counselingService.bookAppointment(school_id, branch_id, req.body);
    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) {
      return res.status(401).json({ message: 'Tenant context missing' });
    }
    // Only staff (admin/counselor/teacher) may confirm/cancel a counseling
    // appointment — a parent or student must never be able to flip another
    // family's appointment status by guessing its id.
    if (!isStaff(req)) {
      return res.status(403).json({ message: 'Only staff can update a counseling appointment\'s status' });
    }
    const branch_id = getEffectiveBranchId(req.user);
    const { id } = req.params;
    const { status, confirmed_date } = req.body;
    const appointment = await counselingService.updateAppointmentStatus(
      school_id,
      branch_id,
      id as string,
      status as string,
      confirmed_date ? new Date(confirmed_date) : undefined
    );
    res.json(appointment);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
