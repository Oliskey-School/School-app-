import React from 'react';
import { EXAM_TYPE_COLORS, ClockIcon, ExamIcon } from '../../constants';
import { mockExamsData } from '../../data';
import { Exam } from '../../types';

// Function to group exams by date
const groupExamsByDate = (exams: Exam[]) => {
  return exams.reduce((acc, exam) => {
    const date = exam.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(exam);
    return acc;
  }, {} as { [key: string]: Exam[] });
};

const ExamSchedule: React.FC = () => {
    
    const publishedExams = mockExamsData
        .filter(exam => exam.isPublished)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const groupedExams = groupExamsByDate(publishedExams);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                {Object.keys(groupedExams).length > 0 ? (
                    Object.entries(groupedExams).map(([date, examsOnDate]) => (
                        <div key={date}>
                            <div className="mb-3 pl-1">
                                <h3 className="font-bold text-lg text-gray-700">
                                    {/* Replace hyphens with slashes for better cross-browser date parsing consistency */}
                                    {new Date(date.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h3>
                            </div>
                            <div className="space-y-3">
                                {examsOnDate.map(exam => {
                                    const examTypeStyle = EXAM_TYPE_COLORS[exam.type] || 'bg-gray-100 text-gray-800 border-gray-300';
                                    const borderColorClass = examTypeStyle.split(' ').find(c => c.startsWith('border-')) || 'border-gray-300';
                                    const bgColorClass = examTypeStyle.split(' ')[0] || 'bg-gray-100';
                                    const textColorClass = (examTypeStyle.split(' ')[1] || 'text-gray-800').replace('-800', '-600');
                                    
                                    return (
                                        <div key={exam.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColorClass} overflow-hidden`}>
                                            <div className="p-4 flex items-center space-x-4">
                                                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${bgColorClass}`}>
                                                    <ExamIcon className={`w-6 h-6 ${textColorClass}`} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg text-gray-800">{exam.subject}</p>
                                                    <p className="text-sm text-gray-500 font-medium">{exam.className}</p>
                                                    {exam.time && (
                                                      <div className="flex items-center text-sm text-gray-600 mt-1">
                                                        <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                                                        <span>{exam.time}</span>
                                                      </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-sm mt-8">
                        <ExamIcon className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Exams Published</h3>
                        <p className="mt-1 text-sm text-gray-500">The exam schedule has not been released yet. Please check back later.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ExamSchedule;
