import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { isDemoMode, backendFetch } from '../lib/database';
import { ChevronDown, Building } from 'lucide-react';
import { Branch, DashboardType } from '../types';
import api from '../lib/api';

interface BranchContextType {
    currentBranch: Branch | null;
    branches: Branch[];
    switchBranch: (branchId: string | null) => void;
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

                // Fetch all branches for this school using our custom API
                const data = await api.getBranches(currentSchool.id);

                if (data && data.length > 0) {
                    setBranches(data);

                    const savedBranchId = localStorage.getItem('selected_branch_id');
                    const assignedBranchId = currentBranchId;

                    if (canSwitchBranches && (savedBranchId === 'all' || (!savedBranchId && !assignedBranchId))) {
                        setCurrentBranch(null);
                    } else if (data.length > 0) {
                        const branchToSelect =
                            data.find((b: Branch) => b.id === savedBranchId) ||
                            data.find((b: Branch) => b.id === assignedBranchId) ||
                            data[0];

                        setCurrentBranch(branchToSelect);
                    }
                } else {
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
                if (!canSwitchBranches) {
                    throw new Error("Unauthorized attempt to clear branch context.");
                }

                setCurrentBranch(null);
                localStorage.setItem('selected_branch_id', 'all');
            } else {
                const branch = branches.find(b => b.id === branchId);
                if (!branch) {
                    throw new Error("Target branch not found or unauthorized.");
                }

                setCurrentBranch(branch);
                localStorage.setItem('selected_branch_id', branchId);
            }
        } catch (err: any) {
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
