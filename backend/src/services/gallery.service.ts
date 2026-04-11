import prisma from '../config/database';
import { SocketService } from './socket.service';

export class GalleryService {
    static async getPhotos(schoolId: string) {
        return await prisma.schoolGallery.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async addPhoto(schoolId: string, branchId: string | undefined, data: any) {
        const photo = await prisma.schoolGallery.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId || null
            }
        });

        SocketService.emitToSchool(schoolId, 'gallery:updated', { action: 'add_photo', photoId: photo.id });
        return photo;
    }
}

