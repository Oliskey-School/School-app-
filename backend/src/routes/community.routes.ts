import { Router } from 'express';
import { 
    getSurveys, 
    getSurveyQuestions, 
    submitSurveyResponse, 
    getMentalHealthResources, 
    getCrisisHelplines, 
    triggerPanicAlert, 
    getPhotos,
    getVolunteeringOpportunities,
    createVolunteeringOpportunity,
    deleteVolunteeringOpportunity
} from '../controllers/community.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);

router.get('/surveys', getSurveys);
router.get('/surveys/:id/questions', getSurveyQuestions);
router.post('/surveys/responses', submitSurveyResponse);
router.get('/mental-health', getMentalHealthResources);
router.get('/helplines', getCrisisHelplines);
router.post('/panic/activate', triggerPanicAlert);
router.get('/volunteering', getVolunteeringOpportunities);
router.post('/volunteering', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), createVolunteeringOpportunity);
router.delete('/volunteering/:id', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), deleteVolunteeringOpportunity);
router.get('/photos', getPhotos);


export default router;
