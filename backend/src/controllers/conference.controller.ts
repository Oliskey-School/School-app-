import { Request, Response } from 'express';
import { ConferenceService } from '../services/conference.service';
import { AuthRequest } from '../middleware/auth.middleware';

const conferenceService = new ConferenceService();

export const getConferences = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.schoolId || req.body.school_id;
    const filters = req.query;
    const conferences = await conferenceService.getConferences(school_id, filters);
    res.json(conferences);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const scheduleConference = async (req: AuthRequest, res: Response) => {
  try {
    const school_id = req.user?.schoolId || req.body.school_id;
    const conference = await conferenceService.scheduleConference(school_id, req.body);
    res.status(201).json(conference);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConferenceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, teacher_notes } = req.body;
    const conference = await conferenceService.updateConferenceStatus(id as string, status as string, teacher_notes as string);
    res.json(conference);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeacherAvailability = async (req: Request, res: Response) => {
  try {
    const { teacher_id } = req.params;
    const { date } = req.query;
    const availability = await conferenceService.getTeacherAvailability(teacher_id as string, new Date(date as string));
    res.json(availability);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const setTeacherAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { teacher_id } = req.params;
    const { school_id, slots } = req.body;
    const result = await conferenceService.setTeacherAvailability(teacher_id as string, school_id as string, slots);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
