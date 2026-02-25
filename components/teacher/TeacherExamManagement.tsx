import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, EditIcon, TrashIcon, EXAM_TYPE_COLORS, EnterResultsIcon } from '../../constants';
import { Exam } from '../../types';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import ConfirmationModal from '../ui/ConfirmationModal';

interface TeacherExamManagementProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    forceUpdate: () => void;
    handleBack: () => void;
    schoolId: string;
    teacherId: string | null;
}

const TeacherExamManagement: React.FC<TeacherExamManagementProps> = ({ navigateTo, forceUpdate, handleBack, schoolId, teacherId }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

    const fetchExams = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const data = await api.getExams(schoolId);
            const teacherExams = teacherId
                ? data.filter((e: any) => e.teacher_id === teacherId)
                : data;

            setExams(teacherExams.map((e: any) => ({
                id: e.id,
                subject: e.subject,
                className: e.class_name,
                type: e.type,
                date: e.date,
                isPublished: e.is_published,
                teacherId: e.teacher_id
            })));
        } catch (error: any) {
            toast.error(error.message || "Failed to load exams");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, [schoolId, teacherId]);

    // Auto-sync when exams change
    useAutoSync(['exams'], () => {
        fetchExams();
    });

    useRealtimeRefresh(['exams'], fetchExams);


    const handleDeleteClick = (exam: Exam) => {
        if (exam.isPublished) {
            toast.error("Cannot delete a published exam.");
            return;
        }
        setExamToDelete(exam);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!examToDelete) return;

        try {
            await api.deleteExam(examToDelete.id);
            toast.success("Exam deleted successfully.");
            setExams(prev => prev.filter(e => e.id !== examToDelete.id));
            forceUpdate();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete exam");
        }
        setIsDeleteModalOpen(false);
        setExamToDelete(null);
    };

    const handleEdit = (exam: Exam) => {
        navigateTo('addExam', 'Edit Exam', {
            examToEdit: exam,
            onSave: async (examData: Omit<Exam, 'id' | 'isPublished' | 'teacherId'>) => {
                if (exam.isPublished) {
                    toast.error("Cannot edit a published exam.");
                    return;
                }

                // Construct clean payload for Supabase
                const payload = {
                    type: examData.type,
                    date: examData.date,
                    time: examData.time,
                    class_name: examData.className,
                    subject: examData.subject,
                    updated_at: new Date().toISOString()
                };

                try {
                    await api.updateExam(exam.id, payload);
                    toast.success("Exam updated successfully");
                    fetchExams();
                    handleBack();
                } catch (error: any) {
                    toast.error(error.message || "Failed to update exam");
                }
            }
        });
    };

    const handleAddNew = () => {
        navigateTo('addExam', 'Add New Exam', {
            onSave: async (examData: Omit<Exam, 'id' | 'isPublished' | 'teacherId'>) => {
                const payload = {
                    type: examData.type,
                    date: examData.date,
                    time: examData.time,
                    class_name: examData.className,
                    subject: examData.subject,
                    is_published: false,
                    teacher_id: teacherId,
                    school_id: schoolId
                };

                try {
                    await api.createExam(payload);
                    toast.success("Exam created successfully");
                    fetchExams();
                    handleBack();
                } catch (error: any) {
                    toast.error(error.message || "Failed to create exam");
                }
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <main className="flex-grow p-4 overflow-y-auto pb-20">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exams.map(exam => (
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
                                        <p className="text-sm text-gray-600 font-medium">{new Date(exam.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                                    <button
                                        onClick={() => navigateTo('gradeEntry', `Grades: ${exam.subject}`, { exam })}
                                        className="text-green-600 p-1 flex items-center space-x-1.5 text-sm font-semibold hover:bg-green-50 rounded-md"
                                    >
                                        <EnterResultsIcon className="w-5 h-5" />
                                        <span>Enter Grades</span>
                                    </button>
                                    <div className="flex space-x-2">
                                        {!exam.isPublished && (
                                            <>
                                                <button onClick={() => handleEdit(exam)} className="text-indigo-600 p-1 hover:bg-gray-100 rounded-md"><EditIcon className="w-5 h-5" /></button>
                                                <button onClick={() => handleDeleteClick(exam)} className="text-red-600 p-1 hover:bg-gray-100 rounded-md"><TrashIcon className="w-5 h-5" /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && exams.length === 0 && <p className="text-center text-gray-500 py-8">You have not created any exams.</p>}
            </main>

            <div className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 z-40">
                <button
                    onClick={() => navigateTo('examCreator', 'Setup New Exam')}
                    className="p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
                >
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Exam"
                message={`Are you sure you want to delete the exam '${examToDelete?.subject} - ${examToDelete?.type}'? This action cannot be undone.`}
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
};
export default TeacherExamManagement;