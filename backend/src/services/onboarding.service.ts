import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { IdGeneratorService } from './idGenerator.service';
import { VerificationService } from './verification.service';

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

        const existingCode = await prisma.school.findUnique({
            where: { code: schoolCode }
        });
        if (existingCode) throw new Error(`School code "${schoolCode}" is already taken. Please choose a different one.`);

        const schoolSlug = data.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
        const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const passwordHash = await bcrypt.hash(data.adminPassword, 12);

        const preparedAdditionalBranches = (data.additionalBranches || [])
            .filter(b => b.name && b.code)
            .map(b => ({
                school_id: '__SCHOOL_ID_PLACEHOLDER__',
                name: b.name,
                code: b.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
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
                    name: data.mainBranchName,
                    code: mainBranchCode,
                    is_main: true,
                }
            });
            const mainBranchId = mainBranch.id;

            if (preparedAdditionalBranches.length > 0) {
                const branchesToCreate = preparedAdditionalBranches.map(b => ({
                    ...b,
                    school_id: schoolId,
                }));
                await tx.branch.createMany({ data: branchesToCreate });
            }

            let adminSchoolGeneratedId: string;
            try {
                adminSchoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, mainBranchId, 'admin', tx);
            } catch (idErr: any) {
                console.warn('[Onboarding] IdGenerator fallback:', idErr.message);
                adminSchoolGeneratedId = `${schoolCode}_${mainBranchCode}_ADM_0001`;
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
            console.log(`[Onboarding] OTP verification email sent to ${data.adminEmail}`);
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
