import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { IdGeneratorService } from './idGenerator.service';

export interface OnboardingData {
    // Step 1 — School
    schoolName: string;
    schoolCode: string;       // owner-typed prefix, e.g. "EXCEL"
    schoolEmail: string;
    phone: string;
    address?: string;
    state?: string;
    logoUrl?: string;
    // Step 2 — Branches
    mainBranchName: string;
    mainBranchCode: string;   // owner-typed, e.g. "MAIN"
    additionalBranches?: Array<{ name: string; code: string }>;
    // Step 3 — Admin
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    // Step 4 — Plan
    planType: 'free' | 'basic' | 'premium' | 'enterprise';
}

export class OnboardingService {
    private static getAdminClient() {
        return createClient(config.supabaseUrl, config.supabaseServiceKey);
    }

    /**
     * Creates a school, its branches, and the owner admin account in a single
     * coordinated operation. This is the entry point for new school sign-ups.
     *
     * Returns the school ID, branch ID, admin user ID, and the generated admin ID.
     */
    static async createSchoolWithSetup(data: OnboardingData) {
        const supabaseAdmin = OnboardingService.getAdminClient();

        // Normalise codes: uppercase, letters/numbers only, max 10 chars
        const schoolCode = data.schoolCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        const mainBranchCode = data.mainBranchCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

        if (!schoolCode) throw new Error('School code is required and must contain letters or numbers.');
        if (!mainBranchCode) throw new Error('Branch code is required and must contain letters or numbers.');

        // 1. Check school code is not already taken
        const { data: existingCode } = await supabaseAdmin
            .from('schools')
            .select('id')
            .eq('code', schoolCode)
            .maybeSingle();
        if (existingCode) throw new Error(`School code "${schoolCode}" is already taken. Please choose a different one.`);

        // 2. Create School record
        const schoolSlug = data.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
            + '-' + Date.now().toString(36);

        const { data: school, error: schoolError } = await supabaseAdmin
            .from('schools')
            .insert({
                name: data.schoolName,
                code: schoolCode,
                email: data.schoolEmail,
                contact_email: data.schoolEmail,
                phone: data.phone,
                address: data.address || null,
                state: data.state || null,
                logo_url: data.logoUrl || null,
                slug: schoolSlug,
                subscription_status: 'trial',
                plan_type: data.planType,
                trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                is_active: true,
                is_onboarded: false,
                onboarding_step: 1,
            })
            .select('id')
            .single();

        if (schoolError) throw new Error(`School creation failed: ${schoolError.message}`);
        const schoolId = school.id;

        // 3. Create Main Branch
        const { data: mainBranch, error: branchError } = await supabaseAdmin
            .from('branches')
            .insert({
                school_id: schoolId,
                name: data.mainBranchName,
                code: mainBranchCode,
                is_main: true,
            })
            .select('id')
            .single();

        if (branchError) {
            // Rollback school
            await supabaseAdmin.from('schools').delete().eq('id', schoolId);
            throw new Error(`Main branch creation failed: ${branchError.message}`);
        }
        const mainBranchId = mainBranch.id;

        // 4. Create Additional Branches (if any)
        if (data.additionalBranches && data.additionalBranches.length > 0) {
            const branches = data.additionalBranches
                .filter(b => b.name && b.code)
                .map(b => ({
                    school_id: schoolId,
                    name: b.name,
                    code: b.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                    is_main: false,
                }));
            if (branches.length > 0) {
                await supabaseAdmin.from('branches').insert(branches);
            }
        }

        // 5. Generate admin's school_generated_id
        // School + branch exist now, so IdGeneratorService can resolve their codes.
        // The admin is the first user in this school/branch → number = 0001.
        let adminSchoolGeneratedId: string;
        try {
            adminSchoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, mainBranchId, 'admin');
        } catch (idErr: any) {
            console.warn('[Onboarding] IdGenerator fallback:', idErr.message);
            adminSchoolGeneratedId = `${schoolCode}_${mainBranchCode}_ADM_0001`;
        }

        // 6. Create Supabase Auth User for the admin (email pre-confirmed, no verification email)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.adminEmail,
            password: data.adminPassword,
            email_confirm: true,
            user_metadata: {
                full_name: data.adminName,
                role: 'admin',
                school_id: schoolId,
                branch_id: mainBranchId,
                school_generated_id: adminSchoolGeneratedId,
                school_code: schoolCode,
                branch_code: mainBranchCode,
            },
            app_metadata: {
                role: 'admin',
                school_id: schoolId,
                branch_id: mainBranchId,
                school_generated_id: adminSchoolGeneratedId,
            },
        });

        if (authError) {
            // Rollback school + branch
            await supabaseAdmin.from('schools').delete().eq('id', schoolId);
            throw new Error(`Admin account creation failed: ${authError.message}`);
        }
        const adminUserId = authData.user.id;

        // 7. Upsert users table profile (Supabase trigger may have created a partial row)
        await supabaseAdmin.from('users').upsert({
            id: adminUserId,
            email: data.adminEmail,
            full_name: data.adminName,
            name: data.adminName,
            role: 'admin',
            school_id: schoolId,
            branch_id: mainBranchId,
            school_generated_id: adminSchoolGeneratedId,
            is_active: true,
        });

        // 8. Create school membership record
        // Insert or ignore if membership already exists
        const { error: membershipError } = await supabaseAdmin
            .from('school_memberships')
            .upsert({ school_id: schoolId, user_id: adminUserId, base_role: 'admin', is_active: true });
        if (membershipError) console.warn('[Onboarding] Membership upsert warning:', membershipError.message);

        // 9. Set the owner on the school and mark setup complete
        await supabaseAdmin
            .from('schools')
            .update({ owner_id: adminUserId, is_onboarded: true, onboarding_step: 5 })
            .eq('id', schoolId);

        const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        return {
            schoolId,
            schoolCode,
            schoolName: data.schoolName,
            mainBranchId,
            mainBranchCode,
            mainBranchName: data.mainBranchName,
            adminUserId,
            adminEmail: data.adminEmail,
            adminName: data.adminName,
            adminSchoolGeneratedId,
            planType: data.planType,
            trialEndsAt,
        };
    }
}
