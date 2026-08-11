import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { BranchIdentityService } from '../services/branchIdentity.service';
import { generateToken } from '../middleware/csrf.middleware';
import prisma from '../config/database';

// Matches csrf.middleware.ts's reasoning: nginx serves the SPA and API
// same-origin in production (see deploy/nginx.conf), so 'lax' is both
// stronger than 'none' and sufficient. 'none' would additionally send these
// auth cookies on genuine cross-site requests, widening the CSRF surface for
// no benefit under this deployment. Override with COOKIE_SAMESITE=none only
// if the API is ever deployed on a different origin than the SPA.
const PROD_SAME_SITE = (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none' | undefined) || 'lax';

const COOKIE_OPTIONS: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? PROD_SAME_SITE : 'lax',
    path: '/',
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);
        
        // Handle 2FA Requirement
        if (result.requires2FA) {
            return res.json({
                requires2FA: true,
                mfaToken: result.mfaToken,
                userId: result.userId
            });
        }

        // Check if email verification is required
        if (result.requiresVerification) {
            return res.status(403).json({
                requiresVerification: true,
                userId: result.userId,
                email: result.email,
                message: result.message
            });
        }
        
        // Set secure httpOnly cookies AND return tokens in the body. The frontend
        // stores tokens in sessionStorage (tab-scoped) and uses them as a Bearer
        // header. The cookies are kept as a fallback for cookie-based requests.
        res.cookie('access_token', result.token, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', result.refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({ user: result.user, token: result.token, refreshToken: result.refreshToken });
    } catch (error: any) {
        res.status(401).json({ message: error.message });
    }
};

/**
 * Lead DevSecOps: Verify 2FA code during login
 * POST /api/auth/verify-2fa-login
 */
export const verify2FALogin = async (req: Request, res: Response) => {
    try {
        const { mfaToken, code } = req.body;
        if (!mfaToken || !code) throw new Error('MFA token and code are required');

        const result = await AuthService.verify2FALogin(mfaToken, code);

        res.cookie('access_token', result.token, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', result.refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({ user: result.user, token: result.token, refreshToken: result.refreshToken });
    } catch (error: any) {
        res.status(401).json({ message: error.message });
    }
};

/**
 * Generate 2FA Secret and QR Code for setup
 * GET /api/auth/2fa/setup
 */
export const setup2FA = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const result = await AuthService.generate2FASecret(userId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * Verify and enable 2FA
 * POST /api/auth/2fa/enable
 */
export const enable2FA = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { code } = req.body;
        const result = await AuthService.verifyAndEnable2FA(userId, code);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

/**
 * Disable 2FA
 * POST /api/auth/2fa/disable
 */
export const disable2FA = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { code } = req.body;
        const result = await AuthService.disable2FA(userId, code);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        // Prefer the per-tab refresh token sent in the body over the shared cookie,
        // so refreshing in one tab can't rotate (and revoke) another tab's session.
        const refreshToken = req.body.refreshToken || req.cookies.refresh_token;
        if (!refreshToken) {
            console.warn('⚠️ [Auth] Refresh attempt without token (Cookie or Body)');
            throw new Error('Refresh token is required');
        }
        const result = await AuthService.refreshAccessToken(refreshToken);
        
        res.cookie('access_token', result.token, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', result.refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({ success: true, token: result.token, refreshToken: result.refreshToken });
    } catch (error: any) {
        res.status(401).json({ message: error.message });
    }
};

export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { credential } = req.body;
        if (!credential) throw new Error('Google credential is required');
        const { user, token, refreshToken } = await AuthService.googleLogin(credential);

        res.cookie('access_token', token, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json({ user, token, refreshToken });
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
        res.status(error.status || 400).json({ message: error.message });
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
        // Identity comes from the authenticated token, never the request body.
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
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
        // Identity comes from the authenticated token, never the request body.
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const { newEmail } = req.body;
        const result = await AuthService.updateEmail(userId, newEmail);
        res.json(result);
    } catch (error: any) {
        console.error('[AuthController] Update Email Error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const verifyEmailChange = async (req: Request, res: Response) => {
    try {
        // Identity comes from the authenticated token, never the request body.
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'code is required' });
        }
        const result = await AuthService.verifyEmailChange(userId, code);

        res.cookie('access_token', result.token, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', result.refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.json(result);
    } catch (error: any) {
        console.error('[AuthController] Verify Email Change Error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const updateUsername = async (req: Request, res: Response) => {
    try {
        // Identity comes from the authenticated token, never the request body.
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const { newUsername } = req.body;
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
        const admin = (req as any).user;
        const adminId = admin?.id;

        if (!userId || !newPassword) {
            return res.status(400).json({ message: 'userId and newPassword are required' });
        }

        if (!adminId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const result = await AuthService.adminChangePassword(userId, newPassword, adminId, admin.school_id, admin.role);
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
        const admin = (req as any).user;
        const adminId = admin?.id;

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        if (!adminId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const newPassword = await AuthService.resetUserPassword(userId, admin.school_id, admin.role);
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
        // Only the authenticated user may list their own memberships (no cross-user IDOR).
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const memberships = await AuthService.getMemberships(userId);
        res.json(memberships);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const switchSchool = async (req: Request, res: Response) => {
    try {
        // Identity comes from the authenticated token, never the request body —
        // otherwise any user could mint a session for another user's account.
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const { schoolId } = req.body;
        if (!schoolId) throw new Error('schoolId is required');
        const result = await AuthService.switchSchool(userId, schoolId);
        res.json({ 
            token: result.token, 
            refreshToken: result.refreshToken, 
            user: result.user 
        });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        // Enrich with the account-saved UI language so it follows the user across
        // devices. Best-effort: demo/short-lived sessions still return the token user.
        let preferred_language: string | null = null;
        try {
            if (user?.id && !user?.is_demo) {
                const row = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { preferred_language: true },
                });
                preferred_language = (row as any)?.preferred_language ?? null;
            }
        } catch { /* column may not be migrated yet — ignore */ }
        res.json({ ...user, preferred_language });
    } catch (error: any) {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// Saves the user's chosen UI language to their account so it follows them across
// devices. The device also remembers it locally for instant load.
export const updateLanguage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const { language } = req.body || {};
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!language || typeof language !== 'string') {
            return res.status(400).json({ message: 'language is required' });
        }
        await prisma.user.update({
            where: { id: userId },
            data: { preferred_language: language } as any,
        });
        res.json({ success: true, preferred_language: language });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Returns the Global ID the caller carries in their CURRENTLY ACTIVE branch
// (from the X-Branch-Id header, validated by the auth middleware). Used by the
// dashboard header to show e.g. OLISKEY_LEKKI_TCH_0001 the moment you switch.
export const getActiveBranchId = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const branchId = user?.active_branch_id;
        const school_generated_id = await BranchIdentityService.resolveForUser(user, branchId);
        // is_main_admin lets the frontend reliably tell a school-level (main) admin from a
        // branch admin — their home branch_id is truthy either way, so the UI can't infer it.
        res.json({ school_generated_id, branch_id: branchId, is_main_admin: !!user?.is_main_admin });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
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
        const result = await AuthService.generateDemoToken(role, req.ip);
        
        // Lead DevSecOps: Set secure cookies for demo login too
        res.cookie('access_token', result.token, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', result.refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

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
        // `sid` is the session id embedded in THIS request's access token payload
        // by AuthService#generateTokens (see req.user.sid, set by auth.middleware
        // from the verified JWT). Re-deriving it from the raw Authorization header
        // (splitting on '.') grabbed the access token's own signature segment,
        // which never matches the session row's token_id (that's the refresh
        // token's signature) — is_current was effectively random/always-false, the
        // same self-revocation hazard fixed for the admin-hub sessions screen.
        const currentTokenId = (req as any).user?.sid;
        const sessions = await AuthService.getSessions(userId);

        const sessionsWithCurrent = sessions.map((s: any) => ({
            ...s,
            is_current: !!currentTokenId && s.token_id === currentTokenId
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
        const currentSid = (req as any).user?.sid;
        const sessionId = req.params.sessionId as string;
        await AuthService.revokeSession(userId, sessionId, currentSid);
        res.json({ success: true, message: 'Session revoked' });
    } catch (error: any) {
        res.status(/own active session/i.test(error.message) ? 400 : 500).json({ message: error.message });
    }
};

/**
 * Revoke all OTHER sessions for the current user (never the caller's own live session)
 */
export const revokeAllSessions = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const currentSid = (req as any).user?.sid;
        await AuthService.revokeAllSessions(userId, currentSid);
        res.json({ success: true, message: 'All sessions revoked' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const logout = async (req: Request, res: Response) => {
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    res.json({ success: true, message: 'Logged out successfully' });
};


export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const result = await AuthService.forgotPassword(email);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const result = await AuthService.resetPassword(email, code, newPassword);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getCsrfToken = async (req: Request, res: Response) => {
    const token = generateToken(req, res);
    res.json({ csrfToken: token });
};
