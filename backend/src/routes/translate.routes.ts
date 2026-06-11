import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { translate } from '../controllers/translate.controller';

const router = Router();

// Generous limit — a single screen warm-up sends a handful of batches, and the
// server cache absorbs repeats. Guards against a runaway client looping.
const translateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
});

// Public on purpose: login/demo screens translate before authentication.
router.post('/', translateLimiter, translate);

export default router;
