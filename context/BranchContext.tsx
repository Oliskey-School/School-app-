import React, { createContext, useContext, useState, useEffect } from 'react';
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
    const { user, role } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Derived state: Only Proprietors and SuperAdmins can switch
    const canSwitchBranches = (role === DashboardType.Proprietor) || (role === DashboardType.SuperAdmin);

    useEffect(() => {
        if (!user) return;

        const fetchBranches = async () => {
            try {
                setIsLoading(true);

                // Get user's school_id first
                let { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('school_id')
                    .eq('id', user.id)
                    .single();

                // If user not found in public.users, try to get from auth metadata
                if (!userData?.school_id) {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    const metaSchoolId = authUser?.user_metadata?.school_id || authUser?.app_metadata?.school_id;

                    if (metaSchoolId) {
                        userData = { school_id: metaSchoolId };
                    } else {
                        console.warn('No school_id found for user. Redirecting to setup...');
                        // Optional: trigger redirect here if not handled by a higher-level guard
                        // window.location.href = '/setup-school'; 

                        // For now, just set empty branches and stop loading
                        setBranches([]);
                        setIsLoading(false);
                        return;
                    }
                }

                if (!userData?.school_id) {
                    console.warn('Still no school_id found');
                    setIsLoading(false);
                    return;
                }

                // Fetch all branches for this school
                const { data, error } = await supabase
                    .from('branches')
                    .select('id, name, is_main, curriculum_type, location')
                    .eq('school_id', userData.school_id)
                    .order('is_main', { ascending: false });

                if (error) throw error;

                if (data && data.length > 0) {
                    setBranches(data);
                    // Default to first branch (or Main) if not set
                    if (!currentBranch) {
                        const savedBranchId = localStorage.getItem('selected_branch_id');
                        const savedBranch = data.find(b => b.id === savedBranchId);
                        setCurrentBranch(savedBranch || data[0]);
                    }
                } else {
                    // No branches found - this is ok for now
                    console.log('No branches found for school');
                    setBranches([]);
                }
            } catch (err) {
                console.error('Error fetching branches:', err);
                // Don't crash the app if branches fail to load
                setBranches([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBranches();
    }, [user]);

    const switchBranch = (branchId: string) => {
        const branch = branches.find(b => b.id === branchId);
        if (branch) {
            setCurrentBranch(branch);
            localStorage.setItem('selected_branch_id', branchId);

            // IMPORTANT: Trigger a reload or re-fetch of dashboard data here
            // Logic: Changing currentBranch should trigger effects in other components
            // that depend on `useBranch()`.

            // For "Zero Data Leakage" UI enforcement:
            // We might want to pass `currentBranch.id` to all future API calls as a filter
            // if we are a Proprietor simulating a branch view.
            console.log(`Switched to branch: ${branch.name}`);
            window.location.reload(); // Simple brute-force reload to refresh all data with new context
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

export const BranchSwitcher: React.FC = () => {
    const { currentBranch, branches, switchBranch, canSwitchBranches, isLoading } = useBranch();
    const [isOpen, setIsOpen] = useState(false);

    if (isLoading || !currentBranch) return null;
    if (!canSwitchBranches && branches.length <= 1) return (
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
                <span className="font-semibold text-gray-800">{currentBranch.name}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                    {branches.map((branch) => (
                        <button
                            key={branch.id}
                            onClick={() => {
                                switchBranch(branch.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${currentBranch.id === branch.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                                }`}
                        >
                            <span>{branch.name}</span>
                            {currentBranch.id === branch.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            )}
                        </button>
                    ))}
                    <div className="border-t my-1"></div>
                    <button className="w-full text-left px-4 py-2 text-xs text-gray-500 hover:text-indigo-600">
                        + Manage Branches
                    </button>
                </div>
            )}
        </div>
    );
};
