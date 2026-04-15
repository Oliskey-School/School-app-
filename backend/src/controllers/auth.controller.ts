import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);
        
        // Check if email verification is required
        if (result.requiresVerification) {
            return res.status(403).json({
                requiresVerification: true,
                userId: result.userId,
                email: result.email,
                message: result.message
            });
        }
        
        res.json({ token: result.token, user: result.user });
    } catch (error: any) {
        res.status(401).json({ message: error.message });
    }
};

export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { email, name } = req.body;
        if (!email) throw new Error('Email is required for Google Login');
        const { user, token } = await AuthService.googleLogin(email, name);
        res.json({ token, user });
    } catch (error: any) {
        res.status(401).json({ message: error.message });
    }
};

export const signup = async (req: Request, res: Response) => {
    try {
        const user = await AuthService.signup(req.body);
        res.status(201).json(user);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const user = await AuthService.createUser(req.body);
        res.status(201).json(user);
    } catch (error: any) {
        console.error('Create User Error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const resendVerification = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const result = await AuthService.resendVerification(email);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const confirmEmail = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        const result = await AuthService.confirmEmail(userId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token, code } = req.body;
        if (!token) throw new Error('Verification token is required');
        if (!code) throw new Error('Verification code is required');
        const result = await AuthService.verifyEmail(token, code);
        res.json(result);
    } catch (error: any) {
        console.error('[AuthController] Verify Email Error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const updateEmail = async (req: Request, res: Response) => {
    try {
        const { userId, newEmail } = req.body;
        const result = await AuthService.updateEmail(userId, newEmail);
        res.json(result);
    } catch (error: any) {
        console.error('[AuthController] Update Email Error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const updateUsername = async (req: Request, res: Response) => {
    try {
        const { userId, newUsername } = req.body;
        const result = await AuthService.updateUsername(userId, newUsername);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updatePassword = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }
        
        const result = await AuthService.updatePassword(userId, currentPassword, newPassword);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * Admin changes a user's password directly
 * POST /api/auth/admin/change-password
 */
export const adminChangePassword = async (req: Request, res: Response) => {
    try {
        const { userId, newPassword } = req.body;
        const adminId = (req as any).user?.id;
        
        if (!userId || !newPassword) {
            return res.status(400).json({ message: 'userId and newPassword are required' });
        }
        
        if (!adminId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const result = await AuthService.adminChangePassword(userId, newPassword, adminId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * Reset a user's password and return the new password
 * POST /api/auth/admin/reset-password
 */
export const resetUserPassword = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        const adminId = (req as any).user?.id;
        
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }
        
        if (!adminId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const newPassword = await AuthService.resetUserPassword(userId);
        console.log(`[AUTH] Admin ${adminId} reset password for user ${userId}`);
        
        res.json({ 
            success: true, 
            message: 'Password reset successfully',
            newPassword 
        });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getMemberships = async (req: Request, res: Response) => {
    try {
        const userId = (req.params.userId || req.query.userId) as string;
        if (!userId) throw new Error('userId is required');
        const memberships = await AuthService.getMemberships(userId);
        res.json(memberships);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const switchSchool = async (req: Request, res: Response) => {
    try {
        const { userId, schoolId } = req.body;
        if (!userId || !schoolId) throw new Error('userId and schoolId are required');
        const result = await AuthService.switchSchool(userId, schoolId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        res.json(user);
    } catch (error: any) {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

export const checkEmail = async (req: Request, res: Response) => {
    try {
        const { email } = req.query;
        if (!email) throw new Error('email is required');
        const result = await AuthService.checkEmail(email as string);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const checkUsername = async (req: Request, res: Response) => {
    try {
        const { username } = req.query;
        if (!username) throw new Error('username is required');
        const result = await AuthService.checkUsername(username as string);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * Generate a cryptographically signed demo token for a specific role
 * POST /api/auth/demo/login
 */
export const demoLogin = async (req: Request, res: Response) => {
    console.log(`🔌 [AUTH] Demo Login attempt for role: ${req.body?.role} from IP: ${req.ip}`);
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ message: 'Role is required' });
        }
        const result = await AuthService.generateDemoToken(role);
        res.json(result);
    } catch (error: any) {
        console.error('[AuthController] 💥 Demo Login Crash:', error);
        
        // Handle specific error cases
        const status = error.status || (error.message?.includes('database') || error.message?.includes('Prisma') ? 503 : 400);
        
        res.status(status).json({ 
            message: error.message || 'An unexpected error occurred during demo login',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * List available demo roles
 * GET /api/auth/demo/roles
 */
export const demoRoles = async (req: Request, res: Response) => {
    try {
        const roles = AuthService.getDemoRoles();
        res.json({ roles });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * List active sessions for the current user
 */
export const getSessions = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const currentTokenId = (req.headers.authorization as string)?.split(' ')[1]?.split('.')[2];
        const sessions = await AuthService.getSessions(userId);
        
        const sessionsWithCurrent = sessions.map((s: any) => ({
            ...s,
            is_current: s.token_id === currentTokenId
        }));
        
        res.json(sessionsWithCurrent);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const sessionId = req.params.sessionId as string;
        await AuthService.revokeSession(userId, sessionId);
        res.json({ success: true, message: 'Session revoked' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Revoke all sessions for the current user
 */
export const revokeAllSessions = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        await AuthService.revokeAllSessions(userId);
        res.json({ success: true, message: 'All sessions revoked' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
