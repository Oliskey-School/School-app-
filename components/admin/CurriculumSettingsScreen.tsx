import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { fetchCurricula, fetchSubjects } from '../../lib/database';
import { Curriculum, Subject } from '../../types';
import { BookOpenIcon, CheckCircleIcon } from '../../constants';
import { toast } from 'react-hot-toast';

const CurriculumSettingsScreen: React.FC<{
    handleBack: () => void;
}> = ({ handleBack }) => {
    const [templates, setTemplates] = useState<Curriculum[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Curriculum | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            loadSubjects(selectedTemplate.id);
        }
    }, [selectedTemplate]);

    const loadTemplates = async () => {
        setIsLoading(true);
        const data = await fetchCurricula();
        setTemplates(data);
        if (data.length > 0) setSelectedTemplate(data[0]);
        setIsLoading(false);
    };

    const loadSubjects = async (curriculumId: string | number) => {
        const data = await fetchSubjects(curriculumId);
        setSubjects(data);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
            {/* Quick Info Bar - Subtle integration instead of huge header */}
            <div className="px-4 py-2 bg-indigo-600/10 border-b border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                    <BookOpenIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">System Curricula</span>
                </div>
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase"
                >
                    {showInfo ? 'Hide Info' : 'Show Info'}
                </button>
            </div>

            {showInfo && (
                <div className="mx-4 mt-4 p-4 bg-indigo-600/10 backdrop-blur-md rounded-2xl border border-indigo-500/20 animate-fade-in">
                    <p className="text-xs text-indigo-200 leading-relaxed font-medium">
                        Curricula are defined at the system level to ensure compliance. These templates are inherited by all branches.
                        Contact system administration or support to request custom curriculum modifications.
                    </p>
                </div>
            )}

            {/* Mobile Tab Navigation */}
            <div className="md:hidden bg-slate-900/50 backdrop-blur-md border-b border-white/5">
                <div className="flex overflow-x-auto scrollbar-hide p-2 gap-2">
                    {templates.map(temp => (
                        <button
                            key={temp.id}
                            onClick={() => setSelectedTemplate(temp)}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${selectedTemplate?.id === temp.id
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                                : 'bg-slate-800/50 border-white/5 text-slate-400'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span>{temp.name === 'Nigerian' ? '🇳🇬' : '🇬🇧'}</span>
                                <span>{temp.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
                {/* Desktop Sidebar */}
                <div className="hidden md:block w-1/3 lg:w-1/4 bg-slate-900/40 backdrop-blur-xl border-r border-white/5 overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Templates</h2>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold border border-indigo-500/20">
                                {templates.length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2].map(i => (
                                        <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                                    ))}
                                </div>
                            ) : (
                                templates.map(temp => (
                                    <button
                                        key={temp.id}
                                        onClick={() => setSelectedTemplate(temp)}
                                        className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group ${selectedTemplate?.id === temp.id
                                            ? 'bg-indigo-600/10 border-indigo-500 shadow-xl shadow-indigo-950/50'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start gap-4">
                                                <div className="text-3xl filter grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110">
                                                    {temp.name === 'Nigerian' ? '🇳🇬' : '🇬🇧'}
                                                </div>
                                                <div>
                                                    <p className={`font-bold transition-colors ${selectedTemplate?.id === temp.id ? 'text-white' : 'text-slate-300'}`}>
                                                        {temp.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                        {temp.description}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedTemplate?.id === temp.id && (
                                                <div className="bg-indigo-500 rounded-full p-0.5 shadow-lg shadow-indigo-500/50">
                                                    <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-slate-950">
                    {selectedTemplate ? (
                        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
                            {/* Curriculum Hero Card */}
                            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 to-slate-900/40 p-1">
                                <div className="absolute inset-0 bg-indigo-500/5" />
                                <div className="relative bg-slate-900/80 backdrop-blur-2xl rounded-[2.4rem] p-8 md:p-10 border border-white/5">
                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                        <div className="text-7xl md:text-8xl drop-shadow-2xl animate-float">
                                            {selectedTemplate.name === 'Nigerian' ? '🇳🇬' : '🇬🇧'}
                                        </div>
                                        <div className="text-center md:text-left">
                                            <div className="flex flex-col md:flex-row items-center gap-3 mb-3">
                                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                                                    {selectedTemplate.name}
                                                </h2>
                                                <span className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest">
                                                    Standard
                                                </span>
                                            </div>
                                            <p className="text-slate-400 text-sm md:text-lg max-w-2xl leading-relaxed">
                                                {selectedTemplate.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subject List Grid */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-xl">
                                            <BookOpenIcon className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">Academic Subjects</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</span>
                                        <span className="px-3 py-1 bg-white/5 rounded-full text-sm font-bold text-indigo-400 border border-white/5">
                                            {subjects.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {subjects.length === 0 ? (
                                        <div className="col-span-full py-20 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                            <BookOpenIcon className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                            <p className="text-slate-500 font-medium">No subjects found in the database.</p>
                                        </div>
                                    ) : (
                                        subjects.map((subject, idx) => (
                                            <div
                                                key={subject.id}
                                                className="group bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/5 hover:border-indigo-500/40 transition-all duration-300 hover:bg-white/10 animate-scale-in"
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-3 rounded-2xl shadow-inner ${subject.category === 'Core'
                                                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                        : subject.category === 'Foundation'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                        }`}>
                                                        <BookOpenIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-lg font-bold text-slate-100 group-hover:text-white transition-colors">
                                                            {subject.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${subject.category === 'Core'
                                                                ? 'bg-indigo-500/20 text-indigo-300'
                                                                : subject.category === 'Foundation'
                                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                                    : 'bg-slate-700/50 text-slate-400'
                                                                }`}>
                                                                {subject.category}
                                                            </span>
                                                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                                {subject.gradeLevel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in">
                            <div className="w-32 h-32 bg-indigo-500/5 rounded-full flex items-center justify-center mb-8 border border-indigo-500/10 relative">
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping opacity-20" />
                                <BookOpenIcon className="w-16 h-16 text-indigo-500/40" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">Initialize Curriculum</h3>
                            <p className="text-slate-500 max-w-sm font-medium">
                                Choose a curriculum template from the sidebar to visualize and managed assigned subjects.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CurriculumSettingsScreen;
