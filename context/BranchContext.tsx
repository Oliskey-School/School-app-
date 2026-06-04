import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { isDemoMode, backendFetch } from '../lib/database';
import { ChevronDown, Building } from 'lucide-react';
import { Branch, DashboardType } from '../types';
import api from '../lib/api';
import { offlineStorage } from '../lib/offlineStorage';

interface BranchContextType {
    currentBranch: Branch | null;
    branches: Branch[];
    switchBranch: (branchId: string | null) => void;
    refreshBranches: () => Promise<void>;
    isLoading: boolean;
    canSwitchBranches: boolean;
    /** Whether the "All Branches" option is allowed. False for multi-branch teachers
     *  (session isolation — they operate in exactly one active branch at a time). */
    allowAllOption: boolean;
    /** The user's Global ID in the CURRENTLY active branch (e.g. OLISKEY_LEKKI_TCH_0001).
     *  Updates live when the branch is switched. Null until resolved. */
    activeBranchGeneratedId: string | null;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, role, currentSchool, currentBranchId, loading: authLoading } = useAuth();
    const queryClient = useQueryClient();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeBranchGeneratedId, setActiveBranchGeneratedId] = useState<string | null>(null);

    // A teacher's authorized branches = their primary branch plus any extra
    // branches the main admin explicitly assigned (allowed_branch_ids).
    const teacherAuthorizedIds = React.useMemo(() => {
        const extra = ((user as any)?.allowed_branch_ids as string[] | undefined) || [];
        return [currentBranchId, ...extra].filter(Boolean) as string[];
    }, [currentBranchId, user]);

    const isMultiBranchTeacher =
        role === DashboardType.Teacher && teacherAuthorizedIds.length >= 2;

    // Derived state: Only Proprietors, SuperAdmins, Main Admins, Parents, and
    // teachers explicitly assigned to multiple branches can switch.
    const canSwitchBranches =
        (role === DashboardType.Proprietor) ||
        (role === DashboardType.SuperAdmin) ||
        (role === DashboardType.Parent) || // Parents need to switch when switching children
        (role === DashboardType.Admin && !currentBranchId) ||
        isMultiBranchTeacher;

    // Teachers are isolated to a single active branch at a time — no "All" view.
    const allowAllOption = role !== DashboardType.Teacher;

    const refreshBranches = useCallback(async () => {
        if (!currentSchool) return;

        try {
            setIsLoading(true);
            // Authorized branches for this user: all school branches for admins,
            // primary + assigned branches for a multi-branch teacher / branch admin.
            const data = await api.getAuthorizedBranches();

            if (data && data.length > 0) {
                // Teachers only ever see/operate within their authorized branches.
                const visible: Branch[] = role === DashboardType.Teacher
                    ? data.filter((b: Branch) => teacherAuthorizedIds.includes(b.id))
                    : data;

                setBranches(visible);

                const savedBranchId = localStorage.getItem('selected_branch_id');
                const assignedBranchId = currentBranchId;

                if (role === DashboardType.Teacher) {
                    // Never "All" for teachers — pick the saved branch if it is still
                    // authorized, otherwise fall back to their primary branch.
                    const desired = (savedBranchId && savedBranchId !== 'all' && teacherAuthorizedIds.includes(savedBranchId))
                        ? savedBranchId
                        : (assignedBranchId || '');
                    const branchToSelect =
                        visible.find((b: Branch) => b.id === desired) ||
                        visible[0] ||
                        null;
                    setCurrentBranch(branchToSelect);
                    // Persist a concrete branch so the X-Branch-Id header is always sent.
                    if (branchToSelect) localStorage.setItem('selected_branch_id', branchToSelect.id);
                } else if (canSwitchBranches && (savedBranchId === 'all' || (!savedBranchId && !assignedBranchId))) {
                    setCurrentBranch(null);
                } else {
                    const branchToSelect =
                        visible.find((b: Branch) => b.id === savedBranchId) ||
                        visible.find((b: Branch) => b.id === assignedBranchId) ||
                        visible[0];

                    setCurrentBranch(branchToSelect);
                }
            }
            // NOTE: if the fetch returns empty we intentionally do nothing — we keep
            // the existing branches AND the active selection. Resetting here (often a
            // transient empty during a token refresh) was collapsing the dashboard
            // back to the home branch and making other branches "leak" their data.
        } catch (err) {
            console.error('Error fetching branches:', err);
            // Same: never drop the active branch on a transient error.
        } finally {
            setIsLoading(false);
        }
    }, [currentSchool, currentBranchId, canSwitchBranches, role, teacherAuthorizedIds]);

    useEffect(() => {
        if (authLoading) {
            setIsLoading(true);
            return;
        }

        if (!user || !currentSchool) {
            setIsLoading(false);
            return;
        }

        refreshBranches();
    }, [authLoading, user, currentSchool, currentBranchId, canSwitchBranches, refreshBranches]);

    // Resolve the Global ID for the ACTIVE branch whenever it changes (switchBranch
    // has already written selected_branch_id, so the request carries the right
    // X-Branch-Id). This is what makes the header ID switch with the branch.
    useEffect(() => {
        if (!user || !currentSchool) { setActiveBranchGeneratedId(null); return; }
        let cancelled = false;
        api.getActiveBranchId()
            .then(res => { if (!cancelled) setActiveBranchGeneratedId(res?.school_generated_id || null); })
            .catch(() => { if (!cancelled) setActiveBranchGeneratedId(null); });
        return () => { cancelled = true; };
    }, [currentBranch?.id, user, currentSchool]);

    const switchBranch = async (branchId: string | null) => {
        try {
            if (branchId === null) {
                // "All Branches" — not permitted for teachers (single active branch).
                if (!canSwitchBranches || !allowAllOption) {
                    throw new Error("Unauthorized attempt to clear branch context.");
                }
                localStorage.setItem('selected_branch_id', 'all');
            } else {
                const branch = branches.find(b => b.id === branchId);
                if (!branch) {
                    throw new Error("Target branch not found or unauthorized.");
                }
                localStorage.setItem('selected_branch_id', branchId);
            }

            // HARD RESET into the new branch's environment. Switching branches must
            // feel like entering a completely separate system — so NOTHING from the
            // previous branch may linger. We:
            //   1) drop EVERY cached query (clear, not just invalidate),
            //   2) drop the API client's in-flight/response cache,
            //   3) clear the offline (localStorage) data cache,
            //   4) reset each dashboard's saved view/tab so we land on a fresh home,
            //   5) reload the whole app so it re-initialises and re-fetches everything
            //      with the new active School + Branch headers.
            // Only the auth token + selected_branch_id persist (the master session).
            try { queryClient.clear(); } catch { /* noop */ }
            try { (api as any).invalidateCache?.(); } catch { /* noop */ }
            try { await offlineStorage.clearAll(); } catch { /* noop */ }
            try {
                Object.keys(sessionStorage).forEach((k) => {
                    if (k.endsWith('_viewStack') || k.endsWith('_activeBottomNav')) sessionStorage.removeItem(k);
                });
            } catch { /* noop */ }

            window.location.reload();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <BranchContext.Provider value={{ currentBranch, branches, switchBranch, refreshBranches, isLoading, canSwitchBranches, allowAllOption, activeBranchGeneratedId }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => {
    const context = useContext(BranchContext);
    if (context === undefined) {
        throw new Error('useBranch must be used within a BranchProvider');
    }
    return context;
};

// ==========================================
// UI Component: Branch Switcher
// ==========================================

export const BranchSwitcher: React.FC<{ align?: 'left' | 'right' }> = ({ align = 'left' }) => {
    const { currentBranch, branches, switchBranch, canSwitchBranches, isLoading, allowAllOption } = useBranch();
    const [isOpen, setIsOpen] = useState(false);

    if (isLoading) return null;

    // If no branches and can't manage, show nothing or school name?
    if (branches.length === 0) return null;

    if (!canSwitchBranches && currentBranch) return (
        // Static display for regular staff
        <div className="flex items-center text-gray-600 px-4 py-2">
            <Building className="w-4 h-4 mr-2" />
            <span className="font-medium">{currentBranch.name}</span>
        </div>
    );

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            >
                <Building className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-800">{currentBranch ? currentBranch.name : 'All Branches'}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2`}>
                    {allowAllOption && (
                        <>
                            <button
                                onClick={() => {
                                    switchBranch(null);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${!currentBranch ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                                    }`}
                            >
                                <span>All Branches</span>
                                {!currentBranch && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                )}
                            </button>
                            <div className="border-t my-1"></div>
                        </>
                    )}
                    {branches.map((branch) => (
                        <button
                            key={branch.id}
                            onClick={() => {
                                switchBranch(branch.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${currentBranch?.id === branch.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                                }`}
                        >
                            <span>{branch.name}</span>
                            {currentBranch?.id === branch.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
