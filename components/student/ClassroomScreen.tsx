

import React from 'react';
import { Student, Teacher } from '../../types';
import { mockStudents, mockTeachers, mockNotices } from '../../data';
import { SUBJECT_COLORS, BookOpenIcon, ClipboardListIcon, MegaphoneIcon, UsersIcon } from '../../constants';

// For this demo, we'll use the logged-in student (ID 4)
const loggedInStudent: Student = mockStudents.find(s => s.id === '4')!;

interface ClassroomScreenProps {
  subjectName: string;
  navigateTo: (view: string, title: string, props?: any) => void;
}

const ClassroomScreen: React.FC<ClassroomScreenProps> = ({ subjectName, navigateTo }) => {
  const teacher = mockTeachers.find(t => t.subjects.includes(subjectName));
  const colorClass = SUBJECT_COLORS[subjectName] || 'bg-gray-200 text-gray-800';
  const [bgColor, textColor] = colorClass.split(' ');
  const ringColor = bgColor.replace('bg-', 'ring-').replace('-100', '-300').replace('-200', '-300').replace('-300', '-400').replace('-400', '-500').replace('-500', '-600');

  const classmates = mockStudents.filter(
    s => s.grade === loggedInStudent.grade && s.section === loggedInStudent.section && s.id !== loggedInStudent.id
  );

  const announcements = mockNotices.filter(
    n => (n.className === `Grade ${loggedInStudent.grade}${loggedInStudent.section}` || n.audience.includes('all')) && (n.audience.includes('students'))
  ).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 2);

  const quickActions = [
    { label: 'Assignments', icon: <ClipboardListIcon className="h-6 w-6"/>, action: () => navigateTo('assignments', `${subjectName} Assignments`, { studentId: loggedInStudent.id, subjectFilter: subjectName }) },
    { label: 'Resources', icon: <BookOpenIcon className="h-6 w-6"/>, action: () => navigateTo('library', 'E-Learning Library') },
  ];
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 overflow-y-auto">
        {/* Subject Header */}
        <div className={`p-5 rounded-2xl text-white shadow-lg ${bgColor.replace('-200', '-500').replace('-100', '-500')} mb-5`}>
          <h3 className="text-2xl font-bold">{subjectName}</h3>
          <p className="text-sm opacity-90 mt-1">Taught by: {teacher?.name || 'N/A'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    {quickActions.map(item => (
                        <button key={item.label} onClick={item.action} className={`bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-2 hover:ring-2 ${ringColor} transition-all`}>
                            <div className={textColor}>{item.icon}</div>
                            <span className={`font-semibold ${textColor} text-center text-sm`}>{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Latest Announcements */}
                <div>
                    <div className="flex items-center space-x-2 mb-2 px-1">
                        <MegaphoneIcon className={`h-5 w-5 ${textColor}`} />
                        <h3 className="font-bold text-lg text-gray-800">Latest Announcements</h3>
                    </div>
                    {announcements.length > 0 ? (
                        <div className="space-y-3">
                        {announcements.map(notice => (
                            <div key={notice.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-400">
                            <h4 className="font-bold text-gray-800">{notice.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notice.content.substring(0, 100)}...</p>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="bg-white p-4 rounded-xl text-center text-gray-500 shadow-sm">
                        No new announcements for this class.
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-1">
                {/* Classmates */}
                 <div>
                    <div className="flex items-center space-x-2 mb-3 px-1">
                        <UsersIcon className={`h-5 w-5 ${textColor}`} />
                        <h3 className="font-bold text-lg text-gray-800">Classmates</h3>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                        {classmates.map(c => (
                            <div key={c.id} className="flex items-center space-x-3">
                                <img src={c.avatarUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover"/>
                                <p className="text-sm font-medium text-gray-700">{c.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default ClassroomScreen;