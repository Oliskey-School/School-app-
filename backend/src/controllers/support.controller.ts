import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';

export const getSupportTickets = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const where: any = { deleted_at: null };

        if (user?.role === 'SUPER_ADMIN' || user?.role === 'super_admin') {
            // Super admin sees all tickets
        } else if (user?.school_id) {
            where.school_id = user.school_id;
            if (user.id) where.user_id = user.id;
        } else if (user?.id) {
            where.user_id = user.id;
        }

        const tickets = await (prisma as any).supportTicket.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: 50,
        });

        res.json(tickets || []);
    } catch (error: any) {
        console.error('[Support] getSupportTickets error:', error.message);
        res.json([]);
    }
};

export const createSupportTicket = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { title, description, category = 'General', priority = 'Low' } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required.' });
        }

        const ticket = await (prisma as any).supportTicket.create({
            data: {
                title,
                description,
                category,
                priority,
                status: 'open',
                user_id: user?.id || null,
                user_email: user?.email || null,
                user_name: user?.full_name || user?.name || null,
                user_role: user?.role || null,
                school_id: user?.school_id || null,
                branch_id: user?.branch_id || null,
            },
        });

        res.status(201).json(ticket);
    } catch (error: any) {
        console.error('[Support] createSupportTicket error:', error.message);
        res.status(500).json({ error: 'Failed to create support ticket.' });
    }
};

export const updateSupportTicket = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, resolved_at } = req.body;

        const ticket = await (prisma as any).supportTicket.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(status === 'resolved' && { resolved_at: resolved_at || new Date() }),
                updated_by: req.user?.id || null,
            },
        });

        res.json(ticket);
    } catch (error: any) {
        console.error('[Support] updateSupportTicket error:', error.message);
        res.status(500).json({ error: 'Failed to update support ticket.' });
    }
};
