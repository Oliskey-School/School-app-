import { Router } from 'express';
import { 
    saveGrade, getGrades, getSubjects, getAnalytics, getPerformance, 
    getReportCardDetails, getCurricula, getAcademicTracks, getAcademicTerms, 
    upsertReportCard, getReportCardByCriteria, getCurriculumTopics, syncCurriculumData,
    calculateClassRankings, promoteStudents
} from '../controllers/academic.controller';
import { getAcademicSettings, saveAcademicSettings } from '../controllers/academicSettings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// Configurable academics (terms + grading) — effective values + editor save.
router.get('/settings', getAcademicSettings);
router.put('/settings', saveAcademicSettings);

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
router.post('/promote-students', promoteStudents);
router.post('/calculate-rankings', authenticate, calculateClassRankings);

export default router;
