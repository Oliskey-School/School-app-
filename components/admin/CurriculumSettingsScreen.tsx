import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { fetchCurricula, fetchSubjects } from '../../lib/database';
import { Curriculum, Subject } from '../../types';
import { BookOpenIcon, CheckCircleIcon, ChevronLeftIcon, GlobeIcon, RefreshIcon, ClockIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';


const CurriculumSettingsScreen: React.FC<{
    handleBack: () => void;
}> = ({ handleBack }) => {
    const { currentSchool, currentBranchId } = useAuth();
    const schoolId = currentSchool?.id;
    const [templates, setTemplates] = useState<Curriculum[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Curriculum | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInfo, setShowInfo] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [topics, setTopics] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingTopics, setIsLoadingTopics] = useState(false);

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
        const data = await fetchCurricula(schoolId);
        setTemplates(data);
        if (data.length > 0) setSelectedTemplate(data[0]);
        setIsLoading(false);
    };

    const loadSubjects = async (curriculumId: string | number) => {
        const data = await fetchSubjects(schoolId, currentBranchId || undefined, curriculumId);
        setSubjects(data);
    };

    const loadTopics = async (subjectId: string, term: number) => {
        setIsLoadingTopics(true);
        try {
            const data = await api.getCurriculumTopics(subjectId, String(term));
            setTopics(data);
        } catch (error) {
            toast.error('Failed to load curriculum topics');
            console.error(error);
        } finally {
            setIsLoadingTopics(false);
        }
    };

    const handleSync = async (subject: Subject) => {
        setIsSyncing(true);
        try {
            const source = selectedTemplate?.name.includes('Nigerian') ? 'Nigerian' : 'British';
            const result = await api.syncCurriculumData(subject.id, source);
            if (result.success) {
                toast.success(result.message);
                if (selectedTerm) loadTopics(subject.id, selectedTerm);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 text-gray-900 font-sans">
            {/* Quick Info Bar */}
            <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700">
                    <BookOpenIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">System Curricula</span>
                </div>
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase"
                >
                    {showInfo ? 'Hide Info' : 'Show Info'}
                </button>
            </div>

            {showInfo && (
                <div className="mx-4 mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-fade-in shadow-sm">
                    <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                        Curricula are defined at the system level to ensure compliance. These templates are inherited by all branches.
                        Contact system administration or support to request custom curriculum modifications.
                    </p>
                </div>
            )}

            {/* Mobile Tab Navigation */}
            <div className="md:hidden bg-white border-b border-gray-200">
                <div className="flex overflow-x-auto scrollbar-hide p-2 gap-2">
                    {templates.map(temp => (
                        <button
                            key={temp.id}
                            onClick={() => setSelectedTemplate(temp)}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${selectedTemplate?.id === temp.id
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                : 'bg-gray-100 border-gray-200 text-gray-600'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span>{temp.name.includes('Nigerian') ? '🇳🇬' : '🇬🇧'}</span>
                                <span>{temp.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
                {/* Desktop Sidebar */}
                <div className="hidden md:block w-1/3 lg:w-1/4 bg-white border-r border-gray-200 overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Templates</h2>
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100">
                                {templates.length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2].map(i => (
                                        <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                templates.map(temp => (
                                    <button
                                        key={temp.id}
                                        onClick={() => setSelectedTemplate(temp)}
                                        className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group ${selectedTemplate?.id === temp.id
                                            ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-200'
                                            : 'bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start gap-4">
                                                <div className="text-3xl filter grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110">
                                                    {temp.name.includes('Nigerian') ? '🇳🇬' : '🇬🇧'}
                                                </div>
                                                <div>
                                                    <p className={`font-bold transition-colors ${selectedTemplate?.id === temp.id ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                        {temp.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                                        {temp.description}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedTemplate?.id === temp.id && (
                                                <div className="bg-indigo-600 rounded-full p-0.5 shadow-sm">
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
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {selectedSubject ? (
                        <SubjectDetailView
                            subject={selectedSubject}
                            term={selectedTerm}
                            onSelectTerm={(term) => {
                                setSelectedTerm(term);
                                loadTopics(selectedSubject.id, term);
                            }}
                            onBack={() => {
                                setSelectedSubject(null);
                                setSelectedTerm(null);
                                setTopics([]);
                            }}
                            topics={topics}
                            isLoading={isLoadingTopics}
                            onSync={() => handleSync(selectedSubject)}
                            isSyncing={isSyncing}
                        />
                    ) : selectedTemplate ? (
                        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
                            {/* Curriculum Hero Card */}
                            <div className="relative overflow-hidden rounded-[2.5rem] bg-white p-1 shadow-xl shadow-indigo-900/5 border border-indigo-50">
                                <div className="absolute inset-0 bg-indigo-50/50" />
                                <div className="relative bg-white/80 backdrop-blur-sm rounded-[2.4rem] p-8 md:p-10">
                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                        <div className="text-7xl md:text-8xl drop-shadow-md animate-float">
                                            {selectedTemplate.name.includes('Nigerian') ? '🇳🇬' : '🇬🇧'}
                                        </div>
                                        <div className="text-center md:text-left">
                                            <div className="flex flex-col md:flex-row items-center gap-3 mb-3">
                                                <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
                                                    {selectedTemplate.name}
                                                </h2>
                                                <span className="px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-xs font-black uppercase tracking-widest">
                                                    Standard
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm md:text-lg max-w-2xl leading-relaxed">
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
                                        <div className="p-2 bg-indigo-100 rounded-xl">
                                            <BookOpenIcon className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Academic Subjects</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                                        <span className="px-3 py-1 bg-white rounded-full text-sm font-bold text-indigo-600 border border-gray-200 shadow-sm">
                                            {subjects.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {subjects.length === 0 ? (
                                        <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-gray-300">
                                            <BookOpenIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 font-medium">No subjects found in the database.</p>
                                        </div>
                                    ) : (
                                        subjects.map((subject, idx) => (
                                            <button
                                                key={subject.id}
                                                onClick={() => setSelectedSubject(subject)}
                                                className="group text-left bg-white rounded-2xl p-5 border border-gray-100 hover:border-indigo-300 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-900/5 animate-scale-in"
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-3 rounded-2xl shadow-sm ${subject.category === 'Core'
                                                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                        : subject.category === 'Foundation'
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                            : 'bg-gray-50 text-gray-600 border border-gray-100'
                                                        }`}>
                                                        <BookOpenIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-lg font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">
                                                            {subject.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${subject.category === 'Core'
                                                                ? 'bg-indigo-100 text-indigo-700'
                                                                : subject.category === 'Foundation'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                {subject.category}
                                                            </span>
                                                            <div className="w-1 h-1 rounded-full bg-gray-300" />
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                {subject.gradeLevel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in">
                            <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-8 border border-indigo-100 relative">
                                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20" />
                                <BookOpenIcon className="w-16 h-16 text-indigo-300" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Initialize Curriculum</h3>
                            <p className="text-gray-500 max-w-sm font-medium">
                                Choose a curriculum template from the sidebar to visualize and managed assigned subjects.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface SubjectDetailViewProps {
    subject: Subject;
    term: number | null;
    onSelectTerm: (term: number) => void;
    onBack: () => void;
    topics: any[];
    isLoading: boolean;
    onSync: () => void;
    isSyncing: boolean;
}

const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
    subject,
    term,
    onSelectTerm,
    onBack,
    topics,
    isLoading,
    onSync,
    isSyncing
}) => {
    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold text-sm group"
            >
                <ChevronLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Back to Subjects
            </button>

            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-indigo-900/5">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100">
                            <BookOpenIcon className="w-10 h-10 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">{subject.name}</h2>
                            <p className="text-gray-500 font-medium">{subject.gradeLevel} • {subject.category}</p>
                        </div>
                    </div>
                    <button
                        onClick={onSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                        {isSyncing ? (
                            <RefreshIcon className="w-5 h-5 animate-spin" />
                        ) : (
                            <GlobeIcon className="w-5 h-5" />
                        )}
                        Sync Curriculum
                    </button>
                </div>

                <div className="mt-12">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Select Academic Term</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((t) => (
                            <button
                                key={t}
                                onClick={() => onSelectTerm(t)}
                                className={`p-4 rounded-2xl border-2 transition-all font-black text-lg ${term === t
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md'
                                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:bg-white hover:border-indigo-200 hover:text-gray-600'
                                    }`}
                            >
                                Term {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {term && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <ClockIcon className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-xl font-bold text-gray-900">Curriculum Content - Term {term}</h3>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-gray-100" />
                            ))}
                        </div>
                    ) : topics.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BookOpenIcon className="w-10 h-10 text-gray-200" />
                            </div>
                            <p className="text-gray-400 font-bold">No curriculum content found for this term.</p>
                            <p className="text-xs text-gray-400 mt-1">Try syncing with the standard curriculum sources.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {topics.map((topic, idx) => (
                                <div
                                    key={topic.id}
                                    className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start gap-6">
                                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black">
                                            {topic.week_number || idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900 mb-2">{topic.title}</h4>
                                            <p className="text-gray-500 text-sm leading-relaxed mb-4">{topic.content}</p>

                                            {topic.learning_objectives && topic.learning_objectives.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-gray-50">
                                                    <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Objectives</h5>
                                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {(Array.isArray(topic.learning_objectives) ? topic.learning_objectives : []).map((obj: string, i: number) => (
                                                            <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                                                {obj}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CurriculumSettingsScreen;
