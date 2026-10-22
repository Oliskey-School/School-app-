import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';
import { createReferral, getMyReferrals, getStaffReferrals, updateReferral } from '../controllers/referral.controller';

const router = Router();

// Family referrals: parents ask the school for help for their own child;
// admins and counselors handle them. Confidentiality and branch scope are
// enforced in ReferralService on top of these role gates.
const PARENT_ROLES = ['parent'];
const STAFF_ROLES = ['admin', 'proprietor', 'counselor', 'counsellor'];

router.post('/', authenticate, requireRole(PARENT_ROLES), createReferral);
router.get('/mine', authenticate, requireRole(PARENT_ROLES), getMyReferrals);
router.get('/', authenticate, requireRole(STAFF_ROLES), getStaffReferrals);
router.patch('/:id', authenticate, requireRole(STAFF_ROLES), updateReferral);

export default router;
