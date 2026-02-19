

import React, { useState, useMemo, useEffect } from 'react';
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
import { Student, AttendanceStatus } from '../../types';
import { fetchStudents } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

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

const StudentRow: React.FC<{ student: Student; onSelect: (student: Student) => void; }> = ({ student, onSelect }) => (
  <button
    key={student.id}
    onClick={() => onSelect(student)}
    className="w-full text-left bg-white rounded-lg p-2 flex items-center space-x-3 transition-all hover:bg-gray-100 ring-1 ring-gray-100"
    aria-label={`View profile for ${student.name}`}
  >
    <img
      src={student.avatarUrl}
      alt={student.name}
      className="w-10 h-10 rounded-full object-cover"
      loading="lazy"
    />
    <div className="flex-grow min-w-0">
      <p className="font-bold text-sm text-gray-800 truncate">{student.name}</p>
      <p className="text-xs text-gray-500">ID: {student.schoolGeneratedId || student.schoolId || student.id}</p>
    </div>
    <div className="flex items-center space-x-3">
      <AttendanceStatusIndicator status={student.attendanceStatus} />
    </div>
  </button>
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
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'stage' | 'class'>('stage');

  const { user } = useAuth();
  const { profile } = useProfile();

  // Fetch students from Supabase
  useEffect(() => {
    if (user || profile || propSchoolId) {
      loadStudents();
    }

    // Realtime Subscription
    const subscription = supabase
      .channel('public:students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        console.log('Student change received:', payload);
        loadStudents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentBranchId, propSchoolId, profile?.schoolId, user?.id]); // Re-load when branch or context changes

  const loadStudents = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // Use prop first, then profile, then metadata
      const schoolId = propSchoolId || profile?.schoolId || user?.user_metadata?.school_id;

      console.log('[StudentList] Loading for School ID:', schoolId, 'Branch:', currentBranchId);

      if (!schoolId) {
        console.warn('[StudentList] No school context found. Aborting fetch to prevent data leak.');
        setStudents([]);
        setIsLoading(false);
        return;
      }

      // Use centralized fetch function with branch support
      const data = await fetchStudents(schoolId, currentBranchId || undefined);

      console.log('[StudentList] Fetched Data:', data.length);
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setFetchError((error as any)?.message || String(error));
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSelect = (student: Student) => {
    navigateTo('studentProfileAdminView', student.name, { student });
  };

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

    const allStudents = students.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()));

    allStudents.forEach(student => {
      const className = student.grade ? getFormattedClassName(student.grade, student.section) : 'Unassigned';

      if (student.grade === null || student.grade === undefined) {
        // Handle unassigned students
        if (!stages.preschool['Unassigned']) stages.preschool['Unassigned'] = [];
        stages.preschool['Unassigned'].push(student);
      } else if (student.grade <= 0) { // Preschool / Nursery
        if (!stages.preschool[className]) stages.preschool[className] = [];
        stages.preschool[className].push(student);
      } else if (student.grade >= 1 && student.grade <= 3) { // Lower Primary
        if (!stages.primary.lower[className]) stages.primary.lower[className] = [];
        stages.primary.lower[className].push(student);
      } else if (student.grade >= 4 && student.grade <= 6) { // Upper Primary
        if (!stages.primary.upper[className]) stages.primary.upper[className] = [];
        stages.primary.upper[className].push(student);
      } else if (student.grade >= 7 && student.grade <= 9) {
        if (!stages.junior[className]) stages.junior[className] = [];
        stages.junior[className].push(student);
      } else if (student.grade >= 10 && student.grade <= 12) {
        if (!stages.senior[className]) stages.senior[className] = [];
        stages.senior[className].push(student);
      }
    });

    // Sort classes within each stage/sub-stage
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
  }, [searchTerm, students]);

  const studentsByClass = useMemo(() => {
    const classes: Record<string, Student[]> = {};
    const allStudents = students.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()));

    allStudents.forEach(student => {
      const className = getFormattedClassName(student.grade, student.section);
      if (!classes[className]) classes[className] = [];
      classes[className].push(student);
    });

    // Sort classes alphanumeric (simple)
    return Object.fromEntries(
      Object.entries(classes).sort((a, b) => a[0].localeCompare(b[0]))
    );
  }, [searchTerm, students]);

  if (filter) {
    const filteredStudents = students.filter(student => {
      const gradeMatch = student.grade === filter.grade;
      const sectionMatch = !filter.section || student.section === filter.section;
      const nameMatch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
      return gradeMatch && sectionMatch && nameMatch;
    });
    return (
      <div className="flex flex-col h-full bg-gray-100 relative">
        <div className="p-4 bg-gray-100 z-10"><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon className="text-gray-600" /></span><input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" aria-label="Search for a student" /></div></div>
        <main className="flex-grow px-4 pb-24 space-y-3 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-gray-500">Loading students...</div>
            </div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map(student => (
              <StudentRow key={student.id} student={student} onSelect={handleStudentSelect} />
            ))
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-gray-500">No students found</div>
            </div>
          )}
        </main>
        <div className="absolute bottom-6 right-6"><button onClick={() => navigateTo('addStudent', 'Add New Student', {})} className="bg-sky-500 text-white p-4 rounded-full shadow-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500" aria-label="Add new student"><PlusIcon className="h-6 w-6" /></button></div>
      </div>
    );
  }

  const seniorCount = Object.values(studentsByStageAndClass.senior).flat().length;
  const juniorCount = Object.values(studentsByStageAndClass.junior).flat().length;
  const lowerPrimaryCount = Object.values(studentsByStageAndClass.primary.lower).flat().length;
  const upperPrimaryCount = Object.values(studentsByStageAndClass.primary.upper).flat().length;
  const preschoolCount = Object.values(studentsByStageAndClass.preschool).flat().length;
  const primaryCount = lowerPrimaryCount + upperPrimaryCount;


  return (
    <div className="flex flex-col h-full bg-gray-100 relative">
      <div className="p-4 bg-gray-100 z-10 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="text-gray-600" />
          </span>
          <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" aria-label="Search for a student" />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('stage')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'stage' ? 'bg-white text-sky-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            By Stage
          </button>
          <button
            onClick={() => setViewMode('class')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'class' ? 'bg-white text-sky-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            By Class
          </button>
        </div>
      </div>

      <main className="flex-grow px-4 pb-24 space-y-4 overflow-y-auto">
        {isLoading ? (
          <CenteredLoader className="h-[60vh]" message="Loading students..." />
        ) : (seniorCount === 0 && juniorCount === 0 && primaryCount === 0 && preschoolCount === 0) ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 m-2">
            <p className="text-gray-500 font-medium">No students found matching your search.</p>
          </div>
        ) : viewMode === 'class' ? (
          <div className="space-y-3">
            {Object.entries(studentsByClass).map(([className, students]) => (
              <ClassAccordion key={className} title={className} count={students.length} defaultOpen={true}>
                {students.map(s => <StudentRow key={s.id} student={s} onSelect={handleStudentSelect} />)}
              </ClassAccordion>
            ))}
          </div>
        ) : (
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
        )}
      </main>

      <div className="absolute bottom-6 right-6">
        <button onClick={() => navigateTo('addStudent', 'Add New Student', {})} className="bg-sky-500 text-white p-4 rounded-full shadow-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500" aria-label="Add new student"><PlusIcon className="h-6 w-6" /></button>
      </div>
    </div>
  );
};

export default StudentListScreen;
