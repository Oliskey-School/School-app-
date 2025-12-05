
import React, { useMemo } from 'react';
import { mockClasses, mockTeachers } from '../../data';
import { ClassInfo, Teacher } from '../../types';
import { ChevronRightIcon, BookOpenIcon, SUBJECT_COLORS } from '../../constants';

const getLevelFromGrade = (grade: number): string => {
    if (grade >= 1 && grade <= 6) return `Primary ${grade}`;
    if (grade >= 7 && grade <= 9) return `JSS ${grade - 6}`;
    if (grade >= 10 && grade <= 12) return `SSS ${grade - 9}`;
    return "Unknown Level";
};

interface TeacherCurriculumSelectionScreenProps {
  navigateTo: (view: string, title: string, props: any) => void;
}

const LOGGED_IN_TEACHER_ID = 2;

const TeacherCurriculumSelectionScreen: React.FC<TeacherCurriculumSelectionScreenProps> = ({ navigateTo }) => {
    const teacher = useMemo(() => mockTeachers.find(t => t.id === LOGGED_IN_TEACHER_ID)!, []);
    const teacherClasses = useMemo(() => mockClasses.filter(c => teacher.classes.includes(`${c.grade}${c.section}`)), [teacher]);

    const handleSelectClass = (classInfo: ClassInfo) => {
        const level = getLevelFromGrade(classInfo.grade);
        const title = `Curriculum for ${level} ${classInfo.department || ''}`.trim();
        navigateTo('curriculum', title, {
            level: level,
            department: classInfo.department
        });
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50">
             <div className="bg-purple-50 p-4 rounded-xl text-center">
                <BookOpenIcon className="h-10 w-10 mx-auto text-purple-400 mb-2"/>
                <h3 className="font-bold text-lg text-purple-800">Select a Class</h3>
                <p className="text-sm text-purple-700">Choose a class to view its official subject curriculum.</p>
            </div>
            {teacherClasses.map(classInfo => {
                const subjectColor = SUBJECT_COLORS[classInfo.subject] || 'bg-gray-200 text-gray-800';
                return (
                    <button 
                        key={classInfo.id}
                        onClick={() => handleSelectClass(classInfo)}
                        className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-purple-200 transition-all"
                    >
                        <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-lg ${subjectColor} flex items-center justify-center font-bold text-lg`}>
                                {classInfo.grade}{classInfo.section}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{`Grade ${classInfo.grade}${classInfo.section}`}</p>
                                <p className="text-sm text-gray-600">{classInfo.subject}</p>
                            </div>
                        </div>
                        <ChevronRightIcon className="text-gray-400" />
                    </button>
                )
            })}
        </div>
    );
};

export default TeacherCurriculumSelectionScreen;
