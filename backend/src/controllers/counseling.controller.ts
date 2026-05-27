import { Response } from 'express';
import { CounselingService } from '../services/counseling.service';
import { AuthRequest } from '../middleware/auth.middleware';

const counselingService = new CounselingService();

export const getAppointments = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) {
      return res.status(401).json({ message: 'Tenant context missing' });
    }
    const filters = req.query;
    const appointments = await counselingService.getAppointments(school_id, filters);
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
    const appointment = await counselingService.bookAppointment(school_id, req.body);
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
    const { id } = req.params;
    const { status, confirmed_date } = req.body;
    const appointment = await counselingService.updateAppointmentStatus(
      school_id,
      id as string,
      status as string,
      confirmed_date ? new Date(confirmed_date) : undefined
    );
    res.json(appointment);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
