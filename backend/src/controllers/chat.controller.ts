import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ChatService } from '../services/chat.service';

const chatService = new ChatService();

export const getChatRooms = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const rooms = await chatService.getChatRooms(userId);
        res.json(rooms);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getChatMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { roomId } = req.params;
        const messages = await chatService.getChatMessages(roomId as string);
        res.json(messages);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { roomId } = req.params;
        const { content, type, mediaUrl } = req.body;
        const senderId = req.user?.id;
        if (!senderId) return res.status(401).json({ message: 'Unauthorized' });
        const message = await chatService.sendMessage(roomId as string, senderId, content, type, mediaUrl);
        res.json(message);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getChatContacts = async (req: AuthRequest, res: Response) => {
    try {
        // Fall back to the authenticated user's context when query params are absent.
        const schoolId = (req.query.schoolId as string) || req.user?.school_id;
        const studentId = (req.query.studentId as string) || req.user?.id;
        const contacts = await chatService.getChatContacts(schoolId as string, studentId as string);
        res.json(contacts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrCreateDirectChat = async (req: AuthRequest, res: Response) => {
    try {
        const { targetUserId, schoolId } = req.body;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!targetUserId) return res.status(400).json({ message: 'targetUserId is required' });
        const room = await chatService.getOrCreateDirectChat(userId, targetUserId, schoolId || req.user?.school_id);
        res.json(room);
    } catch (error: any) {
        // A non-existent participant (e.g. a demo contact that is not a real user)
        // is a bad-request / not-found condition, not a server error.
        if (error?.code === 'P2003' || error?.code === 'P2025') {
            return res.status(404).json({ message: 'This contact is not available for chat yet.' });
        }
        res.status(400).json({ message: error.message || 'Could not start chat' });
    }
};
