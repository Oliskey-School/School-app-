import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ChatService } from '../services/chat.service';
import { DEMO_SCHOOL_ID } from '../config/env';
import prisma from '../config/database';
import { sendError } from '../utils/httpError';
import { getEffectiveBranchId } from '../utils/branchScope';

const chatService = new ChatService();

const resolveSchoolId = (req: AuthRequest): string | undefined =>
    req.user?.school_id || (req.user?.is_demo ? DEMO_SCHOOL_ID : undefined);

// A user may only read/post/mark-read in a room they're actually a participant
// of — without this, any authenticated user could access any room in any
// school just by knowing/guessing its id.
async function isRoomParticipant(roomId: string, userId: string): Promise<boolean> {
    const participant = await prisma.chatParticipant.findUnique({
        where: { room_id_user_id: { room_id: roomId, user_id: userId } },
        select: { id: true },
    });
    return !!participant;
}

export const getChatRooms = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const rooms = await chatService.getChatRooms(userId);
        res.json(rooms);
    } catch (error: any) {
        sendError(res, error, 'chat.controller.ts');
    }
};

export const getChatMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { roomId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!(await isRoomParticipant(roomId as string, userId))) {
            return res.status(403).json({ message: 'You are not a participant in this conversation' });
        }
        const messages = await chatService.getChatMessages(roomId as string);
        res.json(messages);
    } catch (error: any) {
        sendError(res, error, 'chat.controller.ts');
    }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { roomId } = req.params;
        const { content, type, mediaUrl } = req.body;
        const senderId = req.user?.id;
        if (!senderId) return res.status(401).json({ message: 'Unauthorized' });
        if (!(await isRoomParticipant(roomId as string, senderId))) {
            return res.status(403).json({ message: 'You are not a participant in this conversation' });
        }
        const message = await chatService.sendMessage(roomId as string, senderId, content, type, mediaUrl);
        res.json(message);
    } catch (error: any) {
        sendError(res, error, 'chat.controller.ts');
    }
};

export const markRoomAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { roomId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        await chatService.markRoomAsRead(roomId as string, userId);
        res.json({ success: true });
    } catch (error: any) {
        sendError(res, error, 'chat.controller.ts');
    }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const count = await chatService.getUnreadCount(userId);
        res.json({ count });
    } catch (error: any) {
        sendError(res, error, 'chat.controller.ts');
    }
};

export const getChatContacts = async (req: AuthRequest, res: Response) => {
    try {
        // schoolId must never come from the client — it's the authenticated
        // user's own tenant, full stop. A query override here would let anyone
        // pull another school's contact list just by changing the parameter.
        const schoolId = resolveSchoolId(req);
        // Only an admin may look up a DIFFERENT person's contacts (e.g. helping
        // a student troubleshoot messaging); everyone else always gets their own.
        const role = (req.user?.role || '').toLowerCase();
        const isAdmin = ['admin', 'superadmin', 'proprietor'].includes(role);
        const studentId = (isAdmin && req.query.studentId as string) || req.user?.id;
        const contacts = await chatService.getChatContacts(schoolId as string, studentId as string);
        res.json(contacts);
    } catch (error: any) {
        sendError(res, error, 'chat.controller.ts');
    }
};

export const getRoleContacts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role || req.user?.app_metadata?.role || 'student';
        const schoolId = resolveSchoolId(req);
        const branchId = req.user?.active_branch_id || req.user?.branch_id || (req.query.branchId as string);

        if (!userId || !schoolId) return res.status(401).json({ message: 'Unauthorized' });

        const contacts = await chatService.getRoleBasedContacts(userId, role, schoolId, branchId);
        res.json(contacts);
    } catch (error: any) {
        sendError(res, error, 'chat.controller.ts');
    }
};


// Chat crosses the branch boundary unless the participants are checked.
// A Branch MAIN teacher could open a direct room with a Branch BR2 student and
// exchange messages both ways (verified live) — the room and its participants
// were written with branch_id NULL, which RLS treats as school-wide, so the
// database could not catch it either. The owner's rule is that information
// stays inside its branch.
//
// Carve-outs match the rest of the system: a school-level/main-branch admin and
// a PARENT are branch-unrestricted (a parent's children may sit in different
// branches), and a user with no branch is school-wide.
async function assertSameBranch(req: AuthRequest, targetUserIds: string[]): Promise<{ ok: boolean; message?: string }> {
    const roleUpper = (req.user?.role || '').toUpperCase();
    const unrestricted =
        req.user?.is_main_admin === true ||
        ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN', 'PARENT'].includes(roleUpper);
    if (unrestricted) return { ok: true };

    const myBranch = req.user?.branch_id;
    if (!myBranch) return { ok: true }; // school-wide user, nothing to confine to

    const allowed = new Set<string>([myBranch, ...((req.user?.allowed_branch_ids as string[]) || [])]);

    const targets = await prisma.user.findMany({
        where: { id: { in: targetUserIds }, school_id: req.user?.school_id },
        select: { id: true, branch_id: true, role: true },
    });

    if (targets.length !== targetUserIds.length) {
        // Deliberately vague: RLS already hides users outside the caller's
        // entitlement, so a missing row here means "not visible to you" —
        // naming the branch would leak the school's structure.
        return { ok: false, message: 'One or more participants are not available to you' };
    }

    for (const t of targets) {
        // A parent or an admin on the other end is reachable from any branch —
        // the same carve-out, applied to the target rather than the caller.
        const tRole = (t.role || '').toUpperCase();
        if (['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN', 'PARENT'].includes(tRole)) continue;
        // branch_id NULL = school-wide participant.
        if (t.branch_id && !allowed.has(t.branch_id)) {
            return { ok: false, message: 'You can only start a conversation within your own branch' };
        }
    }
    return { ok: true };
}

export const getOrCreateDirectChat = async (req: AuthRequest, res: Response) => {
    try {
        const { targetUserId } = req.body;
        const userId = req.user?.id;
        const schoolId = resolveSchoolId(req);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!targetUserId) return res.status(400).json({ message: 'targetUserId is required' });

        const branchCheck = await assertSameBranch(req, [targetUserId]);
        if (!branchCheck.ok) return res.status(403).json({ message: branchCheck.message });

        const room = await chatService.getOrCreateDirectChat(userId, targetUserId, schoolId || '', getEffectiveBranchId(req.user));
        res.json(room);
    } catch (error: any) {
        if (error?.code === 'P2003' || error?.code === 'P2025') {
            return res.status(404).json({ message: 'This contact is not available for chat yet.' });
        }
        res.status(400).json({ message: error.message || 'Could not start chat' });
    }
};

export const createGroupChat = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const schoolId = resolveSchoolId(req);
        const { name, memberIds } = req.body;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!schoolId) return res.status(401).json({ message: 'School not found' });
        if (!name?.trim()) return res.status(400).json({ message: 'Group name is required' });
        if (!Array.isArray(memberIds) || memberIds.length === 0)
            return res.status(400).json({ message: 'At least one member is required' });
        if (memberIds.length > 400)
            return res.status(400).json({ message: 'Maximum 400 members allowed' });

        const groupBranchCheck = await assertSameBranch(req, memberIds);
        if (!groupBranchCheck.ok) return res.status(403).json({ message: groupBranchCheck.message });

        const room = await chatService.createGroupChat(userId, schoolId, name.trim(), memberIds, getEffectiveBranchId(req.user));
        res.json(room);
    } catch (error: any) {
        sendError(res, error, 'chat.controller.ts');
    }
};
