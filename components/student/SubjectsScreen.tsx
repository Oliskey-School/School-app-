
import React, { useEffect, useState, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { Student, Teacher } from '../../types';
import { fetchClassSubjects } from '../../lib/database';
import { SUBJECT_COLORS, BookOpenIcon, ChevronRightIcon, ChevronLeftIcon, GlobeIcon, ClockIcon } from '../../constants';
// Removed mockStudents import
import { offlineStorage } from '../../lib/offlineStorage';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

// Helper function to get default subjects based on grade and department
const getDefaultSubjectsForGrade = (grade: number, department?: string): string[] => {
  // Core subjects for all students
  const coreSubjects = ['Mathematics', 'English'];

  // Junior Secondary (JSS 1-3) - Grades 7-9
  if (grade >= 7 && grade <= 9) {
    return [
      ...coreSubjects,
      'Basic Science',
      'Basic Technology',
      'Civic Education',
      'Social Studies',
      'French',
      'Computer Studies',
      'Creative Arts'
    ];
  }

  // Senior Secondary Science (SS 1-3) - Grades 10-12
  if (grade >= 10 && grade <= 12) {
    if (department === 'Science' || !department) {
      return [
        ...coreSubjects,
        'Physics',
        'Chemistry',
        'Biology',
        'Further Mathematics',
        'Computer Science',
        'Agricultural Science'
      ];
    } else if (department === 'Arts' || department === 'Humanities') {
      return [
        ...coreSubjects,
        'Literature in English',
        'Government',
        'Economics',
        'Christian Religious Studies',
        'History',
        'Geography'
      ];
    } else if (department === 'Commercial') {
      return [
        ...coreSubjects,
        'Economics',
        'Accounting',
        'Commerce',
        'Business Studies',
        'Government',
        'Data Processing'
      ];
    }
  }

  // Primary level fallback (Grades 1-6)
  if (grade >= 1 && grade <= 6) {
    return [
      ...coreSubjects,
      'Elementary Science',
      'Social Studies',
      'Civic Education',
      'Physical Education',
      'Creative Arts',
      'Computer Studies'
    ];
  }

  // Default fallback for any other grade
  return [...coreSubjects, 'Science', 'Social Studies', 'Civic Education'];
};

interface SubjectsScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
  student?: Student; // Make student optional but expected
}

const SubjectsScreen: React.FC<SubjectsScreenProps> = ({ navigateTo, student }) => {
  const [subjects, setSubjects] = useState<any[]>([]); // Changed from string[] to any[]
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null); // Changed from string to any
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  const loadSubjects = useCallback(async () => {
    if (!student) return;

    const cacheKey = `subjects_${student.id}`;

    // 1. Cache First
    const cachedSubjects = await offlineStorage.load<any[]>(cacheKey);
    if (cachedSubjects && cachedSubjects.length > 0) {
      setSubjects(cachedSubjects);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const fetchedSubjects = await api.getMySubjects();
      
      if (fetchedSubjects && fetchedSubjects.length > 0) {
        setSubjects(fetchedSubjects);
        await offlineStorage.save(cacheKey, fetchedSubjects);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      if (!cachedSubjects) {
        const defaultNames = getDefaultSubjectsForGrade(student.grade, student.department);
        setSubjects(defaultNames.map(name => ({ id: name, name: name })));
      }
    } finally {
      setLoading(false);
    }
  }, [student]);

  // Real-time synchronization
  useAutoSync(['subjects', 'curriculum'], loadSubjects);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const loadTopics = async (subjectId: string, term: number) => {
    setIsLoadingTopics(true);
    try {
      // Use the new backend API method
      const data = await api.getStudentCurriculumTopics(subjectId, term.toString());
      setTopics(data);
    } catch (error) {
      toast.error('Failed to load curriculum topics');
      console.error(error);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading student profile...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        {selectedSubject ? (
          <div className="space-y-6 animate-fade-in">
            <button
              onClick={() => {
                setSelectedSubject(null);
                setSelectedTerm(null);
                setTopics([]);
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors font-bold text-sm"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              Back to Subjects
            </button>

            <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xl shadow-orange-900/5">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-orange-600">
                  <BookOpenIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedSubject.name}</h2>
                  <p className="text-sm text-gray-500 font-medium font-sans uppercase tracking-widest">Curriculum Details</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Select Term</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedTerm(t);
                        loadTopics(selectedSubject.id, t);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all font-black ${selectedTerm === t
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-50 bg-gray-50 text-gray-400 hover:bg-white hover:border-orange-200 hover:text-gray-600'
                        }`}
                    >
                      Term {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedTerm && (
              <div className="space-y-4 animate-fade-in pb-10">
                <div className="flex items-center gap-2 px-2">
                  <ClockIcon className="w-4 h-4 text-orange-500" />
                  <h3 className="text-lg font-bold text-gray-800">Term {selectedTerm} Topics</h3>
                </div>

                {isLoadingTopics ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />
                    ))}
                  </div>
                ) : topics.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <BookOpenIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 font-bold">No topics found for this term.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topics.map((topic, idx) => (
                      <div key={topic.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-black text-sm">
                            {topic.week_number || idx + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">{topic.title}</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">{topic.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => navigateTo('classroom', `${selectedSubject.name} Classroom`, { subjectName: selectedSubject.name })}
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                >
                  <GlobeIcon className="w-5 h-5" />
                  Go to {selectedSubject.name} Classroom
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-200">
              <BookOpenIcon className="h-10 w-10 mx-auto text-orange-400 mb-2" />
              <h3 className="font-bold text-lg text-orange-800">My Subjects</h3>
              <p className="text-sm text-orange-700">Select a subject to view curriculum and classroom.</p>
            </div>

            {subjects.filter(s => s && s !== 'Subject').length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">No subjects found for your class.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.filter(s => s && s.name && s.name !== 'Subject').map(subject => {
                  const subjectName = subject.name;
                  const colorClass = SUBJECT_COLORS[subjectName] || 'bg-gray-200 text-gray-800';
                  const [bgColor, textColor] = colorClass.split(' ');

                  return (
                    <button
                      key={subject.id || subjectName}
                      onClick={() => setSelectedSubject(subject)}
                      className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-orange-200 transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
                          <BookOpenIcon className={`w-6 h-6 ${textColor}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{subjectName}</h3>
                          <p className="text-sm text-gray-500 font-medium">
                            View Curriculum
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="text-gray-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SubjectsScreen;