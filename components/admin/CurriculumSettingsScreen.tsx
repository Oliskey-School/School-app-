import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { fetchCurricula, fetchSubjects } from '../../lib/database';
import { Curriculum, Subject } from '../../types';
import { BookOpenIcon, EditIcon, CheckCircleIcon, XCircleIcon, PlusIcon, TrashIcon } from '../../constants';
import { toast } from 'react-hot-toast';

const CurriculumSettingsScreen: React.FC<{
    handleBack: () => void;
}> = ({ handleBack }) => {
    const [templates, setTemplates] = useState<Curriculum[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Curriculum | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    const loadSubjects = async (curriculumId: number) => {
        const data = await fetchSubjects(curriculumId);
        setSubjects(data);
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
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Available Curricula</h2>
                        <div className="space-y-2">
                            {isLoading ? <p className="text-sm text-gray-400">Loading...</p> : templates.map(temp => (
                                <button
                                    key={temp.id}
                                    onClick={() => setSelectedTemplate(temp)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedTemplate?.id === temp.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-gray-800">{temp.name}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${temp.name === 'Nigerian' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {temp.name === 'Nigerian' ? 'NIGERIAN' : 'BRITISH'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 truncate">{temp.description}</p>
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
                                            Curricula are defined at the system level to ensure compliance. Contact support to add custom curricula.
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
                                <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.name} Curriculum</h2>
                                <p className="text-gray-500 mt-1">{selectedTemplate.description}</p>
                            </div>

                            {/* Subjects Section */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-800">Subject List</h3>
                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-md">{subjects.length} Subjects</span>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                                    {subjects.map(subject => (
                                        <div key={subject.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${subject.category === 'Core' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    <BookOpenIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{subject.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400 border px-1 rounded">{subject.category}</span>
                                                        <span className="text-xs text-gray-400">{subject.gradeLevel}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {subjects.length === 0 && (
                                        <div className="p-8 text-center text-gray-400">
                                            No subjects loaded for this curriculum yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                            <BookOpenIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a curriculum to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CurriculumSettingsScreen;
