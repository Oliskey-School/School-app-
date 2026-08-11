import { Router } from 'express';
import { getPhotos, addPhoto } from '../controllers/gallery.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getPhotos);
// Adding to the school gallery is staff-only (components/teacher/PhotoGalleryScreen.tsx
// is the only UI for it) — previously any authenticated user could POST here.
router.post('/', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']), addPhoto);

export default router;
