import { Router } from 'express';
import {
    getSponsorshipRequests, createSponsorshipRequest, updateSponsorshipRequest,
    getSponsorships, createSponsorship, updateSponsorship,
} from '../controllers/sponsorship.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getSponsorships);
router.post('/', createSponsorship);
router.put('/:id', updateSponsorship);

export default router;

export const requestRouter = Router();
requestRouter.use(authenticate);
requestRouter.get('/', getSponsorshipRequests);
requestRouter.post('/', createSponsorshipRequest);
requestRouter.put('/:id', updateSponsorshipRequest);
