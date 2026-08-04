import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student } from '../../types';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
  ElearningIcon, BookOpenIcon, ChevronRightIcon, SearchIcon, ClockIcon, AwardIcon, SparklesIcon,
} from '../../constants';
import { gradeToLevel, PHET_SUBJECT_AREAS, PHET_GRADE_BANDS, PHET_INCLUSIVE_FEATURES } from '../shared/learningHubConstants';

interface LearningHubScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
  student?: Student;
}

const KIND_LABELS: Record<string, string> = {
  lesson: 'Lesson', worksheet: 'Worksheet', practice_question: 'Practice', quiz: 'Quiz',
  flashcard: 'Flashcards', video: 'Video', reading: 'Reading', story_book: 'Story Book',
  past_question: 'Past Questions', simulation: 'Interactive Simulations', revision_notes: 'Revision Notes',
  game: 'Educational Games',
};

// Games and simulations are the most engaging content, and (per confirmed
// embeddability) always play inside the app rather than falling back to an
// external tab — surface them first so students see them right away.
const KIND_ORDER = ['game', 'simulation', 'quiz', 'flashcard', 'practice_question', 'lesson', 'video', 'worksheet', 'reading', 'story_book', 'past_question', 'revision_notes'];

type Tab = 'browse' | 'filter' | 'customize';

const LearningHubScreen: React.FC<LearningHubScreenProps> = ({ navigateTo, student }) => {
  const [tab, setTab] = useState<Tab>('browse');

  // A student only ever belongs to one class, so the level isn't a filter choice —
  // it's fixed to whatever class they're actually enrolled in.
  const level = gradeToLevel(student?.grade);
  const [subject, setSubject] = useState<string>('');
  const [mySubjects, setMySubjects] = useState<string[]>([]);
  const [resourceKind, setResourceKind] = useState<string>('');

  // "Customize" — PhET's own filter dimensions (Subject Area, Grade Level,
  // Inclusive Features), each a standalone, tap-friendly row of chips so they
  // work well on a phone, independent of our curriculum grade_level/subject.
  const [subjectArea, setSubjectArea] = useState<string>('');
  const [gradeBand, setGradeBand] = useState<string>('');
  const [inclusiveFeature, setInclusiveFeature] = useState<string>('');

  const [search, setSearch] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [progressByResource, setProgressByResource] = useState<Record<string, any>>({});
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMySubjects()
      .then((subs: any[]) => setMySubjects((Array.isArray(subs) ? subs : []).map(s => s.name).filter(Boolean)))
      .catch(() => setMySubjects([]));
  }, []);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const [res, progress, sum] = await Promise.all([
        api.getLearningHubResources({
          grade_level: level || undefined,
          subject: subject || undefined,
          resource_kind: resourceKind || undefined,
          subject_area: subjectArea || undefined,
          grade_band: gradeBand || undefined,
          inclusive_feature: inclusiveFeature || undefined,
          search: search || undefined,
        }),
        api.getMyLearningHubProgress().catch(() => []),
        api.getMyLearningHubSummary().catch(() => null),
      ]);
      setResources(Array.isArray(res) ? res : []);
      const map: Record<string, any> = {};
      (Array.isArray(progress) ? progress : []).forEach((p: any) => { map[p.resource_id] = p; });
      setProgressByResource(map);
      setSummary(sum);
    } catch (error) {
      console.error('Failed to load Learning Hub resources:', error);
      toast.error('Could not load Learning Hub resources');
    } finally {
      setLoading(false);
    }
  }, [level, subject, resourceKind, subjectArea, gradeBand, inclusiveFeature, search]);

  useEffect(() => { loadResources(); }, [loadResources]);

  const handleOpenResource = (resource: any) => {
    navigateTo('learningHubResource', resource.title, {
      url: resource.url,
      title: resource.title,
      sourceName: resource.source_name,
      resourceId: resource.id,
      trackProgress: true,
      themeColor: 'orange',
    });
  };

  const handleMarkComplete = async (resource: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.upsertMyLearningHubProgress({ resource_id: resource.id, status: 'completed' });
      setProgressByResource(prev => ({ ...prev, [resource.id]: updated }));
      toast.success('Marked as completed!');
      const sum = await api.getMyLearningHubSummary().catch(() => null);
      if (sum) setSummary(sum);
    } catch {
      toast.error('Could not update progress');
    }
  };

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    resources.forEach(r => {
      const key = r.resource_kind || 'lesson';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [resources]);

  const activeFilterCount = [subject, resourceKind].filter(Boolean).length;
  const activeCustomizeCount = [subjectArea, gradeBand, inclusiveFeature].filter(Boolean).length;

  const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 border border-gray-200 active:bg-gray-50'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-10">
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
              <ElearningIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-orange-800">Learning Hub</h3>
              <p className="text-sm text-orange-700">Free lessons, games, and simulations, picked for your level.</p>
            </div>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <AwardIcon className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-lg font-black text-gray-800">{summary.lessons_completed}</p>
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Completed</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <ClockIcon className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-lg font-black text-gray-800">{Math.round((summary.time_spent_seconds || 0) / 60)}m</p>
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Time Spent</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <SparklesIcon className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-lg font-black text-gray-800">{summary.average_score ?? '—'}</p>
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Avg Score</p>
            </div>
          </div>
        )}

        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigateTo('studyBuddy', 'AI Study Buddy')}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-md shadow-orange-200 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <SparklesIcon className="w-5 h-5" />
          Ask the AI Study Assistant
        </motion.button>

        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics, keywords..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Browse / Filter / Customize — each tab is its own full-width row of
            tap-friendly chips so this works well one-handed on a phone. */}
        <div className="flex border-b border-gray-200">
          {([
            ['browse', 'Browse', 0],
            ['filter', 'Filter', activeFilterCount],
            ['customize', 'Customize', activeCustomizeCount],
          ] as [Tab, string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex-1 py-2.5 text-sm font-bold transition-colors ${tab === key ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-400'}`}
            >
              {label}
              {count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] align-top">{count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'browse' && (
          <div className="flex items-center gap-2 px-1">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Your Level</p>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white">{level || 'Not set'}</span>
          </div>
        )}

        {tab === 'filter' && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 mb-2">Your Subjects</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Chip active={subject === ''} onClick={() => setSubject('')}>All</Chip>
                {mySubjects.map(s => (
                  <Chip key={s} active={subject === s} onClick={() => setSubject(s)}>{s}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 mb-2">Resource Type</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Chip active={resourceKind === ''} onClick={() => setResourceKind('')}>All</Chip>
                {Object.entries(KIND_LABELS).map(([kind, label]) => (
                  <Chip key={kind} active={resourceKind === kind} onClick={() => setResourceKind(kind)}>{label}</Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'customize' && (
          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-700 font-medium">
              These filters follow PhET's own categories — great for finding more interactive simulations by subject area, grade level, or accessibility needs.
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 mb-2">Subject Area</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Chip active={subjectArea === ''} onClick={() => setSubjectArea('')}>All</Chip>
                {PHET_SUBJECT_AREAS.map(s => (
                  <Chip key={s} active={subjectArea === s} onClick={() => setSubjectArea(s)}>{s}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 mb-2">Grade Level</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Chip active={gradeBand === ''} onClick={() => setGradeBand('')}>All</Chip>
                {PHET_GRADE_BANDS.map(g => (
                  <Chip key={g} active={gradeBand === g} onClick={() => setGradeBand(g)}>{g}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 mb-2">Inclusive Features</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Chip active={inclusiveFeature === ''} onClick={() => setInclusiveFeature('')}>All</Chip>
                {PHET_INCLUSIVE_FEATURES.map(f => (
                  <Chip key={f} active={inclusiveFeature === f} onClick={() => setInclusiveFeature(f)}>{f}</Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
          </div>
        ) : resources.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <BookOpenIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 font-bold">No resources match these filters yet.</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {Object.entries(grouped)
              .sort(([a], [b]) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b))
              .map(([kind, items]) => (
              <div key={kind} className="space-y-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{KIND_LABELS[kind] || kind}</h3>
                <div className="space-y-2">
                  <AnimatePresence>
                    {items.map((resource, i) => {
                      const progress = progressByResource[resource.id];
                      const isCompleted = progress?.status === 'completed';
                      return (
                        <motion.button
                          key={resource.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.03 }}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleOpenResource(resource)}
                          className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left flex items-center gap-3"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                            <BookOpenIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">{resource.title}</p>
                            <p className="text-xs text-gray-500 truncate">{resource.source_name ? `via ${resource.source_name}` : resource.description}</p>
                          </div>
                          {isCompleted ? (
                            <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex-shrink-0">Done</span>
                          ) : (
                            <button
                              onClick={(e) => handleMarkComplete(resource, e)}
                              className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full flex-shrink-0 hover:bg-orange-100"
                            >
                              Mark done
                            </button>
                          )}
                          <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LearningHubScreen;
