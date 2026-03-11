import { Router } from 'express';
import { 
    getSurveys, 
    getSurveyQuestions, 
    submitSurveyResponse, 
    getMentalHealthResources, 
    getCrisisHelplines, 
    triggerPanicAlert, 
    getPhotos 
} from '../controllers/community.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/surveys', getSurveys);
router.get('/surveys/:id/questions', getSurveyQuestions);
router.post('/surveys/responses', submitSurveyResponse);
router.get('/mental-health', getMentalHealthResources);
router.get('/helplines', getCrisisHelplines);
router.post('/panic/activate', triggerPanicAlert);
router.get('/photos', getPhotos);

export default router;
