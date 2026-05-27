import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RoleService } from '../services/role.service';

export class RoleController {
    static async getRolePermissions(req: AuthRequest, res: Response) {
        try {
            const data = await RoleService.getRolePermissions(req.user.school_id);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateRolePermission(req: AuthRequest, res: Response) {
        try {
            const { role, permission_id, enabled } = req.body;
            const data = await RoleService.updateRolePermission(
                req.user.school_id,
                role,
                permission_id,
                enabled
            );
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
