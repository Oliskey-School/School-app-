import { Router } from 'express';
import { 
    saveGrade, getGrades, getSubjects, getAnalytics, getPerformance, 
    getReportCardDetails, getCurricula, getAcademicTracks, getAcademicTerms, 
    upsertReportCard, getReportCardByCriteria, getCurriculumTopics, syncCurriculumData 
} from '../controllers/academic.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/subjects', getSubjects);
router.get('/analytics', getAnalytics);
router.get('/performance', getPerformance);
router.get('/report-card-details', getReportCardDetails);
router.get('/curricula', getCurricula);
router.get('/tracks', getAcademicTracks);
router.get('/terms', getAcademicTerms);
router.get('/get-report', getReportCardByCriteria);
router.get('/topics', getCurriculumTopics);
router.post('/sync', syncCurriculumData);
router.post('/grades', getGrades);
router.put('/grade', saveGrade);
router.post('/upsert-report-card', upsertReportCard);

export default router;
