import prisma from '../config/database';
import { SocketService } from './socket.service';

export class CounselingService {
  async getAppointments(school_id: string, filters: any = {}) {
    const { student_id, counselor_id, status } = filters;
    
    const appointments = await prisma.counselingAppointment.findMany({
      where: {
        school_id,
        ...(student_id && { student_id }),
        ...(counselor_id && { counselor_id }),
        ...(status && { status }),
      },
      include: {
        student: { select: { id: true, full_name: true } },
        counselor: { select: { id: true, full_name: true } },
      },
      orderBy: {
        requested_date: 'desc',
      },
    });

    // Map relations to plural aliases and map full_name to name for frontend compatibility
    return appointments.map((a: any) => ({
      ...a,
      student: { ...a.student, name: a.student.full_name },
      counselor: { ...a.counselor, name: a.counselor.full_name }
    }));
  }

  async bookAppointment(school_id: string, data: any) {
    const appointment = await prisma.counselingAppointment.create({
      data: {
        school_id,
        ...data,
      },
    });

    SocketService.emitToSchool(school_id, 'counseling:updated', { action: 'book', appointmentId: appointment.id });
    return appointment;
  }

  async updateAppointmentStatus(id: string, status: string, confirmed_date?: Date) {
    const appointment = await prisma.counselingAppointment.update({
      where: { id },
      data: { 
        status,
        ...(confirmed_date && { confirmed_date }),
      },
    });

    SocketService.emitToSchool(appointment.school_id, 'counseling:updated', { action: 'status_update', appointmentId: id });
    return appointment;
  }
}
