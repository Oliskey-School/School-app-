import React from 'react';
import { PlusIcon, EditIcon, TrashIcon, EXAM_TYPE_COLORS, EnterResultsIcon } from '../../constants';
import { Exam } from '../../types';
import { mockExamsData } from '../../data';

interface TeacherExamManagementProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    forceUpdate: () => void;
    handleBack: () => void;
}

const LOGGED_IN_TEACHER_ID = 2; 

const TeacherExamManagement: React.FC<TeacherExamManagementProps> = ({ navigateTo, forceUpdate, handleBack }) => {
    
    const teacherExams = mockExamsData.filter(e => e.teacherId === LOGGED_IN_TEACHER_ID);

    const handleDelete = (exam: Exam) => {
        if (exam.isPublished) {
            alert("Cannot delete a published exam.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this exam?')) {
            const index = mockExamsData.findIndex(e => e.id === exam.id);
            if (index > -1) {
                mockExamsData.splice(index, 1);
                forceUpdate();
            }
        }
    };

    const handleEdit = (exam: Exam) => {
        navigateTo('addExam', 'Edit Exam', { 
            examToEdit: exam, 
            onSave: (examData: Omit<Exam, 'id' | 'isPublished' | 'teacherId'>) => {
                if (exam.isPublished) {
                    alert("Cannot edit a published exam.");
                    return;
                }
                const index = mockExamsData.findIndex(e => e.id === exam.id);
                if (index > -1) {
                    mockExamsData[index] = { ...mockExamsData[index], ...examData };
                    forceUpdate();
                    handleBack();
                }
            }
        });
    };

    const handleAddNew = () => {
        navigateTo('addExam', 'Add New Exam', {
             onSave: (examData: Omit<Exam, 'id' | 'isPublished' | 'teacherId'>) => {
                const newId = Math.max(0, ...mockExamsData.map(e => e.id)) + 1;
                mockExamsData.unshift({ id: newId, ...examData, isPublished: false, teacherId: LOGGED_IN_TEACHER_ID });
                forceUpdate();
                handleBack();
             }
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <main className="flex-grow p-4 overflow-y-auto pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {teacherExams.map(exam => (
                        <div key={exam.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-col justify-between space-y-3">
                            <div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-800">{exam.subject}</p>
                                        <p className="text-sm text-gray-500">{exam.className}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${EXAM_TYPE_COLORS[exam.type] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                                        {exam.type}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-sm font-medium">Status: 
                                        {exam.isPublished 
                                            ? <span className="text-green-600 ml-1">Published</span>
                                            : <span className="text-amber-600 ml-1">Pending</span>
                                        }
                                    </p>
                                    <p className="text-sm text-gray-600 font-medium">{new Date(exam.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'})}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                               <button 
                                    onClick={() => navigateTo('gradeEntry', `Grades: ${exam.subject}`, { exam })}
                                    className="text-green-600 p-1 flex items-center space-x-1.5 text-sm font-semibold hover:bg-green-50 rounded-md"
                                >
                                    <EnterResultsIcon className="w-5 h-5"/>
                                    <span>Enter Grades</span>
                                </button>
                                <div className="flex space-x-2">
                                    {!exam.isPublished && (
                                        <>
                                            <button onClick={() => handleEdit(exam)} className="text-indigo-600 p-1 hover:bg-gray-100 rounded-md"><EditIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDelete(exam)} className="text-red-600 p-1 hover:bg-gray-100 rounded-md"><TrashIcon className="w-5 h-5"/></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {teacherExams.length === 0 && <p className="text-center text-gray-500 py-8">You have not created any exams.</p>}
            </main>

            <div className="absolute bottom-6 right-6">
                <button onClick={handleAddNew} className="bg-amber-500 text-white p-4 rounded-full shadow-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500" aria-label="Add new exam">
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
};
export default TeacherExamManagement;