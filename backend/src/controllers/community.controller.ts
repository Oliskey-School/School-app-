import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabase } from '../config/supabase';

export const getSurveys = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.query.schoolId as string || req.user.school_id;
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .eq('school_id', schoolId)
            .eq('is_active', true)
            .lte('start_date', today)
            .gte('end_date', today);
            
        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSurveyQuestions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('survey_questions')
            .select('*')
            .eq('survey_id', id)
            .order('question_order', { ascending: true });
            
        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitSurveyResponse = async (req: AuthRequest, res: Response) => {
    try {
        const responses = req.body;
        if (!Array.isArray(responses)) {
            return res.status(400).json({ message: 'Array of responses is required' });
        }
        
        const { data, error } = await supabase
            .from('survey_responses')
            .insert(responses)
            .select();
            
        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMentalHealthResources = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.query.schoolId as string || req.user.school_id;
        const { data, error } = await supabase
            .from('mental_health_resources')
            .select('*')
            .eq('school_id', schoolId)
            .eq('is_active', true);
            
        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCrisisHelplines = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.query.schoolId as string || req.user.school_id;
        const { data, error } = await supabase
            .from('crisis_helplines')
            .select('*')
            .eq('school_id', schoolId)
            .eq('is_active', true);
            
        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const triggerPanicAlert = async (req: AuthRequest, res: Response) => {
    try {
        const alertData = req.body;
        
        const { data: alert, error: alertError } = await supabase
            .from('emergency_alerts')
            .insert([{
                school_id: alertData.schoolId || req.user.school_id,
                user_id: alertData.userId || req.user.id,
                type: alertData.type,
                location: alertData.location,
                status: 'Active'
            }])
            .select()
            .single();

        if (alertError) throw alertError;

        await supabase
            .from('panic_activations')
            .insert([{
                school_id: alertData.schoolId || req.user.school_id,
                user_id: alertData.userId || req.user.id,
                latitude: alertData.location?.lat,
                longitude: alertData.location?.lng,
                alert_type: alertData.type,
                status: 'Active'
            }]);

        res.status(201).json(alert);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPhotos = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.query.schoolId as string || req.user.school_id;
        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
