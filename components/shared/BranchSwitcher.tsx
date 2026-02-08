import React, { useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { DashboardType } from '../../types';
import { Building2, ChevronDown, Check } from 'lucide-react';

/**
 * Premium BranchSwitcher Component
 * Features: Liquid Glass morphism, curriculum awareness, real-time updates
 * Design: Apple-inspired translucent UI with smooth transitions
 */

interface Branch {
    id: string;
    name: string;
    curriculum_type: 'nigerian' | 'british' | 'american';
    location?: string;
}

interface BranchSwitcherProps {
    align?: 'left' | 'right' | 'center';
}

export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({ align = 'right' }) => {
    const { currentBranch, branches, switchBranch, isLoading } = useBranch();
    const { role } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const getCurriculumLabel = (type: string) => {
        const labels = {
            nigerian: '🇳🇬 NERDC',
            british: '🇬🇧 UK NC',
            american: '🇺🇸 Common Core'
        };
        return labels[type as keyof typeof labels] || type;
    };

    const getCurriculumColor = (type: string) => {
        const colors = {
            nigerian: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
            british: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
            american: 'from-red-500/20 to-rose-500/20 border-red-500/30'
        };
        return colors[type as keyof typeof colors] || 'from-gray-500/20 to-slate-500/20 border-gray-500/30';
    };

    if (!branches || branches.length <= 1) {
        return null; // Don't show if only one branch
    }

    // Hide for non-admin roles
    if (role !== DashboardType.Admin && role !== DashboardType.SuperAdmin && role !== DashboardType.Proprietor) {
        return null;
    }

    return (
        <div className="relative">
            {/* Trigger Button - Liquid Glass Effect */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    group relative p-1 rounded-lg
                    backdrop-blur-md bg-white/5 
                    border border-white/10
                    shadow-sm
                    hover:bg-white/10 hover:shadow-md
                    transition-all duration-300 ease-out
                    ${isOpen ? 'bg-white/10 shadow-inner' : ''}
                `}
            >
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Branch Icon */}
                    <div className={`
                        w-6 h-6 rounded-md bg-gradient-to-br ${getCurriculumColor(currentBranch?.curriculum_type || 'nigerian')}
                        flex items-center justify-center
                        border
                        transition-all duration-300
                        group-hover:scale-110 group-hover:rotate-3
                    `}>
                        <Building2 className="w-3.5 h-3.5 text-white" />
                    </div>

                    {/* Chevron */}
                    <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                </div>
            </button>

            {/* Dropdown Menu - Glass Morphism Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Panel - Mobile: Fixed Modal, Desktop: Absolute Dropdown */}
                    <div className={`
                        z-50
                        fixed left-4 right-4 top-24 w-auto max-w-xs mx-auto
                        sm:absolute sm:inset-auto sm:top-full sm:mt-2 sm:w-80 sm:mx-0
                        ${align === 'right' ? 'sm:right-0 sm:origin-top-right' : align === 'center' ? 'sm:left-1/2 sm:-translate-x-1/2 sm:origin-top' : 'sm:left-0 sm:origin-top-left'}
                    `}>
                        <div className="
                            animate-scale-in
                            bg-white
                            border border-gray-100
                            rounded-2xl
                            shadow-2xl shadow-indigo-500/10
                            overflow-hidden
                            ring-1 ring-black/5
                        ">
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                <h3 className="text-sm font-bold text-gray-900">Switch Branch</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Select a different campus or curriculum</p>
                            </div>

                            {/* Branch List */}
                            <div className="max-h-96 overflow-y-auto p-2">
                                {branches.map((branch) => {
                                    const isActive = branch.id === currentBranch?.id;
                                    return (
                                        <button
                                            key={branch.id}
                                            onClick={() => {
                                                switchBranch(branch.id);
                                                setIsOpen(false);
                                            }}
                                            disabled={isLoading || isActive}
                                            className={`
                                                w-full px-3 py-3 rounded-xl
                                                flex items-center gap-3
                                                transition-all duration-200
                                                text-left
                                                ${isActive
                                                    ? 'bg-indigo-50/80 border border-indigo-100'
                                                    : 'hover:bg-gray-50 border border-transparent'
                                                }
                                                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                mb-1 last:mb-0
                                                group
                                            `}
                                        >
                                            {/* Branch Icon with Curriculum Color */}
                                            <div className={`
                                                w-10 h-10 rounded-lg
                                                bg-gradient-to-br ${getCurriculumColor(branch.curriculum_type).replace('border-', '')}
                                                flex items-center justify-center
                                                shadow-sm
                                                flex-shrink-0
                                            `}>
                                                <Building2 className="w-5 h-5 text-white" />
                                            </div>

                                            {/* Branch Details */}
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-sm font-bold ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                        {branch.name}
                                                    </span>
                                                    {isActive && (
                                                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-gray-500 font-medium">
                                                        {getCurriculumLabel(branch.curriculum_type)}
                                                    </span>
                                                    {branch.location && (
                                                        <>
                                                            <span className="text-gray-300">•</span>
                                                            <span className="text-xs text-gray-400">
                                                                {branch.location}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Checkmark for active */}
                                            {isActive && (
                                                <Check className="w-5 h-5 text-indigo-600" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 backdrop-blur-sm bg-white/10 rounded-2xl flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

// Animation keyframes (add to global CSS or Tailwind config)
const styles = `
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
`;

export default BranchSwitcher;
