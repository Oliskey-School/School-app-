import { Request, Response } from 'express';
import { ConferenceService } from '../services/conference.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';

const conferenceService = new ConferenceService();

// ParentTeacherConference.parent_id is a foreign key into the Parent table
// (Parent.id), NOT the User table. The frontend (ConferenceScheduling.tsx)
// only has profile.id, which is the User id, so a client-supplied parent_id
// is both the wrong id AND, if trusted, would let one parent read/book under
// another family's identity. Resolve the caller's own Parent.id from their
// session instead — mirrors the same fix already applied to appointments
// (parent.controller.ts createAppointment) and Piggy Bank savings.
async function resolveOwnParentId(req: AuthRequest): Promise<string | null> {
  const roleUpper = (req.user.role || '').toUpperCase();
  if (roleUpper !== 'PARENT') return null; // admins/teachers use filters as-is
  const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
  return parent?.id || null;
}

export const getConferences = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) {
      return res.status(401).json({ message: 'Tenant context missing' });
    }
    const branch_id = getEffectiveBranchId(req.user, req.query.branch_id as string);
    const filters: any = { ...req.query };

    // A parent may only ever see their OWN conferences — override whatever
    // parent_id (if any) was on the query string with the caller's real one.
    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper === 'PARENT') {
      const ownParentId = await resolveOwnParentId(req);
      if (!ownParentId) return res.status(404).json({ message: 'Parent profile not found' });
      filters.parent_id = ownParentId;
    }

    const conferences = await conferenceService.getConferences(school_id, branch_id, filters);
    res.json(conferences);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const scheduleConference = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) {
      return res.status(401).json({ message: 'Tenant context missing' });
    }
    const branch_id = getEffectiveBranchId(req.user, req.body.branch_id);

    const payload = { ...req.body };
    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper === 'PARENT') {
      const ownParentId = await resolveOwnParentId(req);
      if (!ownParentId) return res.status(404).json({ message: 'Parent profile not found' });
      // A parent may only book for one of their own linked children.
      const link = await prisma.parentChild.findFirst({
        where: { parent_id: ownParentId, student_id: payload.student_id, deleted_at: null }
      });
      if (!link) return res.status(403).json({ message: 'You can only book conferences for your own child' });
      payload.parent_id = ownParentId;
    }

    const conference = await conferenceService.scheduleConference(school_id, branch_id, payload);
    res.status(201).json(conference);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConferenceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) {
      return res.status(401).json({ message: 'Tenant context missing' });
    }
    const { id } = req.params;
    const { status, teacher_notes } = req.body;
    const branch_id = getEffectiveBranchId(req.user);

    // Any authenticated user could previously flip ANY conference's status
    // (cancel another family's booking) or overwrite teacher_notes with
    // arbitrary text by guessing an id — verified there was no ownership
    // check at all. Only the assigned teacher, the booking parent, or an
    // admin may update a conference.
    const roleUpper = (req.user.role || '').toUpperCase();
    if (!['ADMIN', 'PROPRIETOR', 'SUPERADMIN', 'SUPER_ADMIN'].includes(roleUpper)) {
      const conference = await prisma.parentTeacherConference.findFirst({
        where: { id: id as string, school_id },
        select: { teacher_id: true, parent_id: true },
      });
      if (!conference) return res.status(404).json({ message: 'Conference not found' });

      if (roleUpper === 'TEACHER') {
        const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!teacher || teacher.id !== conference.teacher_id) {
          return res.status(403).json({ message: 'You are not the assigned teacher for this conference' });
        }
      } else if (roleUpper === 'PARENT') {
        const ownParentId = await resolveOwnParentId(req);
        if (!ownParentId || ownParentId !== conference.parent_id) {
          return res.status(403).json({ message: 'This is not your conference' });
        }
      } else {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const conference = await conferenceService.updateConferenceStatus(id as string, school_id, branch_id, status as string, teacher_notes as string);
    res.json(conference);
  } catch (error: any) {
    res.status(/not found/i.test(error.message) ? 404 : 500).json({ message: error.message });
  }
};

export const getTeacherAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) {
      return res.status(401).json({ message: 'Tenant context missing' });
    }
    const { teacher_id } = req.params;
    const { date } = req.query;
    const branch_id = getEffectiveBranchId(req.user);
    const availability = await conferenceService.getTeacherAvailability(teacher_id as string, school_id, branch_id, new Date(date as string));
    res.json(availability);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const setTeacherAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) {
      return res.status(401).json({ message: 'Tenant context missing' });
    }
    const { teacher_id } = req.params;
    const { slots } = req.body;
    const branch_id = getEffectiveBranchId(req.user);

    // A teacher may only set their OWN availability; admins may set any
    // teacher's. Route-level requireRole already blocks students/parents —
    // this closes the remaining gap where one teacher could overwrite
    // another teacher's calendar by passing a different teacher_id.
    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
      if (!teacher || teacher.id !== teacher_id) {
        return res.status(403).json({ message: 'You can only set your own availability' });
      }
    }

    const result = await conferenceService.setTeacherAvailability(teacher_id as string, school_id, branch_id, slots);
    res.json(result);
  } catch (error: any) {
    res.status(/not found/i.test(error.message) ? 404 : 500).json({ message: error.message });
  }
};
