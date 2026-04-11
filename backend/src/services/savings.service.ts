import prisma from '../config/database';
import { SocketService } from './socket.service';

export class SavingsService {
    static async getParentPlans(parentId: string) {
        return await prisma.savingsPlan.findMany({
            where: {
                parent_id: parentId,
                is_active: true,
                is_deleted: false
            },
            include: {
                student: { select: { full_name: true } }
            }
        });
    }

    static async createPlan(schoolId: string, parentId: string, data: any) {
        const plan = await prisma.savingsPlan.create({
            data: {
                school_id: schoolId,
                parent_id: parentId,
                student_id: data.student_id,
                target_amount: parseFloat(data.target_amount),
                target_date: new Date(data.target_date),
                frequency: data.frequency,
                current_amount: 0,
                is_active: true
            }
        });

        SocketService.emitToSchool(schoolId, 'finance:updated', { action: 'create_savings_plan', planId: plan.id });
        return plan;
    }

    static async addFunds(planId: string, amount: number) {
        const plan = await prisma.savingsPlan.update({
            where: { id: planId },
            data: {
                current_amount: { increment: amount }
            }
        });

        SocketService.emitToSchool(plan.school_id, 'finance:updated', { action: 'add_funds', planId });
        return plan;
    }
}
