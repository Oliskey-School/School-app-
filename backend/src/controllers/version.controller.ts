import { Request, Response } from 'express';
import { VersionService } from '../services/version.service';

export const getVersions = async (req: Request, res: Response) => {
    try {
        const versions = await VersionService.getLatestVersions();
        res.json(versions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const setSchoolVersion = async (req: Request, res: Response) => {
    try {
        const schoolId = req.params.schoolId as string;
        const { version } = req.body;

        if (!version) {
            return res.status(400).json({ message: 'Version is required' });
        }

        const school = await VersionService.setSchoolVersion(schoolId, version);
        res.json({ message: `School successfully locked to version ${version}`, school });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// Admin only: Register a new version
export const registerVersion = async (req: Request, res: Response) => {
    try {
        const { version, description } = req.body;
        if (!version) {
            return res.status(400).json({ message: 'Version is required' });
        }

        const result = await VersionService.registerVersion(version, description);
        res.json({ message: `Version ${version} registered successfully`, result });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
