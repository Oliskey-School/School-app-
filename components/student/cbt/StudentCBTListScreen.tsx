
import React, { useMemo, useState } from 'react';
import { mockCBTTests, mockStudents } from '../../../data';
import { Student, CBTTest } from '../../../types';
import { ExamIcon, ClockIcon, CheckCircleIcon, ChevronRightIcon, ChevronLeftIcon, DocumentTextIcon } from '../../../constants';

interface StudentCBTListScreenProps {
    studentId: number;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const StudentCBTListScreen: React.FC<StudentCBTListScreenProps> = ({ studentId, navigateTo }) => {
    const student = mockStudents.find(s => s.id === studentId);
    const [selectedType, setSelectedType] = useState<'Test' | 'Exam' | null>(null);
    
    const availableTests = useMemo(() => {
        if (!student || !selectedType) return [];
        const studentClass = `Grade ${student.grade}${student.section}`; // e.g. "Grade 10A"
        
        return mockCBTTests.filter(test => 
            test.isPublished && 
            test.type === selectedType &&
            (test.className === studentClass || test.className === 'All')
        );
    }, [student, selectedType]);

    const handleTakeTest = (test: CBTTest) => {
        const hasTaken = test.results.some(r => r.studentId === studentId);
        if (hasTaken) {
            alert("You have already taken this test.");
            return;
        }
        navigateTo('cbtPlayer', test.title, { test, studentId });
    };

    if (!selectedType) {
        return (
            <div className="flex flex-col h-full bg-gray-50 p-4">
                <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200 mb-6">
                    <ExamIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2" />
                    <h3 className="font-bold text-lg text-indigo-800">CBT Portal</h3>
                    <p className="text-sm text-indigo-700">Select an assessment type to proceed.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button 
                        onClick={() => setSelectedType('Test')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:ring-2 hover:ring-blue-200 transition-all"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-xl text-gray-800">Tests</h4>
                                <p className="text-gray-500 text-sm">Quizzes and Class Tests</p>
                            </div>
                        </div>
                        <ChevronRightIcon className="text-gray-400 h-6 w-6" />
                    </button>

                    <button 
                        onClick={() => setSelectedType('Exam')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:ring-2 hover:ring-red-200 transition-all"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-red-100 rounded-xl">
                                <ExamIcon className="h-8 w-8 text-red-600" />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-xl text-gray-800">Exams</h4>
                                <p className="text-gray-500 text-sm">Termly Examinations</p>
                            </div>
                        </div>
                        <ChevronRightIcon className="text-gray-400 h-6 w-6" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white border-b flex items-center space-x-2">
                <button onClick={() => setSelectedType(null)} className="p-1 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                </button>
                <h3 className="font-bold text-lg text-gray-800">Available {selectedType}s</h3>
            </div>

            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="space-y-3">
                    {availableTests.length > 0 ? (
                        availableTests.map(test => {
                            const result = test.results.find(r => r.studentId === studentId);
                            const hasTaken = !!result;

                            return (
                                <div key={test.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg">{test.title}</h4>
                                            <p className="text-sm text-gray-500 font-medium">{test.subject}</p>
                                        </div>
                                        {hasTaken ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center">
                                                <CheckCircleIcon className="w-3 h-3 mr-1"/> Completed
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center">
                                                <ClockIcon className="w-3 h-3 mr-1"/> Pending
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="mt-3 flex items-center text-sm text-gray-600 space-x-4">
                                        <span>{test.questionsCount} Questions</span>
                                        <span>•</span>
                                        <span>{test.duration} Mins</span>
                                    </div>

                                    {hasTaken ? (
                                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Your Score:</span>
                                            <span className="font-bold text-lg text-indigo-600">{result.score} / {test.questionsCount} ({result.percentage}%)</span>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleTakeTest(test)}
                                            className="w-full mt-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <span>Start {selectedType}</span>
                                            <ChevronRightIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500">No {selectedType?.toLowerCase()}s are currently available for your class.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentCBTListScreen;
