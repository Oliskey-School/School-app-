import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { Role } from '@prisma/client';
import { EmailService } from './email.service';
import { OnboardingService } from './onboarding.service';
import { SocketService } from './socket.service';

export class SchoolService {
    static async onboard(data: any) {
        // Use the new OnboardingService which handles OTP verification
        const result = await OnboardingService.createSchoolWithSetup({
            schoolName: data.schoolName,
            schoolCode: data.schoolCode || data.schoolName.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, ''),
            schoolEmail: data.adminEmail || data.contact_email,
            phone: data.phone || '',
            address: data.address,
            state: data.state,
            logoUrl: data.logoUrl,
            mainBranchName: data.branchNames?.[0] || 'Main Campus',
            mainBranchCode: data.mainBranchCode || 'MAIN',
            additionalBranches: data.branchNames?.slice(1)?.map((name: string) => ({
                name,
                code: name.substring(0, 4).toUpperCase()
            })) || [],
            adminName: data.adminName,
            adminEmail: data.adminEmail,
            adminPassword: data.adminPassword,
            planType: data.planType || 'free'
        });

        const response = {
            success: true,
            message: result.message,
            data: result.data
        };

        if (result.data?.schoolId) {
            SocketService.emitToSchool(result.data.schoolId, 'school:updated', { action: 'onboard' });
        }
        return response;
    }

    static async createSchool(data: any) {
        const school = await prisma.school.create({
            data: data
        });
        SocketService.emitToSchool(school.id, 'school:updated', { action: 'create' });
        return school;
    }

    static async getAllSchools() {
        return await prisma.school.findMany();
    }

    static async getSchoolById(schoolId: string, id: string) {
        // RELIABILITY: Support 'current' or empty ID to refer to the authenticated tenant.
        // If the ID passed is the school_generated_id of an admin (OLISKEY_MAIN_ADM_0001),
        // we strictly fall back to the schoolId carried in the verified JWT.
        const targetId = (!id || id === 'current' || id === 'me' || id.includes('_ADM_')) ? schoolId : id;

        return await prisma.school.findFirst({
            where: {
                id: targetId,
                // SECURITY: Multi-tenant isolation. A user can only ever read their own school.
                AND: { id: schoolId }
            }
        });
    }

    static async getPilotOnboardingData(schoolId: string) {
        return await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                state: true,
                curriculum_type: true,
                onboarding_step: true,
                is_onboarded: true
            }
        });
    }

    static async savePilotProgress(schoolId: string, payload: {
        name?: string;
        curriculum_type?: string;
        onboarding_step?: number;
        is_onboarded?: boolean;
    }) {
        const result = await prisma.school.update({
            where: { id: schoolId },
            data: {
                ...payload,
                updated_at: new Date()
            },
            select: {
                id: true,
                name: true,
                state: true,
                curriculum_type: true,
                onboarding_step: true,
                is_onboarded: true
            }
        });

        SocketService.emitToSchool(schoolId, 'school:updated', { action: 'pilot_progress' });
        return result;
    }

    static async updateSchool(schoolId: string, id: string, updates: any) {
        const result = await prisma.school.update({
            where: { id: id },
            data: updates
        });

        SocketService.emitToSchool(id, 'school:updated', { action: 'update' });
        return result;
    }

    static async updateSchoolSubscription(schoolId: string, id: string, updates: any) {
        const result = await prisma.school.updateMany({
            where: {
                id: id,
                school_id: schoolId
            },
            data: updates
        });

        if (result.count > 0) {
            SocketService.emitToSchool(id, 'school:updated', { action: 'subscription_update', updates });
            return await prisma.school.findUnique({ where: { id: id } });
        }

        throw new Error('School not found or permission denied');
    }

    static async updateSchoolStatusBulk(schoolId: string, ids: string[], status: string) {
        const data: any = {};
        if (status === 'active') data.is_active = true;
        else if (status === 'suspended') data.is_active = false;
        
        // Also update subscription_status if it's a known value or if we want to sync it
        const subStatuses = ['active', 'trial', 'past_due', 'canceled', 'suspended'];
        if (subStatuses.includes(status)) {
            data.subscription_status = status;
        }

        const result = await prisma.school.updateMany({
            where: { id: { in: ids } },
            data
        });

        ids.forEach(id => SocketService.emitToSchool(id, 'school:updated', { action: 'status_update', status }));
        return result;
    }

    static async deleteSchoolsBulk(schoolId: string, ids: string[]) {
        const demoSchoolId = config.demoSchoolId;

        if (demoSchoolId && ids.includes(demoSchoolId)) {
            throw new Error('Deletion protection: Oliskey Demo Academy (ODA) cannot be deleted as it is the default school.');
        }

        const result = await prisma.school.deleteMany({
            where: { id: { in: ids } }
        });

        ids.forEach(id => SocketService.emitToSchool(id, 'school:deleted', { action: 'delete' }));
        return result;
    }

    static async deleteSchool(schoolId: string) {
        // Perform deletion in a transaction to ensure integrity
        return await prisma.$transaction(async (tx) => {
            // Delete related records in reverse dependency order
            // Note: This assumes standard relational structure. 
            // If prisma schema has `onDelete: Cascade` defined, many of these 
            // might be handled automatically, but explicit deletion is safer.
            
            await tx.auditLog.deleteMany({ where: { school_id: schoolId } });
            await tx.schoolMembership.deleteMany({ where: { school_id: schoolId } });
            await tx.branch.deleteMany({ where: { school_id: schoolId } });
            await tx.user.deleteMany({ where: { school_id: schoolId } });
            await tx.student.deleteMany({ where: { school_id: schoolId } });
            await tx.teacher.deleteMany({ where: { school_id: schoolId } });
            await tx.parent.deleteMany({ where: { school_id: schoolId } });
            await tx.class.deleteMany({ where: { school_id: schoolId } });
            
            // Finally delete the school
            const result = await tx.school.delete({
                where: { id: schoolId }
            });

            SocketService.emitToSchool(schoolId, 'school:deleted', { action: 'delete' });
            return result;
        });
    }

    static async getBranches(schoolId: string, branchId?: string, demoRoot?: string) {
        const where: any = { school_id: schoolId };
        if (demoRoot) {
            // Demo session: only this visitor's sandbox — the root branch and any
            // branches they created within it ("<root>__<rand>").
            where.OR = [{ id: demoRoot }, { id: { startsWith: demoRoot + '__' } }];
        } else if (branchId) {
            where.id = branchId;
        }
        const branches = await prisma.branch.findMany({
            where,
            orderBy: { is_main: 'desc' }
        });

        // Attach how many members already hold an ID based on each branch, so the
        // UI can lock the branch name once IDs exist.
        const counts = await prisma.user.groupBy({
            by: ['branch_id'],
            where: { school_id: schoolId, NOT: { school_generated_id: null } },
            _count: { _all: true },
        });
        const countMap = new Map<string | null, number>(counts.map((c: any) => [c.branch_id, c._count._all]));
        return branches.map((b) => ({ ...b, user_count: countMap.get(b.id) || 0 }));
    }

    static async createBranch(schoolId: string, data: any, demoRoot?: string) {
        console.log('[SchoolService] Creating branch. Input data:', JSON.stringify(data, null, 2));
        return await prisma.$transaction(async (tx) => {
            if (data.is_main) {
                // Unset the existing "main" only within the relevant scope: the demo
                // visitor's own sandbox, or the whole school for a live school.
                const mainWhere: any = { school_id: schoolId };
                if (demoRoot) mainWhere.OR = [{ id: demoRoot }, { id: { startsWith: demoRoot + '__' } }];
                await tx.branch.updateMany({
                    where: mainWhere,
                    data: { is_main: false }
                });
            }

            // Prefer the owner-typed code. If blank, derive a CLEAN code from the first
            // word of the name (no random suffix) — e.g. "Lekki phase 1" -> "LEKKI".
            const generatedCode = data.code && typeof data.code === 'string' && data.code.trim() !== ''
                ? data.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                : (data.name
                    ? (String(data.name).trim().split(/\s+/)[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'BRANCH')
                    : 'BRANCH');

            const { code, id: _ignoredId, ...rest } = data;
            const branchData: any = {
                ...rest,
                school_id: schoolId,
                code: generatedCode
            };

            // Demo branches live as children of the visitor's sandbox root so they stay
            // isolated to that session and never appear in another visitor's demo.
            if (demoRoot) {
                branchData.id = `${demoRoot}__${Math.random().toString(36).slice(2, 10)}`;
            }

            console.log('[SchoolService] Creating branch with data:', JSON.stringify(branchData, null, 2));

            const branch = await tx.branch.create({
                data: branchData
            });

            // Clone the STRUCTURE (classes + subjects) from the main branch so the new
            // branch starts as a full, empty environment: same setup, zero records.
            // Each copy is a brand-new row scoped to the new branch — fully independent
            // (editing one branch never affects another). No students, enrollments,
            // grades, or fees are copied.
            try {
                let sourceBranchId: string | undefined;
                if (demoRoot) {
                    sourceBranchId = demoRoot; // the demo sandbox root acts as "main"
                } else {
                    const main = await tx.branch.findFirst({
                        where: { school_id: schoolId, is_main: true, id: { not: branch.id } },
                        select: { id: true },
                    });
                    sourceBranchId = main?.id;
                }

                if (sourceBranchId && sourceBranchId !== branch.id) {
                    const srcSubjects = await tx.subject.findMany({ where: { school_id: schoolId, branch_id: sourceBranchId } });
                    if (srcSubjects.length) {
                        await tx.subject.createMany({
                            data: srcSubjects.map((s: any) => ({
                                school_id: schoolId, branch_id: branch.id,
                                name: s.name, code: s.code, description: s.description, curriculum_type: s.curriculum_type,
                            })),
                        });
                    }

                    const srcClasses = await tx.class.findMany({ where: { school_id: schoolId, branch_id: sourceBranchId } });
                    if (srcClasses.length) {
                        await tx.class.createMany({
                            data: srcClasses.map((c: any) => ({
                                school_id: schoolId, branch_id: branch.id,
                                name: c.name, grade: c.grade, section: c.section,
                                department: c.department, level_category: c.level_category,
                            })),
                        });
                    }
                    console.log(`[SchoolService] Cloned ${srcSubjects.length} subjects + ${srcClasses.length} classes into new branch ${branch.id}`);
                }
            } catch (cloneErr: any) {
                console.warn('[SchoolService] Branch structure clone failed (non-fatal):', cloneErr.message);
            }

            SocketService.emitToSchool(schoolId, 'school:updated', { action: 'create_branch', branchId: branch.id });
            return branch;
        });
    }

    static async updateBranch(schoolId: string, id: string, updates: any) {
        const sanitizedUpdates = { ...updates };
        delete sanitizedUpdates.school_id;
        // The branch code is baked into every member's global ID — never editable.
        delete sanitizedUpdates.code;

        return await prisma.$transaction(async (tx) => {
            // Ownership: the branch MUST belong to the caller's school — blocks
            // cross-tenant edits via a guessed/leaked branch id.
            const owned = await tx.branch.findFirst({ where: { id, school_id: schoolId }, select: { id: true, name: true } });
            if (!owned) {
                throw Object.assign(new Error('Branch not found in your school'), { status: 404 });
            }

            // Once members have IDs based on this branch, the NAME is frozen (the ID's
            // branch identity must stay consistent). Everything else stays editable.
            if (typeof sanitizedUpdates.name === 'string') {
                if (sanitizedUpdates.name !== owned.name) {
                    const idHolders = await tx.user.count({
                        where: { school_id: schoolId, branch_id: id, NOT: { school_generated_id: null } },
                    });
                    if (idHolders > 0) {
                        throw Object.assign(
                            new Error('Branch name is locked because members already have IDs based on this branch. You can still edit address, phone, location and curriculum.'),
                            { status: 409 }
                        );
                    }
                }
            }

            if (sanitizedUpdates.is_main) {
                await tx.branch.updateMany({
                    where: { school_id: schoolId, id: { not: id } },
                    data: { is_main: false }
                });
            }
            const branch = await tx.branch.update({
                where: { id: id },
                data: sanitizedUpdates
            });
            SocketService.emitToSchool(schoolId, 'school:updated', { action: 'update_branch', branchId: id });
            return branch;
        });
    }

    static async deleteBranch(schoolId: string, id: string) {
        // Scope by school_id so a branch can only be deleted within its own tenant.
        const result = await prisma.branch.deleteMany({
            where: { id, school_id: schoolId }
        });
        if (result.count === 0) {
            throw Object.assign(new Error('Branch not found in your school'), { status: 404 });
        }

        SocketService.emitToSchool(schoolId, 'school:updated', { action: 'delete_branch', branchId: id });
        return { id };
    }

    static async getSchoolPolicies(schoolId: string) {
        return await prisma.schoolPolicy.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async getSchoolPhotos(schoolId: string) {
        return await prisma.schoolGallery.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }
}
