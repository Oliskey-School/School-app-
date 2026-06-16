import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AcademicSettingsService } from '../services/academicSettings.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import { isMainAdmin } from '../utils/permissions';

/**
 * GET /api/academic-settings  → the effective terms/grading for the caller's branch,
 * plus the raw configured row (for the editor) and whether the caller may edit the
 * school-wide default.
 */
export const getAcademicSettings = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const main = isMainAdmin(req.user);
        // Main admin may inspect a specific scope (?branchId=... or ?scope=school);
        // a branch admin is always pinned to their own branch.
        const scope = (req.query.scope as string) || '';
        const requestedBranch = main
            ? (scope === 'school' ? null : ((req.query.branchId as string) || null))
            : (getEffectiveBranchId(req.user, undefined) || null);

        const effective = await AcademicSettingsService.getEffective(schoolId, requestedBranch || undefined);
        const raw = await AcademicSettingsService.getRaw(schoolId, requestedBranch || null);
        res.json({ ...effective, configured: !!raw, scope: requestedBranch ? 'branch' : 'school', branch_id: requestedBranch, canEditSchoolDefault: main });
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

/** PUT /api/academic-settings → save terms/grading for a scope. */
export const saveAcademicSettings = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const main = isMainAdmin(req.user);
        const { terms, grading, scope } = req.body;

        // Branch admins can only edit THEIR branch. Main admin may edit the school
        // default (scope 'school' / branch_id null) or any specific branch.
        let branchId: string | null;
        if (main) {
            branchId = scope === 'school' ? null : (req.body.branch_id ?? getEffectiveBranchId(req.user, undefined) ?? null);
        } else {
            branchId = getEffectiveBranchId(req.user, undefined) || null;
            if (!branchId) return res.status(403).json({ message: 'Only the main admin can edit the school-wide academic defaults.' });
        }

        const saved = await AcademicSettingsService.save(schoolId, branchId, { terms, grading });
        res.json(saved);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};
