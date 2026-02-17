import React, { useState, useEffect } from 'react';
import { Student, Teacher, Notice } from '../../types';
import { fetchStudentsByClass, fetchTeachers, fetchNotices } from '../../lib/database';
import { SUBJECT_COLORS, BookOpenIcon, ClipboardListIcon, MegaphoneIcon, UsersIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

interface ClassroomScreenProps {
  subjectName: string;
  navigateTo: (view: string, title: string, props?: any) => void;
}

const ClassroomScreen: React.FC<ClassroomScreenProps> = ({ subjectName, navigateTo }) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classmates, setClassmates] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Get student profile from current profile context (which should be populated)
        // If not a student profile, we might be an admin viewing this.
        const currentStudent = profile as unknown as Student;
        setStudent(currentStudent);

        if (currentStudent && currentStudent.grade) {
          // 2. Fetch Classmates
          const peers = await fetchStudentsByClass(currentStudent.grade, currentStudent.section);
          setClassmates(peers.filter(p => p.id !== currentStudent.id));

          // 3. Fetch Notices
          const allNotices = await fetchNotices(currentStudent.schoolId);
          const classAnnouncements = allNotices.filter(
            n => (n.audience.includes('all') || n.audience.includes('students')) && 
                 (!n.className || n.className === `Grade ${currentStudent.grade}${currentStudent.section}`)
          ).slice(0, 2);
          setAnnouncements(classAnnouncements);
        }

        // 4. Fetch Teacher for this subject
        const allTeachers = await fetchTeachers(currentStudent?.schoolId);
        const subjectTeacher = allTeachers.find(t => t.subjects.includes(subjectName));
        setTeacher(subjectTeacher || null);

      } catch (err) {
        console.error("Error loading classroom data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      loadData();
    }
  }, [profile, subjectName]);

  const colorClass = SUBJECT_COLORS[subjectName] || 'bg-gray-200 text-gray-800';
  const [bgColor, textColor] = colorClass.split(' ');
  const ringColor = bgColor.replace('bg-', 'ring-').replace('-100', '-300').replace('-200', '-300').replace('-300', '-400').replace('-400', '-500').replace('-500', '-600');

  const quickActions = [
    { label: 'Assignments', icon: <ClipboardListIcon className="h-6 w-6"/>, action: () => navigateTo('assignments', `${subjectName} Assignments`, { studentId: student?.id, subjectFilter: subjectName }) },
    { label: 'Resources', icon: <BookOpenIcon className="h-6 w-6"/>, action: () => navigateTo('library', 'E-Learning Library') },
  ];
  
  if (loading) return <div className="p-8 text-center text-gray-500">Loading classroom...</div>;

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
                        {classmates.length > 0 ? classmates.map(c => (
                            <div key={c.id} className="flex items-center space-x-3">
                                <img src={c.avatarUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover"/>
                                <p className="text-sm font-medium text-gray-700">{c.name}</p>
                            </div>
                        )) : (
                          <p className="text-sm text-gray-400 text-center py-4">No classmates found.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default ClassroomScreen;
