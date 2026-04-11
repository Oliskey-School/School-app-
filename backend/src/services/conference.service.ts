import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ConferenceService {
  async getConferences(school_id: string, filters: any = {}) {
    const { is_available, date_gte, teacher_id, student_id, parent_id, status } = filters;

    // Build the query where object
    const where: any = { school_id };
    if (teacher_id) where.teacher_id = teacher_id;
    if (student_id) where.student_id = student_id;
    if (parent_id) where.parent_id = parent_id;
    if (status) where.status = status;
    
    // For date filter
    if (date_gte) {
      where.scheduled_date = { gte: new Date(date_gte) };
    }

    // Specialized branch for availability if requested
    if (is_available === 'true' || is_available === true) {
      const availabilities = await prisma.teacherAvailability.findMany({
        where: {
          school_id,
          is_available: true,
          date: date_gte ? { gte: new Date(date_gte) } : undefined
        },
        include: {
          teacher: {
            select: { id: true, full_name: true }
          }
        },
        orderBy: [
          { date: 'asc' },
          { time_start: 'asc' }
        ]
      });

      // Map 'teacher' to 'teachers' to match frontend expectations
      return availabilities.map((a: any) => ({
        ...a,
        teachers: {
          ...a.teacher,
          name: a.teacher.full_name,
          subject: 'Teacher' // Placeholder if required by UI
        }
      }));
    }

    const conferences = await prisma.parentTeacherConference.findMany({
      where,
      include: {
        teacher: { select: { id: true, full_name: true } },
        student: { select: { id: true, full_name: true } },
        parent: { select: { id: true, full_name: true } }
      },
      orderBy: { scheduled_date: 'asc' }
    });

    // Map relations to plural aliases and map full_name to name for frontend compatibility
    return conferences.map((c: any) => ({
      ...c,
      teachers: { ...c.teacher, name: c.teacher.full_name, subject: 'Teacher' },
      students: { ...c.student, name: c.student.full_name },
      parents: { ...c.parent, name: c.parent.full_name }
    }));
  }

  async scheduleConference(school_id: string, data: any) {
    const conference = await prisma.parentTeacherConference.create({
      data: {
        school_id,
        ...data,
      },
    });

    SocketService.emitToSchool(school_id, 'conference:updated', { action: 'schedule', conferenceId: conference.id });
    return conference;
  }

  async updateConferenceStatus(id: string, status: string, notes?: string) {
    const conference = await prisma.parentTeacherConference.update({
      where: { id },
      data: { 
        status,
        ...(notes && { teacher_notes: notes }),
      },
    });

    SocketService.emitToSchool(conference.school_id, 'conference:updated', { action: 'status_update', conferenceId: id });
    return conference;
  }

  async getTeacherAvailability(teacher_id: string, date: Date) {
    return await prisma.teacherAvailability.findMany({
      where: {
        teacher_id,
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lte: new Date(date.setHours(23, 59, 59, 999)),
        },
        is_available: true,
      },
    });
  }

  async setTeacherAvailability(teacher_id: string, school_id: string, slots: any[]) {
    // Transaction to clear old slots and add new ones for the given dates
    const dates = [...new Set(slots.map(s => new Date(s.date).toISOString().split('T')[0]))];
    
    return await prisma.$transaction(async (tx) => {
      for (const d of dates) {
        await tx.teacherAvailability.deleteMany({
          where: {
            teacher_id,
            date: {
              gte: new Date(d),
              lte: new Date(new Date(d).setHours(23, 59, 59, 999)),
            },
          },
        });
      }

      const result = await tx.teacherAvailability.createMany({
        data: slots.map(s => ({
          teacher_id,
          school_id,
          date: new Date(s.date),
          time_start: s.time_start,
          time_end: s.time_end,
          location: s.location,
          conference_type: s.conference_type,
        })),
      });

      SocketService.emitToSchool(school_id, 'availability:updated', { teacherId: teacher_id });
      return result;
    });
  }
}
