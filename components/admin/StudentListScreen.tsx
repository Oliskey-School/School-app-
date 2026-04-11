

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SearchIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  gradeColors,
  ClockIcon,
  ChevronRightIcon,
  getFormattedClassName,
  FilterIcon,
  ViewGridIcon
} from '../../constants';
import CenteredLoader from '../ui/CenteredLoader';
import LoadingState from '../ui/LoadingState';
import { Student, AttendanceStatus } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useAutoSync } from '../../hooks/useAutoSync';

const AttendanceStatusIndicator: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
  switch (status) {
    case 'Present':
      return <CheckCircleIcon className="text-green-500" />;
    case 'Absent':
      return <XCircleIcon className="text-red-500" />;
    case 'Leave':
      return <ExclamationCircleIcon className="text-orange-500" />;
    case 'Late':
      return <ClockIcon className="text-blue-500" />;
    default:
      return null;
  }
};

const StudentRow: React.FC<{ student: any; onSelect: (student: Student) => void; }> = ({ student, onSelect }) => (
  <div className="w-full text-left bg-white rounded-lg p-2 flex items-center justify-between transition-all hover:bg-gray-100 ring-1 ring-gray-100">
    <button
      key={student.id}
      onClick={() => onSelect(student)}
      className="flex items-center space-x-3 flex-grow min-w-0"
      aria-label={`View profile for ${student.name}`}
    >
      <img
        src={student.avatarUrl || student.avatar_url || `https://ui-avatars.com/api/?name=${student.name}`}
        alt={student.name}
        className="w-10 h-10 rounded-full object-cover"
        loading="lazy"
      />
      <div className="flex-grow min-w-0 text-left">
        <p className="font-bold text-sm text-gray-800 truncate">{student.name || student.full_name}</p>
        <p className="text-xs text-gray-500">
          ID: {student.schoolGeneratedId || student.school_generated_id || 'Pending'}
          {(student.user?.initial_password || student.initial_password) && (
             <span className="ml-2 text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded text-[10px]">
               Pass: {student.user?.initial_password || student.initial_password}
             </span>
          )}
        </p>
      </div>
    </button>
    <div className="flex items-center space-x-3 px-2">
      <AttendanceStatusIndicator status={student.attendanceStatus || student.status} />
    </div>
  </div>
);

const StageAccordion: React.FC<{ title: string; count: number; children: React.ReactNode, defaultOpen?: boolean }> = ({ title, count, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left"
        aria-expanded={isOpen}
      >
        <h3 className="font-bold text-lg text-gray-800">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">{count} Students</span>
          <ChevronRightIcon className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

const SubStageAccordion: React.FC<{ title: string; count: number; children: React.ReactNode, defaultOpen?: boolean }> = ({ title, count, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100"
        aria-expanded={isOpen}
      >
        <h4 className="font-semibold text-gray-700">{title}</h4>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">{count}</span>
          <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="p-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

const ClassAccordion: React.FC<{ title: string; count: number; children: React.ReactNode, defaultOpen?: boolean }> = ({ title, count, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl overflow-hidden border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100"
        aria-expanded={isOpen}
      >
        <h4 className="font-semibold text-sm text-gray-600">{title}</h4>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
          <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="p-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

interface StudentListScreenProps {
  filter?: { grade: number; section?: string; };
  navigateTo: (view: string, title: string, props?: any) => void;
  currentBranchId?: string | null;
  schoolId?: string; // Added prop
}

const StudentListScreen: React.FC<StudentListScreenProps> = ({ filter, navigateTo, currentBranchId, schoolId: propSchoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'stage' | 'class'>('stage');

  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const schoolId = propSchoolId || profile?.schoolId || profile?.school_id || user?.user_metadata?.school_id;
  const queryKey = ['students', schoolId, currentBranchId];

  // Use React Query for student data management
  const { data: students = [], isLoading, isError, error: fetchError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!schoolId) return [];
      const rawData = await api.getStudents(schoolId, currentBranchId || undefined, { includeUntagged: true });
      return (rawData || []).map((s: any) => ({
        id: s.id,
        schoolId: s.school_id || s.schoolId,
        schoolGeneratedId: s.school_generated_id || s.schoolGeneratedId,
        name: s.name || s.full_name || '',
        email: s.email || '',
        avatarUrl: s.avatar_url || s.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name || s.full_name || 'student'}`,
        grade: s.grade,
        section: s.section,
        department: s.department,
        attendanceStatus: s.attendance_status || s.attendanceStatus || 'Absent',
        birthday: s.birthday,
        classId: s.class_id || s.classId,
        status: s.status,
        initial_password: s.user?.initial_password || s.initial_password
      }));
    },
    enabled: !!schoolId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Auto-sync
  useAutoSync(['students'], () => {
    console.log('🔄 [StudentList] Auto-sync triggered');
    refetch();
  });

  const handleStudentSelect = (student: Student) => {
    navigateTo('studentProfileAdminView', student.name, { student });
  };

  const filteredStudentsList = useMemo(() => {
    return students.filter(student => {
      const nameMatch = (student.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (filter) {
        const gradeMatch = student.grade === filter.grade;
        const sectionMatch = !filter.section || student.section === filter.section;
        return gradeMatch && sectionMatch && nameMatch;
      }
      return nameMatch;
    });
  }, [searchTerm, students, filter]);

  const studentsByStageAndClass = useMemo(() => {
    const stages: {
      primary: {
        lower: { [className: string]: Student[] };
        upper: { [className: string]: Student[] };
      };
      junior: { [className: string]: Student[] };
      senior: { [className: string]: Student[] };
      preschool: { [className: string]: Student[] };
    } = { primary: { lower: {}, upper: {} }, junior: {}, senior: {}, preschool: {} };

    filteredStudentsList.forEach(student => {
      const className = student.grade !== null && student.grade !== undefined ? getFormattedClassName(student.grade, student.section) : 'Unassigned';

      if (student.grade === null || student.grade === undefined) {
        if (!stages.preschool['Unassigned']) stages.preschool['Unassigned'] = [];
        stages.preschool['Unassigned'].push(student);
      } else if (student.grade <= 0) {
        if (!stages.preschool[className]) stages.preschool[className] = [];
        stages.preschool[className].push(student);
      } else if (student.grade >= 1 && student.grade <= 3) {
        if (!stages.primary.lower[className]) stages.primary.lower[className] = [];
        stages.primary.lower[className].push(student);
      } else if (student.grade >= 4 && student.grade <= 6) {
        if (!stages.primary.upper[className]) stages.primary.upper[className] = [];
        stages.primary.upper[className].push(student);
      } else if (student.grade >= 7 && student.grade <= 9) {
        if (!stages.junior[className]) stages.junior[className] = [];
        stages.junior[className].push(student);
      } else if (student.grade >= 10) {
        // Senior Secondary (10-12 and above)
        if (!stages.senior[className]) stages.senior[className] = [];
        stages.senior[className].push(student);
      }
    });

    const sortClasses = (classGroup: { [className: string]: Student[] }) => {
      const sortedClasses = Object.keys(classGroup).sort((a, b) => {
        const gradeA = parseInt(a.match(/\d+/)?.[0] || '0');
        const gradeB = parseInt(b.match(/\d+/)?.[0] || '0');
        if (gradeA !== gradeB) return gradeB - gradeA;
        const sectionA = a.match(/[A-Z]/)?.[0] || '';
        const sectionB = b.match(/[A-Z]/)?.[0] || '';
        return sectionA.localeCompare(sectionB);
      });
      const sortedGroup: { [className: string]: Student[] } = {};
      sortedClasses.forEach(className => {
        sortedGroup[className] = classGroup[className];
      });
      return sortedGroup;
    };

    stages.primary.lower = sortClasses(stages.primary.lower);
    stages.primary.upper = sortClasses(stages.primary.upper);
    stages.junior = sortClasses(stages.junior);
    stages.senior = sortClasses(stages.senior);
    stages.preschool = sortClasses(stages.preschool);

    return stages;
  }, [filteredStudentsList]);

  const studentsByClass = useMemo(() => {
    const classes: Record<string, Student[]> = {};
    filteredStudentsList.forEach(student => {
      const className = getFormattedClassName(student.grade, student.section);
      if (!classes[className]) classes[className] = [];
      classes[className].push(student);
    });
    return Object.fromEntries(
      Object.entries(classes).sort((a, b) => a[0].localeCompare(b[0]))
    );
  }, [filteredStudentsList]);

  const seniorCount = Object.values(studentsByStageAndClass.senior).flat().length;
  const juniorCount = Object.values(studentsByStageAndClass.junior).flat().length;
  const lowerPrimaryCount = Object.values(studentsByStageAndClass.primary.lower).flat().length;
  const upperPrimaryCount = Object.values(studentsByStageAndClass.primary.upper).flat().length;
  const preschoolCount = Object.values(studentsByStageAndClass.preschool).flat().length;
  const primaryCount = lowerPrimaryCount + upperPrimaryCount;

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState type="list" rows={8} className="p-2" />;
    }

    if (fetchError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-red-100 text-center m-2">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <ExclamationCircleIcon className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Failed to Load Students</h3>
          <p className="text-sm text-gray-500 mb-4">{String(fetchError)}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry Now
          </button>
        </div>
      );
    }

    if (filteredStudentsList.length === 0) {
      return (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 m-2">
          <p className="text-gray-500 font-medium">No students found matching your search.</p>
        </div>
      );
    }

    if (filter) {
      return (
        <div className="space-y-3">
          {filteredStudentsList.map(student => (
            <StudentRow key={student.id} student={student} onSelect={handleStudentSelect} />
          ))}
        </div>
      );
    }

    if (viewMode === 'class') {
      return (
        <div className="space-y-3">
          {Object.entries(studentsByClass).map(([className, students]) => (
            <ClassAccordion key={className} title={className} count={students.length} defaultOpen={true}>
              {students.map(s => <StudentRow key={s.id} student={s} onSelect={handleStudentSelect} />)}
            </ClassAccordion>
          ))}
        </div>
      );
    }

    return (
      <>
        {seniorCount > 0 && (
          <StageAccordion title="Senior Secondary" count={seniorCount}>
            {Object.entries(studentsByStageAndClass.senior).map(([className, students]: [string, Student[]]) => (
              <SubStageAccordion key={className} title={className} count={students.length}>
                {students.map(s => <StudentRow key={s.id} student={s} onSelect={handleStudentSelect} />)}
              </SubStageAccordion>
            ))}
          </StageAccordion>
        )}

        {juniorCount > 0 && (
          <StageAccordion title="Junior Secondary" count={juniorCount}>
            {Object.entries(studentsByStageAndClass.junior).map(([className, students]: [string, Student[]]) => (
              <SubStageAccordion key={className} title={className} count={students.length}>
                {students.map(s => <StudentRow key={s.id} student={s} onSelect={handleStudentSelect} />)}
              </SubStageAccordion>
            ))}
          </StageAccordion>
        )}

        {primaryCount > 0 && (
          <StageAccordion title="Primary School" count={primaryCount}>
            {upperPrimaryCount > 0 && (
              <SubStageAccordion title="Upper Primary (4-6)" count={upperPrimaryCount}>
                {Object.entries(studentsByStageAndClass.primary.upper).map(([className, students]: [string, Student[]]) => (
                  <ClassAccordion key={className} title={className} count={students.length}>
                    {students.map(s => <StudentRow key={s.id} student={s} onSelect={handleStudentSelect} />)}
                  </ClassAccordion>
                ))}
              </SubStageAccordion>
            )}
            {lowerPrimaryCount > 0 && (
              <SubStageAccordion title="Lower Primary (1-3)" count={lowerPrimaryCount}>
                {Object.entries(studentsByStageAndClass.primary.lower).map(([className, students]: [string, Student[]]) => (
                  <ClassAccordion key={className} title={className} count={students.length}>
                    {students.map(s => <StudentRow key={s.id} student={s} onSelect={handleStudentSelect} />)}
                  </ClassAccordion>
                ))}
              </SubStageAccordion>
            )}
          </StageAccordion>
        )}

        {preschoolCount > 0 && (
          <StageAccordion title="Preschool / Nursery" count={preschoolCount}>
            {Object.entries(studentsByStageAndClass.preschool).map(([className, students]: [string, Student[]]) => (
              <ClassAccordion key={className} title={className} count={students.length}>
                {students.map(s => <StudentRow key={s.id} student={s} onSelect={handleStudentSelect} />)}
              </ClassAccordion>
            ))}
          </StageAccordion>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 relative">
      <div className="p-4 bg-gray-100 z-10 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="text-gray-600" />
          </span>
          <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" aria-label="Search for a student" />
        </div>

        {!filter && (
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('stage')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'stage' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              By Stage
            </button>
            <button
              onClick={() => setViewMode('class')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'class' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              By Class
            </button>
          </div>
        )}
      </div>

      <main className="flex-grow px-4 pb-24 space-y-4 overflow-y-auto">
        {renderContent()}
      </main>

      <div className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 z-40">
        <button onClick={() => navigateTo('addStudent', 'Add New Student', {})} className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" aria-label="Add new student"><PlusIcon className="h-6 w-6" /></button>
      </div>
    </div>
  );
};

export default StudentListScreen;
