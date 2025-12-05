
import React, { useState, useRef } from 'react';
import { CloudUploadIcon, EyeIcon, CheckCircleIcon, XCircleIcon, TrashIcon, ExamIcon, ChevronRightIcon } from '../../constants';
import { mockCBTTests } from '../../data';
import { CBTTest } from '../../types';
import ConfirmationModal from '../ui/ConfirmationModal';

interface CBTManagementScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const CBTManagementScreen: React.FC<CBTManagementScreenProps> = ({ navigateTo }) => {
    const [tests, setTests] = useState<CBTTest[]>(mockCBTTests);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadType, setUploadType] = useState<'Test' | 'Exam'>('Test');
    const [duration, setDuration] = useState(60);
    const [attempts, setAttempts] = useState(1);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploading(true);
            setTimeout(() => {
                const newTest: CBTTest = {
                    id: Date.now(),
                    title: file.name.replace('.xlsx', '').replace(/_/g, ' '),
                    type: uploadType,
                    className: 'Grade 10A',
                    subject: 'General',
                    duration: duration,
                    attempts: attempts,
                    fileName: file.name,
                    questionsCount: Math.floor(Math.random() * 20) + 10,
                    createdAt: new Date().toISOString(),
                    isPublished: false,
                    results: []
                };
                setTests([newTest, ...tests]);
                mockCBTTests.unshift(newTest);
                setIsUploading(false);
                alert(`${uploadType} uploaded successfully!`);
            }, 1500);
        }
    };

    const togglePublish = (id: number) => {
        setTests(prev => prev.map(test => 
            test.id === id ? { ...test, isPublished: !test.isPublished } : test
        ));
        const index = mockCBTTests.findIndex(t => t.id === id);
        if (index > -1) mockCBTTests[index].isPublished = !mockCBTTests[index].isPublished;
    };

    const confirmDelete = () => {
        if (deleteId !== null) {
            setTests(prev => prev.filter(t => t.id !== deleteId));
            const index = mockCBTTests.findIndex(t => t.id === deleteId);
            if (index > -1) mockCBTTests.splice(index, 1);
            setDeleteId(null);
        }
    };

    const handleViewScores = (test: CBTTest) => {
        navigateTo('cbtScores', `Scores: ${test.title}`, { test });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                {/* Header Card */}
                <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200">
                    <ExamIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2"/>
                    <h3 className="font-bold text-lg text-indigo-800">CBT & Examination</h3>
                    <p className="text-sm text-indigo-700">Upload questions via Excel and manage student access.</p>
                </div>

                {/* Configuration & Upload Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-dashed border-indigo-300 text-center space-y-4">
                    {/* Type Selector */}
                    <div className="flex justify-center space-x-2">
                        <button 
                            onClick={() => setUploadType('Test')} 
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${uploadType === 'Test' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                            Test
                        </button>
                        <button 
                            onClick={() => setUploadType('Exam')} 
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${uploadType === 'Exam' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                            Exam
                        </button>
                    </div>

                    {/* Settings Inputs */}
                    <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Duration (mins)</label>
                            <input 
                                type="number" 
                                value={duration} 
                                onChange={(e) => setDuration(parseInt(e.target.value))} 
                                className="w-full p-2 border rounded-lg text-center text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Attempts</label>
                            <input 
                                type="number" 
                                value={attempts} 
                                onChange={(e) => setAttempts(parseInt(e.target.value))} 
                                className="w-full p-2 border rounded-lg text-center text-sm"
                            />
                        </div>
                    </div>

                    <div 
                        className="h-32 border-2 border-gray-200 border-dashed rounded-lg flex flex-col justify-center items-center cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                        />
                        {isUploading ? (
                            <div className="animate-pulse">
                                <CloudUploadIcon className="h-10 w-10 text-indigo-400 mx-auto mb-2"/>
                                <p className="text-sm text-gray-500">Uploading...</p>
                            </div>
                        ) : (
                            <>
                                <CloudUploadIcon className="h-10 w-10 text-indigo-400 mx-auto mb-2"/>
                                <p className="font-semibold text-gray-700">Upload Question File</p>
                                <p className="text-xs text-gray-500 mt-1">.xlsx, .xls</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Test List */}
                <div>
                    <h3 className="font-bold text-gray-800 mb-3 px-1">Manage Tests</h3>
                    <div className="space-y-3">
                        {tests.map(test => (
                            <div key={test.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h4 className="font-bold text-gray-800">{test.title}</h4>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${test.type === 'Exam' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                                {test.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{test.className}</span>
                                            <span>•</span>
                                            <span>{test.questionsCount} Qs</span>
                                            <span>•</span>
                                            <span>{test.duration}m</span>
                                            <span>•</span>
                                            <span>{test.attempts} Attempts</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{test.fileName}</p>
                                    </div>
                                    <div className="flex flex-col items-end space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs font-semibold text-gray-500">Access:</span>
                                            <button 
                                                onClick={() => togglePublish(test.id)}
                                                className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${test.isPublished ? 'bg-green-500' : 'bg-gray-300'}`}
                                            >
                                                <span className={`inline-block h-3 w-3 transform bg-white rounded-full transition-transform ${test.isPublished ? 'translate-x-5' : 'translate-x-1'}`}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end space-x-3">
                                    <button 
                                        onClick={() => handleViewScores(test)}
                                        className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100"
                                    >
                                        <EyeIcon className="h-4 w-4"/>
                                        <span>Scores</span>
                                    </button>
                                    <button 
                                        onClick={() => setDeleteId(test.id)}
                                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                                    >
                                        <TrashIcon className="h-4 w-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {tests.length === 0 && (
                            <p className="text-center text-gray-500 py-4">No assessments uploaded yet.</p>
                        )}
                    </div>
                </div>
            </main>

            <ConfirmationModal 
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete Assessment"
                message="Are you sure you want to delete this assessment? This action cannot be undone and all student results will be lost."
                confirmText="Delete"
                isDanger
            />
        </div>
    );
};

export default CBTManagementScreen;
