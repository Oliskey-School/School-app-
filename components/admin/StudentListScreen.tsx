

import React, { useState, useMemo, useEffect } from 'react';
import {
  SearchIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  gradeColors,
  ClockIcon,
  ChevronRightIcon
} from '../../constants';
import { Student, AttendanceStatus } from '../../types';
import { supabase } from '../../lib/supabase';

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
    <img src={student.avatarUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
    <div className="flex-grow min-w-0">
      <p className="font-bold text-sm text-gray-800 truncate">{student.name}</p>
      <p className="text-xs text-gray-500">ID: SCH-0{student.id}</p>
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
  filter?: { grade: number; section: string; };
  navigateTo: (view: string, title: string, props?: any) => void;
}

const StudentListScreen: React.FC<StudentListScreenProps> = ({ filter, navigateTo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch students from Supabase
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('grade', { ascending: false });

      // log response for debugging
      console.debug('fetchStudents response', { data, error });

      if (error) throw error;

      // Transform Supabase data to match Student interface
      const transformedData: Student[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        avatarUrl: s.avatar_url || 'https://i.pravatar.cc/150',
        grade: s.grade,
        section: s.section,
        department: s.department,
        attendanceStatus: s.attendance_status || 'Absent',
        birthday: s.birthday
      }));

      setStudents(transformedData);
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
    } = { primary: { lower: {}, upper: {} }, junior: {}, senior: {} };

    const allStudents = students.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()));

    allStudents.forEach(student => {
      const className = `Grade ${student.grade}${student.section}`;
      if (student.grade >= 1 && student.grade <= 3) { // Lower Primary
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

    return stages;
  }, [searchTerm, students]);

  if (filter) {
    const filteredStudents = students.filter(student =>
      (student.grade === filter.grade && student.section === filter.section) &&
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
  const primaryCount = lowerPrimaryCount + upperPrimaryCount;


  return (
    <div className="flex flex-col h-full bg-gray-100 relative">
      <div className="p-4 bg-gray-100 z-10">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="text-gray-600" />
          </span>
          <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" aria-label="Search for a student" />
        </div>
      </div>

      <main className="flex-grow px-4 pb-24 space-y-4 overflow-y-auto">
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
      </main>

      <div className="absolute bottom-6 right-6">
        <button onClick={() => navigateTo('addStudent', 'Add New Student', {})} className="bg-sky-500 text-white p-4 rounded-full shadow-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500" aria-label="Add new student"><PlusIcon className="h-6 w-6" /></button>
      </div>
    </div>
  );
};

export default StudentListScreen;
