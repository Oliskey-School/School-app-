import { Request, Response } from 'express';
import { CounselingService } from '../services/counseling.service';
import { AuthRequest } from '../middleware/auth.middleware';

const counselingService = new CounselingService();

export const getAppointments = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.schoolId || req.body.school_id;
    const filters = req.query;
    const appointments = await counselingService.getAppointments(school_id, filters);
    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bookAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.schoolId || req.body.school_id;
    const appointment = await counselingService.bookAppointment(school_id, req.body);
    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, confirmed_date } = req.body;
    const appointment = await counselingService.updateAppointmentStatus(
      id as string, 
      status as string, 
      confirmed_date ? new Date(confirmed_date) : undefined
    );
    res.json(appointment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
