import { Response } from 'express';
import { VendorService } from '../services/vendor.service';
import { AuthRequest } from '../middleware/auth';

export const getVendors = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const branchId = req.headers['x-branch-id'] as string;
        
        const vendors = await VendorService.getVendors(school_id, branchId);
        res.json(vendors);
    } catch (error: any) {
        console.error('Error in getVendors controller:', error);
        res.status(500).json({ error: 'Failed to fetch vendors', message: error.message });
    }
};

export const createVendor = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const branchId = req.headers['x-branch-id'] as string;
        
        const vendor = await VendorService.createVendor(school_id, branchId, req.body);
        res.status(201).json(vendor);
    } catch (error: any) {
        console.error('Error in createVendor controller:', error);
        res.status(500).json({ error: 'Failed to create vendor', message: error.message });
    }
};

export const updateVendor = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const { id } = req.params;
        
        const vendor = await VendorService.updateVendor(id, school_id, req.body);
        res.json(vendor);
    } catch (error: any) {
        console.error('Error in updateVendor controller:', error);
        res.status(500).json({ error: 'Failed to update vendor', message: error.message });
    }
};

export const deleteVendor = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const { id } = req.params;
        
        await VendorService.deleteVendor(id, school_id);
        res.json({ message: 'Vendor deleted successfully' });
    } catch (error: any) {
        console.error('Error in deleteVendor controller:', error);
        res.status(500).json({ error: 'Failed to delete vendor', message: error.message });
    }
};
