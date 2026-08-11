import { Router } from 'express';
import { submitScore, getLeaderboard, getMyScores } from '../controllers/gameScore.controller';
import { getGames, createGame, deleteGame, seedClassBattles, listClassmates, battleSetup, getAIQuestions } from '../controllers/game.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getGames);
router.post('/', createGame);
router.post('/seed-class-battles', seedClassBattles);
router.get('/classmates', listClassmates);
router.get('/ai-questions', getAIQuestions);
router.get('/:id/battle-setup', battleSetup);
router.delete('/:id', deleteGame);
router.post('/scores', submitScore);
router.get('/scores/me', getMyScores);
router.get('/scores/leaderboard/:gameId', getLeaderboard);

export default router;
