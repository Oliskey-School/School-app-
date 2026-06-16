import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { DashboardType } from '../types';

/**
 * True when the current user manages the WHOLE school (main-branch admin / proprietor /
 * super admin) rather than a single branch.
 *
 * NOTE: a main admin's home `branch_id` is truthy (it's the Main branch), so the UI
 * CANNOT infer this from the branch id alone — that mistakenly locked main admins out
 * of school-wide settings. We use the backend's `is_main_admin` (surfaced via
 * BranchContext). While it resolves we default to allowed for admins; the server still
 * blocks a branch admin's writes, so an optimistic render is safe.
 */
export function useIsMainAdmin(): boolean {
    const { role } = useAuth() as any;
    const { isMainAdmin } = useBranch();
    if (role === DashboardType.Proprietor || role === DashboardType.SuperAdmin) return true;
    if (role !== DashboardType.Admin) return false;
    return isMainAdmin !== false;
}
