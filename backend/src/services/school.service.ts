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
        const result = await prisma.school.deleteMany({
            where: { id: { in: ids } }
        });

        ids.forEach(id => SocketService.emitToSchool(id, 'school:deleted', { action: 'delete' }));
        return result;
    }

    static async getBranches(schoolId: string) {
        return await prisma.branch.findMany({
            where: { school_id: schoolId },
            orderBy: { is_main: 'desc' }
        });
    }

    static async createBranch(schoolId: string, data: any) {
        return await prisma.$transaction(async (tx) => {
            if (data.is_main) {
                await tx.branch.updateMany({
                    where: { school_id: schoolId },
                    data: { is_main: false }
                });
            }
            const branch = await tx.branch.create({
                data: { ...data, school_id: schoolId }
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
}
