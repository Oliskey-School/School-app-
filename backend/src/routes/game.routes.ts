import { Router } from 'express';
import { submitScore, getLeaderboard, getMyScores } from '../controllers/gameScore.controller';
import { getGames, createGame, deleteGame, seedClassBattles, listClassmates, battleSetup, getAIQuestions } from '../controllers/game.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getGames);
router.post('/', createGame);
router.post('/seed-class-battles', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']), seedClassBattles);
router.get('/classmates', listClassmates);
router.get('/ai-questions', getAIQuestions);
router.get('/:id/battle-setup', battleSetup);
router.delete('/:id', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']), deleteGame);
router.post('/scores', submitScore);
router.get('/scores/me', getMyScores);
router.get('/scores/leaderboard/:gameId', getLeaderboard);

export default router;
