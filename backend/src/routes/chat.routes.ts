import { Router } from 'express';
import { 
    getChatRooms, 
    getChatMessages, 
    sendMessage, 
    getChatContacts, 
    getOrCreateDirectChat 
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getChatRooms);
router.get('/rooms', getChatRooms);
router.get('/rooms/:roomId/messages', getChatMessages);
router.post('/rooms/:roomId/messages', sendMessage);
router.get('/contacts', getChatContacts);
router.post('/direct', getOrCreateDirectChat);

export default router;
