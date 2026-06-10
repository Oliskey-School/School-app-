import prisma from '../config/database';
import { SocketService } from './socket.service';

export class SavingsService {
    // The caller passes the authenticated USER id; savings plans are keyed by the
    // Parent record id, so resolve it (accepts either form for robustness).
    private static async resolveParentId(idOrUserId: string): Promise<string | null> {
        const parent = await prisma.parent.findFirst({
            where: { OR: [{ user_id: idOrUserId }, { id: idOrUserId }] },
            select: { id: true }
        });
        return parent?.id || null;
    }

    static async getParentPlans(parentId: string) {
        const resolved = await this.resolveParentId(parentId);
        if (!resolved) return [];
        return await prisma.savingsPlan.findMany({
            where: {
                parent_id: resolved,
                is_active: true,
                is_deleted: false
            },
            include: {
                student: { select: { full_name: true } }
            }
        });
    }

    static async createPlan(schoolId: string, parentId: string, data: any) {
        const resolvedParentId = await this.resolveParentId(parentId);
        if (!resolvedParentId) throw new Error('Parent not found');
        const plan = await prisma.savingsPlan.create({
            data: {
                school_id: schoolId,
                parent_id: resolvedParentId,
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
