import prisma from '../config/database';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

export class LearningHubService {
    static async getResources(schoolId: string, branchId: string | undefined, filters: any = {}) {
        const where: any = { school_id: schoolId, is_curated: true };

        if (branchId && branchId !== 'all') {
            where.OR = [{ branch_id: branchId }, { branch_id: null }];
        }
        if (filters.grade_level) where.grade_level = filters.grade_level;
        if (filters.subject) where.subject = filters.subject;
        if (filters.resource_kind) where.resource_kind = filters.resource_kind;
        // "Customize" tab — PhET-style filter dimensions, independent of our own
        // curriculum grade_level/subject taxonomy.
        if (filters.subject_area) where.subject_area = filters.subject_area;
        if (filters.grade_band) where.grade_band = filters.grade_band;
        if (filters.inclusive_feature) where.inclusive_features = { has: filters.inclusive_feature };
        if (filters.search) {
            where.OR = [
                ...(where.OR || []),
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
                { tags: { has: filters.search } },
            ];
        }

        return prisma.resource.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
    }

    static async createResource(schoolId: string, branchId: string | undefined, data: any) {
        const insertData: any = {
            school_id: schoolId,
            is_curated: true,
            title: data.title,
            description: data.description,
            type: data.type || 'link',
            url: data.url,
            category: data.category,
            subject: data.subject,
            grade_level: data.grade_level,
            resource_kind: data.resource_kind,
            curriculum_type: data.curriculum_type,
            source_name: data.source_name,
            thumbnail_url: data.thumbnail_url,
            tags: Array.isArray(data.tags) ? data.tags : [],
            subject_area: data.subject_area,
            grade_band: data.grade_band,
            inclusive_features: Array.isArray(data.inclusive_features) ? data.inclusive_features : [],
            recommended_age: data.recommended_age,
        };
        if (branchId && branchId !== 'all') insertData.branch_id = branchId;

        return prisma.resource.create({ data: insertData });
    }

    static async updateResource(schoolId: string, id: string, data: any) {
        const existing = await prisma.resource.findFirst({ where: { id, school_id: schoolId } });
        if (!existing) {
            throw Object.assign(new Error('Resource not found'), { statusCode: 404 });
        }
        const updateData: any = {};
        for (const field of ['title', 'description', 'type', 'url', 'category', 'subject', 'grade_level', 'resource_kind', 'curriculum_type', 'source_name', 'thumbnail_url', 'tags']) {
            if (data[field] !== undefined) updateData[field] = data[field];
        }
        return prisma.resource.update({ where: { id }, data: updateData });
    }

    static async deleteResource(schoolId: string, id: string) {
        const existing = await prisma.resource.findFirst({ where: { id, school_id: schoolId } });
        if (!existing) {
            throw Object.assign(new Error('Resource not found'), { statusCode: 404 });
        }
        return prisma.resource.delete({ where: { id } });
    }

    static async upsertProgress(schoolId: string, branchId: string | undefined, studentId: string, data: any) {
        const resource = await prisma.resource.findFirst({ where: { id: data.resource_id, school_id: schoolId } });
        if (!resource) {
            throw Object.assign(new Error('Resource not found'), { statusCode: 404 });
        }

        const status = data.status || 'in_progress';
        const now = new Date();

        return prisma.studentResourceProgress.upsert({
            where: { student_id_resource_id: { student_id: studentId, resource_id: data.resource_id } },
            create: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                student_id: studentId,
                resource_id: data.resource_id,
                status,
                score: data.score,
                time_spent_seconds: data.time_spent_seconds || 0,
                started_at: now,
                completed_at: status === 'completed' ? now : null,
            },
            update: {
                status,
                score: data.score !== undefined ? data.score : undefined,
                time_spent_seconds: data.time_spent_seconds !== undefined
                    ? { increment: data.time_spent_seconds }
                    : undefined,
                completed_at: status === 'completed' ? now : undefined,
            },
        });
    }

    static async getStudentProgress(schoolId: string, studentId: string) {
        return prisma.studentResourceProgress.findMany({
            where: { school_id: schoolId, student_id: studentId },
            include: { resource: true },
            orderBy: { updated_at: 'desc' },
        });
    }

    static async getStudentSummary(schoolId: string, studentId: string) {
        const progress = await prisma.studentResourceProgress.findMany({
            where: { school_id: schoolId, student_id: studentId },
        });
        const completed = progress.filter(p => p.status === 'completed');
        const scored = completed.filter(p => p.score !== null && p.score !== undefined);
        return {
            lessons_completed: completed.length,
            time_spent_seconds: progress.reduce((sum, p) => sum + p.time_spent_seconds, 0),
            average_score: scored.length ? Math.round(scored.reduce((s, p) => s + (p.score || 0), 0) / scored.length) : null,
            in_progress: progress.filter(p => p.status === 'in_progress').length,
        };
    }

    static async createStudyPlan(schoolId: string, branchId: string | undefined, studentId: string, data: any) {
        return prisma.studyPlan.create({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                student_id: studentId,
                title: data.title,
                generated_by: data.generated_by || 'ai',
                created_by: data.created_by,
                items: {
                    create: (data.items || []).map((item: any, index: number) => ({
                        resource_id: item.resource_id,
                        order: item.order ?? index,
                        due_date: item.due_date ? new Date(item.due_date) : undefined,
                    })),
                },
            },
            include: { items: { include: { resource: true }, orderBy: { order: 'asc' } } },
        });
    }

    static async getStudyPlans(schoolId: string, studentId: string) {
        return prisma.studyPlan.findMany({
            where: { school_id: schoolId, student_id: studentId },
            include: { items: { include: { resource: true }, orderBy: { order: 'asc' } } },
            orderBy: { created_at: 'desc' },
        });
    }

    static isAdmin(role: string) {
        return ADMIN_ROLES.includes((role || '').toLowerCase());
    }
}
