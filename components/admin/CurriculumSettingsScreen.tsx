import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { BookOpenIcon, EditIcon, CheckCircleIcon, XCircleIcon, PlusIcon, TrashIcon } from '../../constants';
import { toast } from 'react-hot-toast';

interface CurriculumTemplate {
    id: string;
    code: string;
    name: string;
    category: 'NIGERIAN' | 'BRITISH';
    default_grading_system_id: string;
}

interface TemplateSubject {
    id: string;
    name: string;
    category: string;
    is_compulsory: boolean;
}

const CurriculumSettingsScreen: React.FC<{
    handleBack: () => void;
}> = ({ handleBack }) => {
    const [templates, setTemplates] = useState<CurriculumTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<CurriculumTemplate | null>(null);
    const [subjects, setSubjects] = useState<TemplateSubject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            fetchSubjects(selectedTemplate.id);
        }
    }, [selectedTemplate]);

    const fetchTemplates = async () => {
        setIsLoading(true);
        if (!isSupabaseConfigured) {
            // Mock Data
            setTemplates([
                { id: '1', code: 'NIGERIAN_SEC', name: 'Nigerian Secondary', category: 'NIGERIAN', default_grading_system_id: '1' },
                { id: '2', code: 'BRITISH_IGCSE', name: 'British IGCSE', category: 'BRITISH', default_grading_system_id: '2' }
            ]);
            setIsLoading(false);
            return;
        }

        const { data, error } = await supabase.from('curriculum_templates').select('*');
        if (error) {
            console.error(error);
            toast.error('Failed to load templates. Please ensure strict mode schema is applied.');
        } else {
            setTemplates(data || []);
            // Auto-select first
            if (data && data.length > 0) setSelectedTemplate(data[0]);
        }
        setIsLoading(false);
    };

    const fetchSubjects = async (templateId: string) => {
        if (!isSupabaseConfigured) {
            // Mock Data
            if (templateId === '1') {
                setSubjects([
                    { id: 'a', name: 'Mathematics', category: 'Core', is_compulsory: true },
                    { id: 'b', name: 'English', category: 'Core', is_compulsory: true },
                    { id: 'c', name: 'Civic Education', category: 'Core', is_compulsory: true },
                ]);
            } else {
                setSubjects([
                    { id: 'd', name: 'Math (0580)', category: 'Core', is_compulsory: true },
                    { id: 'e', name: 'English (0500)', category: 'Core', is_compulsory: true },
                ]);
            }
            return;
        }

        const { data } = await supabase.from('template_subjects').select('*').eq('template_id', templateId);
        setSubjects(data || []);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Curriculum Configuration</h1>
                        <p className="text-sm text-gray-500">Manage strict academic templates</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-grow overflow-hidden">
                {/* Sidebar: List of Templates */}
                <div className="w-1/3 bg-white border-r overflow-y-auto">
                    <div className="p-4">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Available Templates</h2>
                        <div className="space-y-2">
                            {isLoading ? <p className="text-sm text-gray-400">Loading...</p> : templates.map(temp => (
                                <button
                                    key={temp.id}
                                    onClick={() => setSelectedTemplate(temp)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedTemplate?.id === temp.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-gray-800">{temp.name}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${temp.category === 'NIGERIAN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {temp.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Code: {temp.code}</p>
                                </button>
                            ))}

                            {/* Alert for user manually trying to add template */}
                            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 bg-yellow-100 rounded-full flex-shrink-0">
                                        <BookOpenIcon className="w-4 h-4 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-yellow-800">Locked System</p>
                                        <p className="text-[10px] text-yellow-700 mt-1 leading-relaxed">
                                            New templates can only be added by System Super-Admins via database migration to ensure product laws compliance.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content: Template Details */}
                <div className="flex-1 overflow-y-auto p-6">
                    {selectedTemplate ? (
                        <div className="max-w-2xl mx-auto space-y-8">
                            {/* Header Section */}
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                                <p className="text-gray-500 mt-1">This template defines the <strong className="text-gray-700">{selectedTemplate.category}</strong> curriculum structure.</p>
                            </div>

                            {/* Subjects Section */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-800">Standard Subjects</h3>
                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-md">{subjects.length} Subjects</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {subjects.map(subject => (
                                        <div key={subject.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${subject.category === 'Core' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    <BookOpenIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{subject.name}</p>
                                                    <p className="text-xs text-gray-400">{subject.category}</p>
                                                </div>
                                            </div>
                                            <div>
                                                {subject.is_compulsory && (
                                                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded-md">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                        Compulsory
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {subjects.length === 0 && (
                                        <div className="p-8 text-center text-gray-400">
                                            No default subjects loaded for this template.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Grading System Preview */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="font-semibold text-gray-800 mb-4">Grading System</h3>
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">
                                                {selectedTemplate.category === 'NIGERIAN' ? 'WAEC WASSCE Standard' : 'Cambridge IGCSE Standard'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {selectedTemplate.category === 'NIGERIAN' ? 'A1 - F9 Scale (0-100%)' : 'A* - G Scale (Ungraded below G)'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                            <BookOpenIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a curriculum template to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CurriculumSettingsScreen;
