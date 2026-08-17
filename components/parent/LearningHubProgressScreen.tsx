import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Student } from '../../types';
import { api } from '../../lib/api';
import { ElearningIcon, AwardIcon, ClockIcon, SparklesIcon, BookOpenIcon } from '../../constants';

interface LearningHubProgressScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
  students?: Student[];
}

const LearningHubProgressScreen: React.FC<LearningHubProgressScreenProps> = ({ students = [] }) => {
  const [selectedChildId, setSelectedChildId] = useState<string>(students[0]?.id || '');
  const [summary, setSummary] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedChildId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [sum, prog] = await Promise.all([
        api.getStudentLearningHubSummary(selectedChildId),
        api.getStudentLearningHubProgress(selectedChildId),
      ]);
      setSummary(sum);
      setProgress(Array.isArray(prog) ? prog : []);
    } catch (e) {
      console.error('[LearningHubProgressScreen] Failed to load progress:', e);
      toast.error('Unable to load learning progress. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedChildId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!selectedChildId && students[0]) setSelectedChildId(students[0].id); }, [students, selectedChildId]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-10">
        <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl text-green-600">
            <ElearningIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-green-800">Learning Hub</h3>
            <p className="text-sm text-green-700">See how your child is progressing with free study resources.</p>
          </div>
        </div>

        {students.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {students.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedChildId === child.id ? 'bg-green-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
          </div>
        ) : !selectedChildId ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-bold">No child linked yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <AwardIcon className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-lg font-black text-gray-800">{summary?.lessons_completed ?? 0}</p>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Completed</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <ClockIcon className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-lg font-black text-gray-800">{Math.round(((summary?.time_spent_seconds) || 0) / 60)}m</p>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Time Spent</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <SparklesIcon className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-lg font-black text-gray-800">{summary?.average_score ?? '—'}</p>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Avg Score</p>
              </div>
            </div>

            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 pt-2">Recent Activity</h3>
            {progress.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <BookOpenIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 font-bold">No activity yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {progress.slice(0, 20).map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.03 }}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${p.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                      <BookOpenIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{p.resource?.title}</p>
                      <p className="text-xs text-gray-500 truncate">{p.resource?.subject} · {p.resource?.grade_level}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${p.status === 'completed' ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                      {p.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default LearningHubProgressScreen;
