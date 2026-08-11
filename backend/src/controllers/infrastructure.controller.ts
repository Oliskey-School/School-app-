import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { InfrastructureService } from '../services/infrastructure.service';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getFacilities = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const result = await InfrastructureService.getFacilities(schoolId, branchId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createFacility = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await InfrastructureService.createFacility(schoolId, branchId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const updateFacility = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        const result = await InfrastructureService.updateFacility(schoolId, id as string, req.body);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deleteFacility = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await InfrastructureService.deleteFacility(schoolId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const getAssets = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const result = await InfrastructureService.getAssets(schoolId, branchId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createAsset = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await InfrastructureService.createAsset(schoolId, branchId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const getAssetDetail = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await InfrastructureService.getAssetDetail(schoolId, req.params.id as string);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(/not found/i.test(error.message) ? 404 : 500).json({ data: null, error: error.message, message: error.message });
    }
};

export const getAssetByQrCode = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await InfrastructureService.getAssetByQrCode(schoolId, req.params.qrCode as string);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(/not found/i.test(error.message) ? 404 : 500).json({ data: null, error: error.message, message: error.message });
    }
};

export const updateAsset = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        const result = await InfrastructureService.updateAsset(schoolId, id as string, req.body);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deleteAsset = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await InfrastructureService.deleteAsset(schoolId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const getVisitorLogs = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const result = await InfrastructureService.getVisitorLogs(schoolId, branchId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createVisitorLog = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await InfrastructureService.createVisitorLog(schoolId, { ...req.body, branch_id: branchId || null });
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const updateVisitorLog = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        const result = await InfrastructureService.updateVisitorLog(schoolId, id as string, req.body);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const getDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await InfrastructureService.getDocuments(schoolId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createDocument = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await InfrastructureService.createDocument(schoolId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await InfrastructureService.deleteDocument(schoolId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deleteVisitorLog = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await InfrastructureService.deleteVisitorLog(schoolId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const getBackups = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await InfrastructureService.getBackups(schoolId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createBackup = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await InfrastructureService.createBackup(schoolId);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deleteBackup = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const id = req.params.id as string;
        await InfrastructureService.deleteBackup(schoolId, id);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const restoreBackup = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const id = req.params.id as string;
        const result = await InfrastructureService.restoreBackup(schoolId, id);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const getSavedReports = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const result = await InfrastructureService.getSavedReports(schoolId, branchId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createSavedReport = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await InfrastructureService.createSavedReport(schoolId, branchId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deleteSavedReport = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await InfrastructureService.deleteSavedReport(schoolId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};
