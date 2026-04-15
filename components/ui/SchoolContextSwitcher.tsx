import React, { useState } from 'react';
import { ChevronRightIcon, SparklesIcon, ChevronLeftIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';

interface SchoolContextSwitcherProps {
    currentSchoolName: string;
    onSwitch?: (schoolId: string) => void;
}

const SchoolContextSwitcher: React.FC<SchoolContextSwitcherProps> = ({ currentSchoolName, onSwitch }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();

    // Mock other schools for now, in reality these would come from the parent's linked children
    const otherSchools = [
        { id: 'school-2', name: 'Oliskey High School', location: 'Lagos' },
        { id: 'school-3', name: 'Elite International Academy', location: 'Abuja' }
    ];

    if (!user || user.role !== 'parent') return null;

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all border border-white/10 group active:scale-95"
            >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                    <SparklesIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                    <p className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold leading-tight">Current School</p>
                    <p className="text-sm font-bold text-white leading-tight">{currentSchoolName}</p>
                </div>
                <ChevronRightIcon className={`h-4 w-4 text-white/50 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Your Linked Schools</h4>
                        </div>
                        
                        <div className="p-2">
                            {/* Current School (Selected) */}
                            <div className="flex items-center gap-4 p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                    {currentSchoolName[0]}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 leading-tight">{currentSchoolName}</p>
                                    <p className="text-xs text-indigo-600 font-medium">Active Context</p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-indigo-600" />
                            </div>

                            {/* Divider */}
                            <div className="my-2 px-4 flex items-center gap-2">
                                <div className="h-px flex-1 bg-gray-100" />
                                <span className="text-[10px] font-bold text-gray-300">SWITCH TO</span>
                                <div className="h-px flex-1 bg-gray-100" />
                            </div>

                            {/* Other Schools */}
                            {otherSchools.map((school) => (
                                <button
                                    key={school.id}
                                    onClick={() => {
                                        onSwitch?.(school.id);
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-4 p-3 w-full rounded-2xl hover:bg-gray-50 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                        {school.name[0]}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-gray-700 leading-tight group-hover:text-gray-900 transition-colors">{school.name}</p>
                                        <p className="text-xs text-gray-400">{school.location}</p>
                                    </div>
                                    <ChevronRightIcon className="h-4 w-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
                                </button>
                            ))}
                        </div>
                        
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                                <span>Link Another Student</span>
                                <ChevronRightIcon className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SchoolContextSwitcher;
