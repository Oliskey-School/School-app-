import { Router } from 'express';
import { submitScore, getLeaderboard, getMyScores } from '../controllers/gameScore.controller';
import { getGames, createGame, deleteGame } from '../controllers/game.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getGames);
router.post('/', createGame);
router.delete('/:id', deleteGame);
router.post('/scores', submitScore);
router.get('/scores/me', getMyScores);
router.get('/scores/leaderboard/:gameId', getLeaderboard);

export default router;
