import { Router } from 'express';
import {
    getPersonnelFile, getMyPersonnelFile,
    createRecord, updateRecord,
    issueQueryLetter, respondToQueryLetter, closeQueryLetter
} from '../controllers/personnel.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Personnel file
router.get('/my-file', getMyPersonnelFile);
router.get('/teachers/:teacherId/file', getPersonnelFile);

// Permanent records (promotions, warnings, commendations, disciplinary)
router.post('/records', createRecord);
router.put('/records/:id', updateRecord);

// Query letters
router.post('/query-letters', issueQueryLetter);
router.post('/query-letters/:id/respond', respondToQueryLetter);
router.post('/query-letters/:id/close', closeQueryLetter);

export default router;
