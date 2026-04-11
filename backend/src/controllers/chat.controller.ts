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
        const { schoolId, studentId } = req.query;
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
        const room = await chatService.getOrCreateDirectChat(userId, targetUserId, schoolId);
        res.json(room);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
