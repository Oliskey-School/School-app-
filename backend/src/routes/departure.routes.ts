import { Router } from 'express';
import {
    getAuthorizedPersons, addAuthorizedPerson, removeAuthorizedPerson,
    requestDeparture, approveDeparture, denyDeparture, confirmDeparture, getDepartures,
} from '../controllers/departure.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/students/:studentId/pickup-persons', getAuthorizedPersons);
router.post('/students/:studentId/pickup-persons', addAuthorizedPerson);
router.delete('/pickup-persons/:id', removeAuthorizedPerson);

router.get('/', getDepartures);
router.post('/', requestDeparture);
router.post('/:id/approve', approveDeparture);
router.post('/:id/deny', denyDeparture);
router.post('/:id/confirm', confirmDeparture);

export default router;
