import React from 'react';
import { useBranch } from '../../context/BranchContext';

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

export const BranchSwitcher: React.FC = () => {
    const { currentBranch, branches, switchBranch, isLoading } = useBranch();
    const [isOpen, setIsOpen] = React.useState(false);

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

    return (
        <div className="relative">
            {/* Trigger Button - Liquid Glass Effect */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    group relative px-4 py-2.5 rounded-2xl
                    backdrop-blur-xl bg-white/10 
                    border border-white/20
                    shadow-2xl shadow-black/10
                    hover:bg-white/20 hover:shadow-black/20
                    transition-all duration-300 ease-out
                    ${isOpen ? 'bg-white/20 scale-95' : 'scale-100'}
                `}
            >
                <div className="flex items-center gap-3">
                    {/* Branch Icon */}
                    <div className={`
                        w-8 h-8 rounded-xl bg-gradient-to-br ${getCurriculumColor(currentBranch?.curriculum_type || 'nigerian')}
                        flex items-center justify-center
                        border
                        transition-all duration-300
                        group-hover:scale-110 group-hover:rotate-3
                    `}>
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>

                    {/* Branch Name & Curriculum */}
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-bold text-white/90 leading-none">
                            {currentBranch?.name || 'Select Branch'}
                        </span>
                        <span className="text-xs text-white/60 mt-0.5">
                            {getCurriculumLabel(currentBranch?.curriculum_type || 'nigerian')}
                        </span>
                    </div>

                    {/* Chevron */}
                    <svg
                        className={`w-4 h-4 text-white/60 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
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

                    {/* Dropdown Panel */}
                    <div className="
                        absolute top-full right-0 mt-2 w-80 z-50
                        origin-top-right
                        animate-scale-in
                    ">
                        <div className="
                            backdrop-blur-2xl bg-white/10
                            border border-white/20
                            rounded-3xl
                            shadow-2xl shadow-black/20
                            overflow-hidden
                        ">
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-white/10">
                                <h3 className="text-sm font-bold text-white/90">Switch Branch</h3>
                                <p className="text-xs text-white/60 mt-0.5">Select a different campus or curriculum</p>
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
                                                w-full px-4 py-3 rounded-2xl
                                                flex items-center gap-3
                                                transition-all duration-200
                                                ${isActive
                                                    ? 'bg-white/20 border border-white/30 shadow-lg'
                                                    : 'hover:bg-white/10 border border-transparent'
                                                }
                                                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                mb-1 last:mb-0
                                            `}
                                        >
                                            {/* Branch Icon with Curriculum Color */}
                                            <div className={`
                                                w-12 h-12 rounded-xl
                                                bg-gradient-to-br ${getCurriculumColor(branch.curriculum_type)}
                                                flex items-center justify-center
                                                border
                                                flex-shrink-0
                                            `}>
                                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            </div>

                                            {/* Branch Details */}
                                            <div className="flex-1 text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white/90">
                                                        {branch.name}
                                                    </span>
                                                    {isActive && (
                                                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-xs text-green-300 font-medium">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-white/60">
                                                        {getCurriculumLabel(branch.curriculum_type)}
                                                    </span>
                                                    {branch.location && (
                                                        <>
                                                            <span className="text-white/30">•</span>
                                                            <span className="text-xs text-white/50">
                                                                {branch.location}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Checkmark for active */}
                                            {isActive && (
                                                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
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
