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
        return await prisma.school.findFirst({
            where: {
                id: id,
                AND: [
                    { id: id },
                    { id: schoolId }
                ]
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

    static async getBranches(schoolId: string, branchId?: string) {
        const where: any = { school_id: schoolId };
        if (branchId) {
            where.id = branchId;
        }
        return await prisma.branch.findMany({
            where,
            orderBy: { is_main: 'desc' }
        });
    }

    static async createBranch(schoolId: string, data: any) {
        console.log('[SchoolService] Creating branch. Input data:', JSON.stringify(data, null, 2));
        return await prisma.$transaction(async (tx) => {
            if (data.is_main) {
                await tx.branch.updateMany({
                    where: { school_id: schoolId },
                    data: { is_main: false }
                });
            }
            
            // Robust code generation
            const generatedCode = data.code && typeof data.code === 'string' && data.code.trim() !== ''
                ? data.code.toUpperCase().replace(/[^A-Z0-9]/g, '')
                : (data.name ? data.name.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'BRCH') + Math.floor(Math.random() * 1000);

            const { code, ...rest } = data;
            const branchData = {
                ...rest,
                school_id: schoolId,
                code: generatedCode
            };

            console.log('[SchoolService] Creating branch with data:', JSON.stringify(branchData, null, 2));

            const branch = await tx.branch.create({
                data: branchData
            });
            SocketService.emitToSchool(schoolId, 'school:updated', { action: 'create_branch', branchId: branch.id });
            return branch;
        });
    }

    static async updateBranch(schoolId: string, id: string, updates: any) {
        const sanitizedUpdates = { ...updates };
        delete sanitizedUpdates.school_id;

        return await prisma.$transaction(async (tx) => {
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
        const result = await prisma.branch.delete({
            where: { id: id }
        });

        SocketService.emitToSchool(schoolId, 'school:updated', { action: 'delete_branch', branchId: id });
        return result;
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
