import bcrypt from 'bcrypt';
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
        if (!data.schoolName?.trim()) throw new Error('School name is required.');
        if (!data.adminName?.trim()) throw new Error('Admin name is required.');
        if (!data.adminEmail?.trim()) throw new Error('Admin email is required.');
        if (!data.adminPassword || data.adminPassword.length < 8) throw new Error('Admin password is required and must be at least 8 characters.');

        // AuthService.login always lowercases the identifier before querying —
        // storing the email with whatever case the onboarding form happened to
        // submit means a school owner who signed up as "Name@Example.com" and
        // later types "name@example.com" (near-universal in practice; almost
        // nobody preserves exact casing typing their own email from memory)
        // would get "Invalid credentials" despite the right password.
        data.adminEmail = data.adminEmail.trim().toLowerCase();

        // Check for existing school code
        const existingCode = await prisma.school.findUnique({
            where: { code: schoolCode }
        });
        
        if (existingCode) {
            if (!existingCode.is_onboarded) {
                console.log(`🧹 [Onboarding] Cleaning up partially configured school record: ${existingCode.id}`);
                // Single transaction — one connection, correct FK delete order
                await prisma.$transaction([
                    prisma.schoolMembership.deleteMany({ where: { school_id: existingCode.id } }),
                    prisma.user.deleteMany({ where: { school_id: existingCode.id } }),
                    prisma.branch.deleteMany({ where: { school_id: existingCode.id } }),
                    prisma.school.delete({ where: { id: existingCode.id } }),
                ]);
            } else {
                throw new Error(`School code "${schoolCode}" is already taken. Please choose a different code.`);
            }
        }

        // Email is unique per school+branch, so one person may own SEVERAL schools
        // with the same email — each school gets its own admin account row. We only
        // block if this exact email is already an owner of a school with the SAME
        // code (handled above), not globally.

        const schoolSlug = data.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
        const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const passwordHash = await bcrypt.hash(data.adminPassword, 12);

        const preparedAdditionalBranches = (data.additionalBranches || [])
            .map((b, index) => ({
                name: b.name || 'Branch ' + (index + 2),
                code: b.code || generateBranchCode(b.name || 'Branch', String(index)),
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
                    const code = b.code || generateBranchCode(b.name, String(index));
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

            // The school code is already guaranteed globally unique (checked above,
            // enforced by a DB unique constraint), so the canonical
            // {SCHOOL_CODE}_{BRANCH_CODE}_ADM_{NUMBER} id can never collide with another
            // school's admin — no random suffix needed. Appending one here (as a previous
            // version did) corrupted the one non-negotiable global ID format for every
            // founding admin account and broke downstream sequence parsing that expects
            // the last underscore-segment to be numeric.
            let adminSchoolGeneratedId: string;
            try {
                adminSchoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, mainBranchId, 'admin', tx);
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

            // Seed default leave types so the Leave Request feature isn't dead-on-arrival:
            // with zero LeaveType rows, the "New Request" dropdown has no options and no
            // teacher can ever submit a leave request. There is no admin UI or API to
            // create leave types after the fact, so this is the only point they get set up.
            await tx.leaveType.createMany({
                data: [
                    { school_id: schoolId, name: 'Annual Leave', days_allowed: 21 },
                    { school_id: schoolId, name: 'Sick Leave', days_allowed: 10 },
                    { school_id: schoolId, name: 'Casual Leave', days_allowed: 5 },
                    { school_id: schoolId, name: 'Maternity/Paternity Leave', days_allowed: 90 },
                ],
            });

            // Mark setup complete so a duplicate-code check doesn't treat this as partial
            await tx.school.update({
                where: { id: schoolId },
                data: { is_onboarded: true, onboarding_step: 5, subscription_status: 'trial' },
            });

            return {
                schoolId,
                mainBranchId,
                adminUserId,
                adminSchoolGeneratedId,
            };
        }, { timeout: 30000 });

        // Send the verification OTP in the BACKGROUND — never block (or time out) the
        // onboarding response on a slow/unreachable email provider. The school, branch
        // and admin are already committed above; the OTP is best-effort and the owner
        // can resend it. (Previously this was awaited, so a slow SMTP hung the whole
        // "Create School" request.)
        VerificationService.createVerification(
            result.adminUserId,
            data.adminEmail,
            data.adminName,
            'email_verification'
        ).catch((otpError: any) => {
            console.error('[Onboarding] Failed to send OTP:', otpError.message);
        });

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
