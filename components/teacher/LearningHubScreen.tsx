import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { ElearningIcon, BookOpenIcon, SearchIcon, AwardIcon, UserGroupIcon, GameControllerIcon } from '../../constants';
import { gradeToLevel } from '../shared/learningHubConstants';

interface LearningHubScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
  teacherId?: string;
  schoolId?: string;
}

const TeacherLearningHubScreen: React.FC<LearningHubScreenProps> = ({ navigateTo, schoolId }) => {
  const [tab, setTab] = useState<'browse' | 'monitor'>('browse');
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // My actual teaching assignments — the Learning Hub only ever shows classes
  // and subjects this teacher is assigned to, not the whole school's catalog.
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [mySubjects, setMySubjects] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<Record<string, any>>({});
  const [loadingMonitor, setLoadingMonitor] = useState(false);

  useEffect(() => {
    api.getMyTeachingRoles().then(roles => {
      const classesById = new Map<string, any>();
      (roles.class_teacher_of || []).forEach((c: any) => c && classesById.set(c.id, c));
      (roles.subject_assignments || []).forEach((a: any) => a.class && classesById.set(a.class.id, a.class));
      setMyClasses(Array.from(classesById.values()));

      const subjectNames = new Set<string>();
      (roles.subject_assignments || []).forEach((a: any) => a.subject?.name && subjectNames.add(a.subject.name));
      setMySubjects(Array.from(subjectNames));
    }).catch(() => { setMyClasses([]); setMySubjects([]); });
  }, []);

  const myLevels = useMemo(() => {
    const levels = new Set<string>();
    myClasses.forEach(c => { const l = gradeToLevel(c.grade); if (l) levels.add(l); });
    return Array.from(levels);
  }, [myClasses]);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLearningHubResources({ grade_level: level || undefined, subject: subject || undefined, search: search || undefined });
      setResources(Array.isArray(res) ? res : []);
    } catch {
      toast.error('Could not load Learning Hub resources');
    } finally {
      setLoading(false);
    }
  }, [level, subject, search]);

  useEffect(() => { loadResources(); }, [loadResources]);

  const loadMonitor = useCallback(async (classId: string) => {
    if (!classId) return;
    setLoadingMonitor(true);
    try {
      const students = await api.getStudentsByClassId(classId);
      setClassStudents(Array.isArray(students) ? students : []);
      const summaries: Record<string, any> = {};
      await Promise.all((Array.isArray(students) ? students : []).map(async (s: any) => {
        summaries[s.id] = await api.getStudentLearningHubSummary(s.id).catch(() => null);
      }));
      setStudentSummaries(summaries);
    } finally {
      setLoadingMonitor(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'monitor' && selectedClassId) loadMonitor(selectedClassId);
  }, [tab, selectedClassId, loadMonitor]);

  const handleRecommend = async (resource: any) => {
    if (!classStudents.length) {
      toast.error('Select one of your classes in the Monitor tab first, so I know who to recommend this to.');
      return;
    }
    try {
      await Promise.all(classStudents.map(s => api.createLearningHubStudyPlan({
        student_id: s.id,
        title: `Recommended: ${resource.title}`,
        items: [{ resource_id: resource.id }],
      })));
      toast.success(`Recommended to ${classStudents.length} student(s).`);
    } catch {
      toast.error('Could not recommend this resource');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-10">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
            <ElearningIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-blue-800">Learning Hub</h3>
            <p className="text-sm text-blue-700">Recommend free resources and monitor your students' progress.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigateTo('library', 'E-Learning Library', { schoolId })}
            className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <BookOpenIcon className="w-4 h-4 text-blue-600" />
            E-Learning Library
          </button>
          <button
            onClick={() => navigateTo('educationalGames', 'Educational Games', {})}
            className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <GameControllerIcon className="w-4 h-4 text-blue-600" />
            Educational Games
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('browse')}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${tab === 'browse' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            Browse & Recommend
          </button>
          <button
            onClick={() => setTab('monitor')}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${tab === 'monitor' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            Monitor Class
          </button>
        </div>

        {tab === 'browse' ? (
          <>
            <div className="relative">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topics, keywords..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            {myLevels.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setLevel('')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${level === '' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>All My Classes</button>
                {myLevels.map(l => (
                  <button key={l} onClick={() => setLevel(l)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${level === l ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{l}</button>
                ))}
              </div>
            )}
            {mySubjects.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setSubject('')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${subject === '' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>All My Subjects</button>
                {mySubjects.map(s => (
                  <button key={s} onClick={() => setSubject(s)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${subject === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{s}</button>
                ))}
              </div>
            )}
            {myLevels.length === 0 && mySubjects.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
                You don't have any classes or subjects assigned yet — ask your admin to assign you, then resources for those classes will show here.
              </div>
            )}

            {loading ? (
              <div className="space-y-3 pt-2">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />)}</div>
            ) : resources.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <BookOpenIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 font-bold">No resources found.</p>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                {resources.map((resource, i) => (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.03 }}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3"
                  >
                    <button
                      onClick={() => navigateTo('learningHubResource', resource.title, { url: resource.url, title: resource.title, sourceName: resource.source_name, themeColor: 'blue' })}
                      className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"
                    >
                      <BookOpenIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => navigateTo('learningHubResource', resource.title, { url: resource.url, title: resource.title, sourceName: resource.source_name, themeColor: 'blue' })}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-bold text-gray-900 truncate">{resource.title}</p>
                      <p className="text-xs text-gray-500 truncate">{resource.grade_level} · {resource.subject}</p>
                    </button>
                    <button
                      onClick={() => handleRecommend(resource)}
                      className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full flex-shrink-0 hover:bg-blue-100"
                    >
                      Recommend to class
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {myClasses.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClassId(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${selectedClassId === c.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                >
                  {c.name || `${c.grade}${c.section || ''}`}
                </button>
              ))}
            </div>

            {myClasses.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <UserGroupIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 font-bold">You have no assigned classes yet.</p>
              </div>
            ) : !selectedClassId ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <UserGroupIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 font-bold">Select one of your classes to monitor progress.</p>
              </div>
            ) : loadingMonitor ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-gray-100" />)}</div>
            ) : (
              <div className="space-y-2">
                {classStudents.map(s => {
                  const sum = studentSummaries[s.id];
                  return (
                    <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{s.full_name || s.name}</p>
                        <p className="text-xs text-gray-500">{sum?.lessons_completed ?? 0} completed · {Math.round(((sum?.time_spent_seconds) || 0) / 60)}m spent</p>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 flex-shrink-0">
                        <AwardIcon className="w-4 h-4" />
                        <span className="font-black text-sm">{sum?.average_score ?? '—'}</span>
                      </div>
                    </div>
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

export default TeacherLearningHubScreen;
