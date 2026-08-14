import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import axios from 'axios';
import prisma, { getRawPrisma } from '../config/database';
import { config } from '../config/env';
import { IdGeneratorService } from './idGenerator.service';
import { AuditService } from './audit.service';
import { SocketService } from './socket.service';
import { VerificationService } from './verification.service';
import { EmailService } from './email.service';
// Lazy-load otplib only when a 2FA method is actually called.
// Top-level require() fails in the test environment because @otplib's CJS
// build requires @scure/base and @noble/hashes which are ESM-only in Node 20.
let _auth: any = null;
function getAuthenticator() {
    if (!_auth) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const _otplib = require('otplib') as any;
        _auth = _otplib.authenticator ?? _otplib.TOTP?.instance ?? {
            generate: (s: string) => _otplib.generate?.(s) ?? '',
            verify: (o: any) => _otplib.verify?.(o) ?? false,
            generateSecret: () => _otplib.generateSecret?.() ?? '',
            keyuri: () => '',
        };
    }
    return _auth;
}
import QRCode from 'qrcode';
import { DemoSeederService } from './demoSeeder.service';

export enum Role {
    SUPER_ADMIN = 'SUPER_ADMIN',
    PROPRIETOR = 'PROPRIETOR',
    ADMIN = 'ADMIN',
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT',
    PARENT = 'PARENT',
    BURSAR = 'BURSAR',
    INSPECTOR = 'INSPECTOR',
    EXAM_OFFICER = 'EXAM_OFFICER',
    COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER'
}

export class AuthService {
    /**
     * Lead DevSecOps: 2FA Enforcement for High-Privilege Roles
     */
    static async generate2FASecret(userId: string) {
        const user = await prisma.user.findFirst({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const secret = getAuthenticator().generateSecret();
        const otpauth = getAuthenticator().keyuri(user.email, 'SchoolSaaS', secret);
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        // Store secret temporarily (don't enable yet)
        await prisma.user.update({
            where: { id: userId },
            data: { two_factor_secret: secret }
        });

        return { secret, qrCodeUrl };
    }

    static async verifyAndEnable2FA(userId: string, code: string) {
        const user = await prisma.user.findFirst({ where: { id: userId } });
        if (!user || !user.two_factor_secret) throw new Error('2FA not initiated');

        const isValid = getAuthenticator().verify({
            token: code,
            secret: user.two_factor_secret
        });

        if (!isValid) throw new Error('Invalid 2FA code');

        await prisma.user.update({
            where: { id: userId },
            data: { two_factor_enabled: true }
        });

        return { success: true };
    }

    static async disable2FA(userId: string, code: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
            throw new Error('2FA not enabled');
        }

        const isValid = getAuthenticator().verify({
            token: code,
            secret: user.two_factor_secret
        });

        if (!isValid) throw new Error('Invalid 2FA code');

        await prisma.user.update({
            where: { id: userId },
            data: { 
                two_factor_enabled: false,
                two_factor_secret: null 
            }
        });

        return { success: true };
    }

    /**
     * Helper to map string roles to Prisma Role enum
     */
    private static mapRole(role: string): Role {
        const r = role.toUpperCase().replace(/_/g, '');
        if (r === 'SUPERADMIN') return Role.SUPER_ADMIN;
        if (r === 'INSPECTOR') return Role.INSPECTOR;
        if (r === 'EXAMOFFICER') return Role.EXAM_OFFICER;
        if (r === 'COMPLIANCEOFFICER') return Role.COMPLIANCE_OFFICER;
        
        if (Object.values(Role).includes(r as Role)) return r as Role;
        return Role.STUDENT;
    }

    static async checkEmail(email: string) {
        const user = await prisma.user.findFirst({
            where: { email: email.toLowerCase() }
        });
        return { exists: !!user, user };
    }

    static async checkUsername(username: string) {
        const user = await prisma.user.findFirst({
            where: { school_generated_id: username }
        });
        return { exists: !!user };
    }

    static async updateUsername(userId: string, newUsername: string) {
        await prisma.user.update({
            where: { id: userId },
            data: { school_generated_id: newUsername }
        });
        return { success: true, message: 'Username updated successfully' };
    }

    // Roles a visitor may assign themselves via the PUBLIC /auth/signup endpoint.
    // Privileged roles (admin, proprietor, super_admin, inspector, exam/compliance
    // officer, bursar) must NEVER be self-assignable — those are created by the
    // school onboarding flow or by an existing admin (AuthService.createUser).
    private static SELF_SIGNUP_ROLES = new Set(['student', 'parent', 'teacher']);

    static async signup(data: any) {
        return await prisma.$transaction(async (tx) => {
            // SECURITY: do not trust the client-supplied role. Without this guard a
            // visitor could POST { role: "super_admin" } and self-create a platform
            // operator account that sees every school (privilege escalation).
            const requestedRole = String(data.role || 'student').toLowerCase().trim();
            if (!this.SELF_SIGNUP_ROLES.has(requestedRole)) {
                throw Object.assign(
                    new Error('Invalid role for self-registration. Allowed: student, parent, teacher.'),
                    { status: 403 }
                );
            }

            const hashedPassword = await bcrypt.hash(data.password, 10);
            const role = this.mapRole(requestedRole);

            let schoolGeneratedId = null;
            if (data.school_id && data.branch_id) {
                try {
                    schoolGeneratedId = await IdGeneratorService.generateSchoolId(data.school_id, data.branch_id, role.toLowerCase(), tx);
                } catch (err) {
                    console.warn('Could not generate school ID:', err);
                }
            }

            const user = await tx.user.create({
                data: {
                    email: data.email.toLowerCase(),
                    password_hash: hashedPassword,
                    role: role,
                    school_id: data.school_id,
                    branch_id: data.branch_id || null,
                    allowed_branch_ids: data.allowed_branch_ids || (data.branch_id ? [data.branch_id] : []),
                    full_name: data.full_name,
                    email_verified: false,
                    school_generated_id: schoolGeneratedId,
                    initial_password: data.password // Store generated credentials for Admin visibility
                }
            });

            // Create initial membership
            if (data.school_id) {
                await tx.schoolMembership.create({
                    data: {
                        user_id: user.id,
                        school_id: data.school_id,
                        base_role: role,
                        is_active: true
                    }
                });
            }

            // Create role-specific profile
            const roleLower = role.toLowerCase();
            const profileData: any = {
                school_id: data.school_id,
                branch_id: data.branch_id || null,
                full_name: data.full_name,
                email: data.email.toLowerCase(),
                school_generated_id: schoolGeneratedId
            };

            if (roleLower === 'teacher') {
                await tx.teacher.create({
                    data: { ...profileData, user_id: user.id }
                });
            } else if (roleLower === 'student') {
                await tx.student.create({
                    data: { ...profileData, user_id: user.id }
                });
            } else if (roleLower === 'parent') {
                await tx.parent.create({
                    data: { ...profileData, user_id: user.id }
                });
            }

            SocketService.emitToSchool(data.school_id || 'system', 'auth:updated', { action: 'signup', userId: user.id });
            return user;
        });
    }

    static async login(identifier: string, password: string) {
        const normalizedIdentifier = identifier.trim().toLowerCase();

        // Find ALL accounts matching the identifier (email OR school_generated_id).
        // A generated ID can legitimately collide across schools/branches — e.g. in
        // the SHARED demo school every visitor's "Lekki" branch admin is
        // OLISKEY_LEKKI_ADM_0001 (same branch code, number resets per branch). So we
        // must not assume the first match is the right person: we pick the candidate
        // whose PASSWORD actually matches. This is also correct for live schools that
        // happen to share a school/branch code.
        //
        // Plain `equals` (not `mode: 'insensitive'`) on purpose: Postgres can't use
        // the @@index([email]) / @@unique(school_generated_id) indexes for a
        // case-insensitive comparison, so every login did a full table scan —
        // 50 concurrent logins took 34s in testing. Both columns are always written
        // in a fixed case (email lowercased, school_generated_id uppercased at
        // generation), so matching the identifier's case per-field is exact AND
        // hits the index.
        const candidates = await (getRawPrisma().user.findMany as any)({
            where: {
                OR: [
                    { email: normalizedIdentifier },
                    { school_generated_id: identifier.trim().toUpperCase() }
                ]
            },
            include: {
                school: true,
                branch: true
            }
        });

        if (!candidates || candidates.length === 0) {
            console.warn(`❌ [Auth] Login failed: User not found for identifier: ${identifier}`);
            throw new Error('Invalid credentials');
        }

        let user: any = null;
        for (const c of candidates) {
            if (c.password_hash && await bcrypt.compare(password, c.password_hash)) {
                user = c;
                break;
            }
        }
        if (!user) {
            console.warn(`❌ [Auth] Login failed: Password mismatch across ${candidates.length} account(s) for identifier: ${identifier}`);
            throw new Error('Invalid credentials');
        }

        // Lead DevSecOps: Step 1 of 2FA - Check if enabled for high-privilege roles
        const isHighPrivilege = ['ADMIN', 'SUPER_ADMIN', 'PROPRIETOR', 'TEACHER'].includes(user.role);
        if (user.two_factor_enabled && isHighPrivilege) {
            // Return a temporary token or flag indicating 2FA is required
            const mfaToken = jwt.sign(
                { id: user.id, purpose: 'mfa_verification' },
                config.jwtSecret,
                { expiresIn: '5m' }
            );
            return {
                requires2FA: true,
                mfaToken,
                userId: user.id
            };
        }

        // Check if email is verified (for parents and students, email verification is required)
        // Admins and Super Admins can bypass this for first-time login
        const requiresVerification = ['PARENT', 'STUDENT', 'TEACHER'].includes(user.role);
        if (requiresVerification && !user.email_verified) {
            return {
                requiresVerification: true,
                userId: user.id,
                email: user.email,
                message: 'Please verify your email before logging in'
            };
        }

        const { token, refreshToken } = await this.generateTokens(user);
        return { user, token, refreshToken };
    }

    static async verify2FALogin(mfaToken: string, code: string) {
        try {
            const decoded = jwt.verify(mfaToken, config.jwtSecret) as any;
            if (decoded.purpose !== 'mfa_verification') throw new Error('Invalid MFA token');

            const user = await prisma.user.findFirst({
                where: { id: decoded.id },
                include: { school: true, branch: true }
            });

            if (!user || !user.two_factor_secret) throw new Error('User or 2FA secret not found');

            const isValid = getAuthenticator().verify({
                token: code,
                secret: user.two_factor_secret
            });

            if (!isValid) throw new Error('Invalid 2FA code');

            const { token, refreshToken } = await this.generateTokens(user);
            return { user, token, refreshToken };
        } catch (err: any) {
            console.error('[AuthService] 2FA verification failed:', err.message);
            throw new Error('2FA verification failed');
        }
    }

    static async generateTokens(user: any) {
        let allowedBranchIds: string[] = user.allowed_branch_ids || [];

        // For Parents: Automatically authorize all branches where their children are enrolled
        if (user.role === 'PARENT') {
            const parentRecord = await (prisma.parent.findUnique as any)({
                where: { user_id: user.id },
                include: {
                    children: {
                        include: {
                            student: true
                        }
                    }
                }
            });

            if (parentRecord && parentRecord.children) {
                const childrenBranchIds = parentRecord.children
                    .map((pc: any) => pc.student?.branch_id)
                    .filter(Boolean);
                
                // Merge and unique
                allowedBranchIds = Array.from(new Set([...allowedBranchIds, ...childrenBranchIds]));
            }
        }

        const payload: any = {
            id: user.id,
            email: user.email,
            role: user.role,
            school_id: user.school_id,
            branch_id: user.branch_id,
            allowed_branch_ids: allowedBranchIds,
            // The demo auth path (auth.middleware.ts) trusts this claim directly instead
            // of re-querying the database like real logins do — without it, req.user.
            // school_generated_id is always undefined for demo sessions, which makes
            // BranchIdentityService.resolveForUser() return an empty ID and the header's
            // ID badge disappear on every reload.
            school_generated_id: user.school_generated_id || null,
        };

        // Mark demo tokens so the auth middleware routes them through the demo path,
        // which authorises ANY branch inside the visitor's sandbox DYNAMICALLY (root
        // or "<root>__<rand>"). Without this flag the token took the normal path and
        // was validated against the FROZEN allowed_branch_ids from login — so a
        // sub-branch created after login (or a stale token) 403'd, and the client
        // then cleared the branch and silently fell back to Main.
        if (user.is_demo) {
            payload.is_demo = true;
        }

        const refreshToken = jwt.sign(
            { ...payload, type: 'refresh' },
            config.refreshTokenSecret,
            {
                expiresIn: '7d',
                algorithm: 'HS256'
            }
        );

        // The session record (below) is keyed by this id. We embed the SAME id into the
        // access token as `sid` so the Session Management screen can tell "is this row
        // MY currently-active session" apart from every other device/browser session —
        // without this, is_current was never true (it compared the access token's raw
        // string to a value derived from the refresh token) and the "Revoke" button was
        // shown for the user's own live session too, letting a self-revoke silently log
        // them out mid-use with no recovery.
        const tokenId = refreshToken.split('.')[2];

        // Lead DevSecOps: Use short-lived Access Tokens (15m) and strictly enforce HS256
        const token = jwt.sign({ ...payload, sid: tokenId }, config.jwtSecret, {
            expiresIn: '15m',
            algorithm: 'HS256'
        });

        // Log successful login/token generation
        if (user.school_id) {
            await AuditService.createLog(user.school_id, user.branch_id, {
                user_id: user.id,
                action: 'Token Generation',
                entity_type: 'User',
                entity_id: user.id
            });

            // Create persistent session
            try {
                await (prisma as any).userSession.upsert({
                    where: { token_id: tokenId },
                    update: { last_active: new Date(), is_active: true },
                    create: {
                        user_id: user.id,
                        token_id: tokenId,
                        is_active: true,
                        // school_id is required on UserSession; without it the upsert
                        // failed (swallowed by the catch) so sessions never persisted
                        // and token refresh always failed. We're inside if(user.school_id).
                        school_id: user.school_id,
                        branch_id: user.branch_id ?? null
                    }
                });
            } catch (err) {
                console.warn('Could not upsert session record:', err);
            }
        }

        return { token, refreshToken };
    }

    static async refreshAccessToken(refreshToken: string) {
        try {
            // 1. Verify refresh token
            const decoded = jwt.verify(refreshToken, config.refreshTokenSecret) as any;
            if (decoded.type !== 'refresh') throw new Error('Invalid token type');

            // 2. Check if session is still active
            const session = await (prisma as any).userSession.findUnique({
                where: { token_id: refreshToken.split('.')[2] }
            });

            if (!session || !session.is_active) {
                throw new Error('Session inactive or revoked');
            }

            // 3. Find user
            const user = await prisma.user.findFirst({
                where: { id: decoded.id },
                include: { school: true, branch: true }
            });

            if (!user) throw new Error('User not found');

            // 4. Generate new tokens (Rotate refresh token).
            // Preserve the SESSION's branch scope carried in the (signed) refresh
            // token instead of rebuilding it from the raw DB row. Demo sessions run
            // in a per-session virtual branch that the persistent user row does NOT
            // carry, so rebuilding from the DB user would silently switch the active
            // branch on every refresh — making all branch-scoped data vanish until
            // re-login. The refresh token is server-signed, so its branch claims
            // cannot be forged; for real users it equals the DB branch (no change).
            const sessionUser = {
                ...user,
                branch_id: decoded.branch_id ?? user.branch_id,
                allowed_branch_ids: decoded.allowed_branch_ids ?? user.allowed_branch_ids ?? [],
            };

            // Optional: revoke old session
            await (prisma as any).userSession.update({
                where: { id: session.id },
                data: { is_active: false }
            });

            return await this.generateTokens(sessionUser);
        } catch (err: any) {
            console.error('[AuthService] Refresh failed:', err.message);
            throw new Error('Refresh token invalid or expired');
        }
    }

    /**
     * Verifies a Google ID token server-side against Google's own tokeninfo
     * endpoint — checks signature, expiry, AND that it was issued for THIS
     * app (aud must match our client ID). Without this, googleLogin would
     * trust whatever email the caller claims, letting anyone log in as any
     * registered user with a plain POST — no Google account needed at all.
     */
    static async verifyGoogleIdToken(idToken: string): Promise<{ email: string; name: string }> {
        let payload: any;
        try {
            const resp = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
                params: { id_token: idToken }
            });
            payload = resp.data;
        } catch (err: any) {
            throw new Error('Invalid or expired Google credential');
        }

        if (payload.aud !== config.googleClientId) {
            throw new Error('Google credential was not issued for this application');
        }
        if (payload.email_verified !== 'true' && payload.email_verified !== true) {
            throw new Error('Google account email is not verified');
        }
        if (!payload.email) {
            throw new Error('Google credential did not include an email address');
        }

        return { email: payload.email, name: payload.name || payload.given_name || 'Google User' };
    }

    static async googleLogin(idToken: string) {
        const { email } = await this.verifyGoogleIdToken(idToken);
        const normalizedEmail = email.trim().toLowerCase();

        // 1. Find user by email (email is not unique alone — compound key includes school_id)
        let user = await prisma.user.findFirst({
            where: { email: normalizedEmail },
            include: {
                school: true,
                branch: true
            }
        });

        if (!user) {
            console.warn(`❌ [Auth] Google Login failed: Account not found for ${normalizedEmail}`);
            throw new Error('This Google account is not registered. Please sign up first.');
        }

        const { token, refreshToken } = await this.generateTokens(user);
        return { user, token, refreshToken };
    }

    static async createUser(data: any) {
        return await prisma.$transaction(async (tx) => {
            // 1. Check if user exists
            let user = await tx.user.findFirst({
                where: { email: data.email.toLowerCase() }
            });

            if (user) {
                // An email belongs to exactly ONE person. We do NOT reuse/overwrite an
                // existing account (that silently changed someone's role + credentials and
                // made them disappear from their original list). Reject clearly so the new
                // account is always genuinely new and the shown credentials always work.
                throw Object.assign(
                    new Error(`This email is already registered to ${user.full_name || 'another account'}. Please use a different email.`),
                    { status: 409 }
                );
            } else {
                // 2. Create new user
                const hashedPassword = await bcrypt.hash(data.password, 10);
                const role = this.mapRole(data.role);
                
                user = await tx.user.create({
                    data: {
                        email: data.email.toLowerCase(),
                        password_hash: hashedPassword,
                        role: role,
                        school_id: data.school_id,
                        branch_id: data.branch_id || null,
                        full_name: data.full_name,
                        avatar_url: data.avatar_url || null,
                        initial_password: data.password || null,
                        email_verified: true
                    }
                });

            }

            // 3. Ensure membership
            const role = this.mapRole(data.role);
            await tx.schoolMembership.upsert({
                where: {
                    school_id_user_id: {
                        school_id: data.school_id,
                        user_id: user.id
                    }
                },
                create: {
                    school_id: data.school_id,
                    user_id: user.id,
                    base_role: role,
                    is_active: true
                },
                update: {
                    base_role: role,
                    is_active: true
                }
            });

            // 4. Generate School ID
            let schoolGeneratedId: string | null = null;
            if (data.school_id && data.branch_id) {
                try {
                    schoolGeneratedId = await IdGeneratorService.generateSchoolId(
                        data.school_id,
                        data.branch_id,
                        data.role,
                        tx
                    );
                    
                    await tx.user.update({
                        where: { id: user.id },
                        data: { school_generated_id: schoolGeneratedId }
                    });
                } catch (err: any) {
                    console.warn('[AuthService] ID generation failed:', err.message);
                }
            }

            // 5. Create role-specific profile
            const roleLower = data.role.toLowerCase();
            const profileData: any = {
                school_id: data.school_id,
                branch_id: data.branch_id || null,
                full_name: data.full_name,
                email: data.email.toLowerCase(),
                school_generated_id: schoolGeneratedId
            };

            if (roleLower === 'teacher') {
                await tx.teacher.upsert({
                    where: { user_id: user.id },
                    create: { ...profileData, user_id: user.id },
                    update: profileData
                });
            } else if (roleLower === 'student') {
                await tx.student.upsert({
                    where: { user_id: user.id },
                    create: { ...profileData, user_id: user.id },
                    update: profileData
                });
            } else if (roleLower === 'parent') {
                await tx.parent.upsert({
                    where: { user_id: user.id },
                    create: { ...profileData, user_id: user.id },
                    update: profileData
                });
            }

            SocketService.emitToSchool(data.school_id, 'auth:updated', { action: 'user_created', userId: user.id });
            // The username the admin is shown MUST be a real login identifier.
            // login() matches by email OR school_generated_id — never by a derived
            // "first-initial + name" handle. So we surface the global ID as the
            // username (falling back to email if ID generation failed) and echo the
            // initial password so the credentials shown actually work at sign-in.
            return {
                id: user.id,
                email: user.email,
                school_generated_id: schoolGeneratedId,
                schoolGeneratedId, // back-compat for any camelCase consumer
                username: schoolGeneratedId || user.email,
                initial_password: data.password || null,
                linked: false // creation always yields a brand-new account now
            };
        });
    }

    static async getMemberships(userId: string) {
        return await (prisma.schoolMembership.findMany as any)({
            where: { user_id: userId, is_active: true },
            include: { school: true }
        });
    }

    static async switchSchool(userId: string, schoolId: string) {
        const targetUser = await prisma.user.findFirst({ where: { id: userId } });
        if (!targetUser) throw new Error('User not found');
        const isSuperAdmin = (targetUser.role || '').toUpperCase() === 'SUPER_ADMIN';

        const membership = await prisma.schoolMembership.findUnique({
            where: {
                school_id_user_id: {
                    school_id: schoolId,
                    user_id: userId
                }
            }
        });

        // SUPER_ADMIN (platform operator) may enter any school for support; everyone
        // else must hold an active membership — preserving strict tenant isolation.
        if (!isSuperAdmin && (!membership || !membership.is_active)) {
            throw new Error('Not an active member of this school');
        }

        // Realign branch_id to the TARGET school. Without this the user keeps the
        // OLD school's branch_id, so every row they create lands on a branch that
        // belongs to a different school (and branch resolution bounces them around).
        // Prefer the branch named on their membership, else the school's Main Branch.
        const mainBranch = await prisma.branch.findFirst({
            where: { school_id: schoolId, is_main: true }
        });
        const targetBranchId = membership?.branch_id || mainBranch?.id || null;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { school_id: schoolId, branch_id: targetBranchId }
        });

        const { token, refreshToken } = await this.generateTokens(user);
        SocketService.emitToSchool(schoolId, 'auth:updated', { action: 'switch_school', userId });
        return { token, refreshToken, user: { ...user, role: membership?.base_role || user.role } };
    }

    static async updatePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await getRawPrisma().user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            throw new Error('Incorrect current password');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { 
                password_hash: hashedPassword,
                initial_password: newPassword
            }
        });

        if (updatedUser.school_id) {
            SocketService.emitToSchool(updatedUser.school_id, 'auth:updated', { action: 'password_update', userId });
        }
        return { success: true, message: 'Password updated successfully' };
    }

    /**
     * Admin changes a user's password directly
     */
    static async adminChangePassword(
        userId: string,
        newPassword: string,
        adminId: string,
        adminSchoolId?: string,
        adminRole?: string
    ) {
        // Cross-tenant protection: a school admin may only act on users in their own
        // school. SUPER_ADMIN (platform operator) is exempt.
        await this.assertSameTenant(userId, adminSchoolId, adminRole);

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password_hash: hashedPassword,
                initial_password: newPassword // Store for admin visibility
            }
        });

        // Log the password change for audit
        console.log(`[AUTH] Admin ${adminId} changed password for user ${userId} at ${new Date().toISOString()}`);

        return { success: true, message: 'Password changed successfully' };
    }

    /**
     * Generate a new password for a user
     */
    static async resetUserPassword(userId: string, adminSchoolId?: string, adminRole?: string): Promise<string> {
        // Cross-tenant protection (see adminChangePassword).
        await this.assertSameTenant(userId, adminSchoolId, adminRole);

        const newPassword = this.generateRandomPassword();
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password_hash: hashedPassword,
                initial_password: newPassword
            }
        });

        return newPassword;
    }

    /**
     * Ensures the target user belongs to the acting admin's school.
     * SUPER_ADMIN bypasses (platform-wide operator). Throws on violation.
     */
    private static async assertSameTenant(targetUserId: string, adminSchoolId?: string, adminRole?: string) {
        if ((adminRole || '').toUpperCase() === 'SUPER_ADMIN') return;

        if (!adminSchoolId) {
            throw new Error('Access denied: missing tenant context');
        }

        const target = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { school_id: true }
        });

        if (!target || target.school_id !== adminSchoolId) {
            throw new Error('Access denied: user belongs to a different school');
        }
    }

    /**
     * Forgot Password Flow - Part 1: Request Reset
     */
    static async forgotPassword(email: string) {
        const user = await prisma.user.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            throw new Error('This email is not registered in our system. Please check your spelling or sign up.');
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

        await (prisma.verificationCode.create as any)({
            data: {
                user_id: user.id,
                email: user.email,
                code: code,
                purpose: 'password_reset',
                expires_at: expiresAt,
                school_id: user.school_id
            }
        });

        await EmailService.sendPasswordResetEmail(user.email, user.full_name || 'User', code);

        return { success: true, message: 'Reset code sent to your email.' };
    }

    /**
     * Forgot Password Flow - Part 2: Verify and Reset
     */
    static async resetPassword(email: string, code: string, newPassword: string) {
        const verification = await prisma.verificationCode.findFirst({
            where: {
                email: email.toLowerCase(),
                code: code,
                purpose: 'password_reset',
                used_at: null,
                expires_at: { gt: new Date() }
            }
        });

        if (!verification) {
            throw new Error('Invalid or expired reset code');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.user.update({
            where: { id: verification.user_id },
            data: { 
                password_hash: hashedPassword,
                initial_password: newPassword // For admin visibility/recovery if needed
            }
        });

        await prisma.verificationCode.update({
            where: { id: verification.id },
            data: { used_at: new Date() }
        });

        return { success: true, message: 'Password has been reset successfully.' };
    }

    /**
     * Generate a random secure password
     */
    private static generateRandomPassword(length: number = 10): string {
        const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lowercase = 'abcdefghjkmnpqrstuvwxyz';
        const numbers = '23456789';
        const special = '!@#$%';
        
        const allChars = uppercase + lowercase + numbers + special;
        let password = '';
        
        // Ensure at least one of each type
        password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
        password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
        password += numbers.charAt(Math.floor(Math.random() * numbers.length));
        password += special.charAt(Math.floor(Math.random() * special.length));
        
        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    static async resendVerification(email: string) {
        const user = await prisma.user.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const result = await VerificationService.resendVerification(
            user.id,
            user.email,
            user.full_name,
            'email_verification'
        );

        return result;
    }

    static async confirmEmail(userId: string) {
        await prisma.user.update({
            where: { id: userId },
            data: { email_verified: true }
        });
        return { success: true, message: 'Email confirmed' };
    }

    static async verifyEmail(token: string, enteredCode: string) {
        try {
            const decoded = jwt.verify(token, config.jwtSecret) as any;
            if (decoded.purpose !== 'otp_verification') {
                throw new Error('Invalid token purpose');
            }

            if (decoded.code !== enteredCode) {
                throw new Error('Incorrect verification code');
            }
            
            await prisma.user.update({
                where: { id: decoded.userId },
                data: { email_verified: true }
            });

            const user = await prisma.user.findFirst({ where: { id: decoded.userId } });
            
            if (user && user.school_id) {
                // Activate the new school
                await prisma.school.update({
                    where: { id: user.school_id },
                    data: { subscription_status: 'active' }
                });
            }

            if (!user) throw new Error('User not found');

            const { token: authToken, refreshToken } = await this.generateTokens(user);
            return { success: true, message: 'Email confirmed successfully', token: authToken, refreshToken, user };
        } catch (err: any) {
            throw new Error('Invalid or expired verification link.');
        }
    }

    static async updateEmail(userId: string, newEmail: string) {
        const normalized = newEmail.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
            throw new Error('Please enter a valid email address.');
        }

        const existing = await prisma.user.findUnique({ where: { id: userId } });
        if (!existing) throw new Error('User not found');

        const oldEmail = existing.email;

        if (normalized === oldEmail.toLowerCase()) {
            throw new Error('The new email is the same as your current email.');
        }

        const taken = await prisma.user.findFirst({ where: { email: normalized } });
        if (taken && taken.id !== userId) {
            throw new Error('That email is already in use by another account.');
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { email: normalized, email_verified: false }
        });

        // Trigger new verification code for the new email
        await VerificationService.createVerification(
            user.id,
            user.email,
            user.full_name,
            'email_verification'
        );

        // Send security notification to the OLD email (non-blocking)
        EmailService.sendEmailChangeSecurityAlert(oldEmail, normalized, user.full_name)
            .catch(err => console.error('[updateEmail] Security alert failed:', err));

        return {
            success: true,
            message: `A 6-digit code has been sent to ${normalized}. Enter it below to activate the new email.`,
            email: normalized
        };
    }

    /**
     * Verify the OTP a user typed after changing their email.
     * Marks email_verified=true and returns fresh auth tokens so the session
     * continues seamlessly under the new email.
     */
    static async verifyEmailChange(userId: string, code: string) {
        if (!userId || !code) throw new Error('userId and code are required');

        const result = await VerificationService.verifyCode(userId, code.trim(), 'email_verification');
        if (!result.success) {
            throw new Error(result.message);
        }

        await prisma.user.update({
            where: { id: userId },
            data: { email_verified: true }
        });

        const user = await prisma.user.findFirst({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const { token, refreshToken } = await this.generateTokens(user);
        return {
            success: true,
            message: 'Email verified successfully.',
            token,
            refreshToken,
            user
        };
    }

    static get DEMO_SCHOOL_ID() { return config.demoSchoolId; }
    static get DEMO_BRANCH_ID() { return config.demoBranchId; }

    /**
     * Role-to-email mapping for demo users.
     * IDs are now dynamically generated using the SCHOOL_BRANCH_ROLE_NUMBER pattern.
     */
    private static DEMO_USER_EMAILS: Record<string, { email: string; role: string; name: string }> = {
        admin: { email: 'admin@demo.com', role: 'ADMIN', name: 'School Admin' },
        teacher: { email: 'john.smith@demo.com', role: 'TEACHER', name: 'John Smith' },
        parent: { email: 'parent1@demo.com', role: 'PARENT', name: 'Demo Parent' },
        student: { email: 'student1@demo.com', role: 'STUDENT', name: 'Demo Student' },
        proprietor: { email: 'proprietor@demo.com', role: 'PROPRIETOR', name: 'Proprietor' },
        inspector: { email: 'inspector@demo.com', role: 'INSPECTOR', name: 'Inspector' },
        examofficer: { email: 'examofficer@demo.com', role: 'EXAM_OFFICER', name: 'Exam Officer' },
        complianceofficer: { email: 'compliance@demo.com', role: 'COMPLIANCE_OFFICER', name: 'Compliance Officer' },
    };

    /**
     * Generate a cryptographically signed JWT demo token for a specific role.
     * These tokens are server-side generated and cannot be forged by clients.
     * 
     * @param role The role to assume (admin, teacher, etc.)
     * @param ip The client IP address used for session isolation
     */
    static async generateDemoToken(role: string, ip: string = '127.0.0.1') {
        console.log(`[AUTH] 🚀 Starting Demo Login flow for role: ${role} (IP: ${ip})`);
        const roleKey = role.toLowerCase();
        const fallbackUser = this.DEMO_USER_EMAILS[roleKey];

        if (!fallbackUser) {
            console.error(`[AUTH] ❌ Invalid demo role requested: ${role}`);
            throw new Error(`Invalid demo role: ${role}. Valid roles: ${Object.keys(this.DEMO_USER_EMAILS).join(', ')}`);
        }

        try {
            // Lead DevSecOps: Dynamic Persistence ID Calculation
            const school = await prisma.school.findUnique({ where: { id: this.DEMO_SCHOOL_ID }, select: { code: true } });
            const schoolCode = school?.code?.toUpperCase() || 'OLISKEY';
            
            // IP-Based Session Isolation (the branch id stays per-session for sandboxing,
            // but the branch CODE shown in the global ID must be a clean, readable code —
            // not an opaque IP hash. So all demo IDs read e.g. OLISKEY_MAIN_ADM_0001.
            const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 8);
            const virtualBranchId = `demo-v-${ipHash}`;
            // Name matches the branch code shown in IDs (OLISKEY_MAIN_...).
            const virtualBranchName = 'MAIN';
            const branchCode = 'MAIN';

            // Persistence ID pattern: SCHOOL_BRANCH_ROLE_NUMBER
            const roleCodes: Record<string, string> = { ADMIN: 'ADM', TEACHER: 'TCH', STUDENT: 'STU', PARENT: 'PAR' };
            const rCode = roleCodes[fallbackUser.role.toUpperCase()] || fallbackUser.role.toUpperCase().substring(0, 3);
            const persistenceId = `${schoolCode}_${branchCode}_${rCode}_0001`;

            console.log(`[AUTH] 🔍 Checking demo user in sandbox: ${persistenceId}`);
            
            // Try to find the user in the sandbox first
            let demoUser = await (prisma.user.findUnique as any)({ 
                where: { id: persistenceId },
                include: { school: true, branch: true }
            });

            // (school_id, code) is UNIQUE, so only one branch in the demo school can
            // carry the readable "MAIN" code. The demo is a shared sandbox (the demo
            // user id above is the same for every visitor), so converge every session
            // on that single MAIN branch: reuse it when it exists, otherwise create
            // this session's virtual branch as MAIN.
            //
            // The previous code INSERTed a per-IP `demo-v-<ip>` branch hardcoded to
            // code "MAIN" with `ON CONFLICT (id)` — which never matches the (school_id,
            // code) constraint, so the SECOND visitor onward crashed with a 400
            // unique-violation and could never enter the demo.
            const existingMain = await prisma.branch.findFirst({
                where: { school_id: this.DEMO_SCHOOL_ID, code: branchCode },
                select: { id: true }
            });
            const effectiveBranchId = existingMain?.id || virtualBranchId;

            // If not found, it might be the global one or we need to seed
            if (!demoUser) {
                console.log(`[AUTH] 🏗️ Sandbox user not found, initializing virtual branch and seeding...`);

                if (!existingMain) {
                    await prisma.$executeRaw`
                        INSERT INTO "Branch" (id, name, code, school_id, is_demo_virtual, is_main, last_active_at, updated_at)
                        VALUES (${virtualBranchId}, ${virtualBranchName}, ${branchCode}, ${this.DEMO_SCHOOL_ID}, true, true, NOW(), NOW())
                        ON CONFLICT (id) DO UPDATE SET name = ${virtualBranchName}, is_main = true, last_active_at = NOW(), updated_at = NOW()
                    `;
                } else {
                    // Keep the shared MAIN branch marked active.
                    await prisma.$executeRaw`
                        UPDATE "Branch" SET last_active_at = NOW(), updated_at = NOW() WHERE id = ${effectiveBranchId}
                    `;
                }

                await DemoSeederService.seedBranchData(this.DEMO_SCHOOL_ID, effectiveBranchId, ipHash);

                demoUser = await (prisma.user.findUnique as any)({
                    where: { id: persistenceId },
                    include: { school: true, branch: true }
                });
            }

            if (!demoUser) {
                throw new Error(`Failed to initialize or find scoped demo user for ${role} in sandbox ${virtualBranchId}`);
            }

            console.log(`[AUTH] ✅ Demo user verified: ${demoUser.full_name} (${demoUser.id})`);

            // Override the user's branch for this session. The demo user row is
            // per-visitor (keyed by IP), so any branches the admin assigned to this
            // user belong to THIS sandbox — preserve them (merged with the sandbox
            // root) so e.g. a teacher granted a second branch can actually switch to
            // it. Hard-coding [virtualBranchId] here previously erased the grant.
            const assignedBranches = Array.isArray((demoUser as any).allowed_branch_ids)
                ? (demoUser as any).allowed_branch_ids
                : [];

            // Authorise the WHOLE sandbox: the demo's sub-branches (e.g. "Lekki") are
            // ids shaped "<root>__<rand>". Without listing them in allowed_branch_ids,
            // the frontend treated them as unauthorised and snapped the view back to
            // Main on every refresh, and actions fell back to the Main branch. List
            // every branch under this sandbox root so switching + actions stick.
            const sandboxRoot = String(effectiveBranchId).split('__')[0];
            let sandboxBranchIds: string[] = [];
            try {
                const rows = await prisma.branch.findMany({
                    where: {
                        school_id: this.DEMO_SCHOOL_ID,
                        OR: [{ id: sandboxRoot }, { id: { startsWith: sandboxRoot + '__' } }]
                    },
                    select: { id: true }
                });
                sandboxBranchIds = rows.map(r => r.id);
            } catch { /* fall back to root only */ }

            const sessionUser = {
                ...demoUser,
                branch_id: effectiveBranchId,
                allowed_branch_ids: Array.from(new Set([effectiveBranchId, ...sandboxBranchIds, ...assignedBranches])),
                is_demo: true,
                demo_ip: ip
            };

            const { token, refreshToken } = await this.generateTokens(sessionUser);
            return {
                token,
                refreshToken,
                user: sessionUser,
            };
        } catch (error: any) {
            console.error(`[AUTH] 💥 Error in generateDemoToken:`, error);
            throw error;
        }
    }

    static getDemoRoles() {
        return Object.keys(this.DEMO_USER_EMAILS).map((key) => ({
            role: key,
            email: this.DEMO_USER_EMAILS[key].email,
            full_name: this.DEMO_USER_EMAILS[key].name,
        }));
    }

    static async getSessions(userId: string) {
        return (prisma as any).userSession.findMany({
            where: { user_id: userId, is_active: true },
            orderBy: { created_at: 'desc' },
            take: 10
        });
    }

    static async revokeSession(userId: string, sessionId: string, currentSid?: string) {
        const target = await (prisma as any).userSession.findFirst({ where: { id: sessionId, user_id: userId } });
        if (!target) throw new Error('Session not found');
        // Defense-in-depth: never let a self-revoke delete the session backing the
        // caller's own live refresh token (see admin-hub SessionService#revokeSession
        // for the same guard, added after this exact gap silently logged users out).
        if (currentSid && target.token_id === currentSid) {
            throw new Error('Cannot revoke your own active session');
        }
        return (prisma as any).userSession.update({
            where: { id: sessionId, user_id: userId },
            data: { is_active: false }
        });
    }

    static async revokeAllSessions(userId: string, currentSid?: string) {
        return (prisma as any).userSession.updateMany({
            where: {
                user_id: userId,
                is_active: true,
                ...(currentSid ? { NOT: { token_id: currentSid } } : {})
            },
            data: { is_active: false }
        });
    }
}
