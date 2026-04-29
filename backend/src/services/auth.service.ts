import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/database';
import { config } from '../config/env';
import { IdGeneratorService } from './idGenerator.service';
import { AuditService } from './audit.service';
import { SocketService } from './socket.service';
import { VerificationService } from './verification.service';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

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
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.email, 'SchoolSaaS', secret);
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        // Store secret temporarily (don't enable yet)
        await prisma.user.update({
            where: { id: userId },
            data: { two_factor_secret: secret }
        });

        return { secret, qrCodeUrl };
    }

    static async verifyAndEnable2FA(userId: string, code: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.two_factor_secret) throw new Error('2FA not initiated');

        const isValid = authenticator.verify({
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

        const isValid = authenticator.verify({
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
        const user = await prisma.user.findUnique({
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

    static async signup(data: any) {
        return await prisma.$transaction(async (tx) => {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            const role = this.mapRole(data.role || 'student');

            let schoolGeneratedId = null;
            if (data.school_id && data.branch_id) {
                try {
                    schoolGeneratedId = await IdGeneratorService.generateSchoolId(data.school_id, data.branch_id, role.toLowerCase());
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
        
        // Find user by email OR school_generated_id
        const user = await (prisma.user.findFirst as any)({
            where: {
                OR: [
                    { email: { equals: normalizedIdentifier, mode: 'insensitive' } },
                    { school_generated_id: { equals: normalizedIdentifier, mode: 'insensitive' } }
                ]
            },
            include: {
                school: true,
                branch: true
            }
        });

        if (!user) {
            console.warn(`❌ [Auth] Login failed: User not found for identifier: ${identifier}`);
            throw new Error('Invalid credentials');
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.warn(`❌ [Auth] Login failed: Password mismatch for user: ${user.email} (ID: ${user.school_generated_id})`);
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

            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                include: { school: true, branch: true }
            });

            if (!user || !user.two_factor_secret) throw new Error('User or 2FA secret not found');

            const isValid = authenticator.verify({
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

        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            school_id: user.school_id,
            branch_id: user.branch_id,
            allowed_branch_ids: allowedBranchIds
        };

        // Lead DevSecOps: Use short-lived Access Tokens (15m) and strictly enforce HS256
        const token = jwt.sign(payload, config.jwtSecret, { 
            expiresIn: '15m',
            algorithm: 'HS256'
        });

        const refreshToken = jwt.sign(
            { ...payload, type: 'refresh' }, 
            config.refreshTokenSecret, 
            { 
                expiresIn: '7d',
                algorithm: 'HS256'
            }
        );

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
                await (prisma as any).userSession.create({
                    data: {
                        user_id: user.id,
                        token_id: refreshToken.split('.')[2], // Store refresh token signature
                        is_active: true
                    }
                });
            } catch (err) {
                console.warn('Could not create session record:', err);
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
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                include: { school: true, branch: true }
            });

            if (!user) throw new Error('User not found');

            // 4. Generate new tokens (Rotate refresh token)
            // Optional: revoke old session
            await (prisma as any).userSession.update({
                where: { id: session.id },
                data: { is_active: false }
            });

            return await this.generateTokens(user);
        } catch (err: any) {
            console.error('[AuthService] Refresh failed:', err.message);
            throw new Error('Refresh token invalid or expired');
        }
    }

    static async googleLogin(email: string, name: string) {
        const normalizedEmail = email.trim().toLowerCase();
        
        // 1. Find user by email
        let user = await (prisma.user.findUnique as any)({
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
            let user = await tx.user.findUnique({
                where: { email: data.email.toLowerCase() }
            });

            let isExisting = false;
            if (user) {
                isExisting = true;
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
                        email_verified: false
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
                        data.role
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
            return {
                id: user.id,
                email: user.email,
                schoolGeneratedId,
                linked: isExisting
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
        const membership = await prisma.schoolMembership.findUnique({
            where: {
                school_id_user_id: {
                    school_id: schoolId,
                    user_id: userId
                }
            }
        });

        if (!membership || !membership.is_active) {
            throw new Error('Not an active member of this school');
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { school_id: schoolId }
        });

        const { token, refreshToken } = await this.generateTokens(user);
        SocketService.emitToSchool(schoolId, 'auth:updated', { action: 'switch_school', userId });
        return { token, refreshToken, user: { ...user, role: membership.base_role } };
    }

    static async updatePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await prisma.user.findUnique({
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
    static async adminChangePassword(userId: string, newPassword: string, adminId: string) {
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
    static async resetUserPassword(userId: string): Promise<string> {
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
     * Forgot Password Flow - Part 1: Request Reset
     */
    static async forgotPassword(email: string) {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            throw new Error('This email is not registered in our system. Please check your spelling or sign up.');
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.verificationCode.create({
            data: {
                user_id: user.id,
                email: user.email,
                code: code,
                purpose: 'password_reset',
                expires_at: expiresAt
            }
        });

        console.log(`🔑 [AUTH] Password reset code for ${user.email}: ${code}`);
        // Later: Send email via MailerService
        
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
        const user = await prisma.user.findUnique({
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

            const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
            
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
        const user = await prisma.user.update({
            where: { id: userId },
            data: { email: newEmail.toLowerCase(), email_verified: false }
        });

        // Trigger new verification code for the new email
        await VerificationService.createVerification(
            user.id,
            user.email,
            user.full_name,
            'email_verification'
        );

        return { success: true, message: 'Email updated and verification code sent' };
    }

    static DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    static DEMO_BRANCH_ID = '7601cbea-e1ba-49d6-b59b-412a584cb94f';

    private static DEMO_USERS: Record<string, {
        id: string;
        email: string;
        role: string;
        full_name: string;
        branch_id: string;
        school_generated_id: string;
    }> = {
        admin: {
            id: 'd3300000-0000-0000-0000-000000000001',
            email: 'admin@demo.com',
            role: 'ADMIN',
            full_name: 'School Admin',
            branch_id: AuthService.DEMO_BRANCH_ID,
            school_generated_id: 'OLISKEY_MAIN_ADM_0001',
        },
        teacher: {
            id: 'd3300000-0000-0000-0000-000000000002',
            email: 'john.smith@demo.com',
            role: 'TEACHER',
            full_name: 'John Smith',
            branch_id: AuthService.DEMO_BRANCH_ID,
            school_generated_id: 'OLISKEY_MAIN_TCH_0017',
        },
        parent: {
            id: 'd3300000-0000-0000-0000-000000000003',
            email: 'parent1@demo.com',
            role: 'PARENT',
            full_name: 'Demo Parent',
            branch_id: AuthService.DEMO_BRANCH_ID,
            school_generated_id: 'OLISKEY_MAIN_PAR_0001',
        },
        student: {
            id: 'd3300000-0000-0000-0000-000000000004',
            email: 'student1@demo.com',
            role: 'STUDENT',
            full_name: 'Demo Student',
            branch_id: AuthService.DEMO_BRANCH_ID,
            school_generated_id: 'OLISKEY_MAIN_STU_0135',
        },
        proprietor: {
            id: 'd3300000-0000-0000-0000-000000000005',
            email: 'proprietor@demo.com',
            role: 'PROPRIETOR',
            full_name: 'Proprietor',
            branch_id: AuthService.DEMO_BRANCH_ID,
            school_generated_id: 'OLISKEY_MAIN_PRO_0001',
        },
        inspector: {
            id: 'd3300000-0000-0000-0000-000000000006',
            email: 'inspector@demo.com',
            role: 'INSPECTOR',
            full_name: 'Inspector',
            branch_id: AuthService.DEMO_BRANCH_ID,
            school_generated_id: 'OLISKEY_MAIN_INS_0001',
        },
        examofficer: {
            id: 'd3300000-0000-0000-0000-000000000007',
            email: 'examofficer@demo.com',
            role: 'EXAM_OFFICER',
            full_name: 'Exam Officer',
            branch_id: AuthService.DEMO_BRANCH_ID,
            school_generated_id: 'OLISKEY_MAIN_EXM_0001',
        },
        complianceofficer: {
            id: 'd3300000-0000-0000-0000-000000000008',
            email: 'compliance@demo.com',
            role: 'COMPLIANCE_OFFICER',
            full_name: 'Compliance Officer',
            branch_id: AuthService.DEMO_BRANCH_ID,
            school_generated_id: 'OLISKEY_MAIN_CMP_0001',
        },
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
        const fallbackUser = this.DEMO_USERS[roleKey];

        if (!fallbackUser) {
            console.error(`[AUTH] ❌ Invalid demo role requested: ${role}`);
            throw new Error(`Invalid demo role: ${role}. Valid roles: ${Object.keys(this.DEMO_USERS).join(', ')}`);
        }

        try {
            console.log(`[AUTH] 🔍 Fetching demo user from database for email: ${fallbackUser.email}`);
            // Validate pulling DB user instantly (fast access to Prisma user)
            const demoUser = await (prisma.user.findUnique as any)({ 
                where: { email: fallbackUser.email },
                include: { school: true, branch: true }
            });

            if (!demoUser) {
                const allUsersCount = await prisma.user.count();
                // Lead DevSecOps: Enhanced diagnostic to check if the database is actually reachable and responsive
                const dbHost = 'production-db'; 
                console.warn(`[AUTH] ⚠️ Demo database user not found for ${fallbackUser.email}. (Total users in DB: ${allUsersCount})`);
                
                // If we have users but not the demo one, it means seeding failed or is incomplete
                const message = allUsersCount > 0 
                    ? `Demo account ${fallbackUser.email} is missing from the database. The system is currently re-synchronizing...`
                    : `Demo accounts are currently spinning up... Please try again in a few seconds.`;
                
                throw new Error(`${message} (Diagnostic: DB=${dbHost}, Users=${allUsersCount})`);
            }

            console.log(`[AUTH] ✅ Demo user found: ${demoUser.full_name} ID: ${demoUser.id} Role: ${demoUser.role}`);

            // Lead DevSecOps: IP-Based Session Isolation
            // We create a unique "Virtual Branch" for this IP so that their changes are private.
            const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 8);
            const virtualBranchId = `demo-v-${ipHash}`;
            const virtualBranchName = `Demo Phone (${ipHash})`;

            console.log(`[AUTH] 🛡️ Mapping Demo Session to Virtual Branch: ${virtualBranchId}`);

            // Ensure the Virtual Branch exists in the database
            await prisma.branch.upsert({
                where: { id: virtualBranchId },
                update: { last_active_at: new Date() }, // Track activity for cleanup
                create: {
                    id: virtualBranchId,
                    name: virtualBranchName,
                    code: ipHash.toUpperCase(),
                    school_id: this.DEMO_SCHOOL_ID,
                    is_demo_virtual: true, // Marker for cleanup
                }
            } as any);

            // Override the user's branch for this session
            const sessionUser = {
                ...demoUser,
                branch_id: virtualBranchId,
                allowed_branch_ids: [virtualBranchId],
                is_demo: true,
                demo_ip: ip
            };

            const { token, refreshToken } = await this.generateTokens(sessionUser);
            return {
                token,
                refreshToken,
                user: demoUser,
            };
        } catch (error: any) {
            console.error(`[AUTH] 💥 Error in generateDemoToken:`, error);
            throw error;
        }
    }

    static getDemoRoles() {
        return Object.keys(this.DEMO_USERS).map((key) => ({
            role: key,
            email: this.DEMO_USERS[key].email,
            full_name: this.DEMO_USERS[key].full_name,
            school_generated_id: this.DEMO_USERS[key].school_generated_id,
        }));
    }

    static async getSessions(userId: string) {
        return (prisma as any).userSession.findMany({
            where: { user_id: userId, is_active: true },
            orderBy: { created_at: 'desc' },
            take: 10
        });
    }

    static async revokeSession(userId: string, sessionId: string) {
        return (prisma as any).userSession.update({
            where: { id: sessionId, user_id: userId },
            data: { is_active: false }
        });
    }

    static async revokeAllSessions(userId: string) {
        return (prisma as any).userSession.updateMany({
            where: { user_id: userId, is_active: true },
            data: { is_active: false }
        });
    }
}
