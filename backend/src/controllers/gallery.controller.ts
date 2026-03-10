import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { GalleryService } from '../services/gallery.service';

export const getPhotos = async (req: AuthRequest, res: Response) => {
    try {
        const result = await GalleryService.getPhotos(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
