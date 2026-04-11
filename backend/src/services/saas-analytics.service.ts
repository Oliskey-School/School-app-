import prisma from '../config/database';

export class SaaSAnalyticsService {
    static async getOverviewStats() {
        const [
            totalSchools,
            activeSchools,
            totalUsers,
            activeSubscriptions,
            payments
        ] = await Promise.all([
            prisma.school.count(),
            prisma.school.count({ where: { status: 'active' } }),
            prisma.user.count(),
            prisma.school.count({ where: { subscription_status: 'active' } }),
            prisma.payment.findMany({
                where: { status: 'completed' },
                select: { amount: true, created_at: true }
            })
        ]);

        const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthlyRevenue = payments
            .filter(p => p.created_at >= thirtyDaysAgo)
            .reduce((sum, p) => sum + Number(p.amount), 0);

        return {
            totalSchools,
            activeSchools,
            totalRevenue,
            monthlyRevenue,
            totalUsers,
            activeSubscriptions
        };
    }

    static async getChartsData() {
        const [userGrowth, revenueTrend, planDist] = await Promise.all([
            this.getMonthlyUserGrowth(6),
            this.getMonthlyRevenueTrend(6),
            this.getPlanDistribution()
        ]);

        return {
            userGrowth,
            revenueTrend,
            planDist
        };
    }

    private static async getMonthlyUserGrowth(months: number) {
        const data = [];
        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const monthName = startDate.toLocaleDateString('en-US', { month: 'short' });

            const count = await prisma.user.count({
                where: {
                    created_at: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            data.push({ name: monthName, value: count, users: count });
        }
        return data;
    }

    private static async getMonthlyRevenueTrend(months: number) {
        const data = [];
        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const monthName = startDate.toLocaleDateString('en-US', { month: 'short' });

            const payments = await prisma.payment.findMany({
                where: {
                    status: 'completed',
                    created_at: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                select: { amount: true }
            });

            const revenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

            data.push({ name: monthName, value: revenue, revenue });
        }
        return data;
    }

    private static async getPlanDistribution() {
        const schools = await prisma.school.findMany({
            where: { subscription_status: 'active' },
            include: { plan: true }
        });

        const planCounts: Record<string, number> = {};
        schools.forEach(school => {
            const planName = school.plan?.name || 'Basic';
            planCounts[planName] = (planCounts[planName] || 0) + 1;
        });

        return Object.entries(planCounts).map(([name, value]) => ({
            name,
            value
        }));
    }
}
