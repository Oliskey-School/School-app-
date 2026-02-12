import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, Building } from 'lucide-react';
import { DashboardType } from '../types';

// Types
export interface Branch {
    id: string;
    name: string;
    is_main: boolean;
    curriculum_type?: 'nigerian' | 'british' | 'american';
    location?: string;
}

interface BranchContextType {
    currentBranch: Branch | null;
    branches: Branch[];
    switchBranch: (branchId: string) => void;
    isLoading: boolean;
    canSwitchBranches: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, role, currentSchool, currentBranchId } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Derived state: Only Proprietors, SuperAdmins, and Main Admins can switch
    const canSwitchBranches =
        (role === DashboardType.Proprietor) ||
        (role === DashboardType.SuperAdmin) ||
        (role === DashboardType.Admin && !currentBranchId);

    useEffect(() => {
        if (!user || !currentSchool) {
            setIsLoading(false);
            return;
        }

        const fetchBranches = async () => {
            try {
                setIsLoading(true);

                // Fetch all branches for this school
                const { data, error } = await supabase
                    .from('branches')
                    .select('id, name, is_main, curriculum_type, location')
                    .eq('school_id', currentSchool.id)
                    .order('is_main', { ascending: false });

                if (error) throw error;

                if (data && data.length > 0) {
                    setBranches(data);

                    // Determine which branch to select:
                    // 1. Saved in localStorage
                    // 2. Assigned via JWT (Project Ironclad claim)
                    // 3. Main branch (fallback)

                    const savedBranchId = localStorage.getItem('selected_branch_id');
                    const assignedBranchId = currentBranchId;

                    // If user is a Main Admin/Proprietor and has "all" saved, or nothing assigned
                    if (canSwitchBranches && (savedBranchId === 'all' || (!savedBranchId && !assignedBranchId))) {
                        setCurrentBranch(null);
                    } else if (data.length > 0) {
                        const branchToSelect =
                            data.find(b => b.id === savedBranchId) ||
                            data.find(b => b.id === assignedBranchId) ||
                            data[0];

                        setCurrentBranch(branchToSelect);
                    }
                } else {
                    console.log('No branches found for school');
                    setBranches([]);
                    setCurrentBranch(null);
                }
            } catch (err) {
                console.error('Error fetching branches:', err);
                setBranches([]);
                setCurrentBranch(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBranches();
    }, [user, currentSchool, currentBranchId, canSwitchBranches]);

    const switchBranch = async (branchId: string | null) => {
        try {
            if (branchId === null) {
                // Main Admin switching to "All Branches"
                if (!canSwitchBranches) {
                    throw new Error("SecurityException: Unauthorized attempt to clear branch context.");
                }

                // Sync with backend
                const { error: rpcError } = await supabase.rpc('sync_active_branch', { p_branch_id: null });
                if (rpcError) throw rpcError;

                setCurrentBranch(null);
                localStorage.setItem('selected_branch_id', 'all');
                console.log("🔓 [Context Switch] All branches active.");
            } else {
                // Switching to a specific branch
                const branch = branches.find(b => b.id === branchId);
                if (!branch) {
                    throw new Error("SecurityException: Target branch not found or unauthorized.");
                }

                // Sync with backend
                const { error: rpcError } = await supabase.rpc('sync_active_branch', { p_branch_id: branchId });
                if (rpcError) throw rpcError;

                setCurrentBranch(branch);
                localStorage.setItem('selected_branch_id', branchId);
                console.log(`🔒 [Context Switch] Active branch: ${branch.name}`);
            }

            // The onAuthStateChange in AuthContext will handle the session update
            // and trigger a re-render, which will then cause the BranchContext
            // to re-evaluate the user's branch access.
            console.log("Branch switched. Auth state will be updated by its own listener.");
        } catch (err: any) {
            console.error("❌ [SecurityException] Branch switch failed:", err.message);
            toast.error(err.message);
        }
    };

    return (
        <BranchContext.Provider value={{ currentBranch, branches, switchBranch, isLoading, canSwitchBranches }}>
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
    const { currentBranch, branches, switchBranch, canSwitchBranches, isLoading } = useBranch();
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
