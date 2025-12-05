import React from 'react';
import { mockTeachers, mockClasses } from '../../data';
import { ClassInfo, Teacher } from '../../types';
import { ChevronRightIcon } from '../../constants';
import { getFormattedClassName } from '../../constants';

const LOGGED_IN_TEACHER_ID = 2;

interface TeacherSelectClassForAttendanceProps {
  navigateTo: (view: string, title: string, props: any) => void;
}

const TeacherSelectClassForAttendance: React.FC<TeacherSelectClassForAttendanceProps> = ({ navigateTo }) => {
    const teacher: Teacher = mockTeachers.find(t => t.id === LOGGED_IN_TEACHER_ID)!;
    
    const teacherClasses = mockClasses.filter(c => 
        teacher.classes.includes(`${c.grade}${c.section}`)
    ).sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section));

    const handleSelectClass = (classInfo: ClassInfo) => {
        const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);
        navigateTo('markAttendance', `Attendance: ${formattedClassName}`, { classInfo });
    };

    return (
        <div className="p-4 bg-gray-100 h-full">
            <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200 mb-4">
                <h3 className="font-bold text-lg text-purple-800">Select a Class</h3>
                <p className="text-sm text-purple-700">Choose a class to take attendance for today.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teacherClasses.map(classInfo => {
                    const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);
                    return (
                        <button 
                            key={classInfo.id}
                            onClick={() => handleSelectClass(classInfo)}
                            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-purple-200 transition-all"
                        >
                            <div>
                                <p className="font-bold text-gray-800">{formattedClassName}</p>
                                <p className="text-sm text-gray-600">{classInfo.subject}</p>
                            </div>
                            <ChevronRightIcon className="text-gray-400" />
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

export default TeacherSelectClassForAttendance;