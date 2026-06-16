import prisma from '../config/database';

/**
 * Configurable academics with a fallback chain:
 *   branch override  →  school default  →  built-in default
 *
 * A branch row (branch_id set) overrides the school default (branch_id NULL).
 */

export interface TermDef { name: string; order: number; start_date?: string; end_date?: string; is_current?: boolean; }
export interface GradeBand { min: number; max: number; grade: string; remark: string; }
export interface GradingDef { ca_percent: number; exam_percent: number; bands: GradeBand[]; }

export const DEFAULT_TERMS: TermDef[] = [
    { name: 'First Term', order: 1, is_current: true },
    { name: 'Second Term', order: 2 },
    { name: 'Third Term', order: 3 },
];

export const DEFAULT_GRADING: GradingDef = {
    ca_percent: 0.4,
    exam_percent: 0.6,
    bands: [
        { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
        { min: 60, max: 69, grade: 'B', remark: 'Very Good' },
        { min: 50, max: 59, grade: 'C', remark: 'Good' },
        { min: 45, max: 49, grade: 'D', remark: 'Pass' },
        { min: 40, max: 44, grade: 'E', remark: 'Weak Pass' },
        { min: 0, max: 39, grade: 'F', remark: 'Fail' },
    ],
};

export class AcademicSettingsService {
    /** Effective settings for a branch (or the school when no branch given). */
    static async getEffective(schoolId: string, branchId?: string | null): Promise<{ terms: TermDef[]; grading: GradingDef; source: 'branch' | 'school' | 'default' }> {
        const orClauses: any[] = [{ branch_id: null }];
        if (branchId) orClauses.push({ branch_id: branchId });
        const rows = await prisma.academicSettings.findMany({ where: { school_id: schoolId, OR: orClauses } });

        const branchRow = branchId ? rows.find(r => r.branch_id === branchId) : undefined;
        const schoolRow = rows.find(r => r.branch_id === null);

        const terms = (branchRow?.terms as any) ?? (schoolRow?.terms as any) ?? DEFAULT_TERMS;
        const grading = (branchRow?.grading as any) ?? (schoolRow?.grading as any) ?? DEFAULT_GRADING;
        const source: 'branch' | 'school' | 'default' = branchRow?.terms ? 'branch' : (schoolRow?.terms ? 'school' : 'default');
        return { terms, grading, source };
    }

    /** The raw row for one scope (for the editor: shows what's actually configured, not the fallback). */
    static async getRaw(schoolId: string, branchId?: string | null) {
        return prisma.academicSettings.findFirst({ where: { school_id: schoolId, branch_id: branchId ?? null } });
    }

    /** Create or update the (school, branch) settings row. */
    static async save(schoolId: string, branchId: string | null, data: { terms?: TermDef[]; grading?: GradingDef }) {
        const existing = await prisma.academicSettings.findFirst({ where: { school_id: schoolId, branch_id: branchId ?? null } });
        const payload = {
            terms: (data.terms ?? (existing?.terms as any) ?? DEFAULT_TERMS) as any,
            grading: (data.grading ?? (existing?.grading as any) ?? DEFAULT_GRADING) as any,
        };
        if (existing) {
            return prisma.academicSettings.update({ where: { id: existing.id }, data: { ...payload, updated_at: new Date() } });
        }
        return prisma.academicSettings.create({ data: { school_id: schoolId, branch_id: branchId ?? null, ...payload } });
    }
}
