
import React, { useState } from 'react';
import { Teacher } from '../../types';
import { MailIcon, PhoneIcon, ChartBarIcon, CalendarIcon, EditIcon, gradeColors, SUBJECT_COLORS, TrashIcon } from '../../constants';
import DonutChart from '../ui/DonutChart';
import { mockClasses, mockTeachers } from '../../data';
import ConfirmationModal from '../ui/ConfirmationModal';

interface TeacherDetailAdminViewProps {
  teacher: Teacher;
  navigateTo: (view: string, title: string, props?: any) => void;
  forceUpdate: () => void;
  handleBack: () => void;
}

const TeacherDetailAdminView: React.FC<TeacherDetailAdminViewProps> = ({ teacher, navigateTo, forceUpdate, handleBack }) => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const teacherClasses = mockClasses.filter(c => teacher.classes.includes(c.grade + c.section));
    
    const handleDelete = () => {
        const index = mockTeachers.findIndex(t => t.id === teacher.id);
        if (index > -1) {
            mockTeachers.splice(index, 1);
            forceUpdate();
            handleBack();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Teacher Info */}
                    <div className="lg:col-span-3 bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                        <img src={teacher.avatarUrl} alt={teacher.name} className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100"/>
                        <div className="flex-grow">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-xl font-bold text-gray-800">{teacher.name}</h3>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${teacher.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {teacher.status}
                                </span>
                            </div>
                            <p className={`text-sm font-semibold inline-block px-2 py-0.5 rounded ${SUBJECT_COLORS[teacher.subjects[0]] || 'bg-gray-200'}`}>{teacher.subjects.join(', ')}</p>
                            <div className="flex space-x-4 mt-2">
                                <a href={`mailto:${teacher.email}`} className="flex items-center space-x-1 text-sm text-gray-600 hover:text-indigo-600"><MailIcon className="w-4 h-4"/><span>Email</span></a>
                                <a href={`tel:${teacher.phone}`} className="flex items-center space-x-1 text-sm text-gray-600 hover:text-indigo-600"><PhoneIcon className="w-4 h-4"/><span>Call</span></a>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                                <p className="text-sm text-gray-500">Attendance</p>
                                <div className="relative w-20 h-20 mx-auto mt-1">
                                    <DonutChart percentage={95} color="#4f46e5" size={80} strokeWidth={9} />
                                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-800">95%</div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                                <p className="text-sm text-gray-500">Avg. Student Score</p>
                                <p className="text-5xl font-bold text-indigo-600 mt-2">82%</p>
                            </div>
                        </div>

                        {/* Assigned Classes */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <h4 className="font-bold text-gray-800 mb-2">Assigned Classes</h4>
                            <div className="space-y-2">
                                {teacherClasses.map(c => (
                                    <div key={c.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-gray-700">Grade {c.grade}{c.section} - {c.subject}</p>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${gradeColors[c.grade] || 'bg-gray-200'}`}>{c.studentCount} students</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        {/* Actions */}
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
                             <button onClick={() => navigateTo('teacherPerformance', 'Performance Evaluation', { teacher })} className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                                <ChartBarIcon className="w-6 h-6 text-indigo-500"/>
                                <span className="font-semibold text-gray-700">Performance Evaluation</span>
                            </button>
                            <button onClick={() => navigateTo('teacherAttendanceDetail', `${teacher.name}'s Attendance`, { teacher })} className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                                <CalendarIcon className="w-6 h-6 text-indigo-500"/>
                                <span className="font-semibold text-gray-700">Full Attendance Record</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
             <div className="p-4 mt-auto bg-white border-t space-y-2">
                <h3 className="text-sm font-bold text-gray-500 text-center uppercase">Admin Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigateTo('addTeacher', `Edit ${teacher.name}`, { teacherToEdit: teacher })} className="flex items-center justify-center space-x-2 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-semibold"><EditIcon /><span>Edit Profile</span></button>
                    <button onClick={() => setShowDeleteModal(true)} className="flex items-center justify-center space-x-2 py-3 bg-red-100 text-red-700 rounded-xl font-semibold"><TrashIcon /><span>Delete Account</span></button>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Teacher Account"
                message={`Are you sure you want to delete ${teacher.name}? This action cannot be undone.`}
                confirmText="Delete"
                isDanger
            />
        </div>
    );
};

export default TeacherDetailAdminView;
