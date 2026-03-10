import { Request, Response } from 'express';
import { OnboardingService } from '../services/onboarding.service';

export const createSchoolOnboard = async (req: Request, res: Response) => {
    try {
        const {
            schoolName, schoolCode, schoolEmail, phone, address, state, logoUrl,
            mainBranchName, mainBranchCode, additionalBranches,
            adminName, adminEmail, adminPassword,
            planType,
        } = req.body;

        // Required field check
        const missing = [];
        if (!schoolName) missing.push('schoolName');
        if (!schoolCode) missing.push('schoolCode');
        if (!schoolEmail) missing.push('schoolEmail');
        if (!phone) missing.push('phone');
        if (!mainBranchName) missing.push('mainBranchName');
        if (!mainBranchCode) missing.push('mainBranchCode');
        if (!adminName) missing.push('adminName');
        if (!adminEmail) missing.push('adminEmail');
        if (!adminPassword) missing.push('adminPassword');

        if (missing.length > 0) {
            return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
        }

        if (adminPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        const result = await OnboardingService.createSchoolWithSetup({
            schoolName,
            schoolCode,
            schoolEmail,
            phone,
            address,
            state,
            logoUrl,
            mainBranchName,
            mainBranchCode,
            additionalBranches,
            adminName,
            adminEmail,
            adminPassword,
            planType: planType || 'free',
        });

        return res.status(201).json({
            message: 'School created successfully. Your 30-day free trial has started.',
            ...result,
        });
    } catch (error: any) {
        console.error('[Onboarding] Error:', error.message);
        return res.status(400).json({ message: error.message || 'Failed to create school.' });
    }
};
