import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Calculator, FlaskConical, Code2, BookOpen, Globe2, GraduationCap, Search, ArrowRight } from 'lucide-react';

interface FreeLearningResourcesScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const CATEGORIES = [
  'Mathematics',
  'Science',
  'Computer Studies & Coding',
  'English',
  'Geography & Social Studies',
  'STEM & Interactive Learning',
];

const CATEGORY_STYLE: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  'Mathematics': { icon: <Calculator className="w-6 h-6" />, bg: 'bg-blue-50', text: 'text-blue-600' },
  'Science': { icon: <FlaskConical className="w-6 h-6" />, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  'Computer Studies & Coding': { icon: <Code2 className="w-6 h-6" />, bg: 'bg-indigo-50', text: 'text-indigo-600' },
  'English': { icon: <BookOpen className="w-6 h-6" />, bg: 'bg-orange-50', text: 'text-orange-600' },
  'Geography & Social Studies': { icon: <Globe2 className="w-6 h-6" />, bg: 'bg-teal-50', text: 'text-teal-600' },
  'STEM & Interactive Learning': { icon: <GraduationCap className="w-6 h-6" />, bg: 'bg-purple-50', text: 'text-purple-600' },
};

const FreeLearningResourcesScreen: React.FC<FreeLearningResourcesScreenProps> = ({ navigateTo }) => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLearningHubResources({ resource_kind: 'website' });
      setResources(Array.isArray(res) ? res : []);
    } catch {
      toast.error('Could not load Free Learning Resources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return resources.filter(r => {
      const matchesCategory = !category || r.category === category;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q
        || r.title?.toLowerCase().includes(q)
        || r.source_name?.toLowerCase().includes(q)
        || r.description?.toLowerCase().includes(q)
        || (r.tags || []).some((t: string) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [resources, category, search]);

  const handleOpen = (resource: any) => {
    navigateTo('learningHubResource', resource.title, {
      url: resource.url,
      title: resource.title,
      sourceName: resource.source_name,
      themeColor: 'orange',
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-10">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-1">Free Learning Resources</h2>
          <p className="text-sm text-gray-500">Hand-picked free websites — no signup, no paywall — for every student from Creche to SSS3.</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources, subjects..."
            className="w-full pl-9 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategory('')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${category === '' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            All
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${category === c ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-gray-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 font-bold">No resources match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <AnimatePresence>
              {filtered.map((resource, i) => {
                const style = CATEGORY_STYLE[resource.category] || CATEGORY_STYLE['STEM & Interactive Learning'];
                return (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.03 }}
                    className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow flex flex-col"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${style.bg} ${style.text}`}>
                        {style.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{resource.source_name}</h3>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide truncate">{resource.category}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-3 flex-1">{resource.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(resource.tags || []).map((t: string) => (
                        <span key={t} className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">{t}</span>
                      ))}
                      {resource.recommended_age && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">{resource.recommended_age}</span>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOpen(resource)}
                      className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                      Open Learning
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default FreeLearningResourcesScreen;
