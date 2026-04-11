import prisma from '../config/database';

export class PlanService {
    static async getAllPlans() {
        return await prisma.plan.findMany({
            orderBy: { price_monthly: 'asc' }
        });
    }

    static async getPlanById(id: number) {
        return await prisma.plan.findUnique({
            where: { id }
        });
    }

    static async createPlan(data: any) {
        return await prisma.plan.create({
            data: {
                name: data.name,
                price_monthly: parseFloat(data.price_monthly),
                price_yearly: parseFloat(data.price_yearly),
                features: data.features || {},
                limits: data.limits || {},
                is_active: data.is_active ?? true
            }
        });
    }

    static async updatePlan(id: number, data: any) {
        // Prepare updates, only include what's provided
        const updates: any = {};
        if (data.name !== undefined) updates.name = data.name;
        if (data.price_monthly !== undefined) updates.price_monthly = parseFloat(data.price_monthly);
        if (data.price_yearly !== undefined) updates.price_yearly = parseFloat(data.price_yearly);
        if (data.features !== undefined) updates.features = data.features;
        if (data.limits !== undefined) updates.limits = data.limits;
        if (data.is_active !== undefined) updates.is_active = data.is_active;

        return await prisma.plan.update({
            where: { id },
            data: updates
        });
    }

    static async deletePlan(id: number) {
        return await prisma.plan.delete({
            where: { id }
        });
    }
}
