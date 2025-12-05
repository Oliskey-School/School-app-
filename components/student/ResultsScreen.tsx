
import React, { useState, useMemo } from 'react';
import { Student } from '../../types';
import { mockStudents } from '../../data';
import { BookOpenIcon, CheckCircleIcon, ClipboardListIcon, SUBJECT_COLORS } from '../../constants';
import DonutChart from '../ui/DonutChart';

interface ResultsScreenProps {
    studentId: number;
}

const TermTab: React.FC<{ term: string; isActive: boolean; onClick: () => void; }> = ({ term, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            isActive ? 'bg-orange-500 text-white shadow' : 'text-gray-600'
        }`}
    >
        {term}
    </button>
);

const ResultsScreen: React.FC<ResultsScreenProps> = ({ studentId }) => {
    const student = useMemo(() => mockStudents.find(s => s.id === studentId)!, [studentId]);
    const publishedReports = useMemo(() => (student.reportCards || []).filter(r => r.status === 'Published'), [student]);

    const availableTerms = useMemo(() => ["First Term", "Second Term", "Third Term"].filter(termName => 
        publishedReports.some(report => report.term === termName)
    ), [publishedReports]);
    
    // Default to the latest available term
    const [activeTerm, setActiveTerm] = useState<string>(availableTerms.length > 0 ? availableTerms[availableTerms.length - 1] : '');

    const termData = useMemo(() => {
        const report = publishedReports.find(rc => rc.term === activeTerm);
        if (!report) return null;

        const behaviorNotes = (student.behaviorNotes || []).filter(note => {
            const noteDate = new Date(note.date.replace(/-/g, '/'));
            const noteMonth = noteDate.getMonth();
            // A simple mapping of term name to month ranges for the academic year
            if (activeTerm === "First Term" && (noteMonth >= 8 && noteMonth <= 11)) return true; // Sep-Dec
            if (activeTerm === "Second Term" && (noteMonth >= 0 && noteMonth <= 4)) return true; // Jan-May
            if (activeTerm === "Third Term" && (noteMonth >= 5 && noteMonth <= 7)) return true; // Jun-Aug
            return false;
        });

        return { report, behaviorNotes };
    }, [activeTerm, publishedReports, student.behaviorNotes]);

    const attendancePercentage = termData ? Math.round((termData.report.attendance.present / termData.report.attendance.total) * 100) : 0;

    if (availableTerms.length === 0) {
        return (
            <div className="p-6 text-center bg-gray-50 h-full flex flex-col justify-center">
                <h3 className="font-bold text-lg text-gray-800">No Performance Data Available</h3>
                <p className="text-gray-600 mt-2">Your academic performance data has not been published yet.</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                    {availableTerms.map(term => (
                        <TermTab key={term} term={term} isActive={activeTerm === term} onClick={() => setActiveTerm(term)} />
                    ))}
                </div>
            </div>

            {termData ? (
                <main className="flex-grow p-4 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Grades Section */}
                        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm">
                            <div className="flex items-center space-x-2 mb-3">
                                <BookOpenIcon className="h-5 w-5 text-orange-600" />
                                <h4 className="font-bold text-gray-800">Grades</h4>
                            </div>
                            <div className="space-y-2">
                                {termData.report.academicRecords.map(record => (
                                    <div key={record.subject} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                        <span className="font-semibold text-sm text-gray-700">{record.subject}</span>
                                        <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${SUBJECT_COLORS[record.subject] || 'bg-gray-200'}`}>{record.total}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="lg:col-span-1 space-y-4">
                            {/* Attendance Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <div className="flex items-center space-x-2 mb-3">
                                    <CheckCircleIcon className="h-5 w-5 text-orange-600" />
                                    <h4 className="font-bold text-gray-800">Attendance</h4>
                                </div>
                                <div className="flex items-center justify-around">
                                    <div className="relative">
                                        <DonutChart percentage={attendancePercentage} color="#f97316" size={100} strokeWidth={10} />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-bold text-gray-800">{attendancePercentage}%</span>
                                            <span className="text-xs text-gray-500">Present</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-sm font-medium">
                                        <p>Present: <span className="font-bold text-green-600">{termData.report.attendance.present}</span></p>
                                        <p>Absent: <span className="font-bold text-red-600">{termData.report.attendance.absent}</span></p>
                                        <p>Late: <span className="font-bold text-blue-600">{termData.report.attendance.late}</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Behavior Notes Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <div className="flex items-center space-x-2 mb-3">
                                    <ClipboardListIcon className="h-5 w-5 text-orange-600" />
                                    <h4 className="font-bold text-gray-800">Behavior Notes</h4>
                                </div>
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                    {termData.behaviorNotes.length > 0 ? [...termData.behaviorNotes].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(note => {
                                        const isPositive = note.type === 'Positive';
                                        return (
                                            <div key={note.id} className={`p-3 rounded-lg border-l-4 ${isPositive ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                                                <h5 className={`font-bold text-sm ${isPositive ? 'text-green-800' : 'text-red-800'}`}>{note.title}</h5>
                                            </div>
                                        );
                                    }) : <p className="text-sm text-gray-400 text-center py-4">No behavioral notes for this term.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            ) : (
                <div className="p-6 text-center text-gray-500">Select a term to view details.</div>
            )}
        </div>
    );
};

export default ResultsScreen;