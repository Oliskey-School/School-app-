
import React, { useMemo } from 'react';
import { Student } from '../../types';
import { mockStudents } from '../../data';
import { BookOpenIcon, ClipboardListIcon, TrendingUpIcon, SUBJECT_COLORS } from '../../constants';

// Line Chart for Performance Trend
const PerformanceTrendChart = ({ data }: { data: { term: string, average: number }[] }) => {
    const width = 320;
    const height = 150;
    const padding = 30;
    const maxValue = 100;
    const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
    const stepY = (height - padding * 2) / maxValue;
    const points = data.map((d, i) => `${padding + i * stepX},${height - padding - d.average * stepY}`).join(' ');

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {[0, 25, 50, 75, 100].map(val => (
                     <g key={val}>
                        <line x1={padding} y1={height - padding - val * stepY} x2={width - padding} y2={height - padding - val * stepY} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2" />
                        <text x={padding - 5} y={height - padding - val * stepY + 3} textAnchor="end" fontSize="10" fill="#6b7280">{val}%</text>
                    </g>
                ))}
                <polyline fill="none" stroke="#FF9800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                {data.map((d, i) => (
                    <circle key={i} cx={padding + i * stepX} cy={height - padding - d.average * stepY} r="4" fill="white" stroke="#FF9800" strokeWidth="2" />
                ))}
            </svg>
            <div className="flex justify-between -mt-4" style={{ paddingLeft: `${padding - 10}px`, paddingRight: `${padding-10}px` }}>
                {data.map(item => <span key={item.term} className="text-xs text-gray-500 font-medium">{item.term}</span>)}
            </div>
        </div>
    );
};

// Bar Chart for Subject Scores
const SubjectScoresChart = ({ data }: { data: { subject: string, score: number }[] }) => {
    return (
        <div className="space-y-3 pt-2">
            {data.map(item => {
                const colorClass = SUBJECT_COLORS[item.subject] || 'bg-gray-200 text-gray-800';
                return (
                    <div key={item.subject} className="flex items-center space-x-2">
                        <span className="w-28 text-sm font-medium text-gray-600 truncate">{item.subject}</span>
                        <div className="flex-grow bg-gray-200 rounded-full h-5">
                            <div className={`${colorClass} h-5 rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold`} style={{ width: `${item.score}%` }}>
                                {item.score}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};


interface AcademicReportScreenProps {
    studentId: number;
}

const AcademicReportScreen: React.FC<AcademicReportScreenProps> = ({ studentId }) => {
    const student = useMemo(() => mockStudents.find(s => s.id === studentId), [studentId]);

    const performanceByTerm = useMemo(() => {
        if (!student?.academicPerformance) return [];
        const terms: { [key: string]: number[] } = {};
        student.academicPerformance.forEach(rec => {
            if (!terms[rec.term]) terms[rec.term] = [];
            terms[rec.term].push(rec.score);
        });
        return Object.entries(terms).map(([term, scores]) => ({
            term,
            average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        })).sort((a,b) => parseInt(a.term.split(' ')[1]) - parseInt(b.term.split(' ')[1]));
    }, [student]);

    const latestTermRecords = useMemo(() => {
        if (!student?.academicPerformance) return [];
        const latestTerm = performanceByTerm[performanceByTerm.length - 1]?.term;
        return student.academicPerformance.filter(r => r.term === latestTerm);
    }, [student, performanceByTerm]);


    if (!student) return <div>Student not found.</div>;

    return (
        <div className="p-4 space-y-4 bg-gray-50">
            {/* Student Header */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                <img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-4 border-orange-100"/>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                    <p className="text-gray-500 font-medium">Grade {student.grade}{student.section}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Performance Trend */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                        <TrendingUpIcon className="h-5 w-5 text-orange-600" />
                        <h4 className="font-bold text-gray-800">Performance Trend</h4>
                    </div>
                    <PerformanceTrendChart data={performanceByTerm} />
                </div>

                {/* Subject Breakdown */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                        <BookOpenIcon className="h-5 w-5 text-orange-600" />
                        <h4 className="font-bold text-gray-800">Breakdown ({performanceByTerm.slice(-1)[0]?.term})</h4>
                    </div>
                    <SubjectScoresChart data={latestTermRecords} />
                </div>
            </div>

            {/* Teacher's Remarks */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                    <ClipboardListIcon className="h-5 w-5 text-orange-600" />
                    <h4 className="font-bold text-gray-800">Teacher's Remarks</h4>
                </div>
                <div className="space-y-3">
                    {(student.academicPerformance || []).filter(r => r.teacherRemark).map(record => (
                         <div key={record.subject} className="bg-orange-50 p-3 rounded-lg">
                            <p className="font-semibold text-orange-800">{record.subject}</p>
                            <p className="text-sm text-gray-700 italic">"{record.teacherRemark}"</p>
                         </div>
                    ))}
                    {(student.behaviorNotes && student.behaviorNotes.length > 0) ? student.behaviorNotes.map(note => (
                         <div key={note.id} className="bg-orange-50 p-3 rounded-lg">
                            <p className="font-semibold text-orange-800">{note.title} ({note.type})</p>
                            <p className="text-sm text-gray-700">{note.note}</p>
                            <p className="text-xs text-gray-500 text-right mt-1">- {note.by} on {new Date(note.date).toLocaleDateString()}</p>
                         </div>
                    )) : <p className="text-sm text-gray-400 text-center py-4">No remarks recorded.</p>}
                </div>
            </div>
        </div>
    );
};

export default AcademicReportScreen;