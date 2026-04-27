import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

import { Student, ClassInfo } from '../../types';
import { ChevronRightIcon, TeacherAttendanceIcon, ClipboardListIcon } from '../../constants';
import { getFormattedClassName } from '../../constants';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useProfile } from '../../context/ProfileContext';

interface ClassDetailScreenProps {
  classInfo: ClassInfo;
  navigateTo: (view: string, title: string, props: any) => void;
}

const ClassDetailScreen: React.FC<ClassDetailScreenProps> = ({ classInfo, navigateTo }) => {
  const { profile } = useProfile();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            // Inject strict multi-tenant filters
            const effectiveSchoolId = classInfo.schoolId || (classInfo as any).school_id || profile?.schoolId;
            const effectiveBranchId = classInfo.branch_id || (classInfo as any).branch_id || profile?.branchId;

            console.log('🔍 [ClassDetail] fetchStudents started:', { 
                classId: classInfo.id, 
                effectiveSchoolId, 
                effectiveBranchId, 
                profileBranchId: profile?.branchId 
            });

            // Use the more robust api.getStudents pattern (working in Attendance)
            const studentData = await api.getStudents(
                effectiveSchoolId,
                effectiveBranchId && effectiveBranchId !== 'all' ? effectiveBranchId : undefined,
                {
                    classId: classInfo.id,
                    grade: classInfo.grade,
                    section: classInfo.section
                }
            );

            if (studentData) {
                setStudents(studentData.map((s: any) => ({
                    id: s.id,
                    schoolId: s.school_generated_id || s.schoolId || s.admission_number,
                    name: s.full_name || s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unnamed',
                    email: s.email || '',
                    avatarUrl: s.avatar_url || s.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name || s.name || 'U')}&background=random`,
                    grade: s.grade,
                    section: s.section,
                    department: s.department,
                    attendanceStatus: s.attendance_status || 'Absent',
                    birthday: s.birthday
                })));
            }
        } catch (err) {
            console.error('Error fetching students for class:', err);
        } finally {
            setLoading(false);
        }
    };

  useEffect(() => {
    fetchStudents();
  }, [classInfo]);

  // Auto-refresh when students table changes in real-time
  useRealtimeRefresh(['students'], fetchStudents);


  const formattedClassName = classInfo.name || getFormattedClassName(classInfo.grade, classInfo.section);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header Info */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h3 className="font-bold text-lg text-gray-800">Students in {formattedClassName}</h3>
        <p className="text-sm text-gray-500">{students.length} total students</p>
      </div>

      {/* Action Buttons */}
      <div className="p-4 grid grid-cols-2 gap-3 bg-white border-b border-gray-200">
        <button onClick={() => navigateTo('markAttendance', `Attendance: ${formattedClassName}`, { classInfo })} className="flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 text-white font-semibold rounded-xl shadow-md hover:bg-purple-700 transition-colors">
          <TeacherAttendanceIcon className="w-5 h-5" />
          <span>Attendance</span>
        </button>
        <button onClick={() => navigateTo('assignmentCreator', 'New Assignment', { classInfo })} className="flex items-center justify-center space-x-2 py-3 px-4 bg-amber-500 text-white font-semibold rounded-xl shadow-md hover:bg-amber-600 transition-colors">
          <ClipboardListIcon className="w-5 h-5" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Student List */}
      <main className="flex-grow p-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        ) : students.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {students.map(student => (
              <button
                key={student.id}
                onClick={() => navigateTo('studentProfile', student.name, { student })}
                className="w-full bg-white rounded-xl shadow-sm p-3 flex items-center space-x-4 transition-all hover:shadow-md hover:ring-2 hover:ring-purple-200"
                aria-label={`View profile for ${student.name}`}
              >
                <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                <div className="flex-grow text-left">
                  <p className="font-bold text-gray-800">{student.name}</p>
                  <p className="text-sm text-gray-500">ID: {student.schoolId || 'Pending'}</p>
                </div>
                <ChevronRightIcon className="text-gray-400" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <p>No students found in this class.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClassDetailScreen;
