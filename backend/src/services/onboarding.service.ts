import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { EmailService } from './email.service';
import { IdGeneratorService } from './idGenerator.service';
import { VerificationService } from './verification.service';
import { generateBranchCode } from '../utils/branchHelper';

export interface OnboardingData {
    schoolName: string;
    schoolCode: string;
    schoolEmail: string;
    phone: string;
    address?: string;
    state?: string;
    logoUrl?: string;
    mainBranchName: string;
    mainBranchCode: string;
    additionalBranches?: Array<{ name: string; code: string }>;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    planType: 'free' | 'basic' | 'premium' | 'enterprise';
}

export interface OnboardingResult {
    success: boolean;
    message: string;
    data?: {
        schoolId: string;
        schoolCode: string;
        schoolName: string;
        mainBranchId: string;
        mainBranchCode: string;
        mainBranchName: string;
        adminUserId: string;
        adminEmail: string;
        adminName: string;
        adminSchoolGeneratedId: string;
        planType: string;
        trialEndsAt: string;
    };
}

export class OnboardingService {
    static async createSchoolWithSetup(data: OnboardingData): Promise<OnboardingResult> {
        const schoolCode = data.schoolCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        const mainBranchCode = data.mainBranchCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

        if (!schoolCode) throw new Error('School code is required and must contain letters or numbers.');
        if (!mainBranchCode) throw new Error('Branch code is required and must contain letters or numbers.');

        // Check for existing school code
        const existingCode = await prisma.school.findUnique({
            where: { code: schoolCode }
        });
        
        if (existingCode) {
            if (!existingCode.is_onboarded) {
                console.log(`🧹 [Onboarding] Cleaning up partially configured school record: ${existingCode.id}`);
                await prisma.school.delete({ where: { id: existingCode.id } });
            } else {
                throw new Error(`School code "${schoolCode}" is already taken and active. Please choose a different one.`);
            }
        }

        // Check for existing admin email
        const existingUser = await prisma.user.findUnique({
            where: { email: data.adminEmail }
        });
        if (existingUser) {
            await EmailService.sendAccountLookupEmail(data.adminEmail);
            throw new Error('This email is already associated with an account. We have sent an email to your inbox listing all accounts linked to this email address. Please check your inbox.');
        }

        const schoolSlug = data.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
        const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const passwordHash = await bcrypt.hash(data.adminPassword, 12);

        const preparedAdditionalBranches = (data.additionalBranches || [])
            .map((b, index) => ({
                name: b.name || 'Branch ' + (index + 2),
                code: b.code || generateBranchCode(b.name || 'Branch', index),
                is_main: false,
            }));

        const result = await prisma.$transaction(async (tx) => {
            const school = await tx.school.create({
                data: {
                    name: data.schoolName,
                    code: schoolCode,
                    email: data.schoolEmail,
                    contact_email: data.schoolEmail,
                    phone: data.phone,
                    address: data.address || null,
                    state: data.state || null,
                    logo_url: data.logoUrl || null,
                    slug: schoolSlug,
                    subscription_status: 'pending_verification',
                    plan_type: data.planType,
                    trial_ends_at: trialEndsAt,
                    is_active: true,
                    is_onboarded: false,
                    onboarding_step: 1,
                }
            });
            const schoolId = school.id;

            const mainBranch = await tx.branch.create({
                data: {
                    school_id: schoolId,
                    name: data.mainBranchName || 'Main Campus',
                    code: mainBranchCode,
                    is_main: true,
                }
            });
            const mainBranchId = mainBranch.id;

            if (preparedAdditionalBranches.length > 0) {
                const branchesToCreate = preparedAdditionalBranches.map((b, index) => {
                    const code = b.code || generateBranchCode(b.name, index);
                    return {
                        ...b,
                        school_id: schoolId,
                        code: code,
                    };
                });

                // Debugging: Inspect every single record before insertion
                console.log('[DEBUG] Prepared branchesToCreate:', JSON.stringify(branchesToCreate, null, 2));

                // Validate payload
                branchesToCreate.forEach((b, i) => {
                    if (!b.code) throw new Error(`[CRITICAL] Branch code missing at index ${i}: ${JSON.stringify(b)}`);
                });

                await tx.branch.createMany({ data: branchesToCreate });
            }

            let adminSchoolGeneratedId: string;
            try {
                const generatedId = await IdGeneratorService.generateSchoolId(schoolId, mainBranchId, 'admin', tx);
                adminSchoolGeneratedId = `${generatedId}_${require('crypto').randomBytes(2).toString('hex').toUpperCase()}`;
            } catch (idErr: any) {
                console.warn('[Onboarding] IdGenerator fallback:', idErr.message);
                const timestampSuffix = Date.now().toString().slice(-6);
                adminSchoolGeneratedId = `${schoolCode}_${mainBranchCode}_ADM_${timestampSuffix}_${require('crypto').randomBytes(2).toString('hex').toUpperCase()}`;
            }

            const adminUser = await tx.user.create({
                data: {
                    email: data.adminEmail,
                    password_hash: passwordHash,
                    full_name: data.adminName,
                    role: 'ADMIN',
                    school_id: schoolId,
                    branch_id: mainBranchId,
                    school_generated_id: adminSchoolGeneratedId,
                    email_verified: false,
                    is_active: true,
                }
            });
            const adminUserId = adminUser.id;

            await tx.schoolMembership.create({
                data: {
                    school_id: schoolId,
                    user_id: adminUserId,
                    base_role: 'ADMIN',
                    is_active: true,
                }
            });

            return {
                schoolId,
                mainBranchId,
                adminUserId,
                adminSchoolGeneratedId,
            };
        });

        try {
            await VerificationService.createVerification(
                result.adminUserId,
                data.adminEmail,
                data.adminName,
                'email_verification'
            );
        } catch (otpError: any) {
            console.error('[Onboarding] Failed to send OTP:', otpError.message);
        }

        return {
            success: true,
            message: 'School created successfully! Please check your email for the verification code.',
            data: {
                schoolId: result.schoolId,
                schoolCode,
                schoolName: data.schoolName,
                mainBranchId: result.mainBranchId,
                mainBranchCode,
                mainBranchName: data.mainBranchName,
                adminUserId: result.adminUserId,
                adminEmail: data.adminEmail,
                adminName: data.adminName,
                adminSchoolGeneratedId: result.adminSchoolGeneratedId,
                planType: data.planType,
                trialEndsAt: trialEndsAt.toISOString(),
            }
        };
    }
}
