import { Router } from 'express';
import {
    getChatRooms,
    getChatMessages,
    sendMessage,
    markRoomAsRead,
    getUnreadCount,
    getChatContacts,
    getRoleContacts,
    getOrCreateDirectChat,
    createGroupChat
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getChatRooms);
router.get('/rooms', getChatRooms);
router.get('/rooms/:roomId/messages', getChatMessages);
router.post('/rooms/:roomId/messages', sendMessage);
router.post('/rooms/:roomId/read', markRoomAsRead);
router.post('/rooms/group', createGroupChat);
router.get('/unread-count', getUnreadCount);
router.get('/contacts', getChatContacts);
router.get('/contacts/role', getRoleContacts);
router.post('/direct', getOrCreateDirectChat);

export default router;
